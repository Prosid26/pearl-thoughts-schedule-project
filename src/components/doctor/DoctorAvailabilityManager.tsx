"use client";

import React, { useState, useMemo } from "react";
import { Doctor, Availability } from "@/types/database";
import {
  createDoctorScheduleAction,
  deleteDoctorAvailabilityAction,
  updateDoctorSchedulingPolicyAction,
  blockDoctorAvailabilityAction,
  unblockDoctorAvailabilityAction,
  modifyDoctorAvailabilityWindowElasticAction,
  previewDoctorScheduleElasticAction,
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
  Ban,
  Unlock,
  ShieldAlert,
  Sliders,
  AlertTriangle,
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
  const [isOverride, setIsOverride] = useState(false);

  // Schedule Blocking state
  const [blockDate, setBlockDate] = useState<string>(minDate);
  const [blockReason, setBlockReason] = useState<string>("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [unblockingDate, setUnblockingDate] = useState<string | null>(null);

  // Elastic Window Editing State
  const [editingWindow, setEditingWindow] = useState<Availability | null>(null);
  const [editStartTime, setEditStartTime] = useState<string>("09:00");
  const [editEndTime, setEditEndTime] = useState<string>("17:00");
  const [editDuration, setEditDuration] = useState<number>(30);
  const [editCapacity, setEditCapacity] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editPreviewLoading, setEditPreviewLoading] = useState(false);
  const [editPreviewData, setEditPreviewData] = useState<{
    addedSlots: Array<{ date: string; time: string }>;
    removedSlots: Array<{ date: string; time: string }>;
    preservedSlotsCount: number;
    conflictingAppointments: Array<{
      appointmentId: number;
      patientName: string;
      patientPhone?: string;
      date: string;
      time: string;
      reason: string;
      status: string;
    }>;
    hasConflicts: boolean;
  } | null>(null);

  const fetchEditPreview = async (
    availId: number,
    start: string,
    end: string,
    dur: number,
    cap: number,
    isWave: boolean
  ) => {
    if (start >= end) {
      setEditPreviewData(null);
      return;
    }
    setEditPreviewLoading(true);
    const res = await previewDoctorScheduleElasticAction({
      availabilityId: availId,
      newStartTime: start,
      newEndTime: end,
      slotDuration: dur,
      capacity: cap,
      isWave,
    });
    setEditPreviewLoading(false);
    if (res.success && res.data) {
      setEditPreviewData(res.data);
    }
  };

  const handleStartEditWindow = (slot: Availability) => {
    setEditingWindow(slot);
    setEditStartTime(slot.start_time.slice(0, 5));
    setEditEndTime(slot.end_time.slice(0, 5));
    setEditDuration(slot.slot_duration);
    setEditCapacity(slot.wave_capacity || (slot.is_wave ? 3 : 1));
    setEditPreviewData(null);
    fetchEditPreview(
      slot.availability_id,
      slot.start_time.slice(0, 5),
      slot.end_time.slice(0, 5),
      slot.slot_duration,
      slot.wave_capacity || (slot.is_wave ? 3 : 1),
      Boolean(slot.is_wave)
    );
  };

  const handleSaveEditWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWindow) return;
    setIsSavingEdit(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("availability_id", String(editingWindow.availability_id));
    formData.append("new_start_time", editStartTime);
    formData.append("new_end_time", editEndTime);
    formData.append("slot_duration", String(editDuration));
    formData.append("capacity", String(editCapacity));

    const res = await modifyDoctorAvailabilityWindowElasticAction(null, formData);
    setIsSavingEdit(false);

    if (res.success) {
      setSuccessMessage(res.message || "Schedule window elastically updated.");
      setSlots((prev) =>
        prev.map((s) =>
          s.availability_id === editingWindow.availability_id
            ? {
                ...s,
                start_time: editStartTime,
                end_time: editEndTime,
                slot_duration: editDuration,
                wave_capacity: editCapacity,
              }
            : s
        )
      );
      setEditingWindow(null);
    } else {
      setErrorMessage(res.error || "Failed to update availability window.");
    }
  };

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBlocking(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("date", blockDate);
    if (blockReason) formData.append("reason", blockReason);

    const res = await blockDoctorAvailabilityAction(null, formData);
    setIsBlocking(false);
    if (res.success) {
      setSuccessMessage(res.message || `Date ${blockDate} successfully blocked.`);
      setSlots((prev) => {
        const dateSlots = prev.filter((s) => s.available_date === blockDate);
        if (dateSlots.length > 0) {
          return prev.map((s) =>
            s.available_date === blockDate
              ? { ...s, is_blocked: true, is_available: false, block_reason: blockReason || "Doctor unavailable / Leave" }
              : s
          );
        } else {
          return [
            ...prev,
            {
              availability_id: Date.now(),
              doctor_id: doctor?.doctor_id || 1,
              available_date: blockDate,
              start_time: "09:00",
              end_time: "17:00",
              slot_duration: 30,
              is_available: false,
              is_wave: false,
              wave_capacity: 0,
              wave_booked_count: 0,
              is_blocked: true,
              block_reason: blockReason || "Doctor unavailable / Leave",
            },
          ];
        }
      });
      setBlockReason("");
    } else {
      setErrorMessage(res.error || "Failed to block schedule date.");
    }
  };

  const handleUnblockDate = async (dateToUnblock: string) => {
    setUnblockingDate(dateToUnblock);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await unblockDoctorAvailabilityAction(dateToUnblock);
    setUnblockingDate(null);
    if (res.success) {
      setSuccessMessage(res.message || `Date ${dateToUnblock} successfully unblocked.`);
      setSlots((prev) =>
        prev
          .filter((s) => !(s.available_date === dateToUnblock && s.wave_capacity === 0 && s.is_blocked))
          .map((s) =>
            s.available_date === dateToUnblock
              ? { ...s, is_blocked: false, block_reason: null, is_available: true }
              : s
          )
      );
    } else {
      setErrorMessage(res.error || "Failed to unblock schedule date.");
    }
  };

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

  // Group slots by date (display top-level parent windows with nested subslots)
  const groupedSlots = useMemo(() => {
    const topLevel = slots.filter((s) => !s.parent_availability_id);
    const childSubslots = slots.filter((s) => Boolean(s.parent_availability_id));

    return topLevel.reduce<Record<string, Availability[]>>((acc, slot) => {
      acc[slot.available_date] = acc[slot.available_date] || [];

      if (slot.is_wave) {
        const subslots =
          slot.subslots && slot.subslots.length > 0
            ? slot.subslots
            : childSubslots.filter(
                (c) => c.parent_availability_id === slot.availability_id
              );
        acc[slot.available_date].push({
          ...slot,
          subslots,
        });
      } else {
        acc[slot.available_date].push(slot);
      }
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
    formData.append("is_override", isOverride.toString());

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

            {/* Override Option */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                  className="mt-0.5 rounded border-warm-border text-forest focus:ring-forest cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-xs text-ink block">
                    Override existing schedule for selected date(s)
                  </span>
                  <span className="text-[10px] text-ink-muted block mt-0.5 leading-relaxed">
                    Safely replaces unbooked availability windows on these dates. Existing booked appointments are strictly preserved.
                  </span>
                </div>
              </label>
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

          {/* Schedule Blocking & Leave Manager */}
          <div className="pt-5 border-t border-warm-border space-y-3.5">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-terracotta" />
              <div>
                <h4 className="font-serif text-base font-medium text-ink">
                  Schedule Blocking & Leave
                </h4>
                <p className="text-[11px] text-muted-text">
                  Block dates to mark as unavailable and prevent bookings.
                </p>
              </div>
            </div>

            <form onSubmit={handleBlockDate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">
                  Date to Block *
                </label>
                <input
                  type="date"
                  min={minDate}
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border focus:outline-none focus:border-terracotta bg-ivory text-ink"
                />
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  Reason for Unavailability (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Medical Leave, Conference"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border focus:outline-none focus:border-terracotta bg-ivory text-ink"
                />
              </div>

              <button
                type="submit"
                disabled={isBlocking}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-terracotta hover:bg-terracotta/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBlocking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Blocking Date...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Block Schedule Date</span>
                  </>
                )}
              </button>
            </form>
          </div>
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

              const isDateBlocked = dateSlots.some((s) => s.is_blocked);
              const blockReasonText = dateSlots.find((s) => s.is_blocked)?.block_reason;

              return (
                <div
                  key={dateStr}
                  className={`clinic-card p-5 space-y-3.5 ${
                    isDateBlocked ? "border-l-4 border-l-terracotta bg-terracotta/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-forest" />
                      <span className="font-serif text-sm font-medium text-ink">
                        {formattedDate}
                      </span>
                      {isDateBlocked && (
                        <span className="px-2 py-0.5 rounded-full bg-terracotta text-white font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          <span>Blocked</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isDateBlocked ? (
                        <button
                          type="button"
                          onClick={() => handleUnblockDate(dateStr)}
                          disabled={unblockingDate === dateStr}
                          className="px-2.5 py-1 rounded-lg bg-ivory border border-terracotta/40 text-terracotta hover:bg-terracotta hover:text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {unblockingDate === dateStr ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                          <span>Unblock Date</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-muted-text">
                          {dateSlots.length} {dateSlots.length === 1 ? "slot" : "slots"}
                        </span>
                      )}
                    </div>
                  </div>

                  {isDateBlocked && (
                    <div className="p-3 bg-terracotta/15 border border-terracotta/30 rounded-xl flex items-center gap-2 text-xs text-ink">
                      <ShieldAlert className="w-4 h-4 text-terracotta shrink-0" />
                      <div>
                        <span className="font-semibold text-terracotta">Blocked Schedule: </span>
                        <span>{blockReasonText || "Doctor Unavailable / On Leave"}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {dateSlots.map((slot) => {
                      const isDeleting = deletingId === slot.availability_id;

                      if (slot.is_wave) {
                        const subslots = slot.subslots || [];
                        return (
                          <div
                            key={slot.availability_id}
                            className="p-4 rounded-xl border border-warm-border bg-ivory space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest text-ivory font-bold uppercase tracking-wider">
                                  Wave Parent Window
                                </span>
                                <span className="font-semibold text-ink font-mono text-sm">
                                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                </span>
                                <span className="text-xs text-ink-muted">
                                  ({subslots.length} waves • {slot.wave_capacity || 3} patients/wave)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="text-xs font-semibold text-forest font-mono">
                                  {slot.wave_booked_count || 0} Total Booked
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditWindow(slot)}
                                  className="p-1.5 rounded-lg text-forest hover:bg-forest/15 transition-colors cursor-pointer"
                                  title="Elastically edit window hours (shrink or expand)"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.availability_id)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg text-muted-text hover:text-ink hover:bg-terracotta/20 transition-colors cursor-pointer"
                                  title="Delete entire Wave window and subslots"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Nested Subslots */}
                            {subslots.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-warm-border/60">
                                {subslots.map((sub, sIdx) => (
                                  <div
                                    key={sub.availability_id || sIdx}
                                    className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                                      sub.is_available
                                        ? "bg-white border-warm-border"
                                        : "bg-sage/20 border-forest/20"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between font-mono font-semibold text-[11px]">
                                      <span>
                                        {sub.start_time.slice(0, 5)} – {sub.end_time.slice(0, 5)}
                                      </span>
                                      <span className="text-[9px] px-1 py-0.2 bg-sage/60 text-forest rounded font-sans font-bold">
                                        Wave {sIdx + 1}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-muted-text">
                                        Cap: {sub.wave_capacity || 3}
                                      </span>
                                      <span
                                        className={
                                          sub.is_available
                                            ? "text-forest font-semibold"
                                            : "text-terracotta font-bold"
                                        }
                                      >
                                        {sub.wave_booked_count || 0}/{sub.wave_capacity || 3} ({sub.is_available ? "Open" : "Full"})
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      }

                      // Stream Continuous Window
                      const dynamicSlots = generateTimeSlots(
                        slot.start_time,
                        slot.end_time,
                        slot.slot_duration
                      );
                      return (
                        <div
                          key={slot.availability_id}
                          className="p-4 rounded-xl border border-warm-border bg-ivory space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest/15 text-forest font-bold uppercase tracking-wider">
                                Continuous Stream Window
                              </span>
                              <span className="font-semibold text-ink font-mono text-sm">
                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                              </span>
                              <span className="text-xs text-ink-muted">
                                ({slot.slot_duration}m intervals • {dynamicSlots.length} dynamic slots)
                              </span>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className="text-xs font-semibold text-forest font-mono">
                                {slot.wave_booked_count || 0} Booked
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditWindow(slot)}
                                className="p-1.5 rounded-lg text-forest hover:bg-forest/15 transition-colors cursor-pointer"
                                title="Elastically edit window hours (shrink or expand)"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.availability_id)}
                                disabled={isDeleting}
                                className="p-1.5 rounded-lg text-muted-text hover:text-ink hover:bg-terracotta/20 transition-colors cursor-pointer"
                                title="Delete Stream Window"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Slot Intervals Display */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 pt-2 border-t border-warm-border/60">
                            {dynamicSlots.map((ds, dsIdx) => (
                              <div
                                key={dsIdx}
                                className="p-1.5 rounded bg-white border border-warm-border text-center text-[11px] font-mono text-ink"
                              >
                                {ds.startTime}–{ds.endTime}
                              </div>
                            ))}
                          </div>
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

    {/* Elastic Schedule Window Modification Modal */}
    {editingWindow && (
      <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-ivory border border-warm-border rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 my-8">
          <div className="flex items-center justify-between pb-3 border-b border-warm-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-ink">
                  Modify Working Hours (Elastic)
                </h3>
                <p className="text-xs text-muted-text">
                  {formatISTDate(editingWindow.available_date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  • Current:{" "}
                  <span className="font-mono font-semibold text-ink">
                    {editingWindow.start_time.slice(0, 5)}–{editingWindow.end_time.slice(0, 5)}
                  </span>{" "}
                  ({editingWindow.is_wave ? "Wave Cohort" : "Stream"})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingWindow(null)}
              className="p-1 rounded-lg text-muted-text hover:text-ink hover:bg-warm-border transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveEditWindow} className="space-y-4 text-xs">
            {/* Start & End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1">
                  New Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={editStartTime}
                  onChange={(e) => {
                    setEditStartTime(e.target.value);
                    fetchEditPreview(
                      editingWindow.availability_id,
                      e.target.value,
                      editEndTime,
                      editDuration,
                      editCapacity,
                      Boolean(editingWindow.is_wave)
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-white text-ink font-mono focus:outline-none focus:border-forest"
                />
              </div>
              <div>
                <label className="font-semibold text-ink block mb-1">
                  New End Time *
                </label>
                <input
                  type="time"
                  required
                  value={editEndTime}
                  onChange={(e) => {
                    setEditEndTime(e.target.value);
                    fetchEditPreview(
                      editingWindow.availability_id,
                      editStartTime,
                      e.target.value,
                      editDuration,
                      editCapacity,
                      Boolean(editingWindow.is_wave)
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-white text-ink font-mono focus:outline-none focus:border-forest"
                />
              </div>
            </div>

            {/* Slot Duration & Wave Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1">
                  Slot Duration
                </label>
                <select
                  value={editDuration}
                  onChange={(e) => {
                    const dur = Number(e.target.value);
                    setEditDuration(dur);
                    fetchEditPreview(
                      editingWindow.availability_id,
                      editStartTime,
                      editEndTime,
                      dur,
                      editCapacity,
                      Boolean(editingWindow.is_wave)
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-white text-ink focus:outline-none focus:border-forest"
                >
                  <option value={15}>15 mins (Express)</option>
                  <option value={30}>30 mins (Standard)</option>
                  <option value={45}>45 mins (Comprehensive)</option>
                  <option value={60}>60 mins (Extended / Wave)</option>
                </select>
              </div>
              {editingWindow.is_wave && (
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    Patients Per Wave
                  </label>
                  <select
                    value={editCapacity}
                    onChange={(e) => {
                      const cap = Number(e.target.value);
                      setEditCapacity(cap);
                      fetchEditPreview(
                        editingWindow.availability_id,
                        editStartTime,
                        editEndTime,
                        editDuration,
                        cap,
                        true
                      );
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-warm-border bg-white text-ink focus:outline-none focus:border-forest font-semibold text-forest"
                  >
                    <option value={1}>1 patient / wave</option>
                    <option value={2}>2 patients / wave</option>
                    <option value={3}>3 patients / wave (Standard)</option>
                    <option value={4}>4 patients / wave</option>
                    <option value={5}>5 patients / wave</option>
                  </select>
                </div>
              )}
            </div>

            {/* Live Preview of Added & Removed Slots */}
            <div className="p-3.5 bg-forest/5 border border-forest/20 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-forest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Schedule Elastic Diff Preview</span>
                </span>
                {editPreviewLoading && (
                  <span className="text-[10px] text-muted-text flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                  </span>
                )}
              </div>

              {editPreviewData && (
                <div className="space-y-2">
                  {/* Added Slots */}
                  {editPreviewData.addedSlots.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-forest block mb-1">
                        + Newly Expanded Slots ({editPreviewData.addedSlots.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {editPreviewData.addedSlots.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-forest/15 text-forest font-mono text-[10px] font-semibold"
                          >
                            + {s.time}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Removed Unbooked Slots */}
                  {editPreviewData.removedSlots.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-terracotta block mb-1">
                        - Shrunk / Removed Unbooked Slots ({editPreviewData.removedSlots.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {editPreviewData.removedSlots.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-terracotta/15 text-terracotta font-mono text-[10px] font-semibold"
                          >
                            - {s.time}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {editPreviewData.addedSlots.length === 0 &&
                    editPreviewData.removedSlots.length === 0 && (
                      <p className="text-[11px] text-ink-muted italic">
                        No slot changes detected for this time range.
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Warning for Conflicting Booked Appointments Outside New Window */}
            {editPreviewData?.hasConflicts && (
              <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Attention: {editPreviewData.conflictingAppointments.length} existing booked appointment(s) fall outside your new hours!
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Medrella strictly preserves all existing bookings. These appointments will <strong>NOT</strong> be cancelled, deleted, or rescheduled automatically. They will be flagged in your Consultation Roster as requiring doctor review.
                </p>
                <div className="space-y-1.5 pt-1">
                  {editPreviewData.conflictingAppointments.map((app) => (
                    <div
                      key={app.appointmentId}
                      className="p-2 rounded bg-white/70 border border-amber-500/25 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-semibold text-ink">{app.patientName}</span>
                        <span className="text-muted-text ml-1">({app.reason})</span>
                      </div>
                      <span className="font-mono font-bold text-amber-800">
                        {app.time} IST
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-warm-border">
              <button
                type="button"
                onClick={() => setEditingWindow(null)}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl border border-warm-border text-ink hover:bg-warm-border/50 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit || editStartTime >= editEndTime}
                className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-ivory font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Apply Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
  );
}
