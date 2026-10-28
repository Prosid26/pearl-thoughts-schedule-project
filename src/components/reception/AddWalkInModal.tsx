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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-warm-border overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-forest text-ivory flex items-center justify-between border-b border-forest-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#182821] text-sage flex items-center justify-center border border-sage-dark/40 font-bold">
              <UserPlus className="w-5 h-5 text-sage" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Check In Walk-In Patient</h3>
              <p className="text-xs text-sage font-sans">
                Triage patient to clinic live waiting queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-sage hover:text-white hover:bg-forest-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Doctor Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5 font-sans">
              <Stethoscope className="w-3.5 h-3.5 text-forest" />
              <span>Attending Specialist *</span>
            </label>
            <select
              name="doctor_id"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            >
              <option value="">Select Practitioner</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.user?.full_name || `Doctor #${d.doctor_id}`} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Patient Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5 font-sans">
              <User className="w-3.5 h-3.5 text-forest" />
              <span>Patient Full Name *</span>
            </label>
            <input
              type="text"
              name="patient_name"
              required
              placeholder="e.g. Vikram Malhotra"
              className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Patient Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5 font-sans">
              <Phone className="w-3.5 h-3.5 text-forest" />
              <span>Contact Phone Number *</span>
            </label>
            <input
              type="tel"
              name="patient_phone"
              required
              placeholder="e.g. +91 98111 22334"
              className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Clinical Reason / Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5 font-sans">
              <FileText className="w-3.5 h-3.5 text-forest" />
              <span>Triage Notes & Symptoms</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Acute hypertension, walk-in consultation, BP 145/95"
              className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-ivory text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-forest text-xs px-5 py-2.5 font-bold shadow-xs flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-ivory" />
                  <span>Checking In...</span>
                </>
              ) : (
                <span>Check In to Queue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
