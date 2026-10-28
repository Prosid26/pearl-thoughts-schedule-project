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
      setSuccessMessage("Doctor profile details updated successfully.");
    } else {
      setErrorMessage(res.error || "Failed to update profile.");
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs max-w-2xl"
    >
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Doctor Silhouette Preview Banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-teal-50/50 border border-teal-100">
        <DoctorAvatar doctor={doctor} size="lg" showActiveBadge />
        <div>
          <div className="text-sm font-bold text-slate-900">
            {user.full_name}
          </div>
          <div className="text-xs text-teal-700 font-medium">
            {doctor.specialization} • Verified Doctor
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Automatic professional healthcare silhouette is displayed when no custom photo is uploaded.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Doctor Full Name
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="full_name"
              required
              defaultValue={user.full_name}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Medical Specialization
          </label>
          <select
            name="specialization"
            defaultValue={doctor.specialization}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
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
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Degrees & Qualifications
          </label>
          <input
            type="text"
            name="qualification"
            required
            defaultValue={doctor.qualification}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              name="experience_years"
              required
              min={0}
              defaultValue={doctor.experience_years}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Clinic Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="clinic_address"
              defaultValue={doctor.clinic_address || ""}
              placeholder="e.g. Suite 402, Link Road, Andheri West, Mumbai"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Doctor Bio & Specialty Description
          </label>
          <textarea
            name="bio"
            rows={4}
            defaultValue={doctor.bio || ""}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 transition-colors shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Profile...</span>
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
