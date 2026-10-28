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
      <div className="border-b border-warm-border pb-6">
        <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-widest mb-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Practice Operating Calendar</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink tracking-tight">
          Manage Availability Windows
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-text">
          Publish consultation dates and time intervals for patients to book with atomic concurrency safeguards.
        </p>
      </div>

      <DoctorAvailabilityManager initialAvailabilities={availabilities} />
    </div>
  );
}
