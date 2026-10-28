"use client";

import React, { useState } from "react";
import { Doctor, User } from "@/types/database";
import { updateDoctorProfileAction } from "@/app/actions/doctor.actions";
import {
  User as UserIcon,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Award,
} from "lucide-react";
import { DoctorAvatar } from "./DoctorAvatar";

interface Props {
  doctor: Doctor;
  user: User;
}

export function DoctorProfileForm({ doctor, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateDoctorProfileAction(null, formData);

    if (res.success) {
      setSuccessMessage("Practitioner credentials updated in clinic registry.");
    } else {
      setErrorMessage(res.error || "Failed to update profile.");
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 clinic-card p-6 sm:p-8 max-w-2xl"
    >
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

      {/* Doctor Silhouette Preview Banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-sage/20 border border-warm-border">
        <DoctorAvatar doctor={doctor} size="lg" showActiveBadge />
        <div>
          <div className="font-serif text-base font-medium text-ink">
            {user.full_name}
          </div>
          <div className="text-xs text-forest font-semibold mt-0.5 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>{doctor.specialization} • Licensed Practitioner</span>
          </div>
          <p className="text-[11px] text-muted-text mt-1 leading-relaxed">
            Standard clinical healthcare silhouette placeholder active when custom headshot is not supplied.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Practitioner Full Name
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
            Medical Specialty
          </label>
          <select
            name="specialization"
            defaultValue={doctor.specialization}
            className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
          >
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Neurology">Neurology</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Gynecology">Gynecology</option>
            <option value="Dentistry">Dentistry</option>
            <option value="Psychiatry">Psychiatry</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Board Qualifications & Degrees
          </label>
          <input
            type="text"
            name="qualification"
            required
            defaultValue={doctor.qualification}
            className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-ink block mb-1.5">
              Years of Clinical Experience
            </label>
            <input
              type="number"
              name="experience_years"
              required
              min={0}
              defaultValue={doctor.experience_years}
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1.5">
              Consultation Fee (₹ INR)
            </label>
            <input
              type="number"
              name="consultation_fee"
              required
              min={50}
              step={50}
              defaultValue={Number(doctor.consultation_fee)}
              placeholder="e.g. 800"
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink font-mono"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Practice Clinic Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="clinic_address"
              defaultValue={doctor.clinic_address || ""}
              placeholder="e.g. Suite 402, Link Road, Andheri West, Mumbai"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-ink block mb-1.5">
            Clinical Background & Practice Overview
          </label>
          <textarea
            name="bio"
            rows={4}
            defaultValue={doctor.bio || ""}
            className="w-full px-3.5 py-2.5 rounded-xl border border-warm-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-ivory text-ink leading-relaxed"
          />
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
              <span>Updating Records...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Practitioner Profile</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
