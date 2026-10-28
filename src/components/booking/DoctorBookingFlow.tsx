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

  const slotsForDate = availabilities.filter(
    (a) => a.available_date === selectedDate
  );

  const selectedSlot = availabilities.find(
    (a) => a.availability_id === selectedSlotId
  );

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setErrorMessage("Please select a time slot.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage(
        "Please provide a reason for the consultation (min 5 characters)."
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
        router.push(
          `/booking-confirmation?id=${res.data.appointmentId}&doctor=${encodeURIComponent(
            doctor.user?.full_name || "Doctor"
          )}`
        );
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-teal-800 to-teal-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-teal-200">
              Online Appointment Schedule
            </span>
            <h2 className="text-xl font-bold mt-0.5">Select Date & Time Slot</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-teal-200 block">Consultation Fee</span>
            <span className="text-2xl font-extrabold text-white">
              {formatINR(doctor.consultation_fee)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Select Date */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            1. Select Consultation Date
          </label>

          {dates.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No active availability slots configured yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Please check back later or view other doctors in our directory.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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
                    className={`flex-shrink-0 px-4 py-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`text-[11px] font-semibold uppercase ${
                        isSelected ? "text-teal-100" : "text-slate-400"
                      }`}
                    >
                      {dayName}
                    </div>
                    <div className="text-sm font-bold mt-0.5">{dayNum}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Time Slots */}
        {selectedDate && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              2. Available Time Slots for {selectedDate}
            </label>

            {slotsForDate.length === 0 ? (
              <p className="text-xs text-slate-500">
                No slots open for this date.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {slotsForDate.map((slot) => {
                  const isSelected = selectedSlotId === slot.availability_id;
                  const isAvailable = slot.is_available;

                  return (
                    <button
                      key={slot.availability_id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedSlotId(slot.availability_id);
                        setErrorMessage(null);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                        !isAvailable
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-teal-700 border-teal-700 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm"
                          : "bg-white border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50/50"
                      }`}
                    >
                      <span>
                        {slot.start_time.slice(0, 5)} -{" "}
                        {slot.end_time.slice(0, 5)}
                      </span>
                      <span
                        className={`text-[10px] font-normal ${
                          !isAvailable
                            ? "text-slate-400"
                            : isSelected
                            ? "text-teal-100"
                            : "text-emerald-600"
                        }`}
                      >
                        {isAvailable ? "Available" : "Booked"}
                      </span>
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
            className="mt-6 pt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-200"
          >
            <div>
              <label
                htmlFor="reason"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
              >
                <HeartPulse className="w-4 h-4 text-teal-600" />
                3. Reason for Consultation & Symptoms *
              </label>
              <textarea
                id="reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Follow-up consultation for blood pressure management, mild dizziness, or annual cardiac screening."
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400"
              />
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Auth Gate vs Submit */}
            {session ? (
              session.role === "patient" ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-900">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-teal-600" />
                      <span>
                        Booking as: <strong>{session.full_name}</strong>
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-700">
                      Slot: {selectedSlot.available_date} @{" "}
                      {selectedSlot.start_time.slice(0, 5)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 transition-colors shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Securing Slot Atomically...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Confirm Appointment ({formatINR(doctor.consultation_fee)})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Doctor Account Active
                  </p>
                  <p>
                    You are currently signed in as a Doctor. To test the patient
                    booking experience, switch to a demo patient account using the
                    dropdown at top right.
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                  <Lock className="w-4 h-4 text-teal-600" />
                  <span>Sign in required to confirm appointment</span>
                </div>
                <p className="text-xs text-slate-500">
                  Please sign in or use a 1-click evaluation demo patient to book
                  this appointment.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/auth/sign-in?redirect=/doctors/${doctor.doctor_id}`}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href={`/auth/register-patient?redirect=/doctors/${doctor.doctor_id}`}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Register Patient
                  </Link>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>
          Instant atomic slot lock guarantees no double bookings or overlaps.
        </span>
      </div>
    </div>
  );
}
