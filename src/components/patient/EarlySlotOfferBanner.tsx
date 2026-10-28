"use client";

import React, { useState, useEffect, useCallback } from "react";
import { EarlySlotOffer } from "@/types/database";
import {
  getActivePatientOfferAction,
  acceptEarlyOfferAction,
  declineEarlyOfferAction,
} from "@/app/actions/early-appointment.actions";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Stethoscope,
} from "lucide-react";
import { formatTime12h, formatCountdown, getRemainingSeconds } from "@/lib/utils/date";
import { useRouter } from "next/navigation";

interface Props {
  initialOffer?: EarlySlotOffer | null;
}

export function EarlySlotOfferBanner({ initialOffer = null }: Props) {
  const [offer, setOffer] = useState<EarlySlotOffer | null>(initialOffer);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [loadingAction, setLoadingAction] = useState<"accept" | "decline" | null>(
    null
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const router = useRouter();

  // Poll for active offers every 4 seconds
  const fetchActiveOffer = useCallback(async () => {
    try {
      const res = await getActivePatientOfferAction();
      if (res.success) {
        setOffer(res.data || null);
        if (res.data) {
          setSecondsRemaining(getRemainingSeconds(res.data.expires_at));
        }
      }
    } catch {
      // Ignore background poll errors
    }
  }, []);

  useEffect(() => {
    if (initialOffer) {
      setOffer(initialOffer);
      setSecondsRemaining(getRemainingSeconds(initialOffer.expires_at));
    } else {
      fetchActiveOffer();
    }

    const pollInterval = setInterval(fetchActiveOffer, 4000);
    return () => clearInterval(pollInterval);
  }, [initialOffer, fetchActiveOffer]);

  // Countdown timer ticking down every second
  useEffect(() => {
    if (!offer) return;

    const timer = setInterval(() => {
      const remaining = getRemainingSeconds(offer.expires_at);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        // Expired!
        clearInterval(timer);
        setOffer(null);
        setStatusMessage("The earlier slot offer has expired and was offered to the next patient.");
        fetchActiveOffer();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [offer, fetchActiveOffer]);

  const handleAccept = async () => {
    if (!offer) return;
    setLoadingAction("accept");
    setStatusMessage(null);

    const res = await acceptEarlyOfferAction(offer.offer_id);
    if (res.success) {
      setStatusMessage("Congratulations! Your appointment has been moved to the earlier slot.");
      setOffer(null);
      router.refresh();
    } else {
      alert(res.error || "Failed to accept earlier slot offer.");
    }
    setLoadingAction(null);
  };

  const handleDecline = async () => {
    if (!offer) return;
    setLoadingAction("decline");
    setStatusMessage(null);

    const res = await declineEarlyOfferAction(offer.offer_id);
    if (res.success) {
      setStatusMessage("Offer declined. Your original appointment remains unchanged.");
      setOffer(null);
      router.refresh();
    } else {
      alert(res.error || "Failed to decline offer.");
    }
    setLoadingAction(null);
  };

  if (!offer && !statusMessage) {
    return null;
  }

  return (
    <div className="space-y-3">
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] text-teal-700 hover:text-teal-900 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {offer && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-7 text-white shadow-xl border border-emerald-400/40 animate-in fade-in slide-in-from-top-3">
          {/* Top Badge & Countdown Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/15">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>EARLIER APPOINTMENT OFFER AVAILABLE</span>
              </span>
            </div>

            {/* Live Countdown */}
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 self-start sm:self-auto">
              <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">
                Offer Expires In:
              </span>
              <span className="font-mono text-sm font-extrabold text-amber-300">
                {formatCountdown(secondsRemaining)}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 items-center">
            {/* Doctor Info */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                <Stethoscope className="w-6 h-6 text-teal-200" />
              </div>
              <div>
                <div className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">
                  Attending Doctor
                </div>
                <div className="text-base font-extrabold text-white">
                  {offer.doctor?.user?.full_name || "Doctor"}
                </div>
                <div className="text-xs text-teal-200">
                  {offer.doctor?.specialization}
                </div>
              </div>
            </div>

            {/* Offered Time Slot */}
            <div>
              <div className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">
                Offered Earlier Time (IST)
              </div>
              <div className="text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>{offer.slot?.available_date}</span>
              </div>
              <div className="text-xs font-semibold text-emerald-200">
                {offer.slot?.start_time ? formatTime12h(offer.slot.start_time) : ""}{" "}
                -{" "}
                {offer.slot?.end_time ? formatTime12h(offer.slot.end_time) : ""}
              </div>
            </div>

            {/* Clinic Location */}
            <div>
              <div className="text-[10px] text-teal-200 uppercase font-bold tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-300" /> Clinic Location
              </div>
              <div className="text-xs text-slate-200 mt-0.5 line-clamp-2">
                {offer.doctor?.clinic_address || "Medrella Healthcare Clinic, Mumbai"}
              </div>
              <div className="text-[11px] text-emerald-200/90 mt-1 font-medium">
                ✓ No extra charge • Original booking fee preserved
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-200 leading-tight">
              Dr. {offer.doctor?.user?.full_name || "Doctor"} finished an earlier visit ahead of schedule.
              Would you like to move up your appointment?
            </p>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleDecline}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                {loadingAction === "decline" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Decline Offer</span>
              </button>

              <button
                onClick={handleAccept}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 active:scale-95"
              >
                {loadingAction === "accept" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Reserving Earlier Slot...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                    <span>Accept Earlier Slot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
