"use client";

import React from "react";
import { EarlySlotOffer } from "@/types/database";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  Stethoscope,
} from "lucide-react";
import { formatTime12h, formatISTDateTime } from "@/lib/utils/date";

interface Props {
  offers: EarlySlotOffer[];
}

export function EarlyOffersTracker({ offers }: Props) {
  const getOfferBadge = (status: string, expiresAt: string) => {
    const isOverdue = new Date(expiresAt).getTime() <= Date.now();

    if (status === "pending" && !isOverdue) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
          Pending (2-min window)
        </span>
      );
    }
    if (status === "accepted") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          Accepted & Rescheduled
        </span>
      );
    }
    if (status === "declined") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          Declined by Patient
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
        Expired (Cascaded)
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-extrabold text-slate-900">
            Early Slot Offer Audit Log ({offers.length})
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Smart Cascade Automation
        </span>
      </div>

      {offers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-bold">Offer #</th>
                <th className="pb-3 font-bold">Offered Earlier Slot (IST)</th>
                <th className="pb-3 font-bold">Attending Specialist</th>
                <th className="pb-3 font-bold">Recipient Patient</th>
                <th className="pb-3 font-bold">Offer Status</th>
                <th className="pb-3 font-bold text-right">Offered At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.map((offer) => (
                <tr key={offer.offer_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 font-mono font-bold text-slate-400">
                    #{offer.offer_id}
                  </td>
                  <td className="py-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{offer.slot?.available_date}</span>
                    </div>
                    <div className="text-[11px] text-teal-700 font-semibold">
                      {offer.slot?.start_time ? formatTime12h(offer.slot.start_time) : ""} -{" "}
                      {offer.slot?.end_time ? formatTime12h(offer.slot.end_time) : ""}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-bold text-slate-800">
                      {offer.doctor?.user?.full_name || `Doctor #${offer.doctor_id}`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {offer.doctor?.specialization}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-bold text-slate-900">
                      {offer.patient?.user?.full_name || `Patient #${offer.patient_id}`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {offer.patient?.user?.phone || ""}
                    </div>
                  </td>
                  <td className="py-4">
                    {getOfferBadge(offer.status, offer.expires_at)}
                  </td>
                  <td className="py-4 text-right text-slate-500 font-medium">
                    {formatISTDateTime(offer.offered_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">
          No early slot offers dispatched yet. Offers are generated automatically when a doctor finishes an appointment early.
        </div>
      )}
    </div>
  );
}
