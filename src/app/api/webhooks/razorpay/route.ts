import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import {
  sendClinicalNotification,
  scheduleAppointmentReminders,
  cancelAppointmentReminders,
} from "@/lib/notifications";
import { formatINR } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    // 1. Verify Webhook Signature
    const isValidSignature = provider.verifyWebhookSignature({
      rawBody,
      signature,
      secret: webhookSecret,
    });

    if (!isValidSignature) {
      console.warn("[WEBHOOK-REJECTED] Invalid signature verification.");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = payload.event;
    // Extract provider event ID from header or payload
    const providerEventId =
      req.headers.get("x-razorpay-event-id") ||
      payload.event_id ||
      payload.id ||
      `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 2. Strict Webhook Idempotency Check
    const existingEvent = await db.getWebhookEvent(provider.name, providerEventId);
    if (existingEvent && existingEvent.status === "processed") {
      console.log(
        `[WEBHOOK-IDEMPOTENT] Event ${providerEventId} already processed. Skipping duplicate execution.`
      );
      return NextResponse.json(
        { received: true, already_processed: true },
        { status: 200 }
      );
    }

    // Record webhook event processing start
    await db.recordWebhookEvent({
      provider: provider.name,
      providerEventId,
      eventType,
      payload: rawBody,
      status: "processing",
    });

    // 3. Process Events
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
        const paymentId = paymentEntity?.id;

        if (orderId) {
          const payment = await db.getPaymentByOrderId(orderId);
          if (payment) {
            if (payment.status !== "captured") {
              await db.updatePaymentStatus({
                paymentId: payment.payment_id,
                status: "captured",
                providerPaymentId: paymentId || payment.provider_payment_id || undefined,
              });

              // Schedule reminders
              await scheduleAppointmentReminders(payment.appointment_id);

              // Dispatch payment success email with idempotency guard
              const appt = await db.getAppointmentById(payment.appointment_id);
              if (appt?.patient?.user?.email) {
                const feeFormatted = formatINR(payment.amount / 100);
                await sendClinicalNotification("payment_success", {
                  recipientEmail: appt.patient.user.email,
                  recipientPhone: appt.patient.user.phone,
                  recipientName: appt.patient.user.full_name || "Patient",
                  userId: appt.patient.user_id,
                  appointmentId: appt.appointment_id,
                  bookingRef: `#APT-${String(appt.appointment_id).padStart(5, "0")}`,
                  doctorName: appt.doctor?.user?.full_name || "Doctor",
                  specialization: appt.doctor?.specialization || "Specialist",
                  appointmentDate: appt.appointment_date,
                  appointmentTimeStr: appt.availability
                    ? `${appt.availability.start_time.slice(0, 5)} IST`
                    : "",
                  amountFormatted: feeFormatted,
                  paymentId,
                  orderId,
                  idempotencyKey: `webhook_pay_${payment.payment_id}`,
                });
              }
            }
          }
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;
        const errorDesc =
          paymentEntity?.error_description || "Payment attempt failed or was cancelled.";

        if (orderId) {
          const payment = await db.getPaymentByOrderId(orderId);
          if (payment && payment.status === "pending") {
            await db.updatePaymentStatus({
              paymentId: payment.payment_id,
              status: "failed",
              providerPaymentId: paymentId,
              failureReason: errorDesc,
            });

            const appt = await db.getAppointmentById(payment.appointment_id);
            if (appt?.patient?.user?.email) {
              await sendClinicalNotification("payment_failed", {
                recipientEmail: appt.patient.user.email,
                recipientPhone: appt.patient.user.phone,
                recipientName: appt.patient.user.full_name || "Patient",
                userId: appt.patient.user_id,
                appointmentId: appt.appointment_id,
                bookingRef: `#APT-${String(appt.appointment_id).padStart(5, "0")}`,
                doctorName: appt.doctor?.user?.full_name || "Doctor",
                specialization: appt.doctor?.specialization || "Specialist",
                appointmentDate: appt.appointment_date,
                appointmentTimeStr: "",
                failureReason: errorDesc,
                idempotencyKey: `webhook_payfail_${payment.payment_id}`,
              });
            }
          }
        }
        break;
      }

      case "refund.processed": {
        const refundEntity = payload.payload?.refund?.entity;
        const providerPaymentId = refundEntity?.payment_id;
        const providerRefundId = refundEntity?.id;

        if (providerPaymentId) {
          const matchedPayment = await db.getPaymentByProviderPaymentId(providerPaymentId);
          if (matchedPayment) {
            const refunds = await db.getRefundsForPayment(matchedPayment.payment_id);
            const targetRefund = refunds.find(
              (r) => r.provider_refund_id === providerRefundId || r.status === "pending"
            );
            if (targetRefund && targetRefund.status !== "processed") {
              await db.createRefundRecord({
                paymentId: matchedPayment.payment_id,
                appointmentId: matchedPayment.appointment_id,
                amount: Number(refundEntity?.amount) || targetRefund.amount,
                currency: matchedPayment.currency,
                reason: targetRefund.reason,
                policyApplied: targetRefund.policy_applied,
                provider: provider.name,
                providerRefundId,
                status: "processed",
              });
            }
          }
        }
        break;
      }

      case "refund.failed": {
        const refundEntity = payload.payload?.refund?.entity;
        const providerPaymentId = refundEntity?.payment_id;
        const providerRefundId = refundEntity?.id;

        if (providerPaymentId) {
          const matchedPayment = await db.getPaymentByProviderPaymentId(providerPaymentId);
          if (matchedPayment) {
            const refunds = await db.getRefundsForPayment(matchedPayment.payment_id);
            const targetRefund = refunds.find(
              (r) => r.provider_refund_id === providerRefundId || r.status === "pending"
            );
            if (targetRefund) {
              await db.createRefundRecord({
                paymentId: matchedPayment.payment_id,
                appointmentId: matchedPayment.appointment_id,
                amount: Number(refundEntity?.amount) || targetRefund.amount,
                currency: matchedPayment.currency,
                reason: targetRefund.reason,
                policyApplied: targetRefund.policy_applied,
                provider: provider.name,
                providerRefundId,
                status: "failed",
                errorMessage:
                  refundEntity?.error_description || "Provider refund failed",
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`[WEBHOOK-UNHANDLED] Event '${eventType}' received.`);
        break;
    }

    // 4. Mark Webhook Processed
    await db.recordWebhookEvent({
      provider: provider.name,
      providerEventId,
      eventType,
      payload: rawBody,
      status: "processed",
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[WEBHOOK-ERROR]", err);
    return NextResponse.json(
      { error: "Webhook internal error" },
      { status: 500 }
    );
  }
}

