"use client";

import React, { useState } from "react";
import { Doctor, Availability, SessionUser } from "@/types/database";
import { bookAppointmentAction } from "@/app/actions/appointment.actions";
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  User,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/utils/currency";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";

interface Props {
  doctor: Doctor;
  availabilities: Availability[];
  session: SessionUser | null;
}

export function DoctorBookingFlow({ doctor, availabilities, session }: Props) {
  const router = useRouter();

  // Group availability by date
  const dates = Array.from(
    new Set(availabilities.map((a) => a.available_date))
  ).sort();

  const [selectedDate, setSelectedDate] = useState<string>(
    dates.length > 0 ? dates[0] : ""
  );
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentAppointmentId, setPaymentAppointmentId] = useState<number | null>(null);

  const slotsForDate = availabilities.filter(
    (a) => a.available_date === selectedDate
  );

  const selectedSlot = availabilities.find(
    (a) => a.availability_id === selectedSlotId
  );

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setErrorMessage("Please select an available consultation time slot.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage(
        "Please provide clinical context or symptoms for your consultation (min 5 characters)."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("doctor_id", doctor.doctor_id.toString());
    formData.append("availability_id", selectedSlotId.toString());
    formData.append("reason", reason.trim());

    try {
      const res = await bookAppointmentAction(null, formData);
      if (res.success && res.data?.appointmentId) {
        // Open payment modal
        setPaymentAppointmentId(res.data.appointmentId);
        setIsSubmitting(false);
      } else {
        setErrorMessage(
          res.error || "Failed to book appointment. Please try again."
        );
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clinic-card overflow-hidden">
      {/* Header */}
      <div className="p-6 sm:p-7 bg-forest text-ivory border-b border-forest-dark">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-sage">
              Live Clinical Scheduling
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold mt-0.5 text-white">
              Reserve Consultation Slot
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-sage block font-sans">
              Consultation Fee
            </span>
            <span className="font-serif text-2xl font-bold text-terracotta">
              {formatINR(doctor.consultation_fee)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* Step 1: Select Date */}
        <div>
          <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-3 flex items-center gap-1.5 font-sans">
            <Calendar className="w-4 h-4 text-forest" />
            1. Select Consultation Date
          </label>

          {dates.length === 0 ? (
            <div className="p-6 bg-ivory-light border border-warm-border rounded-lg text-center space-y-1.5">
              <Calendar className="w-7 h-7 text-ink-muted mx-auto" />
              <p className="text-sm font-semibold text-ink">
                No active availability slots configured yet.
              </p>
              <p className="text-xs text-ink-muted">
                Please check back later or view other doctors in our directory.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {dates.map((d) => {
                const dateObj = new Date(d + "T00:00:00");
                const dayName = dateObj.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dayNum = dateObj.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                });
                const isSelected = selectedDate === d;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedSlotId(null);
                      setErrorMessage(null);
                    }}
                    className={`flex-shrink-0 px-4 py-3 rounded-lg border text-center transition-all ${
                      isSelected
                        ? "bg-forest border-forest text-ivory shadow-xs"
                        : "bg-white border-warm-border text-ink hover:border-forest-light hover:bg-ivory-light"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected ? "text-sage" : "text-ink-muted"
                      }`}
                    >
                      {dayName}
                    </div>
                    <div className="font-serif text-sm font-bold mt-0.5">
                      {dayNum}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Time Slots */}
        {selectedDate && (
          <div className="pt-6 border-t border-warm-border-subtle">
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-3 flex items-center gap-1.5 font-sans">
              <Clock className="w-4 h-4 text-forest" />
              2. Available Time Slots for {selectedDate}
            </label>

            {slotsForDate.length === 0 ? (
              <p className="text-xs text-ink-muted">
                No consultation slots open on this date.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {slotsForDate.map((slot) => {
                  const isSelected = selectedSlotId === slot.availability_id;
                  const isAvailable = slot.is_available;
                  const isWave = slot.is_wave;
                  const remainingSpots = isWave && slot.wave_capacity
                    ? Math.max(0, slot.wave_capacity - (slot.wave_booked_count || 0))
                    : null;

                  return (
                    <button
                      key={slot.availability_id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedSlotId(slot.availability_id);
                        setErrorMessage(null);
                      }}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        !isAvailable
                          ? "bg-ivory-muted border-warm-border/50 text-ink-muted cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-forest border-forest text-ivory ring-2 ring-forest ring-offset-1 shadow-2xs"
                          : "bg-white border-warm-border text-ink hover:border-forest hover:bg-ivory-light"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-sans font-medium">
                        <span>{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isWave && (
                          <span className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-sage/50 text-forest"
                          }`}>
                            Wave
                          </span>
                        )}
                        <span
                          className={`text-[10px] ${
                            !isAvailable
                              ? "text-ink-muted"
                              : isSelected
                              ? "text-sage font-bold"
                              : "text-forest font-semibold"
                          }`}
                        >
                          {isWave && remainingSpots !== null
                            ? `${remainingSpots} spot${remainingSpots !== 1 ? "s" : ""} left`
                            : isAvailable
                            ? "Open"
                            : "Booked"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Visit Details & Atomic Submission */}
        {selectedSlot && (
          <form
            onSubmit={handleBooking}
            className="pt-6 border-t border-warm-border-subtle space-y-4 animate-in fade-in duration-200"
          >
            <div>
              <label
                htmlFor="reason"
                className="text-xs font-bold text-ink uppercase tracking-wider block mb-1.5 flex items-center gap-1.5 font-sans"
              >
                <HeartPulse className="w-4 h-4 text-forest" />
                3. Primary Consultation Reason / Symptoms *
              </label>
              <textarea
                id="reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Follow-up consultation for blood pressure management, mild dizziness, or annual cardiac screening."
                className="w-full px-3.5 py-2.5 text-xs text-ink bg-white border border-warm-border rounded-lg focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest placeholder:text-ink-muted"
              />
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Auth Gate vs Submit */}
            {session ? (
              session.role === "patient" ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-sage-light border border-sage-dark/60 rounded-lg flex items-center justify-between text-xs text-forest">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-forest" />
                      <span>
                        Patient: <strong>{session.full_name}</strong>
                      </span>
                    </div>
                    <span className="font-semibold text-forest">
                      Slot: {selectedSlot.available_date} @ {selectedSlot.start_time.slice(0, 5)} IST
                    </span>
                  </div>

                  {selectedSlot.is_wave && (
                    <div className="p-3 bg-sage/30 border border-warm-border rounded-lg text-xs text-forest space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-forest" />
                        <span>Wave Scheduling Arrival Instruction</span>
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        This appointment is scheduled as a wave cohort. Please arrive at the reception desk promptly at <strong>{selectedSlot.start_time.slice(0, 5)} IST</strong>. Patients in this wave are triaged in order of check-in arrival.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-forest w-full py-3.5 text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-ivory" />
                        <span>Securing Slot Atomically...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-sage" />
                        <span>
                          Proceed to Payment ({formatINR(doctor.consultation_fee)})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-terracotta-light border border-terracotta rounded-lg text-xs text-ink space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-forest">
                    <AlertCircle className="w-4 h-4 text-terracotta-dark" />
                    Doctor Account Active
                  </p>
                  <p className="text-ink-muted leading-relaxed">
                    You are currently signed in with a Practitioner account. To test
                    the patient reservation workflow, switch to a patient account using
                    the Demo Switchboard at top right.
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 bg-ivory-light border border-warm-border rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-xs text-ink font-semibold">
                  <Lock className="w-4 h-4 text-forest" />
                  <span>Sign in required to confirm appointment</span>
                </div>
                <p className="text-xs text-ink-muted">
                  Please sign in or use a 1-click evaluation demo patient to book
                  this consultation.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/auth/sign-in?redirect=/doctors/${doctor.doctor_id}`}
                    className="btn-forest text-xs px-4 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href={`/auth/register-patient?redirect=/doctors/${doctor.doctor_id}`}
                    className="btn-ivory text-xs px-4 py-2"
                  >
                    Register Patient
                  </Link>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="px-6 py-3.5 bg-ivory-light border-t border-warm-border flex items-center gap-2 text-xs text-ink-muted">
        <ShieldCheck className="w-4 h-4 text-forest" />
        <span>
          Instant atomic slot locking guarantees zero double bookings or schedule collisions.
        </span>
      </div>

      {/* Online Payment Modal */}
      {paymentAppointmentId && (
        <PaymentCheckoutModal
          appointmentId={paymentAppointmentId}
          doctorName={doctor.user?.full_name || "Specialist"}
          consultationFee={doctor.consultation_fee}
          isOpen={Boolean(paymentAppointmentId)}
          onClose={() => {
            const aptId = paymentAppointmentId;
            setPaymentAppointmentId(null);
            router.push(
              `/booking-confirmation?id=${aptId}&doctor=${encodeURIComponent(
                doctor.user?.full_name || "Doctor"
              )}`
            );
          }}
          onSuccess={() => {
            const aptId = paymentAppointmentId;
            setPaymentAppointmentId(null);
            router.push(
              `/booking-confirmation?id=${aptId}&doctor=${encodeURIComponent(
                doctor.user?.full_name || "Doctor"
              )}&paid=true`
            );
          }}
        />
      )}
    </div>
  );
}
