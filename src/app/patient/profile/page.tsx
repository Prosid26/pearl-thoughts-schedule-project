import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PatientProfileForm } from "@/components/patient/PatientProfileForm";
import { NotificationPreferencesSection } from "@/components/patient/NotificationPreferencesSection";
import { User } from "lucide-react";

export default async function PatientProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/patient/profile");
  }
  if (session.role !== "patient") {
    redirect("/doctor/dashboard");
  }

  let patientId = session.patient_id;
  if (!patientId) {
    const patientRecord = await db.getPatientByUserId(session.user_id);
    if (patientRecord) {
      patientId = patientRecord.patient_id;
    }
  }

  if (!patientId) {
    redirect("/doctor/dashboard");
  }

  const patient = await db.getPatientById(patientId);
  const user = await db.getUserById(session.user_id);
  const preferences = await db.getNotificationPreferences(session.user_id);

  if (!patient || !user) {
    redirect("/patient/dashboard");
  }

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-warm-border pb-6">
        <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-widest mb-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Patient Account</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink tracking-tight">
          Personal Information
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-text">
          Manage your personal identity, contact numbers, and address on file with Medrella.
        </p>
      </div>

      <PatientProfileForm patient={patient} user={user} />

      <NotificationPreferencesSection initialPreferences={preferences} />
    </div>
  );
}
