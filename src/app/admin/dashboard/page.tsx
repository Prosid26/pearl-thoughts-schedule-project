import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminClinicManager } from "@/components/admin/AdminClinicManager";
import { Building2, ShieldCheck } from "lucide-react";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Command Center | Medrella Private Clinic",
  description: "Centralized clinic administration, staff assignments, and onboarding control.",
};

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/admin/dashboard");
  }
  if (session.role !== "admin") {
    redirect("/patient/dashboard");
  }

  const [clinics, receptionists, invitations, doctors] = await Promise.all([
    db.getClinics(),
    db.getReceptionists(),
    db.getReceptionistInvitations(),
    db.getDoctors(),
  ]);

  return (
    <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-forest bg-sage/30 px-2 py-0.5 rounded">
              Administration Workspace
            </span>
            <span className="text-[10px] text-ink-muted">• System Administrator</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
            Clinic Governance Center
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Oversee clinical centers, reception personnel assignments, and cryptographic onboarding invites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="clinic-card px-4 py-2.5 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-forest" />
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                Signed in as
              </span>
              <span className="text-xs font-bold text-ink">{session.full_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Administrative Control Panel */}
      <AdminClinicManager
        clinics={clinics}
        receptionists={receptionists}
        invitations={invitations}
        doctors={doctors}
      />
    </div>
  );
}

