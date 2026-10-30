"use client";

import React, { useState, useTransition } from "react";
import { PatientNotificationPreferences } from "@/types/database";
import {
  updatePreferencesAction,
  unsubscribeAllAction,
} from "@/app/actions/notification-preferences.actions";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Loader2,
  CalendarCheck,
  Clock,
  RefreshCw,
  CreditCard,
  RotateCcw,
} from "lucide-react";

interface Props {
  initialPreferences: PatientNotificationPreferences;
}

export function NotificationPreferencesSection({ initialPreferences }: Props) {
  const [prefs, setPrefs] =
    useState<PatientNotificationPreferences>(initialPreferences);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);

  const handleChannelToggle = (
    channel: "email_enabled" | "sms_enabled" | "whatsapp_enabled"
  ) => {
    setPrefs((prev) => {
      const nextVal = !prev[channel];
      const next = { ...prev, [channel]: nextVal };
      if (nextVal) {
        next.unsubscribed_all = false;
      }
      return next;
    });
    setFeedback(null);
  };

  const handleCategoryToggle = (
    category:
      | "appointment_confirmations"
      | "appointment_reminders"
      | "cancellation_rescheduling"
      | "payment_confirmations"
      | "refund_updates"
  ) => {
    setPrefs((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
    setFeedback(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.set("email_enabled", String(prefs.email_enabled));
    formData.set("sms_enabled", String(prefs.sms_enabled));
    formData.set("whatsapp_enabled", String(prefs.whatsapp_enabled));

    formData.set(
      "appointment_confirmations",
      String(prefs.appointment_confirmations)
    );
    formData.set(
      "appointment_reminders",
      String(prefs.appointment_reminders)
    );
    formData.set(
      "cancellation_rescheduling",
      String(prefs.cancellation_rescheduling)
    );
    formData.set(
      "payment_confirmations",
      String(prefs.payment_confirmations)
    );
    formData.set("refund_updates", String(prefs.refund_updates));

    formData.set("sms_consent", String(prefs.sms_consent));
    formData.set("whatsapp_consent", String(prefs.whatsapp_consent));

    startTransition(async () => {
      const result = await updatePreferencesAction(formData);
      if (result.success && result.preferences) {
        setPrefs(result.preferences);
        setFeedback({
          type: "success",
          message:
            result.message || "Notification preferences updated successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to update notification preferences.",
        });
      }
    });
  };

  const handleUnsubscribeAll = () => {
    setShowUnsubscribeModal(false);
    setFeedback(null);

    startTransition(async () => {
      const result = await unsubscribeAllAction();
      if (result.success && result.preferences) {
        setPrefs(result.preferences);
        setFeedback({
          type: "success",
          message:
            result.message ||
            "You have been unsubscribed from all optional notifications.",
        });
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to process unsubscribe request.",
        });
      }
    });
  };

  return (
    <section className="bg-sand/30 border border-warm-border rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4 text-forest" />
            <span>Communication Settings</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            Notification Preferences
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Customize which channels and notification categories you receive for your consultations.
          </p>
        </div>

        {prefs.unsubscribed_all ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta/10 text-terracotta border border-terracotta/20 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Globally Unsubscribed</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowUnsubscribeModal(true)}
            className="text-xs font-medium text-terracotta hover:text-terracotta-dark underline transition-colors self-start sm:self-center"
          >
            Unsubscribe from all notifications
          </button>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
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
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Notification Channels */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">
              1. Delivery Channels
            </h3>
            <span className="text-[11px] text-ink-muted">
              Select one or more active delivery channels
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Channel */}
            <div
              onClick={() => handleChannelToggle("email_enabled")}
              className={`cursor-pointer p-4 rounded-xl border transition-all ${
                prefs.email_enabled
                  ? "bg-forest/5 border-forest text-forest shadow-xs"
                  : "bg-surface border-warm-border text-ink-muted opacity-80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      prefs.email_enabled
                        ? "bg-forest text-ivory"
                        : "bg-sand text-ink-muted"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block text-ink">
                      Email
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Resend Cloud
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email_enabled}
                  onChange={() => {}}
                  className="rounded border-warm-border text-forest focus:ring-forest w-4 h-4"
                />
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Detailed appointment itineraries, clinic summaries, and official payment receipts.
              </p>
            </div>

            {/* SMS Channel */}
            <div
              onClick={() => handleChannelToggle("sms_enabled")}
              className={`cursor-pointer p-4 rounded-xl border transition-all ${
                prefs.sms_enabled
                  ? "bg-forest/5 border-forest text-forest shadow-xs"
                  : "bg-surface border-warm-border text-ink-muted opacity-80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      prefs.sms_enabled
                        ? "bg-forest text-ivory"
                        : "bg-sand text-ink-muted"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block text-ink">
                      SMS
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Twilio Telecom
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.sms_enabled}
                  onChange={() => {}}
                  className="rounded border-warm-border text-forest focus:ring-forest w-4 h-4"
                />
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Concise, high-priority arrival notices and immediate consultation changes.
              </p>
            </div>

            {/* WhatsApp Business Channel */}
            <div
              onClick={() => handleChannelToggle("whatsapp_enabled")}
              className={`cursor-pointer p-4 rounded-xl border transition-all ${
                prefs.whatsapp_enabled
                  ? "bg-forest/5 border-forest text-forest shadow-xs"
                  : "bg-surface border-warm-border text-ink-muted opacity-80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      prefs.whatsapp_enabled
                        ? "bg-[#25D366] text-white"
                        : "bg-sand text-ink-muted"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block text-ink">
                      WhatsApp
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Meta Cloud API
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.whatsapp_enabled}
                  onChange={() => {}}
                  className="rounded border-warm-border text-forest focus:ring-forest w-4 h-4"
                />
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Official WhatsApp Business appointment cards, reminders, and interactive confirmations.
              </p>
            </div>
          </div>

          {/* Regulatory Consent Disclosures for Telecommunication Channels */}
          {(prefs.sms_enabled || prefs.whatsapp_enabled) && (
            <div className="p-4 bg-surface rounded-xl border border-warm-border space-y-3 mt-3">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider block">
                Compliance & Messaging Consent
              </span>

              {prefs.sms_enabled && (
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={prefs.sms_consent}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        sms_consent: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-warm-border text-forest focus:ring-forest"
                  />
                  <span>
                    I give explicit consent to Medrella to send me transaction-critical appointment updates and urgent reminders via SMS.
                  </span>
                </label>
              )}

              {prefs.whatsapp_enabled && (
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={prefs.whatsapp_consent}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        whatsapp_consent: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-warm-border text-forest focus:ring-forest"
                  />
                  <span>
                    I consent to receiving official WhatsApp Business notifications. You can reply <strong>STOP</strong> at any time to instantly unsubscribe from WhatsApp.
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Notification Categories */}
        <div className="space-y-4 pt-4 border-t border-warm-border">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">
              2. Notification Categories
            </h3>
            <span className="text-[11px] text-ink-muted">
              Choose the types of updates you want to receive
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Appointment Confirmations */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-warm-border bg-surface hover:bg-surface/80 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={prefs.appointment_confirmations}
                onChange={() =>
                  handleCategoryToggle("appointment_confirmations")
                }
                className="mt-1 rounded border-warm-border text-forest focus:ring-forest"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <CalendarCheck className="w-3.5 h-3.5 text-forest" />
                  <span>Appointment Confirmations</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Booking verification with doctor details, clinic address, and time slot.
                </p>
              </div>
            </label>

            {/* Appointment Reminders */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-warm-border bg-surface hover:bg-surface/80 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={prefs.appointment_reminders}
                onChange={() =>
                  handleCategoryToggle("appointment_reminders")
                }
                className="mt-1 rounded border-warm-border text-forest focus:ring-forest"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <Clock className="w-3.5 h-3.5 text-forest" />
                  <span>Appointment Reminders</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Automated 24-hour and 2-hour advance reminders before scheduled arrival.
                </p>
              </div>
            </label>

            {/* Cancellation & Rescheduling */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-warm-border bg-surface hover:bg-surface/80 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={prefs.cancellation_rescheduling}
                onChange={() =>
                  handleCategoryToggle("cancellation_rescheduling")
                }
                className="mt-1 rounded border-warm-border text-forest focus:ring-forest"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <RefreshCw className="w-3.5 h-3.5 text-forest" />
                  <span>Cancellation & Rescheduling</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Notices when visits are rescheduled, cancelled, or slots are adjusted.
                </p>
              </div>
            </label>

            {/* Payment Confirmations */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-warm-border bg-surface hover:bg-surface/80 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={prefs.payment_confirmations}
                onChange={() =>
                  handleCategoryToggle("payment_confirmations")
                }
                className="mt-1 rounded border-warm-border text-forest focus:ring-forest"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <CreditCard className="w-3.5 h-3.5 text-forest" />
                  <span>Payment Receipts & Alerts</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Verified payment receipts, payment references, and retry alerts.
                </p>
              </div>
            </label>

            {/* Refund Updates */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-warm-border bg-surface hover:bg-surface/80 cursor-pointer transition-colors sm:col-span-2">
              <input
                type="checkbox"
                checked={prefs.refund_updates}
                onChange={() => handleCategoryToggle("refund_updates")}
                className="mt-1 rounded border-warm-border text-forest focus:ring-forest"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <RotateCcw className="w-3.5 h-3.5 text-forest" />
                  <span>Refund Status Updates</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Policy evaluation notices and bank settlement confirmations upon cancellation.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-warm-border">
          <p className="text-[11px] text-ink-muted text-center sm:text-left">
            Preferences take effect immediately for all upcoming consultations.
          </p>

          <button
            type="submit"
            disabled={isPending}
            className="btn-forest text-xs px-6 py-2.5 gap-2 w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Global Unsubscribe */}
      {showUnsubscribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 space-y-4 border border-warm-border shadow-xl">
            <div className="flex items-center gap-3 text-terracotta">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-serif text-lg font-bold text-ink">
                Unsubscribe From All Notifications?
              </h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              This will disable Email, SMS, and WhatsApp notifications and cancel all upcoming automated appointment reminders. You can re-enable channels individually at any time from this dashboard.
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowUnsubscribeModal(false)}
                className="btn-ivory text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnsubscribeAll}
                disabled={isPending}
                className="px-4 py-2 bg-terracotta text-white rounded-lg text-xs font-semibold hover:bg-terracotta-dark transition-colors"
              >
                {isPending ? "Processing..." : "Confirm Unsubscribe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

