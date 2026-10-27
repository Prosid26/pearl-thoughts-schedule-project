import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  ArrowRight,
  PlusCircle,
} from "lucide-react";

export default async function PatientDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/patient/dashboard");
  }
  if (session.role !== "patient" || !session.patient_id) {
    redirect("/doctor/dashboard");
  }

  const appointments = await db.getAppointmentsForPatient(session.patient_id);

  const upcomingAppointments = appointments.filter(
    (a) =>
      (a.status === "pending" || a.status === "confirmed") &&
      new Date(a.appointment_date) >= new Date()
  );

  const nextAppointment =
    upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <User className="w-4 h-4" />
            <span>Patient Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {session.full_name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            View your upcoming consultations, appointment history, and medical specialists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Appointment</span>
          </Link>
          <Link
            href="/patient/profile"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Bookings
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {appointments.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Upcoming
          </div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {upcomingAppointments.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Completed
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {appointments.filter((a) => a.status === "completed").length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Cancelled
          </div>
          <div className="text-2xl font-black text-slate-500 mt-1">
            {
              appointments.filter(
                (a) => a.status === "cancelled" || a.status === "rejected"
              ).length
            }
          </div>
        </div>
      </div>

      {/* Next Upcoming Appointment Highlight */}
      {nextAppointment ? (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-800/80 text-teal-200 border border-teal-700/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Next Scheduled Consultation</span>
            </span>
            <AppointmentStatusBadge status={nextAppointment.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Doctor
              </div>
              <div className="text-lg font-bold text-white mt-0.5">
                {nextAppointment.doctor?.user?.full_name || "Doctor"}
              </div>
              <div className="text-xs text-teal-300 font-medium">
                {nextAppointment.doctor?.specialization}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Date & Time
              </div>
              <div className="text-base font-bold text-white mt-0.5">
                {new Date(nextAppointment.appointment_date).toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric" }
                )}
              </div>
              <div className="text-xs text-slate-300">
                {nextAppointment.availability?.start_time.slice(0, 5)} -{" "}
                {nextAppointment.availability?.end_time.slice(0, 5)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Clinic Location
              </div>
              <div className="text-xs text-slate-200 mt-0.5 line-clamp-2">
                {nextAppointment.doctor?.clinic_address ||
                  "Main Medical Center, Boston"}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Visit reason: <em>&ldquo;{nextAppointment.reason}&rdquo;</em>
            </span>
            <Link
              href="/patient/appointments"
              className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
            >
              <span>Manage Booking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No Upcoming Appointments
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any pending or confirmed consultations. Select a medical specialist to book your next visit.
          </p>
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <span>Explore Doctors</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Recent Appointments Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Recent Appointments
          </h2>
          <Link
            href="/patient/appointments"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            View All ({appointments.length}) →
          </Link>
        </div>

        {appointments.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {appointments.slice(0, 4).map((app) => (
              <div
                key={app.appointment_id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {app.doctor?.user?.full_name || "Doctor"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {app.doctor?.specialization} •{" "}
                      {new Date(app.appointment_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}{" "}
                      @ {app.availability?.start_time.slice(0, 5)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                      Reason: {app.reason}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <AppointmentStatusBadge status={app.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No appointments recorded yet.</p>
        )}
      </div>
    </div>
  );
}
