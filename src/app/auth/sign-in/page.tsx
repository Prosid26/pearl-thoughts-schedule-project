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
        } else if (res.data.role === "admin") {
          router.push("/reception/dashboard");
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
      <div className="clinic-card p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-sage text-forest flex items-center justify-center mx-auto border border-sage-dark/60">
            <Lock className="w-5 h-5 text-forest" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Sign In to Medrella
          </h1>
          <p className="text-xs text-ink-muted font-sans">
            Access your patient sanctuary, clinical schedule, or reception queue.
          </p>
        </div>

        {/* Quick Demo Credentials Box */}
        <div className="p-3.5 bg-ivory-light border border-warm-border rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-ink">
            <span className="flex items-center gap-1.5 text-forest font-bold">
              <KeyRound className="w-3.5 h-3.5 text-forest" />
              1-Click Demo Pre-Fill
            </span>
            <span className="text-[10px] font-mono text-ink-muted bg-white px-2 py-0.5 rounded border border-warm-border">
              pwd: Password123!
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleFillDemo("patient@demo.com")}
              className="px-2 py-1.5 rounded-md border border-warm-border bg-white hover:bg-sage-light hover:border-forest/50 text-ink font-medium text-left truncate transition-colors"
            >
              <div className="font-bold text-[10px] text-ink truncate">
                Aarav Sharma
              </div>
              <div className="text-[9px] text-ink-muted">Patient Demo</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo("doctor.ananya@demo.com")}
              className="px-2 py-1.5 rounded-md border border-warm-border bg-white hover:bg-sage-light hover:border-forest/50 text-ink font-medium text-left truncate transition-colors"
            >
              <div className="font-bold text-[10px] text-forest truncate">
                Dr. Ananya
              </div>
              <div className="text-[9px] text-ink-muted">Doctor Demo</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo("admin@demo.com")}
              className="px-2 py-1.5 rounded-md border border-warm-border bg-white hover:bg-sage-light hover:border-forest/50 text-ink font-medium text-left truncate transition-colors"
            >
              <div className="font-bold text-[10px] text-terracotta-dark truncate">
                Sunita D.
              </div>
              <div className="text-[9px] text-ink-muted">Reception Demo</div>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-ink block mb-1 font-sans">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-warm-border text-xs text-ink bg-white focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-ink font-sans">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-warm-border text-xs text-ink bg-white focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
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
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 text-sage" />
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="pt-2 text-center text-xs text-ink-muted space-y-1 font-sans border-t border-warm-border-subtle">
          <div>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register-patient"
              className="font-bold text-forest hover:underline"
            >
              Register as Patient
            </Link>
          </div>
          <div>
            Medical Specialist?{" "}
            <Link
              href="/auth/provision-doctor"
              className="font-semibold text-ink-muted hover:text-forest underline"
            >
              Practitioner Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
