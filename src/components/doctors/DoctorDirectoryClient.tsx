"use client";

import React, { useState, useMemo } from "react";
import { Doctor } from "@/types/database";
import { DoctorCard } from "./DoctorCard";
import { Search, Stethoscope, RotateCcw } from "lucide-react";

interface Props {
  initialDoctors: Doctor[];
  specialties: string[];
}

export function DoctorDirectoryClient({
  initialDoctors,
  specialties,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [minExp, setMinExp] = useState<number>(0);

  const filteredDoctors = useMemo(() => {
    return initialDoctors.filter((doc) => {
      // Specialty filter
      if (selectedSpecialty !== "All") {
        if (
          doc.specialization.toLowerCase() !== selectedSpecialty.toLowerCase()
        ) {
          return false;
        }
      }

      // Experience filter
      if (minExp > 0 && doc.experience_years < minExp) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const name = doc.user?.full_name?.toLowerCase() || "";
        const spec = doc.specialization.toLowerCase();
        const qual = doc.qualification.toLowerCase();
        const clinic = doc.clinic_address?.toLowerCase() || "";
        if (
          !name.includes(q) &&
          !spec.includes(q) &&
          !qual.includes(q) &&
          !clinic.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialDoctors, searchTerm, selectedSpecialty, minExp]);

  const handleReset = () => {
    setSearchTerm("");
    setSelectedSpecialty("All");
    setMinExp(0);
  };

  return (
    <div className="space-y-8">
      {/* Search and Filters Bar */}
      <div className="clinic-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by physician name, specialty, or clinic..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink placeholder:text-ink-muted focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Specialty Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              aria-label="Filter by Medical Specialty"
              className="w-full px-3 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            >
              <option value="All">All Specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Filter */}
          <div className="w-full md:w-48">
            <select
              value={minExp}
              onChange={(e) => setMinExp(Number(e.target.value))}
              aria-label="Filter by Experience"
              className="w-full px-3 py-2.5 rounded-lg border border-warm-border text-xs sm:text-sm bg-white text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
            >
              <option value={0}>Any Experience</option>
              <option value={10}>10+ Years Practice</option>
              <option value={15}>15+ Years Practice</option>
            </select>
          </div>

          {(searchTerm || selectedSpecialty !== "All" || minExp > 0) && (
            <button
              onClick={handleReset}
              className="btn-ivory text-xs px-4 py-2.5 gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Quick Filter Specialty Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs pt-1 border-t border-warm-border-subtle">
          <span className="text-ink-muted font-medium shrink-0">Specialties:</span>
          <button
            onClick={() => setSelectedSpecialty("All")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all shrink-0 ${
              selectedSpecialty === "All"
                ? "bg-forest text-ivory border border-forest"
                : "bg-white text-ink-muted hover:text-ink border border-warm-border hover:bg-ivory-light"
            }`}
          >
            All ({initialDoctors.length})
          </button>
          {specialties.map((s) => {
            const count = initialDoctors.filter(
              (d) => d.specialization.toLowerCase() === s.toLowerCase()
            ).length;
            const isSelected = selectedSpecialty === s;
            return (
              <button
                key={s}
                onClick={() => setSelectedSpecialty(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-forest text-ivory border border-forest"
                    : "bg-white text-ink-muted hover:text-ink border border-warm-border hover:bg-ivory-light"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-ink-muted px-1">
        <span>
          Showing <strong>{filteredDoctors.length}</strong> verified medical practitioners
        </span>
      </div>

      {/* Doctors Grid */}
      {filteredDoctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <DoctorCard key={doc.doctor_id} doctor={doc} />
          ))}
        </div>
      ) : (
        <div className="clinic-card p-12 text-center max-w-md mx-auto space-y-3.5">
          <div className="w-12 h-12 rounded-lg bg-ivory text-ink-muted flex items-center justify-center mx-auto border border-warm-border">
            <Stethoscope className="w-5 h-5 text-forest" />
          </div>
          <h3 className="font-serif text-lg font-bold text-ink">
            No practitioners found
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed font-sans">
            No medical specialists match your active search criteria. Adjust or reset
            your filters to view available clinic rosters.
          </p>
          <button
            onClick={handleReset}
            className="btn-forest text-xs px-4 py-2"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
