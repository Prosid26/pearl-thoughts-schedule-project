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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {appointment.status === "pending" && (
            <>
              <button
                onClick={() => handleAction("confirmed")}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
              >
                {loadingAction === "confirmed" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Accept & Confirm</span>
              </button>

              <button
                onClick={() => handleAction("rejected")}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
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
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
                title="Complete Consultation & Check for Early Slot Availability"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Complete Consultation</span>
              </button>

              <button
                onClick={() => handleAction("cancelled")}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-colors"
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
