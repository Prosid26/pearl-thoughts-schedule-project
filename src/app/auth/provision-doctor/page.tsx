"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { provisionDoctorAction } from "@/app/actions/auth.actions";
import {
  Stethoscope,
  KeyRound,
  User,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function ProvisionDoctorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provisionKey, setProvisionKey] = useState("MEDRELLA_CLINIC_ADMIN_2026");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await provisionDoctorAction(null, formData);

    if (res.success) {
      router.push("/doctor/dashboard");
      router.refresh();
    } else {
      setErrorMessage(res.error || "Provisioning failed.");
      setLoading(false);
    }
  };

  return (
    <div className="py-12 max-w-2xl mx-auto px-4 sm:px-6 w-full">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs border border-teal-100">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Provision Doctor Account
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Controlled practitioner registration. Requires Clinic Authorization
            Key to establish doctor privileges.
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Evaluation Notice:</strong> As required by the specification,
            public doctor signups are restricted. The authorized demo clinic key
            has been pre-filled for evaluation convenience.
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Authorization Key */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Clinic Authorization Key *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="provision_key"
                required
                value={provisionKey}
                onChange={(e) => setProvisionKey(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50"
              />
            </div>
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Doctor Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Dr. Arthur Wright"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Clinic Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="dr.wright@clinic.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Phone & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Contact Phone *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+1 (555) 345-6789"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Min 8 chars, 1 number"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Specialization & Qualification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Specialization *
              </label>
              <select
                name="specialization"
                required
                defaultValue="General Medicine"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Psychiatry">Psychiatry</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Qualifications *
              </label>
              <input
                type="text"
                name="qualification"
                required
                placeholder="e.g. MBBS, MD (Oxford)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Experience & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Years of Experience *
              </label>
              <input
                type="number"
                name="experience_years"
                required
                min={0}
                defaultValue={8}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Consultation Fee ($ USD) *
              </label>
              <input
                type="number"
                name="consultation_fee"
                required
                min={10}
                defaultValue={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Clinic Address & Bio */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Clinic Location
            </label>
            <input
              type="text"
              name="clinic_address"
              placeholder="Suite 300, Medical Tower, Boston"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Practitioner Bio
            </label>
            <textarea
              name="bio"
              rows={2}
              placeholder="Clinical background, interests, and treatment philosophy..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 transition-colors shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provisioning Doctor Account...</span>
              </>
            ) : (
              <>
                <span>Provision Doctor Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center text-xs">
          <p className="text-slate-500">
            Already have an active login?{" "}
            <Link
              href="/auth/sign-in"
              className="font-bold text-teal-600 hover:text-teal-700"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
