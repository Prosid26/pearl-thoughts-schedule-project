"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  X,
  Loader2,
} from "lucide-react";
import { InAppNotification, InAppNotificationCategory } from "@/types/database";
import {
  getMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/in-app-notification.actions";
import { formatISTDateTime } from "@/lib/utils/date";

interface NotificationBellProps {
  sessionRole?: "patient" | "doctor" | "admin";
  className?: string;
}

export function NotificationBell({
  sessionRole = "patient",
  className = "",
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Client hydration flag
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await getMyNotificationsAction({ limit: 30 });
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount ?? 0);
      }
    } catch {
      // Quiet fail on network hiccups
    }
  }, []);

  // Initial load + Real-time SSE listener with polling fallback
  useEffect(() => {
    let sse: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    loadNotifications();

    // 1. Establish Server-Sent Events (SSE) connection
    try {
      sse = new EventSource("/api/notifications/stream");

      sse.addEventListener("init", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.notifications) setNotifications(data.notifications);
          if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
        } catch {}
      });

      sse.addEventListener("update", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.notifications) setNotifications(data.notifications);
          if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
        } catch {}
      });

      sse.onerror = () => {
        // Fallback to polling if SSE encounters issues
        if (!pollInterval) {
          pollInterval = setInterval(loadNotifications, 7000);
        }
      };
    } catch {
      // Fallback to polling if SSE is unsupported
      pollInterval = setInterval(loadNotifications, 7000);
    }

    // 2. Active Window Focus Refresh
    const onWindowFocus = () => {
      loadNotifications();
    };
    window.addEventListener("focus", onWindowFocus);

    return () => {
      if (sse) sse.close();
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [loadNotifications]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notificationId: number
  ) => {
    e.stopPropagation();

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationReadAction(notificationId);
    } catch {
      // Background retry or refresh on next poll
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsReadAction();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (item: InAppNotification) => {
    if (!item.is_read) {
      // Mark as read optimistically
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === item.notification_id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationReadAction(item.notification_id).catch(() => {});
    }

    setIsOpen(false);

    if (item.action_url) {
      router.push(item.action_url);
    }
  };

  const getCategoryIcon = (category?: InAppNotificationCategory | string) => {
    switch (category) {
      case "booking":
        return {
          icon: CalendarCheck,
          bg: "bg-forest/10 text-forest",
        };
      case "cancellation":
        return {
          icon: AlertCircle,
          bg: "bg-rose-50 text-rose-600",
        };
      case "reschedule":
        return {
          icon: Clock,
          bg: "bg-amber-50 text-amber-700",
        };
      case "payment":
        return {
          icon: CreditCard,
          bg: "bg-emerald-50 text-emerald-700",
        };
      case "refund":
        return {
          icon: RotateCcw,
          bg: "bg-purple-50 text-purple-700",
        };
      case "reminder":
        return {
          icon: Clock,
          bg: "bg-blue-50 text-blue-700",
        };
      case "alert":
        return {
          icon: ShieldAlert,
          bg: "bg-amber-100 text-amber-800",
        };
      default:
        return {
          icon: Sparkles,
          bg: "bg-sage-light text-forest",
        };
    }
  };

  const viewAllUrl =
    sessionRole === "doctor"
      ? "/doctor/notifications"
      : "/patient/notifications";

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Bell Trigger Button */}
      <button
        ref={bellButtonRef}
        type="button"
        onClick={handleToggle}
        aria-label="Clinical notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all ${
          isOpen
            ? "bg-forest text-ivory shadow-xs"
            : "text-ink-muted hover:text-ink hover:bg-ivory-light border border-transparent hover:border-warm-border"
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Live Unread Badge */}
        {mounted && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-mono font-bold text-white shadow-xs ring-2 ring-white animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notification Center"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-warm-border shadow-xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-50 slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-4 bg-surface border-b border-warm-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-ink text-sm sm:text-base">
                Notifications
              </span>
              {mounted && unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-forest/10 text-forest">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {mounted && unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="text-[11px] font-medium text-forest hover:text-forest-dark flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-sand/40 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 border-b border-warm-border bg-ivory-light/40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filter === "all"
                  ? "bg-forest text-ivory shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-sand/40"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filter === "unread"
                  ? "bg-forest text-ivory shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-sand/40"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-warm-border-subtle max-h-96">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-sand/60 text-ink-muted flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <p className="text-xs font-medium text-ink">
                  {filter === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {filter === "unread"
                    ? "You are completely up to date with your schedule."
                    : "Clinical appointment updates and notices will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const config = getCategoryIcon(notif.category || notif.type);
                const IconComponent = config.icon;

                return (
                  <div
                    key={notif.notification_id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer group ${
                      !notif.is_read
                        ? "bg-sage-light/40 hover:bg-sage-light/80"
                        : "hover:bg-ivory-light/60"
                    }`}
                  >
                    {/* Category Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold truncate ${
                            !notif.is_read ? "text-ink font-bold" : "text-ink"
                          }`}
                        >
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span
                            className="w-2 h-2 rounded-full bg-forest shrink-0"
                            title="Unread"
                          />
                        )}
                      </div>

                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-warm-border-subtle/50 text-[10px] text-ink-muted">
                        <span>
                          {notif.created_at
                            ? formatISTDateTime(notif.created_at)
                            : ""}
                        </span>

                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                          {!notif.is_read && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleMarkAsRead(e, notif.notification_id)
                              }
                              className="text-[11px] font-medium text-forest hover:underline flex items-center gap-0.5"
                              title="Mark read"
                            >
                              <Check className="w-3 h-3" />
                              <span>Mark read</span>
                            </button>
                          )}
                          {notif.action_url && (
                            <span className="text-ink-muted hover:text-forest flex items-center gap-0.5 ml-1">
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-surface border-t border-warm-border text-center">
            <Link
              href={viewAllUrl}
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-forest hover:text-forest-dark transition-colors inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
