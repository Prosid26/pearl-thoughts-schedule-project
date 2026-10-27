"use client";

import React, { useState } from "react";
import { Appointment, AppointmentStatus } from "@/types/database";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { DoctorAppointmentActions } from "./DoctorAppointmentActions";
import {
  Calendar,
  Phone,
  Search,
} from "lucide-react";

interface Props {
  initialAppointments: Appointment[];
}

export function DoctorAppointmentsTable({ initialAppointments }: Props) {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  const handleStatusChange = (
    appointmentId: number,
    newStatus: AppointmentStatus
  ) => {
    setAppointments((prev) =>
      prev.map((app) =>
        app.appointment_id === appointmentId
          ? { ...app, status: newStatus }
          : app
      )
    );
  };

  const filtered = appointments.filter((app) => {
    if (activeTab === "pending" && app.status !== "pending") return false;
    if (activeTab === "confirmed" && app.status !== "confirmed") return false;
    if (activeTab === "completed" && app.status !== "completed") return false;
    if (
      activeTab === "cancelled" &&
      app.status !== "cancelled" &&
      app.status !== "rejected"
    )
      return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const pName = app.patient?.user?.full_name?.toLowerCase() || "";
      const pPhone = app.patient?.user?.phone?.toLowerCase() || "";
      const reason = app.reason.toLowerCase();
      if (!pName.includes(q) && !pPhone.includes(q) && !reason.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === "all"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === "pending"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending (
            {appointments.filter((a) => a.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("confirmed")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === "confirmed"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Confirmed (
            {appointments.filter((a) => a.status === "confirmed").length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
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
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
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

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient or symptoms..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Appointments Grid */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((app) => {
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
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {app.patient?.user?.full_name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>
                          {app.patient?.user?.full_name || "Patient Record"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          #APT-{String(app.appointment_id).padStart(5, "0")}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{app.patient?.user?.phone || "No phone"}</span>
                        </span>
                        <span>•</span>
                        <span>
                          {app.patient?.gender || "Gender unspecified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <AppointmentStatusBadge status={app.status} size="sm" />
                    <DoctorAppointmentActions
                      appointment={app}
                      onStatusUpdated={(newStatus) =>
                        handleStatusChange(app.appointment_id, newStatus)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      {dateStr} @ {app.availability?.start_time.slice(0, 5)} -{" "}
                      {app.availability?.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="text-slate-600 truncate">
                    <strong>Reason:</strong> {app.reason}
                  </div>
                </div>
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
            There are no appointments matching the selected filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
