"use client";

import React, { useState } from "react";
import { WaitingQueueEntry, WaitingQueueStatus, Doctor } from "@/types/database";
import { updateWaitingQueueStatusAction } from "@/app/actions/early-appointment.actions";
import {
  Users,
  PhoneCall,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatISTDateTime } from "@/lib/utils/date";

interface Props {
  queue: WaitingQueueEntry[];
  doctors: Doctor[];
}

export function WaitingQueueTable({ queue, doctors }: Props) {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const router = useRouter();

  const handleStatusChange = async (
    queueId: number,
    newStatus: WaitingQueueStatus
  ) => {
    setLoadingId(queueId);
    const res = await updateWaitingQueueStatusAction(queueId, newStatus);
    if (!res.success) {
      alert(res.error || "Failed to update queue status.");
    }
    setLoadingId(null);
    router.refresh();
  };

  const filtered = queue.filter((item) => {
    if (selectedDoctor !== "all" && item.doctor_id !== Number(selectedDoctor)) {
      return false;
    }
    if (selectedStatus !== "all" && item.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: WaitingQueueStatus) => {
    switch (status) {
      case "waiting":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-terracotta-light text-ink border border-terracotta">
            Waiting in Clinic
          </span>
        );
      case "called":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sage-light text-forest border border-sage-dark/80">
            Patient Called
          </span>
        );
      case "in_consultation":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-forest text-ivory border border-forest-dark">
            In Consultation
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-ivory-muted text-ink border border-warm-border">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="clinic-card overflow-hidden space-y-4 p-6 sm:p-7">
      {/* Table Filters & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-warm-border">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-forest" />
          <h2 className="font-serif text-lg font-bold text-ink">
            Live Waiting Queue ({filtered.length})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Doctor Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-ink-muted" />
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-warm-border text-xs font-medium text-ink bg-white focus:outline-none focus:border-forest"
            >
              <option value="all">All Physicians</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.user?.full_name || `Doctor #${d.doctor_id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-warm-border text-xs font-medium text-ink bg-white focus:outline-none focus:border-forest"
          >
            <option value="all">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="called">Called</option>
            <option value="in_consultation">In Consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Queue Table */}
      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-warm-border-subtle text-ink-muted uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-bold">Queue #</th>
                <th className="pb-3 font-bold">Patient Details</th>
                <th className="pb-3 font-bold">Assigned Specialist</th>
                <th className="pb-3 font-bold">Check-In Time</th>
                <th className="pb-3 font-bold">Current Status</th>
                <th className="pb-3 font-bold text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border-subtle">
              {filtered.map((item) => {
                const doc = doctors.find((d) => d.doctor_id === item.doctor_id);
                const isLoading = loadingId === item.queue_id;

                return (
                  <tr key={item.queue_id} className="hover:bg-ivory-light/60 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-forest text-xs">
                      #{String(item.queue_id).padStart(3, "0")}
                    </td>

                    <td className="py-3.5">
                      <div className="font-serif font-bold text-ink text-sm">
                        {item.patient_name}
                      </div>
                      <div className="text-[11px] text-ink-muted font-sans">
                        {item.patient_phone}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-ink-muted italic font-sans max-w-xs truncate mt-0.5">
                          &ldquo;{item.notes}&rdquo;
                        </div>
                      )}
                    </td>

                    <td className="py-3.5">
                      <div className="font-semibold text-ink">
                        {doc?.user?.full_name || `Doctor #${item.doctor_id}`}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {doc?.specialization}
                      </div>
                    </td>

                    <td className="py-3.5 text-ink-muted font-sans text-xs">
                      {formatISTDateTime(item.check_in_time)}
                    </td>

                    <td className="py-3.5">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3.5 text-right">
                      {isLoading ? (
                        <div className="flex justify-end">
                          <Loader2 className="w-4 h-4 animate-spin text-forest" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "waiting" && (
                            <button
                              onClick={() => handleStatusChange(item.queue_id, "called")}
                              className="btn-ivory text-[11px] px-2.5 py-1 gap-1"
                              title="Call patient to consultation room"
                            >
                              <PhoneCall className="w-3 h-3 text-forest" />
                              <span>Call</span>
                            </button>
                          )}

                          {item.status === "called" && (
                            <button
                              onClick={() => handleStatusChange(item.queue_id, "in_consultation")}
                              className="btn-forest text-[11px] px-2.5 py-1 gap-1 font-bold"
                              title="Mark consultation in progress"
                            >
                              <Clock className="w-3 h-3 text-sage" />
                              <span>Start Consult</span>
                            </button>
                          )}

                          {item.status === "in_consultation" && (
                            <button
                              onClick={() => handleStatusChange(item.queue_id, "completed")}
                              className="btn-ivory text-[11px] px-2.5 py-1 gap-1 font-bold text-forest"
                              title="Mark consultation completed"
                            >
                              <CheckCircle className="w-3 h-3 text-forest" />
                              <span>Complete</span>
                            </button>
                          )}

                          {item.status !== "completed" && item.status !== "cancelled" && (
                            <button
                              onClick={() => handleStatusChange(item.queue_id, "cancelled")}
                              className="text-[11px] text-rose-700 hover:text-rose-900 px-1.5 py-1"
                              title="Cancel queue entry"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-ink-muted font-sans space-y-1">
          <p className="font-semibold text-ink">No patients currently in this queue view.</p>
          <p>Use the &ldquo;Check In Walk-In Patient&rdquo; button above to triage arrival patients.</p>
        </div>
      )}
    </div>
  );
}
