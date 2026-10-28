"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAction } from "@/app/actions/auth.actions";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);

    const res = await signInAction(null, fd);
    if (res.success) {
      if (res.data && typeof res.data === "object" && "role" in res.data) {
        if (res.data.role === "doctor") {
          router.push("/doctor/dashboard");
        } else {
          router.push("/patient/dashboard");
        }
      } else {
        router.push("/");
      }
      router.refresh();
    } else {
      setErrorMessage(res.error || "Invalid credentials.");
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setErrorMessage(null);
  };

  return (
    <div className="py-12 sm:py-16 max-w-md mx-auto px-4 sm:px-6 w-full">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs border border-teal-100">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Pearl Thoughts
          </h1>
          <p className="text-xs text-slate-500">
            Access your patient appointments or clinician schedule dashboard.
          </p>
        </div>

        {/* Quick Demo Credentials Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <span className="flex items-center gap-1.5 text-teal-700">
              <KeyRound className="w-3.5 h-3.5" />
              1-Click Demo Pre-Fill
            </span>
            <span className="text-[10px] text-slate-400">pwd: Password123!</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleFillDemo("patient@demo.com")}
              className="px-2.5 py-1.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 text-slate-700 font-medium text-left truncate transition-colors"
            >
              <div className="font-bold text-[11px] text-teal-800 truncate">
                Aarav Sharma
              </div>
              <div className="text-[10px] text-slate-500">Patient Demo</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo("doctor.ananya@demo.com")}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-slate-700 font-medium text-left truncate transition-colors"
            >
              <div className="font-bold text-[11px] text-emerald-800 truncate">
                Dr. Ananya Sharma
              </div>
              <div className="text-[10px] text-slate-500">Cardiologist Demo</div>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 transition-colors shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Links */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-2 text-xs">
          <p className="text-slate-500">
            Need a patient account?{" "}
            <Link
              href="/auth/register-patient"
              className="font-bold text-teal-600 hover:text-teal-700"
            >
              Register here
            </Link>
          </p>
          <p className="text-slate-400 text-[11px]">
            Clinician without credentials?{" "}
            <Link
              href="/auth/provision-doctor"
              className="text-slate-600 hover:text-teal-600 underline font-medium"
            >
              Provision doctor account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
