/**
 * Configurable Healthcare Cancellation & Refund Policy Engine
 *
 * Policy Rules:
 * 1. CLINIC / PRACTITIONER CANCELLATION:
 *    - Always 100% full refund unconditionally.
 *
 * 2. PATIENT CANCELLATION:
 *    - More than 24 hours prior (CANCELLATION_FULL_REFUND_HOURS, default: 24h):
 *      100% full refund.
 *    - Between 2 and 24 hours prior (CANCELLATION_PARTIAL_REFUND_HOURS, default: 2h):
 *      50% partial refund (CANCELLATION_PARTIAL_REFUND_PERCENT, default: 50%).
 *    - Less than 2 hours prior:
 *      0% refund (clinical window locked, appointment forfeited).
 *
 * 3. OVER-REFUND PROTECTION:
 *    - The total refunded amount across all refunds for a payment can never exceed
 *      the captured payment amount.
 */

export interface RefundPolicyResult {
  eligibleAmount: number; // in minor units (paise)
  refundPercentage: number;
  policyApplied: string;
  reason: string;
  canRefund: boolean;
}

export function getRefundPolicyConfig() {
  return {
    fullRefundHours: parseInt(
      process.env.CANCELLATION_FULL_REFUND_HOURS || "24",
      10
    ),
    partialRefundHours: parseInt(
      process.env.CANCELLATION_PARTIAL_REFUND_HOURS || "2",
      10
    ),
    partialRefundPercent: parseInt(
      process.env.CANCELLATION_PARTIAL_REFUND_PERCENT || "50",
      10
    ),
  };
}

/**
 * Calculates refund eligibility based on cancellation initiator, appointment timing, and policy
 */
export function calculateEligibleRefund(params: {
  appointmentDate: Date | string;
  cancellationDate?: Date | string;
  cancelledByRole: "doctor" | "patient" | "admin";
  capturedAmount: number; // in minor units (paise)
  alreadyRefundedAmount?: number; // in minor units (paise)
  manualReason?: string;
}): RefundPolicyResult {
  const {
    appointmentDate,
    cancellationDate = new Date(),
    cancelledByRole,
    capturedAmount,
    alreadyRefundedAmount = 0,
    manualReason,
  } = params;

  const apptTime = new Date(appointmentDate).getTime();
  const cancelTime = new Date(cancellationDate).getTime();
  const hoursUntilAppointment = (apptTime - cancelTime) / (1000 * 60 * 60);

  const remainingMaxRefundable = Math.max(0, capturedAmount - alreadyRefundedAmount);

  // 1. Doctor / Clinic initiated cancellation: Always 100% refund
  if (cancelledByRole === "doctor" || cancelledByRole === "admin") {
    const refundAmount = Math.min(capturedAmount, remainingMaxRefundable);
    return {
      eligibleAmount: refundAmount,
      refundPercentage: 100,
      policyApplied: "CLINIC_OR_DOCTOR_CANCELLATION_FULL_REFUND",
      reason:
        manualReason ||
        "Full refund issued due to clinic schedule adjustment or doctor cancellation.",
      canRefund: refundAmount > 0,
    };
  }

  // 2. Patient initiated cancellation
  const config = getRefundPolicyConfig();

  if (hoursUntilAppointment >= config.fullRefundHours) {
    // > 24 hours: 100% refund
    const refundAmount = Math.min(capturedAmount, remainingMaxRefundable);
    return {
      eligibleAmount: refundAmount,
      refundPercentage: 100,
      policyApplied: `PATIENT_EARLY_CANCELLATION_FULL_REFUND (>= ${config.fullRefundHours}h)`,
      reason:
        manualReason ||
        `Full refund: Appointment cancelled ${Math.round(
          hoursUntilAppointment
        )}h before consultation (policy threshold: >= ${config.fullRefundHours}h).`,
      canRefund: refundAmount > 0,
    };
  }

  if (hoursUntilAppointment >= config.partialRefundHours) {
    // 2h to 24h: 50% partial refund
    const rawPartial = Math.round(
      (capturedAmount * config.partialRefundPercent) / 100
    );
    const refundAmount = Math.min(rawPartial, remainingMaxRefundable);
    return {
      eligibleAmount: refundAmount,
      refundPercentage: config.partialRefundPercent,
      policyApplied: `PATIENT_MODERATE_CANCELLATION_PARTIAL_REFUND (${config.partialRefundPercent}%)`,
      reason:
        manualReason ||
        `Partial refund (${config.partialRefundPercent}%): Appointment cancelled ${Math.round(
          hoursUntilAppointment
        )}h prior (policy threshold: between ${config.partialRefundHours}h and ${
          config.fullRefundHours
        }h).`,
      canRefund: refundAmount > 0,
    };
  }

  // < 2 hours: 0% refund
  return {
    eligibleAmount: 0,
    refundPercentage: 0,
    policyApplied: `PATIENT_LATE_CANCELLATION_NO_REFUND (< ${config.partialRefundHours}h)`,
    reason:
      manualReason ||
      `No refund: Appointment cancelled less than ${config.partialRefundHours} hours before consultation time. Consultation slot forfeited.`,
    canRefund: false,
  };
}

