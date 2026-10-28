import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import {
  Calendar,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  Database,
  Sparkles,
  FileCode2,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";

export default async function HomePage() {
  const doctors = await db.getDoctors();
  const featuredDoctors = doctors.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/80 text-teal-800 text-xs font-semibold border border-teal-200">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Pearl Thoughts Fullstack Internship • Medrella Workflow</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Seamless Doctor Appointments,{" "}
                <span className="text-teal-600 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Zero Waiting.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Experience healthcare scheduling engineered for reliability. Browse top
                specialists, reserve atomic non-conflicting time slots, and track
                live appointment status across dedicated patient and doctor portals.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/doctors"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/25 flex items-center gap-2"
                >
                  <span>Book Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/auth/sign-in"
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-xs"
                >
                  Doctor / Patient Sign In
                </Link>
              </div>

              {/* Key Trust Highlights */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    100%
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Atomic Slot Locking
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    5+
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Specialist Fields
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    ACID
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Real Database State
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Medrella Booking Engine
                      </div>
                      <div className="text-[11px] text-teal-600 font-medium">
                        Live Availability Verified
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>

                {/* Simulated Appointment Preview */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <DoctorAvatar
                        name="Dr. Ananya Sharma"
                        gender="female"
                        size="xs"
                        showActiveBadge
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Dr. Ananya Sharma, MD, DM
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Senior Cardiologist • Andheri West, Mumbai
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-teal-700">
                      ₹1,000 / visit
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>Tomorrow at 10:00 AM - 10:30 AM</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Atomic Slot Reserved
                    </span>
                    <span className="font-semibold text-slate-700">
                      Status: Confirmed
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Ready to book your consultation?
                  </span>
                  <Link
                    href="/doctors"
                    className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    View Specialists →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block mb-1">
                Verified Medical Practitioners
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Top Rated Doctors on Medrella
              </h2>
            </div>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              <span>View All {doctors.length} Doctors & Real Slots</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredDoctors.map((doc) => (
              <DoctorCard key={doc.doctor_id} doctor={doc} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block mb-1">
              End-to-End Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How the Booking Process Operates
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              Validated on the server at every step with real persistence and immediate status updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                1. Browse & Filter
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter by medical specialty, experience years, or search by doctor name.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                2. Select Available Slot
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pick a future date and an active time slot defined by that specific doctor.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                3. Atomic Lock & Book
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Server locks the slot instantly to avoid double bookings and records visit reasons.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                4. Doctor Management
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Doctor reviews incoming appointments to confirm, decline, or mark completed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ER Diagram & Architecture Section */}
      <section id="er-diagram" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 text-teal-300 text-xs font-semibold border border-teal-700/50">
                <Database className="w-3.5 h-3.5 text-teal-400" />
                <span>Entity-Relationship Architecture</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Strict Adherence to Repository ER Specification
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                This application fully implements all 5 entities and relational constraints
                defined in <code className="text-teal-300">schedule-project-er-diagram.png.png</code>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-teal-400">USER (user_id PK)</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    1-to-1 profile links with PATIENT and DOCTOR with role-based auth.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-teal-400">PATIENT (patient_id PK)</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Maintains patient health attributes and books APPOINTMENT records.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-teal-400">DOCTOR (doctor_id PK)</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Defines AVAILABILITY slots and attends scheduled APPOINTMENTs.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-teal-400">AVAILABILITY & APPOINTMENT</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Atomic slot reservation with automatic slot restoration upon cancellation.
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/schedule-project-er-diagram.png.png"
                  target="_blank"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors inline-flex items-center gap-1.5"
                >
                  <FileCode2 className="w-4 h-4" />
                  <span>Inspect ER Diagram PNG</span>
                </Link>
                <Link
                  href="/doctors"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                >
                  Test Booking System
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
