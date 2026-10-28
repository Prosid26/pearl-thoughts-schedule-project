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
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome & Reception Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Clinic Administration & Triage Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reception & Smart Waiting Queue
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Logged in as <strong>{session.full_name}</strong> (Clinic Reception). Manage walk-in check-ins, queue status, and track early slot cascade offers.
          </p>
        </div>

        <ReceptionHeaderActions doctors={doctors} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Currently Waiting
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {waitingCount}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5" />
            Patients Called
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {calledCount}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" />
            In Consultation
          </div>
          <div className="text-2xl font-black text-teal-900 mt-1">
            {inConsultCount}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Active Early Offers
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
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
