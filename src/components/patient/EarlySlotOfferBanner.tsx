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
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  ArrowRight,
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
        setStatusMessage("The earlier slot offer has expired and was offered to the next eligible patient.");
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
      setStatusMessage("Earlier slot confirmed! Your appointment has been moved successfully without extra charges.");
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
      setStatusMessage("Offer declined. Your original scheduled consultation remains unchanged.");
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
        <div className="p-4 rounded-xl bg-sage-light border border-sage-dark/80 text-forest text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] text-forest hover:text-forest-dark font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {offer && (
        <div className="relative overflow-hidden rounded-2xl bg-forest border border-terracotta/40 p-5 sm:p-6 text-ivory shadow-sm animate-in fade-in slide-in-from-top-2">
          {/* Top Badge & Countdown Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-forest-light/60">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-terracotta text-ink tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-forest" />
                <span>Expedited Slot Available</span>
              </span>
              <span className="text-xs text-sage font-medium hidden sm:inline">
                A prior consultation completed ahead of schedule
              </span>
            </div>

            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#182821] border border-terracotta/40 text-terracotta text-xs font-mono font-bold self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-terracotta animate-pulse" />
              <span>Response Window: {formatCountdown(secondsRemaining)}</span>
            </div>
          </div>

          {/* Core Opportunity Details */}
          <div className="py-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-8 space-y-1.5">
              <div className="text-[11px] text-sage font-semibold uppercase tracking-wider">
                Physician Availability
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight">
                {offer.doctor?.user?.full_name || "Doctor"}
              </h3>
              <p className="text-xs text-[#BAC8BF]">
                {offer.doctor?.specialization} • {offer.doctor?.qualification}
              </p>

              {offer.doctor?.clinic_address && (
                <div className="flex items-center gap-1.5 text-xs text-[#BAC8BF] pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-sage shrink-0" />
                  <span>{offer.doctor.clinic_address}</span>
                </div>
              )}

              {/* Time Shift Comparison */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
                {offer.original_appointment && (
                  <div className="px-3 py-1 rounded-md bg-[#1D3128] border border-warm-border/20 text-[#8EA094] line-through text-[11px]">
                    Original: {new Date(offer.original_appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#182821] border border-terracotta/50 text-white font-medium text-xs">
                  <Calendar className="w-3.5 h-3.5 text-terracotta" />
                  <span>
                    New Slot: {offer.slot?.available_date} @ {formatTime12h(offer.slot?.start_time || "")} IST
                  </span>
                </div>
              </div>
            </div>

            {/* Accept / Decline Action Group */}
            <div className="md:col-span-4 flex flex-col gap-2">
              <button
                disabled={loadingAction !== null}
                onClick={handleAccept}
                className="btn-terracotta w-full py-2.5 text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingAction === "accept" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-ink" />
                    <span>Confirming Earlier Slot...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    <span>Accept Earlier Slot</span>
                  </>
                )}
              </button>

              <button
                disabled={loadingAction !== null}
                onClick={handleDecline}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium text-ivory/80 hover:text-white bg-[#1D3128] hover:bg-[#253D32] border border-warm-border/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingAction === "decline" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Keep Original Appointment</span>
                )}
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-forest-light/60 text-[11px] text-[#BAC8BF] flex items-center justify-between">
            <span>
              Your original appointment remains secured unless you accept. No extra fees.
            </span>
            <span className="font-semibold text-terracotta text-[10px] uppercase tracking-wider">
              Atomic Booking Guarantee
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
