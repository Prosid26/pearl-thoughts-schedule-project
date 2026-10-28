import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DoctorProfileForm } from "@/components/doctor/DoctorProfileForm";
import { Stethoscope } from "lucide-react";

export default async function DoctorProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/doctor/profile");
  }
  if (session.role !== "doctor" || !session.doctor_id) {
    redirect("/patient/dashboard");
  }

  const doctor = await db.getDoctorById(session.doctor_id);
  const user = await db.getUserById(session.user_id);

  if (!doctor || !user) {
    redirect("/doctor/dashboard");
  }

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-warm-border pb-6">
        <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-widest mb-1.5">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Practitioner Registry</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink tracking-tight">
          Practitioner Credentials & Practice Details
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-text">
          Keep your medical qualifications, clinic address, bio, and INR consultation fees accurate for patient booking.
        </p>
      </div>

      <DoctorProfileForm doctor={doctor} user={user} />
    </div>
  );
}
