import React from "react";
import Link from "next/link";
import { ShieldCheck, Database, Calendar, Clock, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1C2C25] text-ivory border-t border-[#2D3E35]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand & Editorial Mission */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sage text-forest flex items-center justify-center font-bold">
                <svg
                  className="w-5 h-5 text-forest"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4v16M4 12h16" />
                  <circle cx="12" cy="12" r="3" className="opacity-40" />
                </svg>
              </div>
              <span className="font-serif font-bold text-white text-2xl tracking-tight">
                Medrella
              </span>
            </div>

            <p className="text-xs text-[#BAC8BF] leading-relaxed max-w-sm">
              The Modern Private Clinic. Engineered for punctuality, clinical
              distinction, and patient peace of mind. Non-overlapping atomic
              appointments, real-time triage, and expedited care cascades.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-sage">
              <ShieldCheck className="w-4 h-4 text-terracotta" />
              <span>ACID Guaranteed • Zero Double Booking</span>
            </div>
          </div>

          {/* Clinical Hours & Locations */}
          <div className="md:col-span-3 space-y-3 text-xs text-[#BAC8BF]">
            <h4 className="font-serif font-semibold text-white text-sm tracking-wide">
              Clinic Hours & Practice
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium">
                <Clock className="w-3.5 h-3.5 text-terracotta" />
                <span>Monday – Saturday: 08:00 – 20:00 IST</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-sage" />
                <span>Apex Health Tower, Link Road, Mumbai</span>
              </div>
              <p className="text-[11px] text-[#8EA094] pt-1">
                Emergency admissions triage is active 24/7 through accredited
                partner facilities.
              </p>
            </div>
          </div>

          {/* Patient Services */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-serif font-semibold text-white text-sm tracking-wide">
              Patient Care
            </h4>
            <ul className="space-y-2 text-xs text-[#BAC8BF]">
              <li>
                <Link
                  href="/doctors"
                  className="hover:text-terracotta transition-colors"
                >
                  Medical Specialists
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register-patient"
                  className="hover:text-terracotta transition-colors"
                >
                  Register Account
                </Link>
              </li>
              <li>
                <Link
                  href="/patient/dashboard"
                  className="hover:text-terracotta transition-colors"
                >
                  Patient Sanctuary
                </Link>
              </li>
              <li>
                <Link
                  href="/patient/appointments"
                  className="hover:text-terracotta transition-colors"
                >
                  Consultation History
                </Link>
              </li>
            </ul>
          </div>

          {/* Practitioner & Operations */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-serif font-semibold text-white text-sm tracking-wide">
              Clinical Workspace
            </h4>
            <ul className="space-y-2 text-xs text-[#BAC8BF]">
              <li>
                <Link
                  href="/doctor/dashboard"
                  className="hover:text-terracotta transition-colors"
                >
                  Physician Schedule & Triage
                </Link>
              </li>
              <li>
                <Link
                  href="/doctor/availability"
                  className="hover:text-terracotta transition-colors"
                >
                  Availability Slot Manager
                </Link>
              </li>
              <li>
                <Link
                  href="/reception/dashboard"
                  className="hover:text-terracotta transition-colors"
                >
                  Reception & Walk-in Queue
                </Link>
              </li>
              <li className="pt-2 text-[11px] text-[#8EA094] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sage" />
                <span>Neon Cloud PostgreSQL • Drizzle ORM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#2D3E35] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8EA094] gap-4">
          <p>© {new Date().getFullYear()} Medrella Healthcare. All rights reserved.</p>
          <p className="flex items-center gap-1 text-[11px]">
            <span>Pearl Thoughts Fullstack Project</span>
            <span>•</span>
            <span className="text-sage">The Modern Private Clinic</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
