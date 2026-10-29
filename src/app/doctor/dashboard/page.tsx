import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DoctorAppointmentsTable } from "@/components/doctor/DoctorAppointmentsTable";
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
import { formatISTDate, formatISTTime, formatTime12h } from "@/lib/utils/date";

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
    <div className="py-10 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div className="flex items-start gap-4">
          <DoctorAvatar
            doctor={doctor || undefined}
            name={session.full_name}
            size="lg"
            showActiveBadge
          />
          <div>
            <div className="inline-flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
              <Stethoscope className="w-3.5 h-3.5 text-forest" />
              <span>Practitioner Workspace</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {session.full_name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted font-sans">
              {doctor?.specialization} • {doctor?.qualification}
              {doctor?.consultation_fee ? ` • ${formatINR(doctor.consultation_fee)} / visit` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doctor/availability"
            className="btn-forest text-xs px-4 py-2.5 gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manage Slots</span>
          </Link>
          <Link
            href="/doctor/profile"
            className="btn-ivory text-xs px-4 py-2.5"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Actionable Practice Focus Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`clinic-card p-4 sm:p-5 ${pendingAppointments.length > 0 ? "border-l-4 border-l-terracotta" : ""}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <AlertCircle className={`w-3.5 h-3.5 ${pendingAppointments.length > 0 ? "text-terracotta" : "text-ink-muted"}`} />
            <span>Pending Review</span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink mt-1">
            {pendingAppointments.length}
          </div>
        </div>

        <div className="clinic-card p-4 sm:p-5 border-l-4 border-l-forest">
          <div className="text-[11px] font-bold uppercase tracking-wider text-forest">
            Confirmed Active
          </div>
          <div className="font-serif text-2xl font-bold text-forest mt-1">
            {confirmedAppointments.length}
          </div>
        </div>

        <div className="clinic-card p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-forest" />
            <span>Queue Waiting</span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink mt-1">
            {waitingQueue.length}
          </div>
        </div>

        <div className="clinic-card p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" />
            <span>Active Offers</span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink mt-1">
            {activeOffers.length}
          </div>
        </div>
      </div>

      {/* Smart Early Slot Automation & Clinic Waiting Queue Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Early Slot Offer in Progress */}
        <div className="p-6 rounded-xl bg-forest text-ivory border border-forest-dark space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#182821] text-sage border border-sage-dark/40">
              <Sparkles className="w-3.5 h-3.5 text-terracotta" />
              <span>Smart Early Slot Automation</span>
            </span>
            <span className="text-xs font-medium text-[#BAC8BF]">
              {activeOffers.length} Active Offer{activeOffers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {activeOffers.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {activeOffers.map((offer) => (
                <div
                  key={offer.offer_id}
                  className="p-3.5 rounded-lg bg-[#1D3128] border border-warm-border/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>
                      Offered to: {offer.patient?.user?.full_name || "Patient"}
                    </span>
                    <span className="text-[10px] bg-terracotta text-ink font-bold px-2 py-0.5 rounded">
                      2-min window
                    </span>
                  </div>
                  <div className="text-[#BAC8BF]">
                    Earlier Slot: {offer.slot?.available_date} @{" "}
                    {offer.slot?.start_time ? formatTime12h(offer.slot.start_time) : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#BAC8BF] pt-1 leading-relaxed font-sans">
              When concluding an appointment early via the &ldquo;Complete Consultation&rdquo; action,
              Medrella automatically detects if an earlier slot is open and cascades an expedited
              offer with a 2-minute countdown to the next eligible patient.
            </div>
          )}
        </div>

        {/* Clinic Waiting Queue Status */}
        <div className="clinic-card p-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider">
              <Users className="w-4 h-4 text-forest" />
              <span>Clinic Walk-in Queue</span>
            </div>
            <span className="text-xs font-semibold text-forest bg-sage-light px-2.5 py-0.5 rounded-md border border-sage-dark/60">
              {waitingQueue.length} Patient{waitingQueue.length !== 1 ? "s" : ""} Waiting
            </span>
          </div>

          {waitingQueue.length > 0 ? (
            <div className="divide-y divide-warm-border-subtle text-xs">
              {waitingQueue.slice(0, 3).map((item) => (
                <div key={item.queue_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-serif font-bold text-ink">{item.patient_name}</div>
                    <div className="text-[11px] text-ink-muted">
                      Checked in: {formatISTTime(item.check_in_time)} IST
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terracotta-light text-ink border border-terracotta uppercase">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-ink-muted pt-1 leading-relaxed font-sans">
              No walk-in patients currently triaged at the reception desk for your clinic.
            </div>
          )}
        </div>
      </div>

      {/* Pending Appointments Action Box */}
      {pendingAppointments.length > 0 && (
        <div className="bg-terracotta-light border border-terracotta rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-terracotta-dark" />
              <span>
                {pendingAppointments.length} Pending Consultation Requests
                Awaiting Your Confirmation
              </span>
            </div>
            <Link
              href="/doctor/appointments"
              className="text-xs font-bold text-forest hover:text-forest-dark uppercase tracking-wider underline"
            >
              View In Roster
            </Link>
          </div>

          <div className="divide-y divide-terracotta/40">
            {pendingAppointments.slice(0, 3).map((app) => (
              <div
                key={app.appointment_id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-ink">
                    {app.patient?.user?.full_name} ({app.patient?.user?.phone})
                  </div>
                  <div className="text-ink-muted">
                    Slot: {formatISTDate(app.appointment_date)} @ {app.availability?.start_time.slice(0, 5)} IST
                  </div>
                  <div className="text-ink-muted text-[11px] italic mt-0.5">
                    &ldquo;{app.reason}&rdquo;
                  </div>
                </div>

                <DoctorAppointmentActions appointment={app} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Schedule & Complete Consultation Workspace */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink">
            Clinical Appointments & Schedule
          </h2>
          <span className="text-xs text-ink-muted font-sans">
            Use &ldquo;Complete Consultation&rdquo; to finish early and trigger patient cascade offers
          </span>
        </div>

        <DoctorAppointmentsTable initialAppointments={appointments} />
      </div>
    </div>
  );
}
