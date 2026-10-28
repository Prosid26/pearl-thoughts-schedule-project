import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PatientAppointmentsList } from "@/components/patient/PatientAppointmentsList";
import { Calendar, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function PatientAppointmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/patient/appointments");
  }
  if (session.role !== "patient" || !session.patient_id) {
    redirect("/doctor/dashboard");
  }

  const appointments = await db.getAppointmentsForPatient(session.patient_id);

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-widest mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Consultation Archive & Schedule</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink tracking-tight">
            My Appointments
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-text">
            Track consultation stages, review doctor details, or cancel eligible bookings.
          </p>
        </div>

        <Link
          href="/doctors"
          className="btn-forest inline-flex items-center gap-2 text-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book New Consultation</span>
        </Link>
      </div>

      <PatientAppointmentsList initialAppointments={appointments} />
    </div>
  );
}
