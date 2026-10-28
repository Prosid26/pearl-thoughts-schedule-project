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
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatISTDateTime } from "@/lib/utils/date";

export function PatientNotificationsPanel() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5 text-teal-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              In-App Notification Center
            </h3>
            <p className="text-xs text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""} regarding earlier appointment opportunities`
                : "All caught up! No unread notifications."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
          <span>{isExpanded ? "Hide" : "View"} ({notifications.length})</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Notifications List */}
      {isExpanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.notification_id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !notif.is_read ? "bg-teal-50/40" : "bg-white hover:bg-slate-50/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notif.type === "early_offer" && (
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      </span>
                    )}
                    {notif.type === "offer_accepted" && (
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                    )}
                    {(notif.type === "offer_expired" ||
                      notif.type === "offer_declined") && (
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                    )}
                    {notif.type === "general" && (
                      <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-600 text-white uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="text-[10px] text-slate-400">
                      {formatISTDateTime(notif.created_at)}
                    </div>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.notification_id)}
                    className="shrink-0 p-1.5 text-xs text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No notifications yet. When earlier slots or booking updates occur, they will appear here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
