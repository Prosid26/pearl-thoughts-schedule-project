import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";
import {
  Calendar,
  Clock,
  User,
  PlusCircle,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { EarlySlotOfferBanner } from "@/components/patient/EarlySlotOfferBanner";
import { PatientNotificationsPanel } from "@/components/patient/PatientNotificationsPanel";
import { NotificationPreferencesSection } from "@/components/patient/NotificationPreferencesSection";
import { formatISTDate, formatISTTime, isSlotInPast } from "@/lib/utils/date";

export default async function PatientDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/patient/dashboard");
  }
  if (session.role !== "patient") {
    redirect("/doctor/dashboard");
  }

  let patientId = session.patient_id;
  if (!patientId) {
    const patientRecord = await db.getPatientByUserId(session.user_id);
    if (patientRecord) {
      patientId = patientRecord.patient_id;
    }
  }

  if (!patientId) {
    redirect("/doctor/dashboard");
  }

  const appointments = await db.getAppointmentsForPatient(patientId);
  const initialOffer = await db.getActiveOfferForPatient(patientId);
  const preferences = await db.getNotificationPreferences(session.user_id);

  const upcomingAppointments = appointments.filter((a) => {
    if (a.status !== "pending" && a.status !== "confirmed") return false;
    if (a.availability?.available_date && a.availability?.start_time) {
      return !isSlotInPast(a.availability.available_date, a.availability.start_time);
    }
    return new Date(a.appointment_date) >= new Date();
  });

  const nextAppointment =
    upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  return (
    <div className="py-10 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <User className="w-3.5 h-3.5" />
            <span>Patient Sanctuary</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Welcome, {session.full_name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted font-sans">
            Review your clinical schedule, upcoming consultations, and expedited slot opportunities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doctors"
            className="btn-forest text-xs px-4 py-2.5 gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book Consultation</span>
          </Link>
          <Link
            href="/patient/profile"
            className="btn-ivory text-xs px-4 py-2.5"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Prominent Earlier-Slot Offer Banner with Live 2-Min Countdown */}
      <EarlySlotOfferBanner initialOffer={initialOffer} />

      {/* Next Upcoming Consultation Highlight */}
      {nextAppointment && (
        <div className="bg-forest rounded-2xl p-6 sm:p-7 text-ivory shadow-sm space-y-5 border border-forest-dark/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#182821] text-sage border border-sage-dark/40">
                <Clock className="w-3.5 h-3.5 text-terracotta" />
                <span>Next Confirmed Visit</span>
              </span>
              {nextAppointment.wave_number && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-sage/20 text-sage border border-sage/30">
                  Wave #{nextAppointment.wave_number} • Est. {nextAppointment.estimated_consult_time || "TBD"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AppointmentStatusBadge status={nextAppointment.status} />
              <PaymentStatusBadge status={nextAppointment.payment_status} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1 items-center">
            <div className="md:col-span-8 flex items-start gap-4">
              <DoctorAvatar
                avatarUrl={nextAppointment.doctor?.avatar_url}
                specialization={nextAppointment.doctor?.specialization}
                doctorName={nextAppointment.doctor?.user?.full_name}
                size="lg"
              />
              <div className="space-y-1.5">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {nextAppointment.doctor?.user?.full_name || "Doctor"}
                </h3>
                <p className="text-xs text-[#BAC8BF]">
                  {nextAppointment.doctor?.specialization} • {nextAppointment.doctor?.qualification}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-sage pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-terracotta" />
                    <span>{formatISTDate(nextAppointment.appointment_date)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-ivory/80 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-terracotta" />
                    <span>
                      {formatISTTime(nextAppointment.availability?.start_time || nextAppointment.appointment_date)} IST
                    </span>
                  </div>
                </div>
                {nextAppointment.doctor?.clinic_address && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#BAC8BF] pt-0.5">
                    <MapPin className="w-3 h-3 text-sage shrink-0" />
                    <span>{nextAppointment.doctor.clinic_address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-start md:items-end justify-center gap-3">
              <div className="text-left md:text-right">
                <span className="text-[11px] text-sage block font-sans">Consultation Fee</span>
                <span className="font-serif text-xl font-bold text-terracotta">
                  {nextAppointment.doctor?.consultation_fee
                    ? formatINR(nextAppointment.doctor.consultation_fee)
                    : "Covered"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/patient/appointments"
                  className="btn-ivory text-xs px-3.5 py-2 font-medium"
                >
                  Reschedule
                </Link>
                <Link
                  href="/patient/appointments"
                  className="btn-terracotta text-xs px-4 py-2 gap-1 font-bold"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical In-App Notifications Center */}
      <PatientNotificationsPanel />

      {/* Upcoming Appointments Summary */}
      <div className="clinic-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-warm-border">
          <h3 className="font-serif text-lg font-bold text-ink">
            Upcoming Consultations ({upcomingAppointments.length})
          </h3>
          <Link
            href="/patient/appointments"
            className="text-xs font-bold text-forest hover:text-forest-dark uppercase tracking-wider"
          >
            All History →
          </Link>
        </div>

        {upcomingAppointments.length > 0 ? (
          <div className="divide-y divide-warm-border-subtle">
            {upcomingAppointments.map((app) => (
              <div
                key={app.appointment_id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <DoctorAvatar
                    avatarUrl={app.doctor?.avatar_url}
                    specialization={app.doctor?.specialization}
                    doctorName={app.doctor?.user?.full_name}
                    size="md"
                  />
                  <div>
                    <h4 className="font-serif text-sm font-bold text-ink">
                      {app.doctor?.user?.full_name || "Doctor"}
                    </h4>
                    <p className="text-xs text-ink-muted font-sans">
                      {app.doctor?.specialization}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <div className="text-ink-muted">
                    <span className="font-medium text-ink">
                      {formatISTDate(app.appointment_date)}
                    </span>{" "}
                    @ {formatISTTime(app.availability?.start_time || app.appointment_date)} IST
                  </div>
                  <AppointmentStatusBadge status={app.status} size="sm" />
                  <PaymentStatusBadge status={app.payment_status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-ink-muted font-sans">
            No upcoming consultations booked at present.
          </div>
        )}
      </div>

      {/* Patient Notification Preferences & Unsubscribe Controls */}
      <NotificationPreferencesSection initialPreferences={preferences} />
    </div>
  );
}
