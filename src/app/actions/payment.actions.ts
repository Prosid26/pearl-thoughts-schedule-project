"use server";

import { db } from "@/lib/db";
import { getSession, requireUser, requirePatient } from "@/lib/auth/session";
import { getPaymentProvider, calculateEligibleRefund } from "@/lib/payments";
import {
  sendClinicalNotification,
  scheduleAppointmentReminders,
  cancelAppointmentReminders,
} from "@/lib/notifications";
import { formatINR } from "@/lib/utils/currency";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * 1. Create Backend Payment Order
 * CRITICAL SECURITY: Never trusts client-supplied amount.
 * Retrieves consultation fee directly from verified database record.
 */
export async function createPaymentOrderAction(
  appointmentId: number
): Promise<
  ActionResult<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    paymentId: number;
    doctorName: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    isLive?: boolean;
  }>
> {
  try {
    const session = await requireUser();

    const appointment = await db.getAppointmentById(appointmentId);
    if (!appointment) {
      return { success: false, error: "Appointment record not found." };
    }

    // Authorization check
    if (
      session.role === "patient" &&
      appointment.patient?.user_id !== session.user_id &&
      appointment.patient_id !== session.patient_id
    ) {
      return { success: false, error: "Unauthorized access to appointment payment." };
    }

    if (appointment.payment_status === "paid") {
      return { success: false, error: "This consultation has already been paid for." };
    }

    const doctor = appointment.doctor;
    if (!doctor || !doctor.consultation_fee) {
      return { success: false, error: "Attending doctor consultation fee not configured." };
    }

    // Exact monetary representation in integer minor units (paise)
    const amountInPaise = Math.round(Number(doctor.consultation_fee) * 100);
    if (amountInPaise <= 0) {
      return { success: false, error: "Invalid consultation fee configuration." };
    }

    const provider = getPaymentProvider();
    const receipt = `rcpt_apt_${appointmentId}_${Date.now()}`;
    const idempotencyKey = `order_init_${appointmentId}_${Date.now()}`;

    // Create provider order on backend
    const providerOrder = await provider.createOrder({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        appointment_id: String(appointmentId),
        doctor_id: String(doctor.doctor_id),
        patient_id: String(appointment.patient_id),
      },
    });

    // Durably store pending payment transaction in database
    const payment = await db.createPayment({
      appointmentId,
      patientId: appointment.patient_id,
      provider: provider.name,
      providerOrderId: providerOrder.orderId,
      amount: amountInPaise,
      currency: providerOrder.currency,
      idempotencyKey,
    });

    return {
      success: true,
      data: {
        orderId: providerOrder.orderId,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        keyId: providerOrder.keyId,
        paymentId: payment.payment_id,
        doctorName: doctor.user?.full_name || "Doctor",
        patientName: appointment.patient?.user?.full_name || "Patient",
        patientEmail: appointment.patient?.user?.email || "",
        patientPhone: appointment.patient?.user?.phone || "",
        isLive: provider.name === "razorpay",
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to initialize payment order.";
    return { success: false, error: message };
  }
}

/**
 * 2. Cryptographic Server-Side Payment Signature Verification
 * CRITICAL SECURITY: Does not mark appointment paid based solely on frontend success.
 * Performs HMAC SHA-256 verification against key secret.
 */
export async function verifyPaymentAction(params: {
  appointmentId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult<{ paymentId: number; status: string }>> {
  try {
    const session = await requireUser();
    const { appointmentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      params;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return { success: false, error: "Missing cryptographic payment credentials." };
    }

    const appointment = await db.getAppointmentById(appointmentId);
    if (!appointment) {
      return { success: false, error: "Appointment record not found." };
    }

    // Retrieve corresponding payment record
    const payment = await db.getPaymentByOrderId(razorpayOrderId);
    if (!payment) {
      return { success: false, error: "No pending payment found for this order reference." };
    }

    if (payment.status === "captured") {
      return {
        success: true,
        message: "Payment already captured and verified.",
        data: { paymentId: payment.payment_id, status: "captured" },
      };
    }

    const provider = getPaymentProvider();

    // Verify cryptographic signature
    const isValid = provider.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      await db.updatePaymentStatus({
        paymentId: payment.payment_id,
        status: "failed",
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
        failureReason: "Cryptographic signature verification failed (spoofing attempt detected).",
      });

      // Send failure alert notification
      if (appointment.patient?.user?.email) {
        await sendClinicalNotification("payment_failed", {
          recipientEmail: appointment.patient.user.email,
          recipientName: appointment.patient.user.full_name || "Patient",
          userId: appointment.patient.user_id,
          appointmentId: appointment.appointment_id,
          doctorName: appointment.doctor?.user?.full_name || "Doctor",
          specialization: appointment.doctor?.specialization || "Specialist",
          appointmentDate: appointment.appointment_date,
          appointmentTimeStr: appointment.availability
            ? `${appointment.availability.start_time.slice(0, 5)} IST`
            : "",
          failureReason: "Payment verification signature mismatch.",
          idempotencyKey: `notif_pay_fail_${payment.payment_id}`,
        });
      }

      return {
        success: false,
        error: "Security Alert: Payment signature verification failed.",
      };
    }

    // Atomically transition payment to captured
    const updatedPayment = await db.updatePaymentStatus({
      paymentId: payment.payment_id,
      status: "captured",
      providerPaymentId: razorpayPaymentId,
      providerSignature: razorpaySignature,
    });

    // Schedule automated clinical reminders
    await scheduleAppointmentReminders(appointmentId);

    // Dispatch booking & payment receipts
    if (appointment.patient?.user?.email) {
      const appTime = appointment.availability
        ? `${appointment.availability.start_time.slice(0, 5)} – ${appointment.availability.end_time.slice(0, 5)} IST`
        : "Scheduled Time";

      const feeFormatted = formatINR(updatedPayment.amount / 100);

      await sendClinicalNotification("payment_success", {
        recipientEmail: appointment.patient.user.email,
        recipientName: appointment.patient.user.full_name || "Patient",
        userId: appointment.patient.user_id,
        appointmentId: appointment.appointment_id,
        doctorName: appointment.doctor?.user?.full_name || "Doctor",
        specialization: appointment.doctor?.specialization || "Specialist",
        appointmentDate: appointment.appointment_date,
        appointmentTimeStr: appTime,
        clinicAddress: appointment.doctor?.clinic_address,
        amountFormatted: feeFormatted,
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        idempotencyKey: `notif_pay_success_${updatedPayment.payment_id}`,
      });
    }

    // Revalidate affected views
    revalidatePath("/patient/appointments");
    revalidatePath("/patient/dashboard");
    revalidatePath(`/booking-confirmation`);

    return {
      success: true,
      message: "Payment successfully verified and appointment confirmed!",
      data: { paymentId: updatedPayment.payment_id, status: "captured" },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Payment verification failed.";
    return { success: false, error: message };
  }
}

/**
 * 3. Request Refund Under Clinical Policy
 */
export async function requestRefundAction(params: {
  appointmentId: number;
  reason?: string;
}): Promise<
  ActionResult<{
    refundId: number;
    amount: number;
    policyApplied: string;
    status: string;
  }>
> {
  try {
    const session = await requireUser();
    const { appointmentId, reason } = params;

    const appointment = await db.getAppointmentById(appointmentId);
    if (!appointment) {
      return { success: false, error: "Appointment record not found." };
    }

    // Check authorization
    if (
      session.role === "patient" &&
      appointment.patient?.user_id !== session.user_id &&
      appointment.patient_id !== session.patient_id
    ) {
      return { success: false, error: "Unauthorized." };
    }

    // Find captured payments for this appointment
    const payments = await db.getPaymentsForAppointment(appointmentId);
    const capturedPayment = payments.find((p) => p.status === "captured");

    if (!capturedPayment) {
      return {
        success: false,
        error: "No captured payment found on file for this appointment.",
      };
    }

    // Check prior refunds
    const existingRefunds = await db.getRefundsForPayment(capturedPayment.payment_id);
    const alreadyRefunded = existingRefunds
      .filter((r) => r.status !== "failed")
      .reduce((sum, r) => sum + r.amount, 0);

    // Apply policy engine
    const policyResult = calculateEligibleRefund({
      appointmentDate: appointment.appointment_date,
      cancelledByRole: session.role,
      capturedAmount: capturedPayment.amount,
      alreadyRefundedAmount: alreadyRefunded,
      manualReason: reason,
    });

    if (!policyResult.canRefund || policyResult.eligibleAmount <= 0) {
      return {
        success: false,
        error: `Cancellation Policy: ${policyResult.reason}`,
      };
    }

    const provider = getPaymentProvider();
    const refundIdempotencyKey = `rfnd_${capturedPayment.payment_id}_${policyResult.eligibleAmount}_${alreadyRefunded}`;

    // Create provider refund
    let providerRefund;
    try {
      providerRefund = await provider.createRefund({
        paymentId: capturedPayment.provider_payment_id || capturedPayment.provider_order_id,
        amount: policyResult.eligibleAmount,
        reason: policyResult.reason,
        idempotencyKey: refundIdempotencyKey,
      });
    } catch (providerErr: unknown) {
      const errMessage =
        providerErr instanceof Error
          ? providerErr.message
          : "Payment provider rejected refund.";
      // Record failed refund record for clinical audit
      await db.createRefundRecord({
        paymentId: capturedPayment.payment_id,
        appointmentId,
        amount: policyResult.eligibleAmount,
        currency: capturedPayment.currency,
        reason: policyResult.reason,
        policyApplied: policyResult.policyApplied,
        provider: provider.name,
        idempotencyKey: refundIdempotencyKey,
        status: "failed",
        errorMessage: errMessage,
      });

      return {
        success: false,
        error: `Gateway refund failed: ${errMessage}`,
      };
    }

    // Persist processed refund record
    const refundRecord = await db.createRefundRecord({
      paymentId: capturedPayment.payment_id,
      appointmentId,
      amount: policyResult.eligibleAmount,
      currency: capturedPayment.currency,
      reason: policyResult.reason,
      policyApplied: policyResult.policyApplied,
      provider: provider.name,
      providerRefundId: providerRefund.refundId,
      idempotencyKey: refundIdempotencyKey,
      status: "processed",
    });

    // Cancel reminders
    await cancelAppointmentReminders(appointmentId);

    // Dispatch refund confirmation email
    if (appointment.patient?.user?.email) {
      await sendClinicalNotification("refund_processed", {
        recipientEmail: appointment.patient.user.email,
        recipientName: appointment.patient.user.full_name || "Patient",
        userId: appointment.patient.user_id,
        appointmentId: appointment.appointment_id,
        doctorName: appointment.doctor?.user?.full_name || "Doctor",
        specialization: appointment.doctor?.specialization || "Specialist",
        appointmentDate: appointment.appointment_date,
        appointmentTimeStr: "",
        refundAmountFormatted: formatINR(policyResult.eligibleAmount / 100),
        refundReason: policyResult.policyApplied,
        idempotencyKey: `notif_rfnd_${refundRecord.refund_id}`,
      });
    }

    revalidatePath("/patient/appointments");
    revalidatePath("/patient/dashboard");

    return {
      success: true,
      message: `Refund of ${formatINR(policyResult.eligibleAmount / 100)} processed under policy: ${policyResult.policyApplied}.`,
      data: {
        refundId: refundRecord.refund_id,
        amount: policyResult.eligibleAmount,
        policyApplied: policyResult.policyApplied,
        status: "processed",
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process refund.";
    return { success: false, error: message };
  }
}

/**
 * 4. Record Checkout Dismissed / Abandoned
 * Called when patient closes Razorpay Checkout modal without completing payment.
 */
export async function recordPaymentAbandonedAction(params: {
  appointmentId: number;
  paymentId?: number;
  orderId?: string;
  reason?: string;
}): Promise<ActionResult<{ status: string }>> {
  try {
    const session = await requireUser();
    const { appointmentId, paymentId, orderId, reason } = params;

    let payment = null;
    if (paymentId) {
      payment = await db.getPaymentById(paymentId);
    } else if (orderId) {
      payment = await db.getPaymentByOrderId(orderId);
    } else {
      const payments = await db.getPaymentsForAppointment(appointmentId);
      payment = payments.find((p) => p.status === "pending") || null;
    }

    if (payment && payment.status === "pending") {
      await db.updatePaymentStatus({
        paymentId: payment.payment_id,
        status: "abandoned",
        failureReason:
          reason || "Patient dismissed Checkout modal before completing payment.",
      });
    }

    revalidatePath("/patient/appointments");
    revalidatePath("/patient/dashboard");
    revalidatePath("/booking-confirmation");

    return {
      success: true,
      data: { status: "abandoned" },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to record checkout dismissal.";
    return { success: false, error: message };
  }
}

