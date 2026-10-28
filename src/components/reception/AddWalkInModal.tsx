"use client";

import React, { useState } from "react";
import { Doctor } from "@/types/database";
import { addToWaitingQueueAction } from "@/app/actions/early-appointment.actions";
import {
  UserPlus,
  X,
  Loader2,
  Stethoscope,
  Phone,
  User,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  doctors: Doctor[];
  isOpen: boolean;
  onClose: () => void;
}

export function AddWalkInModal({ doctors, isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await addToWaitingQueueAction(null, formData);

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(res.error || "Failed to add walk-in patient to queue.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/50 flex items-center justify-center text-teal-200 border border-teal-500/40">
              <UserPlus className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Check In Walk-In Patient</h3>
              <p className="text-xs text-teal-200">
                Add patient to clinic live waiting queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Doctor Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>Attending Doctor *</span>
            </label>
            <select
              name="doctor_id"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-slate-50/50"
            >
              <option value="">Select Doctor</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.user?.full_name || `Doctor #${d.doctor_id}`} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Patient Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Patient Full Name *</span>
            </label>
            <input
              type="text"
              name="patient_name"
              required
              placeholder="e.g. Vikram Malhotra"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Patient Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              <span>Contact Phone Number *</span>
            </label>
            <input
              type="tel"
              name="patient_phone"
              required
              placeholder="e.g. +91 98111 22334"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Clinical Reason / Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Reason / Clinical Triage Notes</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Walk-in consultation for chest discomfort follow-up."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm shadow-teal-700/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking in...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Check In Walk-In</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
