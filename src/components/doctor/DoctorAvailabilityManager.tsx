"use client";

import React, { useState } from "react";
import { Doctor, Availability } from "@/types/database";
import {
  addDoctorAvailabilityAction,
  deleteDoctorAvailabilityAction,
  updateDoctorSchedulingPolicyAction,
} from "@/app/actions/doctor.actions";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Activity,
  Users,
} from "lucide-react";

interface Props {
  initialAvailabilities: Availability[];
  doctor?: Doctor | null;
}

export function DoctorAvailabilityManager({
  initialAvailabilities,
  doctor,
}: Props) {
  const [slots, setSlots] = useState<Availability[]>(initialAvailabilities);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Policy state
  const [schedulingMode, setSchedulingMode] = useState<"stream" | "wave">(
    doctor?.scheduling_mode || "stream"
  );
  const [waveCapacity, setWaveCapacity] = useState<number>(
    doctor?.wave_capacity || 3
  );
  const [isWaveSlot, setIsWaveSlot] = useState<boolean>(
    doctor?.scheduling_mode === "wave"
  );
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  const handlePolicyChange = async (mode: "stream" | "wave") => {
    setIsUpdatingPolicy(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await updateDoctorSchedulingPolicyAction(
      mode,
      mode === "wave" ? waveCapacity : undefined
    );
    if (res.success) {
      setSchedulingMode(mode);
      setIsWaveSlot(mode === "wave");
      setSuccessMessage(res.message || "Scheduling policy updated.");
    } else {
      setErrorMessage(res.error || "Failed to switch scheduling policy.");
    }
    setIsUpdatingPolicy(false);
  };

  // Group slots by date
  const groupedSlots = slots.reduce<Record<string, Availability[]>>(
    (acc, slot) => {
      acc[slot.available_date] = acc[slot.available_date] || [];
      acc[slot.available_date].push(slot);
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(groupedSlots).sort();

  const handleAddSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await addDoctorAvailabilityAction(null, formData);

    if (res.success) {
      setSuccessMessage("Consultation slot registered to clinic registry.");
      (e.target as HTMLFormElement).reset();
      window.location.reload();
    } else {
      setErrorMessage(res.error || "Failed to add slot.");
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm("Are you sure you want to remove this availability slot?")) {
      return;
    }

    setDeletingId(slotId);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await deleteDoctorAvailabilityAction(slotId);
    if (res.success) {
      setSlots((prev) => prev.filter((s) => s.availability_id !== slotId));
      setSuccessMessage("Slot removed from active schedule.");
    } else {
      setErrorMessage(res.error || "Failed to delete slot.");
    }
    setDeletingId(null);
  };

  // Get tomorrow date string for min date in picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      {/* Practice Scheduling Policy Config Card */}
      <div className="clinic-card p-6 sm:p-7 space-y-4 border-l-4 border-l-forest">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-forest uppercase tracking-wider mb-1">
              <Activity className="w-3.5 h-3.5 text-forest" />
              <span>Practice Scheduling Policy</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-ink">
              {schedulingMode === "wave" ? "Wave Scheduling Active" : "Stream Scheduling Active"}
            </h3>
            <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {schedulingMode === "wave"
                ? "Wave scheduling groups patients into designated arrival cohorts (e.g. 3 patients per 60m window). Patients arrive at the cohort start and are seen in triage order, protecting the practice against no-shows."
                : "Stream scheduling assigns individual sequential appointment intervals (e.g. 15-30m per patient). Ideal for scheduled consultations with predictable appointment lengths."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={isUpdatingPolicy}
              onClick={() => handlePolicyChange("stream")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                schedulingMode === "stream"
                  ? "bg-forest text-ivory shadow-xs"
                  : "bg-ivory border border-warm-border text-ink hover:bg-warm-border/30"
              }`}
            >
              Stream (Sequential)
            </button>

            <button
              type="button"
              disabled={isUpdatingPolicy}
              onClick={() => handlePolicyChange("wave")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                schedulingMode === "wave"
                  ? "bg-forest text-ivory shadow-xs"
                  : "bg-ivory border border-warm-border text-ink hover:bg-warm-border/30"
              }`}
            >
              Wave (Cohorts)
            </button>
          </div>
        </div>

        {schedulingMode === "wave" && (
          <div className="pt-3 border-t border-warm-border flex flex-wrap items-center gap-4 text-xs">
            <span className="font-medium text-ink flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-forest" />
              <span>Target Patients Per Wave:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={async () => {
                    setWaveCapacity(cap);
                    await updateDoctorSchedulingPolicyAction("wave", cap);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                    waveCapacity === cap
                      ? "bg-forest text-ivory"
                      : "bg-ivory border border-warm-border text-ink hover:bg-warm-border/30"
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-ink-muted">
              (New wave slots will allow up to {waveCapacity} patients per window)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form: Add Slot */}
        <div className="lg:col-span-5 clinic-card p-6 sm:p-7 space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-forest block mb-1">
              Clinic Schedule Engine
            </span>
            <h2 className="font-serif text-2xl font-normal text-ink">
              Define Availability
            </h2>
            <p className="text-xs text-muted-text mt-1">
              Specify consulting dates and operating windows open for patient booking.
            </p>
          </div>

          {successMessage && (
            <div className="p-3 bg-sage/40 border border-forest/20 rounded-xl flex items-center gap-2 text-xs text-forest">
              <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-terracotta/20 border border-terracotta/40 rounded-xl flex items-center gap-2 text-xs text-ink">
              <AlertCircle className="w-4 h-4 text-ink shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-ink block mb-1.5">
                Consultation Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  name="available_date"
                  required
                  min={minDate}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-border focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
                />
              </div>
              <span className="text-[10px] text-muted-text mt-1 block">
                Historical dates are automatically disabled.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Start Time *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    name="start_time"
                    required
                    defaultValue="09:00"
                    className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-warm-border focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  End Time *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    name="end_time"
                    required
                    defaultValue="09:30"
                    className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-warm-border focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
                  />
                </div>
              </div>
            </div>

            {/* Wave Scheduling Option */}
            <div className="p-3.5 rounded-xl bg-sage/20 border border-warm-border space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_wave"
                  value="true"
                  checked={isWaveSlot}
                  onChange={(e) => setIsWaveSlot(e.target.checked)}
                  className="rounded border-warm-border text-forest focus:ring-forest"
                />
                <span className="font-semibold text-ink text-xs">
                  Configure as Wave Arrival Window
                </span>
              </label>

              {isWaveSlot ? (
                <div className="pt-2 flex items-center justify-between text-xs border-t border-warm-border/40">
                  <span className="text-ink-muted">Wave Patient Capacity:</span>
                  <select
                    name="wave_capacity"
                    defaultValue={waveCapacity}
                    className="px-2.5 py-1 rounded-lg border border-warm-border bg-ivory text-xs font-semibold text-forest"
                  >
                    <option value="2">2 Patients / wave</option>
                    <option value="3">3 Patients / wave</option>
                    <option value="4">4 Patients / wave</option>
                    <option value="5">5 Patients / wave</option>
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-ink-muted">
                  Standard stream slot: Single patient per time block.
                </p>
              )}
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1.5">
                Consultation Duration
              </label>
              <select
                name="slot_duration"
                defaultValue="30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
              >
                <option value="15">15 minutes (Express review)</option>
                <option value="30">30 minutes (Standard consultation)</option>
                <option value="45">45 minutes (Comprehensive examination)</option>
                <option value="60">60 minutes (Specialist procedure)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing to Roster...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Publish Slot</span>
                </>
              )}
            </button>
          </form>
        </div>

      {/* List: Existing Slots */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-warm-border">
          <div>
            <h3 className="font-serif text-xl font-normal text-ink">
              Configured Consult Windows
            </h3>
            <p className="text-xs text-muted-text">
              {slots.length} configured intervals across {sortedDates.length} operating days
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/40 border border-warm-border text-[11px] font-medium text-forest">
            <Layers className="w-3.5 h-3.5" />
            <span>Active Roster</span>
          </div>
        </div>

        {sortedDates.length > 0 ? (
          <div className="space-y-5">
            {sortedDates.map((dateStr) => {
              const dateSlots = groupedSlots[dateStr].sort((a, b) =>
                a.start_time.localeCompare(b.start_time)
              );
              const formattedDate = new Date(
                dateStr + "T00:00:00"
              ).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={dateStr}
                  className="clinic-card p-5 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-forest" />
                      <span className="font-serif text-sm font-medium text-ink">
                        {formattedDate}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-text">
                      {dateSlots.length} {dateSlots.length === 1 ? "slot" : "slots"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {dateSlots.map((slot) => {
                      const isAvailable = slot.is_available;
                      const isDeleting = deletingId === slot.availability_id;

                      return (
                        <div
                          key={slot.availability_id}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                            isAvailable
                              ? "bg-ivory border-warm-border hover:border-forest/40"
                              : "bg-sage/20 border-forest/20"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-ink font-mono text-[11px] flex items-center gap-1.5">
                              <span>
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                              </span>
                              {slot.is_wave && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sage/60 text-forest font-sans font-bold uppercase">
                                  Wave
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-medium block ${
                                isAvailable
                                  ? "text-muted-text"
                                  : "text-forest font-semibold"
                              }`}
                            >
                              {slot.is_wave
                                ? `${slot.wave_booked_count || 0}/${slot.wave_capacity || 3} booked (${isAvailable ? "Open" : "Full"})`
                                : isAvailable
                                ? "Open for booking"
                                : "Reserved"}
                            </span>
                          </div>

                          {isAvailable && (
                            <button
                              onClick={() =>
                                handleDeleteSlot(slot.availability_id)
                              }
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-muted-text hover:text-ink hover:bg-terracotta/20 transition-colors"
                              title="Delete Slot"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="clinic-card p-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-muted-text/50 mx-auto" />
            <h4 className="font-serif text-base font-medium text-ink">
              No Availability Configured
            </h4>
            <p className="text-xs text-muted-text max-w-sm mx-auto leading-relaxed">
              You haven&apos;t defined any consultation time slots yet. Use the calendar engine
              on the left to publish your first available dates to the clinic registry.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
