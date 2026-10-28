"use client";

import React, { useState } from "react";
import { Appointment } from "@/types/database";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { cancelAppointmentAction } from "@/app/actions/appointment.actions";
import {
  Calendar,
  Clock,
  MapPin,
  XCircle,
  Loader2,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";

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
      <div className="flex items-center gap-2 border-b border-warm-border pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "all"
              ? "bg-forest text-ivory border border-forest"
              : "text-ink-muted hover:text-ink hover:bg-ivory-light border border-transparent"
          }`}
        >
          All ({appointments.length})
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "upcoming"
              ? "bg-forest text-ivory border border-forest"
              : "text-ink-muted hover:text-ink hover:bg-ivory-light border border-transparent"
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
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "completed"
              ? "bg-forest text-ivory border border-forest"
              : "text-ink-muted hover:text-ink hover:bg-ivory-light border border-transparent"
          }`}
        >
          Completed (
          {appointments.filter((a) => a.status === "completed").length})
        </button>

        <button
          onClick={() => setActiveTab("cancelled")}
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "cancelled"
              ? "bg-forest text-ivory border border-forest"
              : "text-ink-muted hover:text-ink hover:bg-ivory-light border border-transparent"
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
            const dateStr = formatISTDate(app.appointment_date);
            const timeStr = new Date(app.appointment_date).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <div
                key={app.appointment_id}
                className="clinic-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <DoctorAvatar
                    avatarUrl={app.doctor?.avatar_url}
                    specialization={app.doctor?.specialization}
                    doctorName={app.doctor?.user?.full_name}
                    size="lg"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-serif text-lg font-bold text-ink">
                        {app.doctor?.user?.full_name || "Doctor"}
                      </h4>
                      <AppointmentStatusBadge status={app.status} size="sm" />
                    </div>

                    <p className="text-xs text-ink-muted font-sans">
                      {app.doctor?.specialization} • {app.doctor?.qualification}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted pt-1">
                      <div className="flex items-center gap-1.5 font-semibold text-ink">
                        <Calendar className="w-3.5 h-3.5 text-forest" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1 text-ink-muted">
                        <Clock className="w-3.5 h-3.5 text-forest" />
                        <span>{timeStr} IST</span>
                      </div>
                      {app.doctor?.consultation_fee && (
                        <span className="font-serif font-bold text-forest text-xs">
                          {formatINR(app.doctor.consultation_fee)}
                        </span>
                      )}
                    </div>

                    {app.reason && (
                      <p className="text-xs text-ink-muted font-sans pt-1">
                        <span className="font-semibold text-ink">Notes:</span> {app.reason}
                      </p>
                    )}

                    {app.doctor?.clinic_address && (
                      <div className="flex items-center gap-1 text-[11px] text-ink-muted pt-0.5">
                        <MapPin className="w-3 h-3 text-forest shrink-0" />
                        <span>{app.doctor.clinic_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                  {isCancellable && (
                    <button
                      disabled={cancellingId === app.appointment_id}
                      onClick={() => handleCancel(app.appointment_id)}
                      className="text-xs font-semibold text-rose-800 hover:text-rose-900 border border-rose-200 bg-rose-50/70 hover:bg-rose-100 px-3.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      {cancellingId === app.appointment_id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Booking</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="clinic-card p-12 text-center max-w-md mx-auto space-y-3">
          <Calendar className="w-8 h-8 text-ink-muted mx-auto" />
          <h4 className="font-serif text-lg font-bold text-ink">
            No consultations found
          </h4>
          <p className="text-xs text-ink-muted font-sans">
            You do not have any appointments under this category.
          </p>
        </div>
      )}
    </div>
  );
}
