"use client";

import React, { useState } from "react";
import { Appointment, AppointmentStatus } from "@/types/database";
import { updateAppointmentStatusAction } from "@/app/actions/appointment.actions";
import { CompleteConsultationModal } from "./CompleteConsultationModal";
import {
  CheckCircle2,
  XCircle,
  CheckCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  appointment: Appointment;
  onStatusUpdated?: (newStatus: AppointmentStatus) => void;
}

export function DoctorAppointmentActions({
  appointment,
  onStatusUpdated,
}: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const handleAction = async (status: AppointmentStatus) => {
    setLoadingAction(status);
    const res = await updateAppointmentStatusAction(
      appointment.appointment_id,
      status
    );
    if (res.success) {
      if (onStatusUpdated) onStatusUpdated(status);
      router.refresh();
    } else {
      alert(res.error || "Failed to update appointment status.");
    }
    setLoadingAction(null);
  };

  const handleConsultationCompleted = (result: {
    earlySlotOffered: boolean;
    message: string;
  }) => {
    if (onStatusUpdated) onStatusUpdated("completed");
    setFeedback(result.message);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
        {feedback && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold bg-sage-light text-forest border border-sage-dark/80 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-forest shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {appointment.status === "pending" && (
            <>
              <button
                onClick={() => handleAction("confirmed")}
                disabled={loadingAction !== null}
                className="btn-forest text-xs px-3.5 py-1.5 gap-1 shadow-2xs"
              >
                {loadingAction === "confirmed" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
                )}
                <span>Accept & Confirm</span>
              </button>

              <button
                onClick={() => handleAction("rejected")}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-rose-800 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                {loadingAction === "rejected" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Decline</span>
              </button>
            </>
          )}

          {appointment.status === "confirmed" && (
            <>
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={loadingAction !== null}
                className="btn-forest text-xs px-3.5 py-1.5 gap-1.5 font-bold shadow-2xs"
                title="Conclude Consultation & Trigger Early Slot Detection"
              >
                <CheckCheck className="w-3.5 h-3.5 text-sage" />
                <span>Complete Consultation</span>
              </button>

              <button
                onClick={() => handleAction("cancelled")}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-ivory-light transition-colors"
              >
                {loadingAction === "cancelled" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>

      <CompleteConsultationModal
        appointment={appointment}
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onSuccess={handleConsultationCompleted}
      />
    </>
  );
}
