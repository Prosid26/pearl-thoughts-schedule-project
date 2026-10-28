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
  Stethoscope,
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            Waiting in Clinic
          </span>
        );
      case "called":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            Patient Called
          </span>
        );
      case "in_consultation":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
            In Consultation
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
      {/* Table Filters & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-extrabold text-slate-900">
            Clinic Waiting Queue ({filtered.length})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Doctor Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50"
            >
              <option value="all">All Doctors</option>
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
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50"
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
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-bold">Queue #</th>
                <th className="pb-3 font-bold">Patient Name & Contact</th>
                <th className="pb-3 font-bold">Attending Specialist</th>
                <th className="pb-3 font-bold">Check-In Time (IST)</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 font-bold text-right">Queue Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item, idx) => (
                <tr key={item.queue_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 font-mono font-bold text-slate-400">
                    #{item.queue_id}
                  </td>
                  <td className="py-4">
                    <div className="font-bold text-slate-900">{item.patient_name}</div>
                    <div className="text-[11px] text-slate-500">{item.patient_phone}</div>
                    {item.notes && (
                      <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                        &ldquo;{item.notes}&rdquo;
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="font-semibold text-slate-800">
                      {item.doctor?.user?.full_name || `Doctor #${item.doctor_id}`}
                    </div>
                    <div className="text-[11px] text-teal-600">
                      {item.doctor?.specialization}
                    </div>
                  </td>
                  <td className="py-4 text-slate-600 font-medium">
                    {formatISTDateTime(item.check_in_time)}
                  </td>
                  <td className="py-4">{getStatusBadge(item.status)}</td>
                  <td className="py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {item.status === "waiting" && (
                        <button
                          onClick={() => handleStatusChange(item.queue_id, "called")}
                          disabled={loadingId === item.queue_id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1"
                          title="Call patient into consultation room"
                        >
                          {loadingId === item.queue_id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <PhoneCall className="w-3 h-3" />
                          )}
                          <span>Call</span>
                        </button>
                      )}

                      {(item.status === "waiting" || item.status === "called") && (
                        <button
                          onClick={() => handleStatusChange(item.queue_id, "in_consultation")}
                          disabled={loadingId === item.queue_id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Mark patient currently consulting with doctor"
                        >
                          <Stethoscope className="w-3 h-3" />
                          <span>In Consult</span>
                        </button>
                      )}

                      {item.status === "in_consultation" && (
                        <button
                          onClick={() => handleStatusChange(item.queue_id, "completed")}
                          disabled={loadingId === item.queue_id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                      )}

                      {item.status !== "completed" && item.status !== "cancelled" && (
                        <button
                          onClick={() => handleStatusChange(item.queue_id, "cancelled")}
                          disabled={loadingId === item.queue_id}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Cancel/Remove from queue"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Waiting Patients</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The clinic waiting queue is currently clear for the selected filter.
            Click &ldquo;Check In Walk-In&rdquo; to add a new arriving patient.
          </p>
        </div>
      )}
    </div>
  );
}
