import React from "react";
import Link from "next/link";
import { Stethoscope, ShieldCheck, Heart, Database, Calendar } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                Pearl<span className="text-teal-400">Thoughts</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Medrella-inspired modern doctor appointment booking and scheduling
              platform built for the Pearl Thoughts Fullstack Internship.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ACID Safe • Zero Overlap Bookings</span>
            </div>
          </div>

          {/* Patient Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3">
              Patient Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/doctors"
                  className="hover:text-teal-400 transition-colors"
                >
                  Browse Specialists
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register-patient"
                  className="hover:text-teal-400 transition-colors"
                >
                  Create Patient Account
                </Link>
              </li>
              <li>
                <Link
                  href="/patient/appointments"
                  className="hover:text-teal-400 transition-colors"
                >
                  My Appointments
                </Link>
              </li>
              <li>
                <Link
                  href="/patient/dashboard"
                  className="hover:text-teal-400 transition-colors"
                >
                  Patient Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Doctor Portal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3">
              Practitioners & Clinics
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/doctor/dashboard"
                  className="hover:text-teal-400 transition-colors"
                >
                  Doctor Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/doctor/availability"
                  className="hover:text-teal-400 transition-colors"
                >
                  Manage Availability Slots
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/provision-doctor"
                  className="hover:text-teal-400 transition-colors"
                >
                  Doctor Provisioning
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/sign-in"
                  className="hover:text-teal-400 transition-colors"
                >
                  Practitioner Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Stack */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3">
              Stack Architecture
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-400" />
                <span>Supabase PostgreSQL + Local Store</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Atomic Slot Locking Mechanism</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>HTTP-Only JWT Cookie Sessions</span>
              </li>
              <li className="pt-2 text-[11px] text-slate-500">
                Matches repository ER diagram specification exactly.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Pearl Thoughts Schedule Project. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Pearl Thoughts Fullstack Assignment
          </p>
        </div>
      </div>
    </footer>
  );
}
