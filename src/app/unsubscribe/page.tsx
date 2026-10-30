"use client";

import React, { useState, useTransition, use } from "react";
import Link from "next/link";
import {
  unsubscribeEmailWithTokenAction,
  unsubscribeAllWithTokenAction,
} from "./actions";
import {
  Mail,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
} from "lucide-react";

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleUnsubscribeEmail = () => {
    if (!token) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await unsubscribeEmailWithTokenAction(token);
      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            "You have been successfully unsubscribed from Medrella email notifications.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to process unsubscribe request.",
        });
      }
    });
  };

  const handleUnsubscribeAll = () => {
    if (!token) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await unsubscribeAllWithTokenAction(token);
      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            "You have been successfully unsubscribed from all optional notifications.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to process unsubscribe request.",
        });
      }
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-sand/30 border border-warm-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-forest/10 rounded-full flex items-center justify-center mx-auto text-forest mb-2">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            Notification Preferences
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Manage your subscription to automated clinical communications from Medrella Healthcare.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback ? (
          <div
            className={`p-4 rounded-xl flex items-start gap-3 border text-xs sm:text-sm ${
              feedback.type === "success"
                ? "bg-sage/10 border-sage/30 text-forest"
                : "bg-terracotta/10 border-terracotta/30 text-terracotta"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-forest" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-terracotta" />
            )}
            <div className="space-y-2">
              <span className="font-medium block">{feedback.message}</span>
              <p className="text-[11px] text-ink-muted">
                You can log in to your patient sanctuary anytime to re-enable or adjust specific channels.
              </p>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline pt-1"
              >
                <span>Sign In to Medrella</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : !token ? (
          <div className="p-4 bg-terracotta/10 border border-terracotta/30 rounded-xl flex items-start gap-3 text-xs sm:text-sm text-terracotta">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Missing Unsubscribe Token</p>
              <p className="text-xs mt-1 text-ink-muted">
                Please use the direct unsubscribe link provided at the bottom of your email, or sign in to your Medrella account.
              </p>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center gap-1 text-xs font-bold text-forest mt-3 hover:underline"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-surface rounded-xl border border-warm-border text-xs text-ink-muted flex items-center gap-2">
              <Shield className="w-4 h-4 text-forest shrink-0" />
              <span>
                Authenticated via secure cryptographic token. No password required.
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleUnsubscribeEmail}
                disabled={isPending}
                className="btn-forest w-full text-xs py-3 justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Unsubscribe from Email Only</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleUnsubscribeAll}
                disabled={isPending}
                className="w-full text-xs py-2.5 px-4 rounded-xl border border-terracotta/30 text-terracotta hover:bg-terracotta/5 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Unsubscribe from All Notifications</span>
              </button>
            </div>

            <p className="text-[11px] text-ink-muted text-center pt-2">
              Need to customize specific notification types?{" "}
              <Link
                href="/auth/sign-in?redirect=/patient/dashboard"
                className="text-forest font-semibold hover:underline"
              >
                Sign in to your dashboard
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

