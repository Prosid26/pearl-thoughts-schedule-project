"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpPatientAction } from "@/app/actions/auth.actions";
import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  MapPin,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function RegisterPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await signUpPatientAction(null, formData);

    if (res.success) {
      router.push("/patient/dashboard");
      router.refresh();
    } else {
      setErrorMessage(res.error || "Registration failed.");
      setLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-16 max-w-lg mx-auto px-4 sm:px-6 w-full">
      <div className="clinic-card p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-sage text-forest flex items-center justify-center mx-auto border border-sage-dark/60">
            <User className="w-5 h-5 text-forest" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Create Patient Account
          </h1>
          <p className="text-xs text-ink-muted font-sans">
            Register to reserve consultation slots and manage your personal health records.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              Full Legal Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="full_name"
                required
                placeholder="e.g. Aarav Sharma"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="aarav@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+91 98200 12345"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              Create Password (min 8 characters) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                name="password"
                required
                placeholder="Must include at least 1 number"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  name="date_of_birth"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Gender
              </label>
              <select
                name="gender"
                className="w-full px-3 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              >
                <option value="Unspecified">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              Residential Address (City/Locality)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="address"
                placeholder="e.g. Bandra West, Mumbai"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-forest w-full py-3 text-xs font-bold shadow-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-ivory" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Patient Registration</span>
                <ArrowRight className="w-3.5 h-3.5 text-sage" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-ink-muted border-t border-warm-border-subtle font-sans">
          Already have an account?{" "}
          <Link
            href="/auth/sign-in"
            className="font-bold text-forest hover:underline"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
