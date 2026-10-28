import React from "react";
import { AppointmentStatus } from "@/types/database";
import { Clock, CheckCircle2, XCircle, AlertCircle, CheckCheck } from "lucide-react";

interface Props {
  status: AppointmentStatus;
  size?: "sm" | "md";
}

export function AppointmentStatusBadge({ status, size = "md" }: Props) {
  const configs: Record<
    AppointmentStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending Action",
      bg: "bg-terracotta-light",
      text: "text-ink font-semibold",
      border: "border-terracotta",
      icon: <Clock className={size === "sm" ? "w-3 h-3 text-terracotta-dark" : "w-3.5 h-3.5 text-terracotta-dark"} />,
    },
    confirmed: {
      label: "Confirmed",
      bg: "bg-sage-light",
      text: "text-forest font-bold",
      border: "border-sage-dark/70",
      icon: <CheckCircle2 className={size === "sm" ? "w-3 h-3 text-forest" : "w-3.5 h-3.5 text-forest"} />,
    },
    completed: {
      label: "Completed",
      bg: "bg-forest",
      text: "text-ivory font-bold",
      border: "border-forest-dark",
      icon: <CheckCheck className={size === "sm" ? "w-3 h-3 text-sage" : "w-3.5 h-3.5 text-sage"} />,
    },
    cancelled: {
      label: "Cancelled",
      bg: "bg-ivory-muted",
      text: "text-ink-muted font-medium",
      border: "border-warm-border",
      icon: <XCircle className={size === "sm" ? "w-3 h-3 text-ink-muted" : "w-3.5 h-3.5 text-ink-muted"} />,
    },
    rejected: {
      label: "Declined",
      bg: "bg-rose-50",
      text: "text-rose-800 font-medium",
      border: "border-rose-200",
      icon: <AlertCircle className={size === "sm" ? "w-3 h-3 text-rose-700" : "w-3.5 h-3.5 text-rose-700"} />,
    },
  };

  const c = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${c.bg} ${c.text} ${c.border} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
}
