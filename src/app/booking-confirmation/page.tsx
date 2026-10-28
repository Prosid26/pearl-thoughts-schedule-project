import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Stethoscope,
  MapPin,
  ArrowRight,
  FileText,
  IndianRupee,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";

export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; doctor?: string }>;
}) {
  const { id } = await searchParams;
  const appointmentId = id ? parseInt(id, 10) : null;

  const appointment = appointmentId
    ? await db.getAppointmentById(appointmentId)
    : null;

  const docName =
    appointment?.doctor?.user?.full_name || "Medical Practitioner";
  const appDate = appointment
    ? new Date(appointment.appointment_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Confirmed Date";

  const appTime = appointment?.availability
    ? `${appointment.availability.start_time.slice(0, 5)} - ${appointment.availability.end_time.slice(0, 5)}`
    : "Scheduled Time";

  return (
    <div className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Success Header Banner */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto border border-white/20 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-emerald-300" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Appointment Booked Successfully!
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 max-w-md mx-auto">
            Your appointment has been recorded in the database and the time slot
            is securely locked.
          </p>
        </div>

        {/* Details Card */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Appointment Reference ID
              </span>
              <div className="text-xl font-mono font-extrabold text-slate-900 mt-0.5">
                #APT-{String(appointmentId || 1001).padStart(5, "0")}
              </div>
            </div>

            {appointment && (
              <div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
            )}
          </div>

          {/* Consultation Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <DoctorAvatar
                doctor={appointment?.doctor}
                size="sm"
                showActiveBadge
              />
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Doctor / Specialist
                </span>
                <div className="text-sm font-bold text-slate-900 truncate">{docName}</div>
                {appointment?.doctor && (
                  <div className="text-xs text-teal-700 font-medium">
                    {appointment.doctor.specialization}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                Date & Time Slot
              </span>
              <div className="text-sm font-bold text-slate-900">{appDate}</div>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{appTime}</span>
              </div>
            </div>
          </div>

          {/* Consultation Fee Badge */}
          {appointment?.doctor?.consultation_fee && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
              <span className="font-semibold flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-700" />
                <span>Consultation Fee (Pay at clinic / online):</span>
              </span>
              <span className="text-base font-extrabold text-emerald-800">
                {formatINR(appointment.doctor.consultation_fee)}
              </span>
            </div>
          )}

          {/* Reason for consultation */}
          {appointment?.reason && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                Reason for Visit
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {appointment.reason}
              </p>
            </div>
          )}

          {/* Clinic Location */}
          {appointment?.doctor?.clinic_address && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-teal-50/50 border border-teal-200/70 text-xs text-teal-900">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Consultation Location:</strong>
                <span>{appointment.doctor.clinic_address}</span>
              </div>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/patient/appointments"
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl text-xs font-bold text-center text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              <span>View in My Appointments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/doctors"
              className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold text-center text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Find Another Doctor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
