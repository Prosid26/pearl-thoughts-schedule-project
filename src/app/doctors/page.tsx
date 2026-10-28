import React from "react";
import { db } from "@/lib/db";
import { DoctorDirectoryClient } from "@/components/doctors/DoctorDirectoryClient";
import { Stethoscope } from "lucide-react";

export const metadata = {
  title: "Clinical Specialists & Available Slots | Medrella",
  description:
    "Browse verified healthcare specialists, view medical qualifications, consultation fees, and reserve live appointments instantly.",
};

export default async function DoctorsPage() {
  const doctors = await db.getDoctors();

  // Extract unique specialties
  const specialties = Array.from(
    new Set(doctors.map((d) => d.specialization))
  ).sort();

  return (
    <div className="py-10 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-warm-border pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-sage-light text-forest text-xs font-semibold border border-sage-dark/60">
          <Stethoscope className="w-3.5 h-3.5 text-forest" />
          <span>Practitioner Roster • Medrella Medical Wing</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Consult With Senior Specialists
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted max-w-2xl font-sans leading-relaxed">
          Browse verified Indian practitioners, explore authentic clinic hours, and reserve
          guaranteed non-conflicting consultation slots.
        </p>
      </div>

      <DoctorDirectoryClient
        initialDoctors={doctors}
        specialties={specialties}
      />
    </div>
  );
}
