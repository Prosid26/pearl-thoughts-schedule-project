"use client";

import React, { useState } from "react";
import { Availability } from "@/types/database";
import {
  addDoctorAvailabilityAction,
  deleteDoctorAvailabilityAction,
} from "@/app/actions/doctor.actions";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Props {
  initialAvailabilities: Availability[];
}

export function DoctorAvailabilityManager({ initialAvailabilities }: Props) {
  const [slots, setSlots] = useState<Availability[]>(initialAvailabilities);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setSuccessMessage("Time slot added successfully!");
      // Reset form
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
      setSuccessMessage("Slot removed successfully.");
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form: Add Slot */}
      <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 block mb-1">
            New Time Slot
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            Define Availability
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Set dates and operating intervals open for patient booking.
          </p>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Consultation Date *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                name="available_date"
                required
                min={minDate}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Past dates are automatically prohibited.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Start Time *
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  name="start_time"
                  required
                  defaultValue="09:00"
                  className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                End Time *
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  name="end_time"
                  required
                  defaultValue="09:30"
                  className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Slot Duration (Minutes)
            </label>
            <select
              name="slot_duration"
              defaultValue="30"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes (Standard)</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 transition-colors shadow-xs flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating & Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Time Slot</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* List: Existing Slots */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Active Availability Schedule
            </h3>
            <p className="text-xs text-slate-500">
              {slots.length} configured slots across {sortedDates.length} days
            </p>
          </div>
        </div>

        {sortedDates.length > 0 ? (
          <div className="space-y-6">
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
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-bold text-slate-900">
                        {formattedDate}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {dateSlots.length} slots
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
                              ? "bg-slate-50 border-slate-200 hover:border-teal-300"
                              : "bg-emerald-50/50 border-emerald-200"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              {slot.start_time.slice(0, 5)} -{" "}
                              {slot.end_time.slice(0, 5)}
                            </div>
                            <span
                              className={`text-[10px] font-semibold ${
                                isAvailable
                                  ? "text-slate-500"
                                  : "text-emerald-700"
                              }`}
                            >
                              {isAvailable ? "Open (Available)" : "Reserved"}
                            </span>
                          </div>

                          {isAvailable && (
                            <button
                              onClick={() =>
                                handleDeleteSlot(slot.availability_id)
                              }
                              disabled={isDeleting}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              No Availability Configured
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t defined any consultation time slots yet. Use the form
              on the left to publish your first available dates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
