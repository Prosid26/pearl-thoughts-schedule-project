"use client";

import React, { useState, useEffect, useCallback } from "react";
import { InAppNotification } from "@/types/database";
import {
  getMyNotificationsAction,
  markNotificationReadAction,
} from "@/app/actions/early-appointment.actions";
import {
  Bell,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatISTDateTime } from "@/lib/utils/date";

export function PatientNotificationsPanel() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getMyNotificationsAction();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch {
      // Ignore poll error
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 6000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    await markNotificationReadAction(notificationId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      )
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
            <h3 className="font-serif text-base font-bold text-ink">
              Clinical Notification Center
            </h3>
            <p className="text-xs text-ink-muted font-sans">
              {unreadCount > 0
                ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""} on earlier appointment availability`
                : "All caught up. No unread clinical notifications."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-forest">
          <span>{isExpanded ? "Hide" : "Review"} ({notifications.length})</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-ink-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-muted" />
          )}
        </div>
      </div>

      {/* Expanded Notifications List */}
      {isExpanded && (
        <div className="border-t border-warm-border divide-y divide-warm-border-subtle max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.notification_id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  !notif.is_read ? "bg-sage-light/60" : "bg-white hover:bg-ivory-light/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notif.type === "early_offer" && (
                      <span className="w-7 h-7 rounded-md bg-terracotta text-ink flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-forest" />
                      </span>
                    )}
                    {notif.type === "offer_accepted" && (
                      <span className="w-7 h-7 rounded-md bg-sage text-forest flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                      </span>
                    )}
                    {(notif.type === "offer_expired" ||
                      notif.type === "offer_declined") && (
                      <span className="w-7 h-7 rounded-md bg-ivory-muted text-ink flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-ink-muted" />
                      </span>
                    )}
                    {notif.type !== "early_offer" &&
                      notif.type !== "offer_accepted" &&
                      notif.type !== "offer_expired" &&
                      notif.type !== "offer_declined" && (
                        <span className="w-7 h-7 rounded-md bg-sage-light text-forest flex items-center justify-center shrink-0">
                          <AlertCircle className="w-3.5 h-3.5 text-forest" />
                        </span>
                      )}
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
                    <div className="text-[10px] text-ink-muted font-medium pt-0.5">
                      {formatISTDateTime(notif.created_at)}
                    </div>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.notification_id)}
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
