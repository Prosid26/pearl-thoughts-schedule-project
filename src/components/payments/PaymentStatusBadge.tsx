import React from "react";
import { AppointmentPaymentStatus } from "@/types/database";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface Props {
  status?: AppointmentPaymentStatus | string;
  size?: "sm" | "md";
  refundAmountFormatted?: string;
}

export function PaymentStatusBadge({
  status = "unpaid",
  size = "md",
  refundAmountFormatted,
}: Props) {
  const isSm = size === "sm";
  const sizeClasses = isSm
    ? "px-2 py-0.5 text-[10px] gap-1"
    : "px-2.5 py-1 text-xs gap-1.5";

  switch (status) {
    case "paid":
      return (
        <span
          className={`inline-flex items-center rounded-lg font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses}`}
        >
          <CheckCircle2 className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Paid</span>
        </span>
      );

    case "pending":
      return (
        <span
          className={`inline-flex items-center rounded-lg font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}
        >
          <Clock className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Payment Pending</span>
        </span>
      );

    case "refunded":
      return (
        <span
          className={`inline-flex items-center rounded-lg font-semibold bg-purple-50 text-purple-800 border border-purple-200/80 ${sizeClasses}`}
        >
          <RotateCcw className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Refunded {refundAmountFormatted ? `(${refundAmountFormatted})` : ""}</span>
        </span>
      );

    case "partially_refunded":
      return (
        <span
          className={`inline-flex items-center rounded-lg font-semibold bg-blue-50 text-blue-800 border border-blue-200/80 ${sizeClasses}`}
        >
          <RotateCcw className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Partial Refund {refundAmountFormatted ? `(${refundAmountFormatted})` : ""}</span>
        </span>
      );

    case "failed":
      return (
        <span
          className={`inline-flex items-center rounded-lg font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 ${sizeClasses}`}
        >
          <XCircle className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Payment Failed</span>
        </span>
      );

    case "unpaid":
    default:
      return (
        <span
          className={`inline-flex items-center rounded-lg font-medium bg-ivory-light text-ink-muted border border-warm-border ${sizeClasses}`}
        >
          <AlertCircle className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Unpaid</span>
        </span>
      );
  }
}

