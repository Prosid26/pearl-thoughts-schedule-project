import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { DoctorAppointmentActions } from "@/components/doctor/DoctorAppointmentActions";
import {
  Stethoscope,
  Calendar,
  AlertCircle,
  PlusCircle,
  Sparkles,
  Users,
  Clock,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate, formatTime12h } from "@/lib/utils/date";

export default async function DoctorDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/doctor/dashboard");
  }
  if (session.role !== "doctor" || !session.doctor_id) {
    redirect("/patient/dashboard");
  }

  const doctor = await db.getDoctorById(session.doctor_id);
  const appointments = await db.getAppointmentsForDoctor(session.doctor_id);
  const waitingQueue = await db.getWaitingQueue(session.doctor_id, "waiting");
  const earlyOffers = await db.getOffersForDoctor(session.doctor_id);

  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending"
  );
  const confirmedAppointments = appointments.filter(
    (a) => a.status === "confirmed"
  );
  const completedAppointments = appointments.filter(
    (a) => a.status === "completed"
  );

  const activeOffers = earlyOffers.filter(
    (o) => o.status === "pending" && new Date(o.expires_at) > new Date()
  );

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-4">
          <DoctorAvatar
            doctor={doctor || undefined}
            name={session.full_name}
            size="lg"
            showActiveBadge
          />
          <div>
            <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Practice Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {session.full_name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {doctor?.specialization} • {doctor?.qualification}
              {doctor?.consultation_fee ? ` • ${formatINR(doctor.consultation_fee)} / visit` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doctor/availability"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manage Availability Slots</span>
          </Link>
          <Link
            href="/doctor/profile"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Consultations
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {appointments.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Pending Action
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">
            {pendingAppointments.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-200 bg-teal-50/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
            Confirmed Active
          </div>
          <div className="text-2xl font-black text-teal-800 mt-1">
            {confirmedAppointments.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Completed Visits
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {completedAppointments.length}
          </div>
        </div>
      </div>

      {/* Smart Early Slot Offers & Clinic Waiting Queue Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Early Slot Offer in Progress */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-900 to-slate-900 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-800/80 text-teal-200 border border-teal-700/60">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Smart Early Slot Automation</span>
            </span>
            <span className="text-[11px] font-medium text-slate-300">
              {activeOffers.length} Active Offer{activeOffers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {activeOffers.length > 0 ? (
            <div className="space-y-2 pt-1">
              {activeOffers.map((offer) => (
                <div
                  key={offer.offer_id}
                  className="p-3 rounded-2xl bg-white/10 border border-white/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-teal-200">
                    <span>
                      Offered to: {offer.patient?.user?.full_name || "Patient"}
                    </span>
                    <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full">
                      2-min window
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Earlier Slot: {offer.slot?.available_date} @{" "}
                    {offer.slot?.start_time ? formatTime12h(offer.slot.start_time) : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-300 pt-1">
              Completing a consultation early automatically detects available slots
              and initiates a 2-minute countdown offer to the next eligible patient in the queue.
            </div>
          )}
        </div>

        {/* Clinic Waiting Queue Status */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Clinic Walk-in Queue</span>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {waitingQueue.length} Patient{waitingQueue.length !== 1 ? "s" : ""} Waiting
            </span>
          </div>

          {waitingQueue.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {waitingQueue.slice(0, 2).map((item) => (
                <div key={item.queue_id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{item.patient_name}</div>
                    <div className="text-[11px] text-slate-500">
                      Checked in: {new Date(item.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 pt-1">
              No walk-in patients currently checked in at the reception desk for your clinic.
            </div>
          )}
        </div>
      </div>

      {/* Pending Appointments Action Box */}
      {pendingAppointments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>
                {pendingAppointments.length} Pending Appointment Requests
                Require Your Confirmation
              </span>
            </div>
            <Link
              href="/doctor/appointments"
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline"
            >
              View In Table
            </Link>
          </div>

          <div className="divide-y divide-amber-200/60">
            {pendingAppointments.slice(0, 3).map((app) => (
              <div
                key={app.appointment_id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {app.patient?.user?.full_name} ({app.patient?.user?.phone})
                  </div>
                  <div className="text-slate-600">
                    Slot:{" "}
                    {new Date(app.appointment_date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    )}{" "}
                    @ {app.availability?.start_time.slice(0, 5)} -{" "}
                    {app.availability?.end_time.slice(0, 5)}
                  </div>
                  <div className="text-slate-500 italic mt-0.5">
                    &ldquo;{app.reason}&rdquo;
                  </div>
                </div>

                <DoctorAppointmentActions appointment={app} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Upcoming Consultations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Confirmed Consultations
          </h2>
          <Link
            href="/doctor/appointments"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            Manage All Appointments ({appointments.length}) →
          </Link>
        </div>

        {confirmedAppointments.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {confirmedAppointments.slice(0, 5).map((app) => (
              <div
                key={app.appointment_id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {app.patient?.user?.full_name?.charAt(0) || "P"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {app.patient?.user?.full_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(app.appointment_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}{" "}
                      @ {app.availability?.start_time.slice(0, 5)} -{" "}
                      {app.availability?.end_time.slice(0, 5)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                      Reason: {app.reason}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <AppointmentStatusBadge status={app.status} size="sm" />
                  <DoctorAppointmentActions appointment={app} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              No Confirmed Appointments Yet
            </h3>
            <p className="text-xs text-slate-500">
              When patients book consultations, they will appear here for your
              review and check-in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
