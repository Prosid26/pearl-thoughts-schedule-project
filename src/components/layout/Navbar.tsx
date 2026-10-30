"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Clock,
  Sparkles,
  Building,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth.actions";
import { DemoSwitcher } from "./DemoSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
    <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur-md border-b border-warm-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-17">
          {/* Logo & Clinical Brandmark */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-forest flex items-center justify-center text-ivory shadow-xs group-hover:bg-forest-dark transition-all">
                {/* Custom restrained botanical clinical cross */}
                <svg
                  className="w-5 h-5 text-ivory"
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
              <div className="flex flex-col">
                <span className="font-serif font-bold text-ink tracking-tight leading-none text-xl group-hover:text-forest transition-colors">
                  Medrella
                </span>
                <span className="text-[10px] font-semibold text-ink-muted tracking-wider uppercase mt-0.5">
                  The Modern Private Clinic
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-7">
              <Link
                href="/doctors"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-forest transition-colors"
              >
                Specialists & Slots
              </Link>
              <Link
                href="/#clinic-model"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-forest transition-colors"
              >
                The Clinic Model
              </Link>
              <Link
                href="/#queue-preview"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-forest transition-colors"
              >
                Smart Waiting Queue
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            {/* Database indicator badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-sage-light text-forest border border-sage-dark/60"
              title={
                dbMode === "neon"
                  ? "Connected to Neon PostgreSQL cloud instance (Drizzle ORM)"
                  : dbMode === "supabase"
                  ? "Connected to Supabase PostgreSQL"
                  : "Running on embedded ACID database store (Drizzle/Neon ready)."
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
              <span>
                {dbMode === "neon"
                  ? "Neon PostgreSQL • ACID"
                  : dbMode === "supabase"
                  ? "Supabase PostgreSQL"
                  : "Database: Active"}
              </span>
            </div>

            {/* Demo Quick Switcher */}
            <DemoSwitcher />

            {/* User Session Buttons */}
            {session ? (
              <div className="flex items-center gap-2 pl-2 border-l border-warm-border">
                {/* Real-time In-App Notification Bell */}
                <NotificationBell sessionRole={session.role} />

                {session.role === "doctor" ? (
                  <>
                    <Link
                      href="/doctor/dashboard"
                      className="btn-forest text-xs px-3 py-1.5 gap-1.5"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Doctor Workspace</span>
                    </Link>
                    <Link
                      href="/doctor/availability"
                      className="btn-ivory text-xs px-3 py-1.5 gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Manage Slots</span>
                    </Link>
                  </>
                ) : session.role === "admin" ? (
                  <Link
                    href="/reception/dashboard"
                    className="btn-forest text-xs px-3.5 py-1.5 gap-1.5"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Reception Queue</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/patient/dashboard"
                      className="btn-forest text-xs px-3 py-1.5 gap-1.5"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Patient Portal</span>
                    </Link>
                    <Link
                      href="/patient/appointments"
                      className="btn-ivory text-xs px-3 py-1.5 gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>My Visits</span>
                    </Link>
                  </>
                )}

                <div className="flex items-center gap-2 ml-1 pl-2 border-l border-warm-border">
                  <div className="text-right">
                    <div className="text-xs font-bold text-ink leading-tight truncate max-w-[120px]">
                      {session.full_name}
                    </div>
                    <div className="text-[10px] text-forest font-semibold capitalize">
                      {session.role}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-ivory-muted transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-warm-border">
                <Link
                  href="/auth/sign-in"
                  className="btn-ivory text-xs px-3.5 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  href="/doctors"
                  className="btn-forest text-xs px-4 py-1.5"
                >
                  Book Consultation
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <DemoSwitcher />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-ink hover:bg-ivory-muted"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-warm-border space-y-3 animate-in fade-in">
            <Link
              href="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-ink rounded-md hover:bg-ivory-muted"
            >
              Specialists & Slots
            </Link>
            <Link
              href="/#clinic-model"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-ink rounded-md hover:bg-ivory-muted"
            >
              The Clinic Model
            </Link>
            <Link
              href="/#queue-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-ink rounded-md hover:bg-ivory-muted"
            >
              Smart Waiting Queue
            </Link>

            {session ? (
              <div className="pt-3 border-t border-warm-border space-y-2">
                <div className="px-3 py-1 text-xs text-ink-muted flex items-center justify-between">
                  <span>Signed in as <strong>{session.full_name}</strong> ({session.role})</span>
                  <NotificationBell sessionRole={session.role} />
                </div>
                {session.role === "doctor" ? (
                  <>
                    <Link
                      href="/doctor/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-forest rounded-md bg-sage-light"
                    >
                      Doctor Workspace
                    </Link>
                    <Link
                      href="/doctor/availability"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-medium text-ink rounded-md hover:bg-ivory-muted"
                    >
                      Manage Availability Slots
                    </Link>
                  </>
                ) : session.role === "admin" ? (
                  <Link
                    href="/reception/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-forest rounded-md bg-sage-light"
                  >
                    Reception Queue
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/patient/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-forest rounded-md bg-sage-light"
                    >
                      Patient Portal
                    </Link>
                    <Link
                      href="/patient/appointments"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-medium text-ink rounded-md hover:bg-ivory-muted"
                    >
                      My Visits
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-ink-muted hover:text-forest rounded-md hover:bg-ivory-muted"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-warm-border flex flex-col gap-2">
                <Link
                  href="/auth/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-semibold text-ink bg-white border border-warm-border rounded-md"
                >
                  Sign In
                </Link>
                <Link
                  href="/doctors"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-bold text-ivory bg-forest rounded-md"
                >
                  Book Consultation
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
