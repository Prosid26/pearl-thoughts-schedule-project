import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DoctorAvailabilityManager } from "@/components/doctor/DoctorAvailabilityManager";
import { Clock } from "lucide-react";

export default async function DoctorAvailabilityPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/doctor/availability");
  }
  if (session.role !== "doctor" || !session.doctor_id) {
    redirect("/patient/dashboard");
  }

  const availabilities = await db.getDoctorAvailability(session.doctor_id);

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <Clock className="w-4 h-4" />
          <span>Practice Calendar</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Manage Availability Slots
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Publish consultation dates and time intervals for patients to book in real-time.
        </p>
      </div>

      <DoctorAvailabilityManager initialAvailabilities={availabilities} />
    </div>
  );
}
