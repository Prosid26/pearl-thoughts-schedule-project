"use client";

import React, { useState } from "react";
import { Appointment } from "@/types/database";
import { completeConsultationAction } from "@/app/actions/early-appointment.actions";
import {
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  Clock,
} from "lucide-react";
import { formatTime12h } from "@/lib/utils/date";

interface Props {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { earlySlotOffered: boolean; message: string }) => void;
}

export function CompleteConsultationModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    const res = await completeConsultationAction(appointment.appointment_id);
    if (res.success && res.data) {
      onSuccess({
        earlySlotOffered: res.data.earlySlotOffered,
        message: res.message || "Consultation concluded successfully.",
      });
      onClose();
    } else {
      setError(res.error || "Failed to complete consultation.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-warm-border overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-forest text-ivory flex items-center justify-between border-b border-forest-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#182821] text-sage flex items-center justify-center border border-sage-dark/40 font-bold">
              <CheckCircle2 className="w-5 h-5 text-sage" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Conclude Consultation</h3>
              <p className="text-xs text-sage font-sans">
                Mark visit completed & initiate earlier slot cascade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-sage hover:text-white hover:bg-forest-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Appointment Summary */}
          <div className="bg-ivory-light rounded-lg p-4 border border-warm-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                Patient Record
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sage-light text-forest border border-sage-dark/60 font-semibold text-[10px]">
                Active Consultation
              </span>
            </div>
            <div className="font-serif text-base font-bold text-ink">
              {appointment.patient?.user?.full_name || "Patient"}
            </div>
            <div className="text-ink-muted flex items-center gap-3">
              <span>📞 {appointment.patient?.user?.phone || "N/A"}</span>
              <span>
                ⏰ Slot:{" "}
                {appointment.availability
                  ? `${formatTime12h(appointment.availability.start_time)} – ${formatTime12h(
                      appointment.availability.end_time
                    )}`
                  : "Scheduled Slot"}
              </span>
            </div>
            {appointment.reason && (
              <div className="text-ink-muted italic pt-1 border-t border-warm-border-subtle font-sans">
                Clinical Reason: &ldquo;{appointment.reason}&rdquo;
              </div>
            )}
          </div>

          {/* Smart Early Slot Explanation Box */}
          <div className="p-4 rounded-lg bg-sage-light border border-sage-dark/70 space-y-2 text-forest">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-forest" />
              <span>Smart Waiting Queue & Early Offer Cascade</span>
            </div>
            <p className="text-[11px] text-forest/90 leading-relaxed font-sans">
              When concluding this appointment ahead of time, Medrella automatically
              identifies if upcoming slots can accommodate waiting clinic patients or
              the next scheduled patient. An early-slot offer with a 2-minute response
              window will be dispatched automatically.
            </p>
          </div>

          <div className="text-xs text-ink-muted font-sans">
            Confirm to mark this visit as <strong>Completed</strong>. Your schedule will be refreshed immediately.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-ivory-light border-t border-warm-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-ivory text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="btn-forest text-xs px-5 py-2.5 font-bold flex items-center gap-2 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-ivory" />
                <span>Concluding Visit...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-sage" />
                <span>Conclude Consultation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
