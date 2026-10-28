import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WaitingQueueTable } from "@/components/reception/WaitingQueueTable";
import { EarlyOffersTracker } from "@/components/reception/EarlyOffersTracker";
import { ReceptionHeaderActions } from "@/components/reception/ReceptionHeaderActions";
import {
  Users,
  Clock,
  Sparkles,
  PhoneCall,
  Stethoscope,
  Building,
} from "lucide-react";

export default async function ReceptionDashboardPage() {
  const session = await getSession();

  // Strict role-based authorization check on server
  if (!session) {
    redirect("/auth/sign-in?redirect=/reception/dashboard");
  }
  if (session.role !== "admin") {
    redirect("/patient/dashboard");
  }

  const doctors = await db.getDoctors();
  const queue = await db.getWaitingQueue();
  const offers = await db.getAllOffers();

  const waitingCount = queue.filter((q) => q.status === "waiting").length;
  const calledCount = queue.filter((q) => q.status === "called").length;
  const inConsultCount = queue.filter((q) => q.status === "in_consultation").length;
  const activeOffersCount = offers.filter(
    (o) => o.status === "pending" && new Date(o.expires_at) > new Date()
  ).length;

  return (
    <div className="py-10 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome & Reception Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-3.5 h-3.5 text-forest" />
            <span>Clinic Front Desk & Triage Operations</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Reception & Smart Waiting Queue
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted font-sans">
            Staff Portal: <strong>{session.full_name}</strong>. Triage walk-in patients, manage clinic calling status, and monitor early-offer cascades.
          </p>
        </div>

        <ReceptionHeaderActions doctors={doctors} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="clinic-card p-5 border-l-4 border-l-terracotta">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 font-sans">
            <Clock className="w-3.5 h-3.5 text-terracotta-dark" />
            Currently Waiting
          </div>
          <div className="font-serif text-2xl font-bold text-ink mt-1">
            {waitingCount}
          </div>
        </div>

        <div className="clinic-card p-5 border-l-4 border-l-sage-dark">
          <div className="text-[11px] font-bold uppercase tracking-wider text-forest flex items-center gap-1.5 font-sans">
            <PhoneCall className="w-3.5 h-3.5 text-forest" />
            Patients Called
          </div>
          <div className="font-serif text-2xl font-bold text-forest mt-1">
            {calledCount}
          </div>
        </div>

        <div className="clinic-card p-5 border-l-4 border-l-forest">
          <div className="text-[11px] font-bold uppercase tracking-wider text-forest flex items-center gap-1.5 font-sans">
            <Stethoscope className="w-3.5 h-3.5 text-forest" />
            In Consultation
          </div>
          <div className="font-serif text-2xl font-bold text-forest mt-1">
            {inConsultCount}
          </div>
        </div>

        <div className="clinic-card p-5 border-l-4 border-l-terracotta-dark">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 font-sans">
            <Sparkles className="w-3.5 h-3.5 text-terracotta-dark" />
            Active Early Offers
          </div>
          <div className="font-serif text-2xl font-bold text-ink mt-1">
            {activeOffersCount}
          </div>
        </div>
      </div>

      {/* Waiting Queue Table Section */}
      <WaitingQueueTable queue={queue} doctors={doctors} />

      {/* Early Offers Audit Log Section */}
      <EarlyOffersTracker offers={offers} />
    </div>
  );
}
