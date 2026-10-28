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
      <div className="clinic-card p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-sage text-forest flex items-center justify-center mx-auto border border-sage-dark/60">
            <Stethoscope className="w-5 h-5 text-forest" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Practitioner Provisioning
          </h1>
          <p className="text-xs text-ink-muted max-w-md mx-auto font-sans">
            Controlled physician onboarding. Requires clinic administrative key
            to establish verified doctor credentials.
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 bg-ivory-light border border-warm-border rounded-lg flex items-start gap-2.5 text-xs text-ink">
          <ShieldCheck className="w-4 h-4 text-forest shrink-0 mt-0.5" />
          <div className="font-sans leading-relaxed text-ink-muted">
            <strong className="text-ink">Administrative Evaluation:</strong> As required by the
            specification, public doctor signups are restricted. The authorized demo
            clinic key has been pre-filled for convenience.
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {/* Authorization Key */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              Clinic Authorization Key *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="provision_key"
                required
                value={provisionKey}
                onChange={(e) => setProvisionKey(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm font-mono bg-ivory-light text-forest font-bold focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Doctor Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Dr. Arthur Wright"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Clinic Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="dr.sharma@clinic.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>
          </div>

          {/* Phone & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Contact Phone *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+91 98201 23456"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Min 8 chars, 1 number"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>
          </div>

          {/* Specialization & Qualification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Specialization *
              </label>
              <select
                name="specialization"
                required
                defaultValue="General Medicine"
                className="w-full px-3 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
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
              <label className="text-xs font-bold text-ink block mb-1">
                Qualifications *
              </label>
              <input
                type="text"
                name="qualification"
                required
                placeholder="e.g. MBBS, MD, DM (AIIMS)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          {/* Experience & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Years of Experience *
              </label>
              <input
                type="number"
                name="experience_years"
                required
                min={0}
                defaultValue={8}
                className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Consultation Fee (₹ INR) *
              </label>
              <input
                type="number"
                name="consultation_fee"
                required
                min={50}
                step={50}
                defaultValue={800}
                className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          {/* Clinic Address & Bio */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              Clinic Location Venue
            </label>
            <input
              type="text"
              name="clinic_address"
              placeholder="Suite 402, Link Road, Andheri West, Mumbai"
              className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              Practitioner Bio & Philosophy
            </label>
            <textarea
              name="bio"
              rows={2}
              placeholder="Clinical background, interests, and treatment philosophy..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-forest w-full py-3 text-xs font-bold shadow-xs flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-ivory" />
                <span>Provisioning Doctor Account...</span>
              </>
            ) : (
              <>
                <span>Complete Practitioner Onboarding</span>
                <ArrowRight className="w-3.5 h-3.5 text-sage" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-warm-border-subtle text-center text-xs font-sans">
          <p className="text-ink-muted">
            Already registered?{" "}
            <Link
              href="/auth/sign-in"
              className="font-bold text-forest hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
