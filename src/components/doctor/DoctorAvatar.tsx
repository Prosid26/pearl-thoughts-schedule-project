"use client";

import React, { useState } from "react";
import { Doctor } from "@/types/database";

export type DoctorAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";

export interface DoctorAvatarProps {
  doctor?: Partial<Doctor> & {
    user?: { full_name?: string | null; email?: string | null };
    gender?: string | null;
    full_name?: string;
    name?: string;
  };
  doctorName?: string;
  specialization?: string;
  name?: string;
  avatarUrl?: string | null;
  gender?: "male" | "female" | "neutral" | string | null;
  size?: DoctorAvatarSize;
  className?: string;
  alt?: string;
  showActiveBadge?: boolean;
}

/**
 * Reliable explicit mapping for seeded demo doctors (by ID, email, and normalized name)
 * Ensures every seeded demo doctor receives their designated male/female silhouette placeholder
 * without guessing or relying on external images.
 */
export const DEMO_DOCTOR_GENDER_MAP: Record<string, "female" | "male"> = {
  // By doctor_id (numeric strings)
  "1": "female", // Dr. Ananya Sharma (Cardiologist)
  "2": "female", // Dr. Priya Nair (Dermatologist)
  "3": "male",   // Dr. Rohan Iyer (Neurologist)
  "4": "female", // Dr. Sneha Kulkarni (Pediatrician)
  "5": "male",   // Dr. Rahul Mehta (Orthopedic Specialist)
  "6": "male",   // Dr. Arjun Deshmukh (General Physician)
  "7": "female", // Dr. Aditi Patel (Gynecologist)
  "8": "male",   // Dr. Karan Shah (Dentist)

  // By normalized doctor full name (lowercase, stripped punctuation)
  "dr. ananya sharma": "female",
  "ananya sharma": "female",
  "dr ananya sharma": "female",
  "dr. priya nair": "female",
  "priya nair": "female",
  "dr priya nair": "female",
  "dr. rohan iyer": "male",
  "rohan iyer": "male",
  "dr rohan iyer": "male",
  "dr. sneha kulkarni": "female",
  "sneha kulkarni": "female",
  "dr sneha kulkarni": "female",
  "dr. rahul mehta": "male",
  "rahul mehta": "male",
  "dr rahul mehta": "male",
  "dr. arjun deshmukh": "male",
  "arjun deshmukh": "male",
  "dr arjun deshmukh": "male",
  "dr. aditi patel": "female",
  "aditi patel": "female",
  "dr aditi patel": "female",
  "dr. karan shah": "male",
  "karan shah": "male",
  "dr karan shah": "male",

  // Legacy demo doctors (for backward compatibility)
  "dr. sarah jenkins": "female",
  "sarah jenkins": "female",
  "dr. marcus vance": "male",
  "marcus vance": "male",
  "dr. elena rostova": "female",
  "elena rostova": "female",
  "dr. david chen": "male",
  "david chen": "male",
  "dr. priya sharma": "female",
  "priya sharma": "female",

  // By demo account emails
  "doctor.ananya@demo.com": "female",
  "doctor.priya@demo.com": "female",
  "doctor.rohan@demo.com": "male",
  "doctor.sneha@demo.com": "female",
  "doctor.rahul@demo.com": "male",
  "doctor.arjun@demo.com": "male",
  "doctor.aditi@demo.com": "female",
  "doctor.karan@demo.com": "male",
  "doctor.sarah@demo.com": "female",
  "doctor.marcus@demo.com": "male",
  "doctor.elena@demo.com": "female",
  "doctor.david@demo.com": "male",
};

/**
 * Checks whether an image URL is an unwanted external stock photo URL.
 * When true, we ignore it and use our professional local SVG silhouette instead.
 */
export function isUnwantedExternalStockUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const lower = url.toLowerCase().trim();
  return (
    lower.includes("unsplash.com") ||
    lower.includes("images.unsplash") ||
    lower.includes("pravatar") ||
    lower.includes("placeholder") ||
    lower.includes("example.com")
  );
}

/**
 * Accurately determines doctor gender based on explicit fields, demo mappings, bio, and names.
 */
export function getDoctorGender(
  doctor?: DoctorAvatarProps["doctor"],
  explicitGender?: string | null,
  fallbackName?: string
): "female" | "male" {
  // 1. Explicit prop on component
  if (explicitGender) {
    const g = explicitGender.toLowerCase();
    if (g.startsWith("f") || g === "female" || g === "woman") return "female";
    if (g.startsWith("m") || g === "male" || g === "man") return "male";
  }

  // 2. Explicit doctor.gender field from database/profile
  if (doctor?.gender) {
    const g = doctor.gender.toLowerCase();
    if (g.startsWith("f") || g === "female" || g === "woman") return "female";
    if (g.startsWith("m") || g === "male" || g === "man") return "male";
  }

  // 3. Reliable seeded demo doctor mapping by doctor_id
  if (doctor?.doctor_id !== undefined && doctor?.doctor_id !== null) {
    const mappedById = DEMO_DOCTOR_GENDER_MAP[String(doctor.doctor_id)];
    if (mappedById) return mappedById;
  }

  // 4. Reliable seeded demo doctor mapping by user email
  if (doctor?.user?.email) {
    const mappedByEmail = DEMO_DOCTOR_GENDER_MAP[doctor.user.email.toLowerCase().trim()];
    if (mappedByEmail) return mappedByEmail;
  }

  const rawName =
    fallbackName ||
    doctor?.user?.full_name ||
    doctor?.full_name ||
    doctor?.name ||
    "";

  const normalizedName = rawName.toLowerCase().trim();

  // 5. Reliable seeded demo doctor mapping by normalized full name
  if (DEMO_DOCTOR_GENDER_MAP[normalizedName]) {
    return DEMO_DOCTOR_GENDER_MAP[normalizedName];
  }

  // 6. Bio pronouns
  const bio = doctor?.bio || "";
  if (/\b(she|her|hers)\b/i.test(bio)) return "female";
  if (/\b(he|him|his)\b/i.test(bio)) return "male";

  // 7. Clean title prefix (e.g., "Dr.", "Dr", "Prof.") and check first name
  const cleaned = rawName.replace(/^(dr|prof|doctor)\.?\s+/i, "").trim().toLowerCase();
  const firstName = cleaned.split(/[\s.]+/)[0];

  const femaleNames = [
    "ananya",
    "priya",
    "sneha",
    "aditi",
    "pooja",
    "neha",
    "sunita",
    "kavita",
    "deepa",
    "anita",
    "sarah",
    "elena",
    "radha",
    "swati",
    "meera",
    "shruti",
    "tanvi",
    "divya",
    "rashmi",
    "shreya",
    "aarti",
    "rupa",
    "pallavi",
    "geeta",
    "nandini",
    "shweta",
    "isha",
    "ritu",
    "simran",
  ];

  if (femaleNames.includes(firstName)) {
    return "female";
  }

  return "male";
}

const sizeClasses: Record<DoctorAvatarSize, string> = {
  xs: "w-8 h-8 rounded-lg",
  sm: "w-10 h-10 rounded-xl",
  md: "w-14 h-14 rounded-xl",
  lg: "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl",
  xl: "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl",
  "2xl": "w-28 h-28 sm:w-32 sm:h-32 rounded-3xl",
  custom: "",
};

export function DoctorAvatar({
  doctor,
  doctorName: customDoctorName,
  specialization,
  name,
  avatarUrl,
  gender,
  size = "md",
  className = "",
  alt,
  showActiveBadge = false,
}: DoctorAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const rawUrl = avatarUrl !== undefined ? avatarUrl : doctor?.avatar_url;
  const doctorName =
    customDoctorName ||
    name ||
    doctor?.user?.full_name ||
    doctor?.full_name ||
    doctor?.name ||
    (specialization || doctor?.specialization ? `Dr. ${specialization || doctor?.specialization}` : "Medical Doctor");

  const resolvedGender = getDoctorGender(doctor, gender, doctorName);
  const fallbackSvgPath =
    resolvedGender === "female"
      ? "/avatars/doctor-female.svg"
      : "/avatars/doctor-male.svg";

  // Check if we have a valid non-stock URL
  const isStockPhoto = isUnwantedExternalStockUrl(rawUrl);
  const hasValidUrl = Boolean(rawUrl && !isStockPhoto && !imgError);

  const containerSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative inline-block shrink-0 select-none ${containerSizeClass} ${className}`}
      title={doctorName}
    >
      {hasValidUrl ? (
        <img
          src={rawUrl!}
          alt={alt || doctorName}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-[inherit] border border-slate-100 shadow-xs"
        />
      ) : (
        <img
          src={fallbackSvgPath}
          alt={alt || `${doctorName} Silhouette`}
          className="w-full h-full object-cover rounded-[inherit] border border-teal-100/80 shadow-xs"
        />
      )}

      {showActiveBadge && (
        <span
          className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-xs"
          title="Active Medical Practitioner"
        />
      )}
    </div>
  );
}

export default DoctorAvatar;
