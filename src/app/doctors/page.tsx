import React from "react";
import { db } from "@/lib/db";
import { DoctorDirectoryClient } from "@/components/doctors/DoctorDirectoryClient";
import { Stethoscope } from "lucide-react";

export const metadata = {
  title: "Find Doctors & Specialists | Pearl Thoughts Schedule",
  description:
    "Browse verified healthcare specialists, view qualifications, fees, and reserve live appointments instantly.",
};

export default async function DoctorsPage() {
  const doctors = await db.getDoctors();

  // Extract unique specialties
  const specialties = Array.from(
    new Set(doctors.map((d) => d.specialization))
  ).sort();

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <Stethoscope className="w-4 h-4" />
          <span>Practitioner Directory</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Find Top Medical Specialists
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
          Search qualified physicians, explore real-time availability slots, and book your consultation in seconds.
        </p>
      </div>

      <DoctorDirectoryClient
        initialDoctors={doctors}
        specialties={specialties}
      />
    </div>
  );
}
