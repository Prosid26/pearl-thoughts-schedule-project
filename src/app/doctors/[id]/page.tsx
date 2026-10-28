import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { DoctorBookingFlow } from "@/components/booking/DoctorBookingFlow";
import {
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  ArrowLeft,
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
    db.getDoctorAvailability(doctorId),
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Specialists Directory</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Doctor Profile Overview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <DoctorAvatar
                doctor={doctor}
                size="xl"
                showActiveBadge
              />
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-1">
                  {doctor.specialization}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  {doctorName}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {doctor.qualification}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>4.9 / 5.0</span>
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {doctor.experience_years} Years Practice
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 font-medium">
                  Consultation Fee
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatINR(doctor.consultation_fee)}
                  <span className="text-xs font-normal text-slate-500"> / session</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 font-medium">
                  Slot Duration
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  30 Mins
                  <span className="text-xs font-normal text-slate-500"> / patient</span>
                </div>
              </div>
            </div>

            {/* Biography */}
            {doctor.bio && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Practitioner Biography
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {doctor.bio}
                </p>
              </div>
            )}

            {/* Clinic & Contact Information */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Clinic Location
              </h3>
              {doctor.clinic_address && (
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>{doctor.clinic_address}</span>
                </div>
              )}
              {doctor.user?.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Direct Desk: {doctor.user.phone}</span>
                </div>
              )}
            </div>

            {/* Trust Assurance */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Verified Medical Credential</span>
              </div>
              <p className="text-[11px] text-teal-800">
                Credentials and board certifications have been verified by the Pearl Thoughts clinical review board.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Booking Schedule Flow */}
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
