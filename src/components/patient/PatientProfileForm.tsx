"use client";

import React, { useState } from "react";
import { Patient, User } from "@/types/database";
import { updatePatientProfileAction } from "@/app/actions/patient.actions";
import {
  User as UserIcon,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

interface Props {
  patient: Patient;
  user: User;
}

export function PatientProfileForm({ patient, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await updatePatientProfileAction(null, formData);

    if (res.success) {
      setSuccessMessage("Your profile information has been securely updated.");
    } else {
      setErrorMessage(res.error || "Failed to update profile.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 clinic-card p-6 sm:p-8 max-w-2xl">
      {successMessage && (
        <div className="p-3 bg-sage/40 border border-forest/20 rounded-xl flex items-center gap-2 text-xs text-forest">
          <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-terracotta/20 border border-terracotta/40 rounded-xl flex items-center gap-2 text-xs text-ink">
          <AlertCircle className="w-4 h-4 text-ink shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 rounded-xl bg-sage/20 border border-warm-border text-xs text-forest">
        <ShieldCheck className="w-4 h-4 text-forest shrink-0" />
        <span>Your patient record is safeguarded under strict clinic privacy protocols.</span>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="full_name"
              required
              defaultValue={user.full_name}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Registered Email (Primary Identity)
          </label>
          <input
            type="email"
            disabled
            value={user.email}
            className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border/60 bg-warm-border/30 text-muted-text text-xs sm:text-sm cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Phone Number (For WhatsApp / SMS Triage Alerts)
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="tel"
              name="phone"
              required
              defaultValue={user.phone}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-ink block mb-1.5">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                name="date_of_birth"
                defaultValue={patient.date_of_birth || ""}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1.5">
              Gender Identity
            </label>
            <select
              name="gender"
              defaultValue={patient.gender || ""}
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Residential Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="address"
              defaultValue={patient.address || ""}
              placeholder="e.g. 204 Silver Arch, Lokhandwala, Andheri West, Mumbai"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-forest inline-flex items-center gap-2 text-xs cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Updates...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Patient Record</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
