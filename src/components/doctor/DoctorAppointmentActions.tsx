"use client";

import React, { useState } from "react";
import { Appointment, AppointmentStatus } from "@/types/database";
import { updateAppointmentStatusAction } from "@/app/actions/appointment.actions";
import {
  CheckCircle2,
  XCircle,
  CheckCheck,
  Loader2,
} from "lucide-react";

interface Props {
  appointment: Appointment;
  onStatusUpdated?: (newStatus: AppointmentStatus) => void;
}

export function DoctorAppointmentActions({
  appointment,
  onStatusUpdated,
}: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (status: AppointmentStatus) => {
    setLoadingAction(status);
    const res = await updateAppointmentStatusAction(
      appointment.appointment_id,
      status
    );
    if (res.success) {
      if (onStatusUpdated) onStatusUpdated(status);
    } else {
      alert(res.error || "Failed to update appointment status.");
    }
    setLoadingAction(null);
  };

  return (
    <div className="flex items-center gap-2">
      {appointment.status === "pending" && (
        <>
          <button
            onClick={() => handleAction("confirmed")}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          >
            {loadingAction === "confirmed" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Accept & Confirm</span>
          </button>

          <button
            onClick={() => handleAction("rejected")}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
          >
            {loadingAction === "rejected" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Decline</span>
          </button>
        </>
      )}

      {appointment.status === "confirmed" && (
        <>
          <button
            onClick={() => handleAction("completed")}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
          >
            {loadingAction === "completed" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            <span>Mark Completed</span>
          </button>

          <button
            onClick={() => handleAction("cancelled")}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-colors"
          >
            {loadingAction === "cancelled" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            <span>Cancel</span>
          </button>
        </>
      )}
    </div>
  );
}
