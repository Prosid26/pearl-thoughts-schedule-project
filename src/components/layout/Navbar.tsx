"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Stethoscope,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Clock,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth.actions";
import { DemoSwitcher } from "./DemoSwitcher";
import { SessionUser } from "@/types/database";

interface NavbarProps {
  session: SessionUser | null;
  dbMode: "neon" | "supabase" | "local";
}

export function Navbar({ session, dbMode }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight leading-none text-lg">
                  Pearl<span className="text-teal-600">Thoughts</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">
                  Schedule System
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/doctors"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                Find Doctors
              </Link>
              <Link
                href="/#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#er-diagram"
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                ER Architecture
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            {/* Database indicator badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                dbMode === "neon"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : dbMode === "supabase"
                  ? "bg-teal-50 text-teal-800 border-teal-200"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
              title={
                dbMode === "neon"
                  ? "Connected to Neon PostgreSQL cloud instance (Drizzle ORM)"
                  : dbMode === "supabase"
                  ? "Connected to Supabase PostgreSQL"
                  : "Running on embedded ACID database store (Drizzle/Neon ready)."
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbMode === "neon"
                    ? "bg-emerald-500"
                    : dbMode === "supabase"
                    ? "bg-teal-500"
                    : "bg-emerald-600"
                } animate-pulse`}
              />
              <span>
                {dbMode === "neon"
                  ? "Neon PostgreSQL (Drizzle)"
                  : dbMode === "supabase"
                  ? "Supabase PostgreSQL"
                  : "Database: Active (ACID)"}
              </span>
            </div>

            {/* Demo Quick Switcher */}
            <DemoSwitcher />

            {/* User Session Buttons */}
            {session ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {session.role === "doctor" ? (
                  <>
                    <Link
                      href="/doctor/dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Doctor Dashboard
                    </Link>
                    <Link
                      href="/doctor/availability"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Manage Slots
                    </Link>
                  </>
                ) : session.role === "admin" ? (
                  <Link
                    href="/reception/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Reception Queue
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/patient/dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Patient Portal
                    </Link>
                    <Link
                      href="/patient/appointments"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      My Appointments
                    </Link>
                  </>
                )}

                <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {session.full_name}
                    </div>
                    <div className="text-[10px] text-teal-600 font-medium capitalize">
                      {session.role}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/auth/sign-in"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register-patient"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
                >
                  Book Appointment
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <DemoSwitcher />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 space-y-3">
            <Link
              href="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Find Doctors
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100"
            >
              How It Works
            </Link>

            {session ? (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="px-3 py-1 text-xs text-slate-500">
                  Signed in as <strong>{session.full_name}</strong> (
                  {session.role})
                </div>
                {session.role === "doctor" ? (
                  <>
                    <Link
                      href="/doctor/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-teal-700 rounded-lg bg-teal-50"
                    >
                      Doctor Dashboard
                    </Link>
                    <Link
                      href="/doctor/availability"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      Manage Availability Slots
                    </Link>
                  </>
                ) : session.role === "admin" ? (
                  <Link
                    href="/reception/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-teal-700 rounded-lg bg-teal-50"
                  >
                    Reception Queue
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/patient/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-teal-700 rounded-lg bg-teal-50"
                    >
                      Patient Portal
                    </Link>
                    <Link
                      href="/patient/appointments"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      My Appointments
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-rose-600 rounded-lg hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
                <Link
                  href="/auth/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 text-center text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register-patient"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 text-center text-sm font-semibold text-white bg-teal-600 rounded-lg"
                >
                  Register as Patient
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
