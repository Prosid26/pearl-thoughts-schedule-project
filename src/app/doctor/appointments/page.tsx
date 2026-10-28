import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DoctorAppointmentsTable } from "@/components/doctor/DoctorAppointmentsTable";
import { Calendar, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function DoctorAppointmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/doctor/appointments");
  }
  if (session.role !== "doctor" || !session.doctor_id) {
    redirect("/patient/dashboard");
  }

  const appointments = await db.getAppointmentsForDoctor(session.doctor_id);

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-widest mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Clinical Registry</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink tracking-tight">
            Consultation Roster
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-text">
            Complete consultations, monitor arrival statuses, or review patient booking details.
          </p>
        </div>

        <Link
          href="/doctor/availability"
          className="btn-forest inline-flex items-center gap-2 text-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Manage Time Windows</span>
        </Link>
      </div>

      <DoctorAppointmentsTable initialAppointments={appointments} />
    </div>
  );
}
