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
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <Stethoscope className="w-4 h-4" />
          <span>Practitioner Settings</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Doctor Profile Details
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Update medical qualifications, consultation fees, bio, and clinic location.
        </p>
      </div>

      <DoctorProfileForm doctor={doctor} user={user} />
    </div>
  );
}
