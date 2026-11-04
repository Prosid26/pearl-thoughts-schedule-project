"use client";

import React, { useState, useMemo } from "react";
import { Doctor, Availability } from "@/types/database";
import {
  createDoctorScheduleAction,
  deleteDoctorAvailabilityAction,
  updateDoctorSchedulingPolicyAction,
} from "@/app/actions/doctor.actions";
import {
  generateTimeSlots,
  resolveTargetDates,
} from "@/lib/scheduling/slot-generator";
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
  Repeat,
  CalendarRange,
  X,
  Sparkles,
} from "lucide-react";
import {
  getTodayIST,
  addDaysIST,
  isSlotInPast,
  formatISTDate,
} from "@/lib/utils/date";

interface Props {
  initialAvailabilities: Availability[];
  doctor?: Doctor | null;
}

const WEEKDAY_NAMES = [
  { day: 1, label: "Mon", full: "Monday" },
  { day: 2, label: "Tue", full: "Tuesday" },
  { day: 3, label: "Wed", full: "Wednesday" },
  { day: 4, label: "Thu", full: "Thursday" },
  { day: 5, label: "Fri", full: "Friday" },
  { day: 6, label: "Sat", full: "Saturday" },
  { day: 0, label: "Sun", full: "Sunday" },
];

export function DoctorAvailabilityManager({
  initialAvailabilities,
  doctor,
}: Props) {
  const [slots, setSlots] = useState<Availability[]>(initialAvailabilities);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Practice Policy state
  const [schedulingMode, setSchedulingMode] = useState<"stream" | "wave">(
    doctor?.scheduling_mode || "stream"
  );
  const [waveCapacity, setWaveCapacity] = useState<number>(
    doctor?.wave_capacity || 3
  );
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  // Today in IST
  const minDate = getTodayIST();

  // Generator form state
  const [scheduleType, setScheduleType] = useState<
    "recurring_weekly" | "specific_dates"
  >("recurring_weekly");
  const [formMode, setFormMode] = useState<"stream" | "wave">(
    doctor?.scheduling_mode || "stream"
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([
    1, 2, 3, 4, 5, 6,
  ]);
  const [startDate, setStartDate] = useState<string>(minDate);
  const [endDate, setEndDate] = useState<string>(addDaysIST(minDate, 28));
  const [specificDates, setSpecificDates] = useState<string[]>([minDate]);
  const [newDateInput, setNewDateInput] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [capacity, setCapacity] = useState<number>(
    doctor?.scheduling_mode === "wave" ? doctor?.wave_capacity || 3 : 1
  );

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
      setFormMode(mode);
      setCapacity(mode === "wave" ? waveCapacity : 1);
      setSuccessMessage(res.message || "Scheduling policy updated.");
    } else {
      setErrorMessage(res.error || "Failed to switch scheduling policy.");
    }
    setIsUpdatingPolicy(false);
  };

  // Group slots by date
  const groupedSlots = useMemo(() => {
    return slots.reduce<Record<string, Availability[]>>((acc, slot) => {
      acc[slot.available_date] = acc[slot.available_date] || [];
      acc[slot.available_date].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedSlots).sort();
  }, [groupedSlots]);

  // Live preview calculation
  const { previewSlots, previewDates, previewError } = useMemo(() => {
    try {
      const generated = generateTimeSlots(startTime, endTime, slotDuration);
      const dates = resolveTargetDates({
        scheduleType,
        specificDates,
        startDate,
        endDate,
        weekdays: selectedWeekdays,
      });
      return {
        previewSlots: generated,
        previewDates: dates,
        previewError: null,
      };
    } catch (err: unknown) {
      return {
        previewSlots: [],
        previewDates: [],
        previewError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [
    startTime,
    endTime,
    slotDuration,
    scheduleType,
    specificDates,
    startDate,
    endDate,
    selectedWeekdays,
  ]);

  const totalSlotsCount = previewSlots.length * previewDates.length;

  // Weekday toggle handlers
  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const selectWeekdaysPreset = (preset: "all" | "weekdays" | "mon_sat") => {
    if (preset === "all") setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6]);
    else if (preset === "weekdays") setSelectedWeekdays([1, 2, 3, 4, 5]);
    else if (preset === "mon_sat") setSelectedWeekdays([1, 2, 3, 4, 5, 6]);
  };

  // Specific dates handlers
  const handleAddSpecificDate = () => {
    if (!newDateInput) return;
    if (newDateInput < minDate) {
      setErrorMessage("Cannot add dates in the past.");
      return;
    }
    if (!specificDates.includes(newDateInput)) {
      setSpecificDates((prev) => [...prev, newDateInput].sort());
    }
    setNewDateInput("");
    setErrorMessage(null);
  };

  const handleRemoveSpecificDate = (dateToRemove: string) => {
    setSpecificDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("schedule_type", scheduleType);
    formData.append("scheduling_mode", formMode);
    formData.append("start_time", startTime);
    formData.append("end_time", endTime);
    formData.append("slot_duration", slotDuration.toString());
    formData.append("capacity", capacity.toString());

    if (scheduleType === "recurring_weekly") {
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("weekdays", JSON.stringify(selectedWeekdays));
    } else {
      formData.append("specific_dates", JSON.stringify(specificDates));
    }

    const res = await createDoctorScheduleAction(null, formData);

    if (res.success) {
      setSuccessMessage(res.message || "Schedule generated successfully.");
      window.location.reload();
    } else {
      setErrorMessage(res.error || "Failed to generate schedule.");
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
              {schedulingMode === "wave"
                ? "Wave Scheduling Active"
                : "Stream Scheduling Active"}
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
              <span>Default Patients Per Wave:</span>
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
              (New wave slots will default to {waveCapacity} patients per window)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form: Define Availability with Recurrence & Batch Generator */}
        <div className="lg:col-span-5 clinic-card p-6 sm:p-7 space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-forest block mb-1">
              Clinic Schedule Engine
            </span>
            <h2 className="font-serif text-2xl font-normal text-ink">
              Define Availability
            </h2>
            <p className="text-xs text-muted-text mt-1">
              Configure recurring weekday schedules or specific calendar dates with automated slot generation.
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

          <form onSubmit={handleGenerateSchedule} className="space-y-4 text-xs">
            {/* 1. Schedule Type: Recurring vs Specific Dates */}
            <div>
              <label className="font-semibold text-ink block mb-1.5">
                Schedule Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType("recurring_weekly")}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    scheduleType === "recurring_weekly"
                      ? "bg-forest text-ivory border-forest shadow-xs"
                      : "bg-ivory border-warm-border text-ink hover:bg-warm-border/30"
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Recurring Weekly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("specific_dates")}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                    scheduleType === "specific_dates"
                      ? "bg-forest text-ivory border-forest shadow-xs"
                      : "bg-ivory border-warm-border text-ink hover:bg-warm-border/30"
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Specific Date(s)</span>
                </button>
              </div>
            </div>

            {/* 2. Schedule Mode: Wave vs Stream */}
            <div>
              <label className="font-semibold text-ink block mb-1.5">
                Slot Architecture *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("stream");
                    setCapacity(1);
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                    formMode === "stream"
                      ? "bg-forest/10 border-forest text-forest font-bold ring-1 ring-forest"
                      : "bg-ivory border-warm-border text-ink-muted hover:text-ink"
                  }`}
                >
                  Stream (Individual)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("wave");
                    setCapacity(waveCapacity || 3);
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                    formMode === "wave"
                      ? "bg-forest/10 border-forest text-forest font-bold ring-1 ring-forest"
                      : "bg-ivory border-warm-border text-ink-muted hover:text-ink"
                  }`}
                >
                  Wave (Cohort Windows)
                </button>
              </div>
            </div>

            {/* 3a. Recurring Weekly: Weekdays & Date Range */}
            {scheduleType === "recurring_weekly" ? (
              <div className="space-y-3.5 p-3.5 bg-sage/20 border border-warm-border rounded-xl">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-ink">
                      Active Weekdays *
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] text-forest">
                      <button
                        type="button"
                        onClick={() => selectWeekdaysPreset("weekdays")}
                        className="hover:underline cursor-pointer"
                      >
                        Mon–Fri
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => selectWeekdaysPreset("mon_sat")}
                        className="hover:underline cursor-pointer"
                      >
                        Mon–Sat
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => selectWeekdaysPreset("all")}
                        className="hover:underline cursor-pointer"
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_NAMES.map(({ day, label, full }) => {
                      const isSelected = selectedWeekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekday(day)}
                          title={full}
                          className={`py-2 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-forest text-ivory shadow-2xs"
                              : "bg-ivory border border-warm-border text-ink-muted hover:text-ink hover:bg-warm-border/30"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedWeekdays.length === 0 && (
                    <span className="text-[10px] text-terracotta mt-1 block">
                      Please select at least one weekday.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-ink block mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={minDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-warm-border bg-ivory text-ink text-xs focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-ink block mb-1">
                      Recurrence End Date *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || minDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-warm-border bg-ivory text-ink text-xs focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* 3b. Specific Date(s) Multi-Selector */
              <div className="space-y-3 p-3.5 bg-sage/20 border border-warm-border rounded-xl">
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    Add Calendar Date *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newDateInput}
                      min={minDate}
                      onChange={(e) => setNewDateInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-warm-border bg-ivory text-ink text-xs focus:outline-none focus:border-forest"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpecificDate}
                      className="px-3 py-1.5 bg-forest text-ivory rounded-lg font-semibold text-xs hover:bg-forest/90 transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Selected Dates Chips */}
                <div>
                  <span className="text-[11px] font-medium text-ink-muted block mb-1.5">
                    Target Dates ({specificDates.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {specificDates.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ivory border border-warm-border text-[11px] font-mono text-ink"
                      >
                        <span>{d}</span>
                        {specificDates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecificDate(d)}
                            className="text-muted-text hover:text-terracotta cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Operating Window: Start & End Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Start Time *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 rounded-xl border border-warm-border focus:outline-none focus:border-forest bg-ivory text-ink"
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
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 rounded-xl border border-warm-border focus:outline-none focus:border-forest bg-ivory text-ink"
                  />
                </div>
              </div>
            </div>

            {/* 5. Duration & Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Slot Duration
                </label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border focus:outline-none focus:border-forest bg-ivory text-ink text-xs"
                >
                  <option value={15}>15 mins (Express)</option>
                  <option value={30}>30 mins (Standard)</option>
                  <option value={45}>45 mins (Comprehensive)</option>
                  <option value={60}>60 mins (Extended / Wave)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  {formMode === "wave" ? "Patients Per Wave" : "Slot Capacity"}
                </label>
                <select
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border focus:outline-none focus:border-forest bg-ivory text-ink text-xs font-semibold text-forest"
                >
                  <option value={1}>1 patient {formMode === "stream" ? "(Standard 1:1)" : ""}</option>
                  <option value={2}>2 patients {formMode === "wave" ? "/ wave" : "/ slot"}</option>
                  <option value={3}>3 patients {formMode === "wave" ? "/ wave (Standard)" : "/ slot"}</option>
                  <option value={4}>4 patients {formMode === "wave" ? "/ wave" : "/ slot"}</option>
                  <option value={5}>5 patients {formMode === "wave" ? "/ wave" : "/ slot"}</option>
                </select>
              </div>
            </div>

            {/* 6. Real-Time Schedule Generation Live Preview */}
            <div className="p-3.5 rounded-xl bg-forest/5 border border-forest/20 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-forest text-xs">
                <Sparkles className="w-3.5 h-3.5 text-forest" />
                <span>Live Schedule Generator Preview</span>
              </div>

              {previewError ? (
                <p className="text-[11px] text-terracotta">{previewError}</p>
              ) : (
                <div className="space-y-1 text-[11px] text-ink">
                  <div className="flex justify-between">
                    <span className="text-muted-text">Operating hours:</span>
                    <span className="font-semibold font-mono">{startTime}–{endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-text">Duration:</span>
                    <span className="font-semibold">{slotDuration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-text">Generated slots per day:</span>
                    <span className="font-semibold text-forest font-mono">
                      {previewSlots.length} slots / day
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-text">Operating days selected:</span>
                    <span className="font-semibold font-mono">
                      {previewDates.length} day{previewDates.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-forest/15 font-semibold text-forest">
                    <span>Total slots to publish:</span>
                    <span className="font-mono font-bold text-xs">
                      {totalSlotsCount} slot{totalSlotsCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-muted italic pt-0.5">
                    Mode: {formMode === "wave" ? `Wave Cohort (${capacity} patients/window)` : `Stream (${capacity} patient${capacity > 1 ? "s" : ""}/slot)`}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || totalSlotsCount === 0 || Boolean(previewError)}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Roster...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    Publish Schedule ({totalSlotsCount} Slot{totalSlotsCount !== 1 ? "s" : ""})
                  </span>
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
              const formattedDate = formatISTDate(dateStr, {
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
                                : slot.wave_capacity && slot.wave_capacity > 1
                                ? `${slot.wave_booked_count || 0}/${slot.wave_capacity} booked (${isAvailable ? "Open" : "Full"})`
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
