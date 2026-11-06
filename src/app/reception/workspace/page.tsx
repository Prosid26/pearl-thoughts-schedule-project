import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ReceptionWorkspace } from "@/components/reception/ReceptionWorkspace";
import { Building2, ShieldCheck } from "lucide-react";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reception Workspace | Medrella Private Clinic",
  description: "Front-desk patient admissions, appointment scheduling, and clinic cascade management.",
};

export default async function ReceptionWorkspacePage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/reception/workspace");
  }
  if (session.role !== "receptionist" || !session.receptionist_id || !session.clinic_id) {
    redirect("/patient/dashboard");
  }

  const clinic = await db.getClinicById(session.clinic_id);
  if (!clinic) {
    throw new Error("Assigned clinic record not found. Please contact your administrator.");
  }

  const [doctors, appointments, patients, receptionistRec] = await Promise.all([
    db.getDoctorsByClinic(session.clinic_id),
    db.getAppointmentsByClinic(session.clinic_id),
    db.getPatients(),
    db.getReceptionistById(session.receptionist_id),
  ]);

  const receptionistData = receptionistRec || {
    receptionist_id: session.receptionist_id,
    user_id: session.user_id,
    clinic_id: session.clinic_id,
    created_at: new Date().toISOString(),
    user: {
      full_name: session.full_name,
      email: session.email,
      phone: "+91 98200 88776",
    },
    clinic,
  };

  return (
    <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-forest bg-sage/30 px-2 py-0.5 rounded">
              Front Desk Portal
            </span>
            <span className="text-[10px] text-ink-muted">• Clinic Receptionist</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
            Receptionist Command Workspace
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Patient check-ins, assisted bookings, schedule management, and capacity enforcement for {clinic.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="clinic-card px-4 py-2.5 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-forest" />
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                Logged in Staff
              </span>
              <span className="text-xs font-bold text-ink">{session.full_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reception Workspace */}
      <ReceptionWorkspace
        receptionist={receptionistData}
        clinic={clinic}
        doctors={doctors}
        initialAppointments={appointments}
        patients={patients}
      />
    </div>
  );
}

