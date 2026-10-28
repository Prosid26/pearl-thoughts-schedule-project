import React from "react";
import Link from "next/link";
import { Doctor } from "@/types/database";
import {
  Calendar,
  MapPin,
  Award,
  ChevronRight,
  Clock,
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
    <div className="clinic-card overflow-hidden flex flex-col justify-between group">
      <div className="p-6">
        {/* Header: Avatar, Name, Specialization */}
        <div className="flex items-start gap-4">
          <div className="shrink-0 group-hover:scale-102 transition-transform">
            <DoctorAvatar
              doctor={doctor}
              size="lg"
              showActiveBadge
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sage-light text-forest border border-sage-dark/60">
                {doctor.specialization}
              </span>
              <span className="text-[11px] font-medium text-ink-muted">
                {doctor.experience_years} yrs practice
              </span>
            </div>

            <h3 className="mt-1.5 font-serif text-lg font-bold text-ink truncate group-hover:text-forest transition-colors">
              {doctorName}
            </h3>

            <p className="text-xs text-ink-muted line-clamp-1 mt-0.5 font-sans">
              {doctor.qualification}
            </p>

            <div className="mt-2.5 flex items-center gap-3 text-xs">
              <span className="font-serif font-bold text-forest text-sm">
                {formatINR(doctor.consultation_fee)}
                <span className="font-sans text-[11px] font-normal text-ink-muted"> / visit</span>
              </span>
            </div>
          </div>
        </div>

        {/* Short Bio */}
        {doctor.bio && (
          <p className="mt-4 text-xs text-ink-muted line-clamp-2 leading-relaxed font-sans">
            {doctor.bio}
          </p>
        )}

        {/* Clinic Location */}
        {doctor.clinic_address && (
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-ink-muted border-t border-warm-border-subtle pt-3">
            <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <span className="truncate">{doctor.clinic_address}</span>
          </div>
        )}
      </div>

      {/* Footer / Booking Action */}
      <div className="px-6 py-3.5 bg-ivory-light border-t border-warm-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Clock className="w-3.5 h-3.5 text-forest" />
          <span>
            {availableSlotCount !== undefined ? (
              availableSlotCount > 0 ? (
                <strong className="text-forest font-semibold">{availableSlotCount} open slots</strong>
              ) : (
                <span className="text-ink-muted">Next available soon</span>
              )
            ) : (
              <span className="text-forest font-medium">Slots Open Today</span>
            )}
          </span>
        </div>

        <Link
          href={`/doctors/${doctor.doctor_id}`}
          className="btn-forest text-xs px-3.5 py-1.5 gap-1"
        >
          <span>Select Slot</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
