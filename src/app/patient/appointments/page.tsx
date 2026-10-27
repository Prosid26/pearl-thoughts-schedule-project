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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Consultation Schedule</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            My Appointments
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Track status, review booking details, or cancel eligible appointments.
          </p>
        </div>

        <Link
          href="/doctors"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book Consultation</span>
        </Link>
      </div>

      <PatientAppointmentsList initialAppointments={appointments} />
    </div>
  );
}
