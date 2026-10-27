import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PatientProfileForm } from "@/components/patient/PatientProfileForm";
import { User } from "lucide-react";

export default async function PatientProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/patient/profile");
  }
  if (session.role !== "patient" || !session.patient_id) {
    redirect("/doctor/dashboard");
  }

  const patient = await db.getPatientById(session.patient_id);
  const user = await db.getUserById(session.user_id);

  if (!patient || !user) {
    redirect("/patient/dashboard");
  }

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <User className="w-4 h-4" />
          <span>Patient Account</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Personal Information
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Manage your personal identity, contact numbers, and home address.
        </p>
      </div>

      <PatientProfileForm patient={patient} user={user} />
    </div>
  );
}
