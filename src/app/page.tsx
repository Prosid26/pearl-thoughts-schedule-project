import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import {
  Calendar,
  ShieldCheck,
  ArrowRight,
  Database,
  Clock,
  Sparkles,
  FileCode2,
  Users,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";

export default async function HomePage() {
  const doctors = await db.getDoctors();
  const featuredDoctors = doctors.slice(0, 3);

  return (
    <div className="flex flex-col bg-ivory">
      {/* 1. EDITORIAL ASYMMETRIC HERO SECTION */}
      <section className="relative overflow-hidden pt-12 sm:pt-16 pb-20 border-b border-warm-border bg-clinic-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Bold Editorial Typography */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage text-forest text-xs font-semibold border border-sage-dark/60 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                <span>The Modern Private Clinic • Medrella Scheduling</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.75rem] font-bold text-ink tracking-tight leading-[1.08]">
                Where Clinical Excellence Meets{" "}
                <span className="italic font-normal text-forest underline decoration-terracotta decoration-wavy decoration-2 underline-offset-8">
                  Zero-Wait
                </span>{" "}
                Care.
              </h1>

              <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl font-sans">
                Experience private healthcare scheduling re-engineered for
                absolute punctuality. Browse verified Indian specialists,
                reserve guaranteed atomic slots, and benefit from intelligent
                waiting queues that expedite your care when consultations finish early.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/doctors"
                  className="btn-forest px-6 py-3.5 text-sm font-bold shadow-sm hover:shadow flex items-center gap-2"
                >
                  <span>Book Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/auth/sign-in"
                  className="btn-ivory px-6 py-3.5 text-sm font-semibold hover:bg-white transition-colors"
                >
                  Doctor / Patient Sign In
                </Link>
              </div>

              {/* Architectural Clinical Highlights */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-warm-border max-w-lg">
                <div>
                  <div className="font-serif text-2xl font-bold text-forest">
                    100%
                  </div>
                  <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mt-0.5">
                    Atomic Locking
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-bold text-forest">
                    2-Min
                  </div>
                  <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mt-0.5">
                    Early Cascade
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-bold text-forest">
                    ACID
                  </div>
                  <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mt-0.5">
                    PostgreSQL State
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Live Triage Preview Panel */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white p-6 sm:p-7 rounded-2xl border border-warm-border shadow-md space-y-5">
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-warm-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-forest text-ivory flex items-center justify-center font-bold">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">
                        Medrella Smart Triage Desk
                      </div>
                      <div className="text-[11px] text-forest font-semibold">
                        Apex Clinic Suite 402 • Live
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sage-light text-forest border border-sage-dark/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping" />
                    In Session
                  </span>
                </div>

                {/* Active Consultation Simulation */}
                <div className="p-4 rounded-xl bg-ivory border border-warm-border space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <DoctorAvatar
                        name="Dr. Ananya Sharma"
                        gender="female"
                        size="sm"
                        showActiveBadge
                      />
                      <div>
                        <div className="text-xs font-bold text-ink">
                          Dr. Ananya Sharma
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          Senior Cardiologist • AIIMS Alumna
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-forest">
                      ₹1,000 / visit
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-ink bg-white p-2.5 rounded-lg border border-warm-border">
                    <Clock className="w-3.5 h-3.5 text-forest shrink-0" />
                    <span className="font-medium">
                      Consultation In Progress • Finishes 15m Early
                    </span>
                  </div>

                  {/* Early Offer Preview Strip */}
                  <div className="p-3 rounded-lg bg-terracotta-light border border-terracotta text-ink space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-forest flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-terracotta-dark" />
                        Earlier Slot Opportunity
                      </span>
                      <span className="font-mono font-bold text-forest text-[10px] bg-white px-2 py-0.5 rounded border border-terracotta">
                        01:54 window
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-light leading-snug">
                      Next scheduled patient offered fast-track consultation at{" "}
                      <strong>10:15 AM</strong>.
                    </p>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">
                    Explore available consultation hours:
                  </span>
                  <Link
                    href="/doctors"
                    className="font-bold text-forest hover:text-forest-dark flex items-center gap-1"
                  >
                    View Roster →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE CLINIC MODEL (Replaces generic 3-box cards) */}
      <section id="clinic-model" className="py-20 bg-white border-b border-warm-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-forest block">
              Architectural Clinical Process
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              A Punctual Practice Designed Around Your Time
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed font-sans">
              Unlike conventional hospital portals that overbook waiting rooms,
              Medrella pairs mathematical slot integrity with an intelligent
              cascade engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Stage 1 */}
            <div className="clinic-card-subtle p-7 rounded-xl border border-warm-border space-y-4">
              <div className="w-8 h-8 rounded-lg bg-forest text-ivory font-serif font-bold text-sm flex items-center justify-center">
                01
              </div>
              <h3 className="font-serif text-lg font-bold text-ink">
                Atomic Slot Reservation
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed font-sans">
                Each doctor publishes exact, non-overlapping availability blocks.
                When you reserve a slot, our database guarantees conditional
                locking to prevent double booking.
              </p>
              <div className="pt-2 text-[11px] text-forest font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero phantom reservations</span>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="clinic-card-subtle p-7 rounded-xl border border-warm-border space-y-4">
              <div className="w-8 h-8 rounded-lg bg-forest text-ivory font-serif font-bold text-sm flex items-center justify-center">
                02
              </div>
              <h3 className="font-serif text-lg font-bold text-ink">
                Smart Clinic Waiting Queue
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed font-sans">
                Walk-in patients are checked in at the front desk and triaged
                transparently. Status advances through waiting, called, and
                consultation without queue jumping.
              </p>
              <div className="pt-2 text-[11px] text-forest font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Front-desk triage & tracking</span>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="clinic-card-subtle p-7 rounded-xl border border-warm-border space-y-4">
              <div className="w-8 h-8 rounded-lg bg-forest text-ivory font-serif font-bold text-sm flex items-center justify-center">
                03
              </div>
              <h3 className="font-serif text-lg font-bold text-ink">
                Early Consultation Cascade
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed font-sans">
                When a physician completes an appointment early, the opened slot
                is offered to next-eligible patients with an active 2-minute countdown.
                Accepted moves occur seamlessly with no extra fee.
              </p>
              <div className="pt-2 text-[11px] text-forest font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Automated patient notification</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED PRACTITIONERS SECTION */}
      <section className="py-20 bg-ivory border-b border-warm-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-forest block mb-1">
                Verified Medical Specialists
              </span>
              <h2 className="font-serif text-3xl font-bold text-ink tracking-tight">
                Senior Practitioners at Medrella
              </h2>
            </div>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-dark uppercase tracking-wider"
            >
              <span>Explore All {doctors.length} Doctors</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {featuredDoctors.map((doc) => (
              <DoctorCard key={doc.doctor_id} doctor={doc} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. TECHNICAL INTEGRITY & ARCHITECTURE */}
      <section id="er-diagram" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#1C2C25] rounded-2xl p-8 sm:p-12 text-ivory overflow-hidden relative border border-[#2D3E35]">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-sage text-forest text-xs font-semibold">
                <Database className="w-3.5 h-3.5 text-forest" />
                <span>Relational Architecture & Concurrency</span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Engineered for Concurrency Safety & Data Integrity
              </h2>

              <p className="text-xs sm:text-sm text-[#BAC8BF] leading-relaxed font-sans">
                Medrella is built with strict adherence to database normalization,
                row-level locking, and transactional guarantees across 8 relational tables:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-lg bg-[#243B32] border border-[#345245]">
                  <div className="font-bold text-terracotta">USERS & AUTHENTICATION</div>
                  <div className="text-[#BAC8BF] text-[11px] mt-1">
                    Bcrypt password hashing, HTTP-only JWT sessions, and role guards for doctors, patients, and reception.
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#243B32] border border-[#345245]">
                  <div className="font-bold text-terracotta">AVAILABILITY & APPOINTMENTS</div>
                  <div className="text-[#BAC8BF] text-[11px] mt-1">
                    Atomic slot reservations preventing double-booking; auto-restoration upon cancellation.
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#243B32] border border-[#345245]">
                  <div className="font-bold text-terracotta">SMART WAITING QUEUE</div>
                  <div className="text-[#BAC8BF] text-[11px] mt-1">
                    Walk-in triage supporting waiting, called, in-consultation, and completed transitions.
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#243B32] border border-[#345245]">
                  <div className="font-bold text-terracotta">EARLY SLOT OFFERS CASCADE</div>
                  <div className="text-[#BAC8BF] text-[11px] mt-1">
                    2-minute countdown timer, automated fallback cascades, and single-claim atomic acceptance.
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/schedule-project-er-diagram.png.png"
                  target="_blank"
                  className="btn-terracotta px-4 py-2 text-xs font-bold text-ink inline-flex items-center gap-1.5"
                >
                  <FileCode2 className="w-4 h-4" />
                  <span>Inspect ER Diagram Specification</span>
                </Link>
                <Link
                  href="/doctors"
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-[#243B32] hover:bg-[#2F4C40] text-ivory border border-[#3E5C4E] transition-colors"
                >
                  Test Appointment Booking
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
