"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  AlertCircle,
  Clock,
  CreditCard,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Check,
  CheckCheck,
  ExternalLink,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { InAppNotification, InAppNotificationCategory } from "@/types/database";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/in-app-notification.actions";
import { formatISTDateTime } from "@/lib/utils/date";

interface NotificationListProps {
  initialNotifications: InAppNotification[];
  role: "patient" | "doctor" | "admin";
  backUrl: string;
  backLabel: string;
}

export function NotificationList({
  initialNotifications,
  role,
  backUrl,
  backLabel,
}: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<InAppNotification[]>(initialNotifications);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );

    startTransition(async () => {
      await markNotificationReadAction(notificationId);
      router.refresh();
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }))
    );

    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  const getCategoryIcon = (category?: InAppNotificationCategory | string) => {
    switch (category) {
      case "booking":
        return {
          icon: CalendarCheck,
          bg: "bg-forest/10 text-forest border-forest/20",
          label: "Booking",
        };
      case "cancellation":
        return {
          icon: AlertCircle,
          bg: "bg-rose-50 text-rose-600 border-rose-200",
          label: "Cancellation",
        };
      case "reschedule":
        return {
          icon: Clock,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Reschedule",
        };
      case "payment":
        return {
          icon: CreditCard,
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Payment",
        };
      case "refund":
        return {
          icon: RotateCcw,
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          label: "Refund",
        };
      case "reminder":
        return {
          icon: Clock,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Reminder",
        };
      case "alert":
        return {
          icon: ShieldAlert,
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          label: "Clinical Alert",
        };
      default:
        return {
          icon: Sparkles,
          bg: "bg-sage-light text-forest border-sage",
          label: "Notice",
        };
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Status filter
      if (statusFilter === "unread" && item.is_read) return false;

      // Category filter
      if (activeCategory !== "all") {
        const cat = item.category || item.type;
        if (cat !== activeCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const messageMatch = item.message.toLowerCase().includes(query);
        if (!titleMatch && !messageMatch) return false;
      }

      return true;
    });
  }, [notifications, statusFilter, activeCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border">
        <div>
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-forest transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {backLabel}</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Clinical Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-forest text-ivory">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Track real-time appointment updates, payment receipts, schedule adjustments, and clinic reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="btn-forest text-xs px-3.5 py-2 gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-warm-border">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "booking", label: "Bookings" },
            { id: "reminder", label: "Reminders" },
            { id: "reschedule", label: "Reschedules" },
            { id: "cancellation", label: "Cancellations" },
            { id: "payment", label: "Payments" },
            { id: "refund", label: "Refunds" },
            { id: "alert", label: "Alerts" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-forest text-ivory shadow-xs"
                  : "text-ink-muted hover:text-ink hover:bg-sand/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Status Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-warm-border bg-white text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div className="flex items-center bg-sand/30 rounded-xl p-0.5 border border-warm-border">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-white text-ink shadow-2xs font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unread")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                statusFilter === "unread"
                  ? "bg-white text-forest shadow-2xs font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Unread
            </button>
          </div>
        </div>
      </div>

      {/* Notification Stream Cards */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="clinic-card p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sand/60 text-ink-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="font-serif text-base font-bold text-ink">
              No notifications found
            </h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matched "${searchQuery}". Try a different filter.`
                : statusFilter === "unread"
                ? "You have addressed all your clinical notifications."
                : "Clinical messages and alerts will appear here as appointments progress."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const config = getCategoryIcon(notif.category || notif.type);
            const IconComponent = config.icon;

            return (
              <div
                key={notif.notification_id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  !notif.is_read
                    ? "bg-sage-light/30 border-forest/30 shadow-xs"
                    : "bg-surface border-warm-border hover:border-warm-border/80"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category Pill Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${config.bg}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            !notif.is_read
                              ? "font-bold text-ink"
                              : "font-semibold text-ink"
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sand/50 text-ink-muted border border-warm-border">
                          {config.label}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-forest shrink-0" />
                        )}
                      </div>

                      <span className="text-xs text-ink-muted shrink-0">
                        {notif.created_at
                          ? formatISTDateTime(notif.created_at)
                          : ""}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-warm-border-subtle">
                      <div className="flex items-center gap-3">
                        {notif.action_url && (
                          <Link
                            href={notif.action_url}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:text-forest-dark hover:underline transition-colors"
                          >
                            <span>Open Related Record</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={() =>
                              handleMarkAsRead(notif.notification_id)
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:text-forest-dark hover:bg-forest/10 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
