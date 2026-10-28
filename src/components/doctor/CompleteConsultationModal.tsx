"use client";

import React, { useState } from "react";
import { Appointment } from "@/types/database";
import { completeConsultationAction } from "@/app/actions/early-appointment.actions";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  Stethoscope,
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
        message: res.message || "Consultation completed.",
      });
      onClose();
    } else {
      setError(res.error || "Failed to complete consultation.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/50 flex items-center justify-center text-teal-200 border border-teal-500/40">
              <CheckCircle2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Complete Consultation</h3>
              <p className="text-xs text-teal-200">
                Finish active visit & check for early slot availability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Appointment Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Patient Details
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                Active Visit
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              {appointment.patient?.user?.full_name || "Patient"}
            </div>
            <div className="text-slate-600 flex items-center gap-3">
              <span>📞 {appointment.patient?.user?.phone || "N/A"}</span>
              <span>
                ⏰ Slot:{" "}
                {appointment.availability
                  ? `${formatTime12h(appointment.availability.start_time)} - ${formatTime12h(
                      appointment.availability.end_time
                    )}`
                  : "Scheduled Slot"}
              </span>
            </div>
            <div className="text-slate-500 italic pt-1 border-t border-slate-200">
              Reason: &ldquo;{appointment.reason}&rdquo;
            </div>
          </div>

          {/* Smart Early Slot Explanation Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Smart Waiting Queue & Early Offer Integration</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              When you complete this appointment early, Medrella will automatically
              detect if an upcoming slot can accommodate another patient sooner. If
              available, an early-offer notification with a 2-minute response
              countdown will be dispatched to the next eligible patient in line.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Are you sure you want to conclude this consultation? This will mark
            the appointment as <strong>Completed</strong>.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm shadow-teal-700/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Completing Consultation...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Complete Consultation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
