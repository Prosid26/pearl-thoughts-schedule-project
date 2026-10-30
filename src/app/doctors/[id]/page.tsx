import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { DoctorBookingFlow } from "@/components/booking/DoctorBookingFlow";
import {
  MapPin,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Award,
} from "lucide-react";
import Link from "next/link";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doctorId = parseInt(id, 10);
  if (isNaN(doctorId)) {
    notFound();
  }

  const [doctor, availabilities, session] = await Promise.all([
    db.getDoctorById(doctorId),
    db.getDoctorAvailability(doctorId, undefined, true),
    getSession(),
  ]);

  if (!doctor) {
    notFound();
  }

  const doctorName = doctor.user?.full_name || `Dr. ${doctor.specialization}`;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-forest transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Specialists Roster</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Doctor Profile Overview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="clinic-card p-6 sm:p-7 space-y-6">
            <div className="flex items-start gap-4">
              <DoctorAvatar
                doctor={doctor}
                size="xl"
                showActiveBadge
              />
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sage-light text-forest border border-sage-dark/60 mb-1.5">
                  {doctor.specialization}
                </span>
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink leading-tight">
                  {doctorName}
                </h1>
                <p className="text-xs text-ink-muted mt-1 font-sans">
                  {doctor.qualification}
                </p>

                <div className="flex items-center gap-2 mt-2.5 text-xs text-ink-muted">
                  <Award className="w-3.5 h-3.5 text-forest" />
                  <span>{doctor.experience_years} Years Clinical Practice</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-ivory-light border border-warm-border">
                <div className="text-[11px] text-ink-muted font-medium">
                  Consultation Fee
                </div>
                <div className="font-serif text-xl font-bold text-forest mt-0.5">
                  {formatINR(doctor.consultation_fee)}
                  <span className="font-sans text-[11px] font-normal text-ink-muted"> / visit</span>
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-ivory-light border border-warm-border">
                <div className="text-[11px] text-ink-muted font-medium">
                  Slot Duration
                </div>
                <div className="font-serif text-xl font-bold text-forest mt-0.5">
                  30 Mins
                  <span className="font-sans text-[11px] font-normal text-ink-muted"> / patient</span>
                </div>
              </div>
            </div>

            {/* Biography */}
            {doctor.bio && (
              <div className="space-y-2 pt-3 border-t border-warm-border-subtle">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
                  Clinical Background
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed font-sans">
                  {doctor.bio}
                </p>
              </div>
            )}

            {/* Clinic & Venue Information */}
            <div className="space-y-2.5 pt-3 border-t border-warm-border-subtle">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
                Consultation Venue
              </h3>
              {doctor.clinic_address && (
                <div className="flex items-start gap-2 text-xs text-ink-muted">
                  <MapPin className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <span>{doctor.clinic_address}</span>
                </div>
              )}
              {doctor.user?.phone && (
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock className="w-4 h-4 text-forest shrink-0" />
                  <span>Clinic Contact Desk: {doctor.user.phone}</span>
                </div>
              )}
            </div>

            {/* Reassurance */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-forest font-semibold">
              <ShieldCheck className="w-4 h-4 text-forest" />
              <span>NABH Punctuality Standard • Verified Practitioner</span>
            </div>
          </div>
        </div>

        {/* Right Column: Booking Flow */}
        <div className="lg:col-span-7">
          <DoctorBookingFlow
            doctor={doctor}
            availabilities={availabilities}
            session={session}
          />
        </div>
      </div>
    </div>
  );
}
