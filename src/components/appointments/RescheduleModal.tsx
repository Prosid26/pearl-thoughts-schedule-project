"use client";

import React, { useState, useEffect } from "react";
import { Appointment, Availability } from "@/types/database";
import {
  rescheduleAppointmentAction,
  getDoctorAvailableSlotsAction,
} from "@/app/actions/appointment.actions";
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { isSlotInPast } from "@/lib/utils/date";

interface Props {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RescheduleModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load alternative slots for this doctor
  useEffect(() => {
    if (isOpen) {
      setLoadingSlots(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedSlotId(null);

      getDoctorAvailableSlotsAction(appointment.doctor_id).then((res) => {
        setLoadingSlots(false);
        if (res.success && res.data) {
          // Filter out the current appointment's slot and past slots
          const available = res.data.filter(
            (s) =>
              s.availability_id !== appointment.availability_id &&
              s.is_available &&
              !isSlotInPast(s.available_date, s.start_time)
          );
          setSlots(available);
          const distinctDates = Array.from(
            new Set(available.map((s) => s.available_date))
          ).sort();
          if (distinctDates.length > 0) {
            setSelectedDate(distinctDates[0]);
          }
        } else {
          setErrorMessage(res.error || "Failed to load alternative slots.");
        }
      });
    }
  }, [isOpen, appointment.doctor_id, appointment.availability_id]);

  if (!isOpen) return null;

  const dates = Array.from(new Set(slots.map((s) => s.available_date))).sort();
  const slotsForDate = slots.filter((s) => s.available_date === selectedDate);
  const targetSlot = slots.find((s) => s.availability_id === selectedSlotId);

  // Original time formatting
  const originalDate = appointment.availability?.available_date || appointment.appointment_date.split("T")[0];
  const originalTime = appointment.availability?.start_time || "Scheduled Time";

  const handleConfirm = async () => {
    if (!selectedSlotId) {
      setErrorMessage("Please select a new time slot.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const res = await rescheduleAppointmentAction(
      appointment.appointment_id,
      selectedSlotId,
      reason
    );

    setSubmitting(false);
    if (res.success) {
      setSuccessMessage("Appointment successfully rescheduled.");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload();
      }, 1200);
    } else {
      setErrorMessage(res.error || "Failed to reschedule appointment.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-ivory border border-warm-border rounded-2xl max-w-xl w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-warm-border bg-white/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-forest block mb-0.5">
              Appointment Modification
            </span>
            <h3 className="font-serif text-xl font-normal text-ink">
              Reschedule Consultation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-text hover:text-ink hover:bg-warm-border/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Current vs Proposed Compare Card */}
          <div className="p-4 rounded-xl bg-sage/20 border border-warm-border space-y-3">
            <div className="text-[11px] font-semibold text-muted-text">
              Practitioner:{" "}
              <span className="text-ink font-bold">
                {appointment.doctor?.user?.full_name || "Specialist Practitioner"}
              </span>{" "}
              ({appointment.doctor?.specialization})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="p-3 rounded-lg bg-white/80 border border-warm-border">
                <span className="text-[10px] uppercase font-bold text-muted-text block mb-1">
                  Current Booking
                </span>
                <div className="font-semibold text-ink">
                  {originalDate}
                </div>
                <div className="text-muted-text font-mono text-[11px] mt-0.5">
                  {originalTime} IST
                </div>
              </div>

              <div className="p-3 rounded-lg bg-forest/5 border border-forest/20">
                <span className="text-[10px] uppercase font-bold text-forest block mb-1">
                  Proposed Booking
                </span>
                {targetSlot ? (
                  <>
                    <div className="font-semibold text-ink">
                      {targetSlot.available_date}
                    </div>
                    <div className="text-forest font-mono text-[11px] font-bold mt-0.5">
                      {targetSlot.start_time} - {targetSlot.end_time} IST
                    </div>
                  </>
                ) : (
                  <div className="text-muted-text italic">
                    Select a date & time below
                  </div>
                )}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-terracotta/20 border border-terracotta/40 flex items-center gap-2 text-ink">
              <AlertCircle className="w-4 h-4 shrink-0 text-ink" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-sage/40 border border-forest/20 flex items-center gap-2 text-forest">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-forest" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Date Selector */}
          <div>
            <label className="font-semibold text-ink block mb-2">
              Select New Consultation Date
            </label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 py-4 text-muted-text">
                <Loader2 className="w-4 h-4 animate-spin text-forest" />
                <span>Checking doctor availability roster...</span>
              </div>
            ) : dates.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((d) => {
                  const isSelected = d === selectedDate;
                  const [y, m, day] = d.split("-").map(Number);
                  const dateObj = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
                  const dayName = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    weekday: "short",
                  }).format(dateObj);
                  const dayNum = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                  }).format(dateObj);

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d);
                        setSelectedSlotId(null);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-center border transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-forest text-ivory border-forest shadow-xs font-semibold"
                          : "bg-white text-ink border-warm-border hover:border-forest/40"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        {dayName}
                      </div>
                      <div className="text-xs font-serif mt-0.5">{dayNum}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-warm-border text-center text-muted-text">
                No alternative open slots currently available for this practitioner.
              </div>
            )}
          </div>

          {/* Slot Selector */}
          {selectedDate && slotsForDate.length > 0 && (
            <div>
              <label className="font-semibold text-ink block mb-2">
                Select New Time Slot
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {slotsForDate.map((s) => {
                  const isSelected = s.availability_id === selectedSlotId;
                  const isWave = Boolean(s.is_wave);
                  const remainingCapacity = isWave
                    ? Math.max(0, (s.wave_capacity || 3) - (s.wave_booked_count || 0))
                    : 1;

                  return (
                    <button
                      key={s.availability_id}
                      type="button"
                      onClick={() => setSelectedSlotId(s.availability_id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-forest text-ivory border-forest shadow-xs"
                          : "bg-white text-ink border-warm-border hover:border-forest/40"
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold">
                        {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                      </div>
                      <div
                        className={`text-[10px] mt-1 flex items-center gap-1 ${
                          isSelected ? "text-ivory/80" : "text-muted-text"
                        }`}
                      >
                        {isWave ? (
                          <>
                            <Layers className="w-3 h-3 text-terracotta" />
                            <span>Wave ({remainingCapacity} left)</span>
                          </>
                        ) : (
                          <span>Sequential Slot</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason Field */}
          <div>
            <label className="font-semibold text-ink block mb-1.5">
              Reason for Rescheduling (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Schedule conflict, work commitment..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-warm-border bg-white/70 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-text hover:text-ink hover:bg-warm-border/30 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedSlotId || submitting}
            onClick={handleConfirm}
            className="btn-forest inline-flex items-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Confirming Reschedule...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Confirm Reschedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
