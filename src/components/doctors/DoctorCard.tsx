import React from "react";
import Link from "next/link";
import { Doctor } from "@/types/database";
import {
  Calendar,
  MapPin,
  Star,
  Award,
  ChevronRight,
} from "lucide-react";

import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";

interface DoctorCardProps {
  doctor: Doctor;
  availableSlotCount?: number;
}

export function DoctorCard({ doctor, availableSlotCount }: DoctorCardProps) {
  const doctorName = doctor.user?.full_name || `Dr. ${doctor.specialization}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <div className="p-5 sm:p-6">
        {/* Header: Avatar, Name, Specialization */}
        <div className="flex items-start gap-4">
          <div className="group-hover:scale-102 transition-transform">
            <DoctorAvatar
              doctor={doctor}
              size="lg"
              showActiveBadge
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                {doctor.specialization}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>4.9</span>
              </span>
            </div>

            <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
              {doctorName}
            </h3>

            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {doctor.qualification}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-teal-600" />
                <span>{doctor.experience_years} yrs exp</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-900">
                {formatINR(doctor.consultation_fee)}
                <span className="text-[11px] font-normal text-slate-500"> / visit</span>
              </span>
            </div>
          </div>
        </div>

        {/* Short Bio */}
        {doctor.bio && (
          <p className="mt-4 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {doctor.bio}
          </p>
        )}

        {/* Clinic Location */}
        {doctor.clinic_address && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.clinic_address}</span>
          </div>
        )}
      </div>

      {/* Footer / Booking Action */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-teal-600" />
          <span>
            {availableSlotCount !== undefined ? (
              availableSlotCount > 0 ? (
                <strong className="text-emerald-700">{availableSlotCount} open slots</strong>
              ) : (
                <span className="text-slate-400">Next available soon</span>
              )
            ) : (
              <span>Bookable Slots Open</span>
            )}
          </span>
        </div>

        <Link
          href={`/doctors/${doctor.doctor_id}`}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
        >
          <span>Select Time</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
