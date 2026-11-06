"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptReceptionistInvitationAction } from "@/app/actions/admin.actions";
import {
  Building2,
  Mail,
  User,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function ReceptionistInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(searchParams);
  const token = resolvedParams.token || "";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Missing invitation token. Please check the link sent by your administrator.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append("token", token);
    fd.append("full_name", fullName);
    fd.append("phone", phone);
    fd.append("password", password);

    const res = await acceptReceptionistInvitationAction(null, fd);
    setLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || "Account successfully created!");
      setTimeout(() => {
        router.push("/reception/workspace");
        router.refresh();
      }, 1500);
    } else {
      setErrorMessage(res.error || "Failed to accept invitation.");
    }
  };

  return (
    <div className="py-12 sm:py-16 max-w-lg mx-auto px-4 sm:px-6 w-full">
      <div className="clinic-card p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center mx-auto border border-forest/20">
            <Building2 className="w-6 h-6 text-forest" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Clinic Receptionist Onboarding
          </h1>
          <p className="text-xs text-ink-muted">
            You have been invited to join the clinic administration team on Medrella.
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 bg-sage/30 border border-forest/20 rounded-xl flex items-center gap-3 text-xs text-forest">
          <ShieldCheck className="w-5 h-5 text-forest shrink-0" />
          <div>
            <span className="font-bold block">Secure Single-Use Invitation</span>
            <span className="text-[11px] text-ink-muted">
              Complete your profile below to gain access to your assigned clinic workspace.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-terracotta/20 border border-terracotta/40 rounded-xl flex items-center gap-2 text-xs text-ink">
            <AlertCircle className="w-4 h-4 text-ink shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-sage/40 border border-forest/20 rounded-xl flex items-center gap-2 text-xs text-forest">
            <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
            <span>{successMessage} Redirecting to workspace...</span>
          </div>
        )}

        {!token ? (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="w-10 h-10 text-terracotta mx-auto" />
            <h3 className="font-semibold text-sm text-ink">Invitation Token Missing</h3>
            <p className="text-xs text-ink-muted">
              The invitation link appears to be invalid or incomplete. Please request a new invitation link from your clinic administrator.
            </p>
            <Link href="/" className="btn-forest text-xs inline-flex mt-2">
              Return Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-ink block mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Kulkarni"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-border bg-ivory focus:outline-none focus:border-forest text-ink"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">
                Contact Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-border bg-ivory focus:outline-none focus:border-forest text-ink"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink block mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-border bg-ivory focus:outline-none focus:border-forest text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-warm-border bg-ivory focus:outline-none focus:border-forest text-ink"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating Profile...</span>
                </>
              ) : (
                <>
                  <span>Accept Invitation & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

