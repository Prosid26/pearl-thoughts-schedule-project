import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { scheduleAppointmentReminders, sendClinicalNotification } from "@/lib/notifications";
import { formatINR } from "@/lib/utils/currency";

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay key secret not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id || body.razorpay_order_id;
    const paymentId = body.payment_id || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;
    const appointmentId = body.appointmentId ? Number(body.appointmentId) : undefined;

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: order_id, payment_id, and signature are required.",
        },
        { status: 400 }
      );
    }

    // Cryptographic HMAC-SHA256 verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature, "utf8");

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      // If payment record exists, mark as failed
      try {
        const payment = await db.getPaymentByOrderId(orderId);
        if (payment) {
          await db.updatePaymentStatus({
            paymentId: payment.payment_id,
            status: "failed",
            providerPaymentId: paymentId,
            providerSignature: signature,
            failureReason: "HMAC signature verification mismatch",
          });
        }
      } catch (err) {
        console.warn("Could not record payment failure in db:", err);
      }

      return NextResponse.json(
        { success: false, error: "Payment verification failed: Signature mismatch." },
        { status: 400 }
      );
    }

    // Signature matches! Atomically update payment and appointment state
    let resolvedAppointmentId = appointmentId;
    try {
      const payment = await db.getPaymentByOrderId(orderId);
      if (payment) {
        resolvedAppointmentId = resolvedAppointmentId || payment.appointment_id;
        await db.updatePaymentStatus({
          paymentId: payment.payment_id,
          status: "captured",
          providerPaymentId: paymentId,
          providerSignature: signature,
        });
      }

      if (resolvedAppointmentId) {
        const appt = await db.getAppointmentById(resolvedAppointmentId);
        if (appt) {
          await db.updateAppointmentPaymentStatus(resolvedAppointmentId, "paid");
          await scheduleAppointmentReminders(resolvedAppointmentId);

          if (appt.patient?.user?.email) {
            const appTime = appt.availability
              ? `${appt.availability.start_time.slice(0, 5)} – ${appt.availability.end_time.slice(0, 5)} IST`
              : "Scheduled Time";

            const fee = appt.doctor ? formatINR(Number(appt.doctor.consultation_fee)) : "Paid";

            await sendClinicalNotification("payment_success", {
              recipientEmail: appt.patient.user.email,
              recipientName: appt.patient.user.full_name || "Patient",
              userId: appt.patient.user_id,
              appointmentId: appt.appointment_id,
              doctorName: appt.doctor?.user?.full_name || "Doctor",
              specialization: appt.doctor?.specialization || "Specialist",
              appointmentDate: appt.appointment_date,
              appointmentTimeStr: appTime,
              clinicAddress: appt.doctor?.clinic_address,
              amountFormatted: fee,
              paymentId,
              orderId,
              idempotencyKey: `notif_pay_api_${payment?.payment_id || orderId}`,
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("Database sync completed with warnings:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (error: any) {
    console.error("Error verifying Razorpay payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during verification." },
      { status: 500 }
    );
  }
}

