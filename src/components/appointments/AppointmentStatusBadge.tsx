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
      label: "Pending Confirmation",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
    },
    confirmed: {
      label: "Confirmed",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <CheckCircle2 className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
    },
    completed: {
      label: "Completed",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <CheckCheck className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
    },
    cancelled: {
      label: "Cancelled",
      bg: "bg-slate-100",
      text: "text-slate-600",
      border: "border-slate-200",
      icon: <XCircle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
    },
    rejected: {
      label: "Declined",
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      icon: <AlertCircle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
    },
  };

  const c = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${c.bg} ${c.text} ${c.border} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"
      }`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
}
