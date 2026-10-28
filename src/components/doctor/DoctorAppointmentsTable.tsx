"use client";

import React, { useState } from "react";
import { Appointment, AppointmentStatus } from "@/types/database";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { DoctorAppointmentActions } from "./DoctorAppointmentActions";
import {
  Calendar,
  Phone,
  Search,
  Clock,
} from "lucide-react";
import { formatISTDate } from "@/lib/utils/date";

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
      <div className="clinic-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-forest text-ivory border border-forest"
                : "text-ink-muted hover:text-ink hover:bg-ivory-light"
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "pending"
                ? "bg-forest text-ivory border border-forest"
                : "text-ink-muted hover:text-ink hover:bg-ivory-light"
            }`}
          >
            Pending (
            {appointments.filter((a) => a.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("confirmed")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "confirmed"
                ? "bg-forest text-ivory border border-forest"
                : "text-ink-muted hover:text-ink hover:bg-ivory-light"
            }`}
          >
            Confirmed (
            {appointments.filter((a) => a.status === "confirmed").length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "completed"
                ? "bg-forest text-ivory border border-forest"
                : "text-ink-muted hover:text-ink hover:bg-ivory-light"
            }`}
          >
            Completed (
            {appointments.filter((a) => a.status === "completed").length})
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "cancelled"
                ? "bg-forest text-ivory border border-forest"
                : "text-ink-muted hover:text-ink hover:bg-ivory-light"
            }`}
          >
            Cancelled (
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
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient, phone, symptoms..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-warm-border text-xs bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest placeholder:text-ink-muted"
          />
        </div>
      </div>

      {/* Appointments Grid */}
      {filtered.length > 0 ? (
        <div className="space-y-3.5">
          {filtered.map((app) => {
            const dateStr = formatISTDate(app.appointment_date);

            return (
              <div
                key={app.appointment_id}
                className="clinic-card p-5 sm:p-6 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-sage-light text-forest border border-sage-dark/60 flex items-center justify-center font-serif font-bold text-sm shrink-0">
                      {app.patient?.user?.full_name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink flex items-center gap-2">
                        <span>
                          {app.patient?.user?.full_name || "Patient Record"}
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted font-normal">
                          #APT-{String(app.appointment_id).padStart(5, "0")}
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted flex items-center gap-3 mt-0.5 font-sans">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-forest" />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-warm-border-subtle text-xs">
                  <div className="flex items-center gap-2 text-ink font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                    <span>
                      {dateStr} @ {app.availability?.start_time.slice(0, 5)} –{" "}
                      {app.availability?.end_time.slice(0, 5)} IST
                    </span>
                  </div>

                  <div className="text-ink-muted truncate font-sans">
                    <strong className="text-ink font-semibold">Clinical Note:</strong> {app.reason}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="clinic-card p-12 text-center max-w-md mx-auto space-y-3">
          <Calendar className="w-8 h-8 text-ink-muted mx-auto" />
          <h3 className="font-serif text-lg font-bold text-ink">
            No consultations found
          </h3>
          <p className="text-xs text-ink-muted font-sans">
            There are no appointments matching the selected filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
