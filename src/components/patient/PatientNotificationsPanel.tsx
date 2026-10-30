"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InAppNotification } from "@/types/database";
import {
  getMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/in-app-notification.actions";
import {
  Bell,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  CreditCard,
  RotateCcw,
  ShieldAlert,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import { formatISTDateTime } from "@/lib/utils/date";

export function PatientNotificationsPanel() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getMyNotificationsAction({ limit: 20 });
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch {
      // Ignore poll error
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 7000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notificationId: number
  ) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      )
    );
    await markNotificationReadAction(notificationId);
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsReadAction();
  };

  const handleItemClick = (notif: InAppNotification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notif.notification_id
            ? { ...n, is_read: true }
            : n
        )
      );
      markNotificationReadAction(notif.notification_id).catch(() => {});
    }

    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getCategoryIcon = (category?: string, type?: string) => {
    const key = category || type;
    switch (key) {
      case "booking":
        return <CalendarCheck className="w-3.5 h-3.5 text-forest" />;
      case "cancellation":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      case "reschedule":
        return <Clock className="w-3.5 h-3.5 text-amber-700" />;
      case "payment":
        return <CreditCard className="w-3.5 h-3.5 text-emerald-700" />;
      case "refund":
        return <RotateCcw className="w-3.5 h-3.5 text-purple-700" />;
      case "reminder":
        return <Clock className="w-3.5 h-3.5 text-blue-700" />;
      case "alert":
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-800" />;
      case "early_offer":
        return <Sparkles className="w-3.5 h-3.5 text-terracotta" />;
      case "offer_accepted":
        return <CheckCircle2 className="w-3.5 h-3.5 text-forest" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-forest" />;
    }
  };

  return (
    <div className="clinic-card overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-ivory-light transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 rounded-lg bg-sage text-forest flex items-center justify-center font-bold">
            <Bell className="w-5 h-5 text-forest" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-forest text-ivory text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-ink">
                Clinical Notification Center
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest/10 text-forest">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted font-sans">
              {unreadCount > 0
                ? `${unreadCount} unread appointment and consultation updates`
                : "All caught up. No unread clinical notifications."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-forest">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-[11px] font-medium text-forest hover:text-forest-dark flex items-center gap-1 py-1 px-2 rounded hover:bg-sand/40"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <Link
            href="/patient/notifications"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] font-medium text-ink-muted hover:text-forest flex items-center gap-1 py-1 px-2 rounded hover:bg-sand/40"
          >
            <span>View all</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <div className="flex items-center gap-1">
            <span>{isExpanded ? "Hide" : "Review"} ({notifications.length})</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-ink-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ink-muted" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Notifications List */}
      {isExpanded && (
        <div className="border-t border-warm-border divide-y divide-warm-border-subtle max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.notification_id}
                onClick={() => handleItemClick(notif)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                  !notif.is_read ? "bg-sage-light/60 hover:bg-sage-light/80" : "bg-white hover:bg-ivory-light/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <span className="w-7 h-7 rounded-md bg-white border border-warm-border flex items-center justify-center shrink-0">
                      {getCategoryIcon(notif.category, notif.type)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm font-bold text-ink">
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-forest text-ivory uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed font-sans">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-ink-muted font-medium pt-0.5">
                      <span>{formatISTDateTime(notif.created_at)}</span>
                      {notif.action_url && (
                        <span className="text-forest flex items-center gap-0.5">
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={(e) => handleMarkAsRead(e, notif.notification_id)}
                    className="text-[11px] font-semibold text-forest hover:text-forest-dark shrink-0 underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-ink-muted font-sans">
              No notifications on record yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
