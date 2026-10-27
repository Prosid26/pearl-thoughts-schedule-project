"use client";

import React, { useState } from "react";
import { Appointment } from "@/types/database";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { cancelAppointmentAction } from "@/app/actions/appointment.actions";
import {
  Calendar,
  Stethoscope,
  MapPin,
  XCircle,
  Loader2,
} from "lucide-react";

interface Props {
  initialAppointments: Appointment[];
}

export function PatientAppointmentsList({ initialAppointments }: Props) {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<
    "all" | "upcoming" | "completed" | "cancelled"
  >("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleCancel = async (appointmentId: number) => {
    if (
      !confirm(
        "Are you sure you want to cancel this appointment? Your reserved time slot will be released back to the clinic schedule."
      )
    ) {
      return;
    }

    setCancellingId(appointmentId);
    const res = await cancelAppointmentAction(appointmentId);
    if (res.success) {
      setAppointments((prev) =>
        prev.map((app) =>
          app.appointment_id === appointmentId
            ? { ...app, status: "cancelled" }
            : app
        )
      );
    } else {
      alert(res.error || "Failed to cancel appointment.");
    }
    setCancellingId(null);
  };

  const filtered = appointments.filter((app) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming")
      return app.status === "pending" || app.status === "confirmed";
    if (activeTab === "completed") return app.status === "completed";
    if (activeTab === "cancelled")
      return app.status === "cancelled" || app.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === "all"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({appointments.length})
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === "upcoming"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Upcoming (
          {
            appointments.filter(
              (a) => a.status === "pending" || a.status === "confirmed"
            ).length
          }
          )
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === "completed"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Completed (
          {appointments.filter((a) => a.status === "completed").length})
        </button>

        <button
          onClick={() => setActiveTab("cancelled")}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeTab === "cancelled"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Cancelled / Declined (
          {
            appointments.filter(
              (a) => a.status === "cancelled" || a.status === "rejected"
            ).length
          }
          )
        </button>
      </div>

      {/* Appointment Cards */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((app) => {
            const isCancellable =
              app.status === "pending" || app.status === "confirmed";
            const dateStr = new Date(app.appointment_date).toLocaleDateString(
              "en-US",
              {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              }
            );

            return (
              <div
                key={app.appointment_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {app.doctor?.user?.full_name || "Doctor"}
                      </div>
                      <div className="text-xs text-teal-700 font-medium">
                        {app.doctor?.specialization} •{" "}
                        {app.doctor?.qualification}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono font-semibold text-slate-400">
                      #APT-{String(app.appointment_id).padStart(5, "0")}
                    </span>
                    <AppointmentStatusBadge status={app.status} />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      {dateStr} @ {app.availability?.start_time.slice(0, 5)} -{" "}
                      {app.availability?.end_time.slice(0, 5)}
                    </span>
                  </div>

                  {app.doctor?.clinic_address && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{app.doctor.clinic_address}</span>
                    </div>
                  )}
                </div>

                {/* Visit Reason */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Reason for visit
                  </span>
                  <p>{app.reason}</p>
                </div>

                {/* Actions */}
                {isCancellable && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleCancel(app.appointment_id)}
                      disabled={cancellingId === app.appointment_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      {cancellingId === app.appointment_id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cancelling Booking...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Appointment</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No Appointments Found
          </h3>
          <p className="text-xs text-slate-500">
            There are no appointments matching this status filter.
          </p>
        </div>
      )}
    </div>
  );
}
