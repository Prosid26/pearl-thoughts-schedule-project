"use client";

import React from "react";
import { EarlySlotOffer } from "@/types/database";
import {
  Sparkles,
  Calendar,
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
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-terracotta text-ink border border-terracotta-dark animate-pulse">
          Pending (2-min window)
        </span>
      );
    }
    if (status === "accepted") {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sage-light text-forest border border-sage-dark/80">
          Accepted & Rescheduled
        </span>
      );
    }
    if (status === "declined") {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
          Declined by Patient
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-ivory-muted text-ink-muted border border-warm-border">
        Expired (Cascaded)
      </span>
    );
  };

  return (
    <div className="clinic-card overflow-hidden space-y-4 p-6 sm:p-7">
      <div className="flex items-center justify-between pb-4 border-b border-warm-border">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-terracotta-dark" />
          <h2 className="font-serif text-lg font-bold text-ink">
            Early Slot Offer Audit Log ({offers.length})
          </h2>
        </div>
        <span className="text-xs text-ink-muted font-sans">
          Automated Smart Queue Cascade
        </span>
      </div>

      {offers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-warm-border-subtle text-ink-muted uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-bold">Offer ID</th>
                <th className="pb-3 font-bold">Offered Earlier Slot (IST)</th>
                <th className="pb-3 font-bold">Attending Specialist</th>
                <th className="pb-3 font-bold">Offered Patient</th>
                <th className="pb-3 font-bold">Cascade Status</th>
                <th className="pb-3 font-bold text-right">Offered At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border-subtle">
              {offers.map((offer) => (
                <tr key={offer.offer_id} className="hover:bg-ivory-light/60 transition-colors">
                  <td className="py-3.5 font-mono font-bold text-forest text-xs">
                    #OFR-{String(offer.offer_id).padStart(4, "0")}
                  </td>
                  <td className="py-3.5">
                    <div className="font-semibold text-ink flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest" />
                      <span>{offer.slot?.available_date}</span>
                    </div>
                    <div className="text-[11px] text-forest font-semibold">
                      {offer.slot?.start_time ? formatTime12h(offer.slot.start_time) : ""} –{" "}
                      {offer.slot?.end_time ? formatTime12h(offer.slot.end_time) : ""} IST
                    </div>
                  </td>
                  <td className="py-3.5">
                    <div className="font-semibold text-ink">
                      {offer.doctor?.user?.full_name || `Doctor #${offer.doctor_id}`}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {offer.doctor?.specialization}
                    </div>
                  </td>
                  <td className="py-3.5">
                    <div className="font-semibold text-ink">
                      {offer.patient?.user?.full_name || `Patient #${offer.patient_id}`}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {offer.patient?.user?.phone || ""}
                    </div>
                  </td>
                  <td className="py-3.5">
                    {getOfferBadge(offer.status, offer.expires_at)}
                  </td>
                  <td className="py-3.5 text-right text-ink-muted font-sans text-xs">
                    {formatISTDateTime(offer.offered_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-ink-muted font-sans">
          No early slot offers dispatched yet. Offers trigger automatically when a doctor finishes a consultation early.
        </div>
      )}
    </div>
  );
}
