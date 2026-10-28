"use client";

import React, { useState } from "react";
import { signInAction } from "@/app/actions/auth.actions";
import { KeyRound, User, Stethoscope, ChevronDown, Loader2, Building } from "lucide-react";
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
        title="1-Click Demo Accounts for Internship Evaluator"
      >
        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
        <span>1-Click Demo Logins</span>
        <ChevronDown className="w-3 h-3 text-emerald-600" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Evaluation Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                pwd: Password123!
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 px-1">
                <User className="w-3 h-3 text-teal-600" /> Patients
              </div>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("patient@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-teal-50 hover:text-teal-900 border border-transparent hover:border-teal-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-teal-900">
                    Aarav Sharma (Patient)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    patient@demo.com
                  </div>
                </div>
                {loadingEmail === "patient@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                ) : (
                  <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("jane@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-teal-50 hover:text-teal-900 border border-transparent hover:border-teal-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-teal-900">
                    Priya Verma (Patient)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    jane@demo.com
                  </div>
                </div>
                {loadingEmail === "jane@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                ) : (
                  <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>

              <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 px-1 pt-1 border-t border-slate-100">
                <Stethoscope className="w-3 h-3 text-emerald-600" /> Doctors
              </div>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("doctor.ananya@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-emerald-50 hover:text-emerald-900 border border-transparent hover:border-emerald-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-emerald-900">
                    Dr. Ananya Sharma
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cardiology • doctor.ananya@demo.com
                  </div>
                </div>
                {loadingEmail === "doctor.ananya@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("doctor.rahul@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-emerald-50 hover:text-emerald-900 border border-transparent hover:border-emerald-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-emerald-900">
                    Dr. Rahul Mehta
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Orthopedics • doctor.rahul@demo.com
                  </div>
                </div>
                {loadingEmail === "doctor.rahul@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("doctor.priya@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-emerald-50 hover:text-emerald-900 border border-transparent hover:border-emerald-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-emerald-900">
                    Dr. Priya Nair
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Dermatology • doctor.priya@demo.com
                  </div>
                </div>
                {loadingEmail === "doctor.priya@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("doctor.arjun@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-emerald-50 hover:text-emerald-900 border border-transparent hover:border-emerald-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-emerald-900">
                    Dr. Arjun Deshmukh
                  </div>
                  <div className="text-[11px] text-slate-500">
                    General Medicine • doctor.arjun@demo.com
                  </div>
                </div>
                {loadingEmail === "doctor.arjun@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>

              {/* Reception Staff */}
              <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 px-1 pt-2 border-t border-slate-100">
                <Building className="w-3 h-3 text-blue-600" /> Reception & Waiting Queue
              </div>

              <button
                disabled={loadingEmail !== null}
                onClick={() => handleQuickLogin("admin@demo.com")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs hover:bg-blue-50 hover:text-blue-900 border border-transparent hover:border-blue-200 transition-all group"
              >
                <div>
                  <div className="font-medium text-slate-800 group-hover:text-blue-900">
                    Sunita Deshpande (Reception)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Admin Staff • admin@demo.com
                  </div>
                </div>
                {loadingEmail === "admin@demo.com" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 font-medium">
                    Login →
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
