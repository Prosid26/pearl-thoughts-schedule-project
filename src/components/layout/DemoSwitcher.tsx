"use client";

import React, { useState } from "react";
import { signInAction } from "@/app/actions/auth.actions";
import { KeyRound, User, Stethoscope, ChevronDown, Loader2, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DemoSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const router = useRouter();

  const handleQuickLogin = async (email: string) => {
    setLoadingEmail(email);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", "Password123!");

    const res = await signInAction(null, fd);
    if (res.success) {
      setIsOpen(false);
      setLoadingEmail(null);
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
      alert(res.error || "Login failed");
      setLoadingEmail(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-ink hover:bg-ivory-light border border-warm-border transition-colors shadow-2xs"
        title="1-Click Demo Accounts for Medrella Evaluation"
        aria-expanded={isOpen}
      >
        <KeyRound className="w-3.5 h-3.5 text-forest" />
        <span>Demo Switchboard</span>
        <ChevronDown className="w-3 h-3 text-ink-muted" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-xl border border-warm-border p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-warm-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Quick Role Switcher
              </span>
              <span className="text-[10px] font-mono text-ink bg-terracotta/40 px-2 py-0.5 rounded border border-terracotta/50">
                pwd: Password123!
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Reception Staff */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-forest flex items-center gap-1 px-1 mb-1">
                  <Building2 className="w-3 h-3 text-forest" /> Clinic Front Desk
                </div>
                <button
                  disabled={loadingEmail !== null}
                  onClick={() => handleQuickLogin("admin@demo.com")}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-ivory border border-transparent hover:border-warm-border transition-all group"
                >
                  <div>
                    <div className="font-semibold text-ink group-hover:text-forest">
                      Sunita Deshpande (Receptionist)
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      admin@demo.com • Walk-in Queue & Cascade
                    </div>
                  </div>
                  {loadingEmail === "admin@demo.com" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                  ) : (
                    <span className="text-[10px] text-forest font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter →
                    </span>
                  )}
                </button>
              </div>

              {/* Doctors */}
              <div className="pt-1 border-t border-warm-border">
                <div className="text-[10px] font-bold uppercase tracking-wider text-forest flex items-center gap-1 px-1 mb-1">
                  <Stethoscope className="w-3 h-3 text-forest" /> Attending Doctors
                </div>
                <button
                  disabled={loadingEmail !== null}
                  onClick={() => handleQuickLogin("doctor.ananya@demo.com")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-ivory border border-transparent hover:border-warm-border transition-all group"
                >
                  <div>
                    <div className="font-semibold text-ink group-hover:text-forest">
                      Dr. Ananya Sharma
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      doctor.ananya@demo.com • Cardiologist
                    </div>
                  </div>
                  {loadingEmail === "doctor.ananya@demo.com" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                  ) : (
                    <span className="text-[10px] text-forest font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter →
                    </span>
                  )}
                </button>

                <button
                  disabled={loadingEmail !== null}
                  onClick={() => handleQuickLogin("doctor.rahul@demo.com")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-ivory border border-transparent hover:border-warm-border transition-all group"
                >
                  <div>
                    <div className="font-semibold text-ink group-hover:text-forest">
                      Dr. Rahul Mehta
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      doctor.rahul@demo.com • Orthopedic
                    </div>
                  </div>
                  {loadingEmail === "doctor.rahul@demo.com" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                  ) : (
                    <span className="text-[10px] text-forest font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter →
                    </span>
                  )}
                </button>
              </div>

              {/* Patients */}
              <div className="pt-1 border-t border-warm-border">
                <div className="text-[10px] font-bold uppercase tracking-wider text-forest flex items-center gap-1 px-1 mb-1">
                  <User className="w-3 h-3 text-forest" /> Registered Patients
                </div>
                <button
                  disabled={loadingEmail !== null}
                  onClick={() => handleQuickLogin("patient@demo.com")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-ivory border border-transparent hover:border-warm-border transition-all group"
                >
                  <div>
                    <div className="font-semibold text-ink group-hover:text-forest">
                      Aarav Sharma
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      patient@demo.com • Patient Portal
                    </div>
                  </div>
                  {loadingEmail === "patient@demo.com" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                  ) : (
                    <span className="text-[10px] text-forest font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter →
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
