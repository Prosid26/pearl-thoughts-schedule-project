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
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor name, specialty, or clinic..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Specialty Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              aria-label="Filter by Medical Specialty"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value={0}>Any Experience</option>
              <option value={10}>10+ Years Experience</option>
              <option value={15}>15+ Years Experience</option>
            </select>
          </div>

          {(searchTerm || selectedSpecialty !== "All" || minExp > 0) && (
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Quick Filter Specialty Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-medium shrink-0">Quick Filter:</span>
          <button
            onClick={() => setSelectedSpecialty("All")}
            className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 ${
              selectedSpecialty === "All"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 ${
                  isSelected
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredDoctors.length}</strong> verified doctors
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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No doctors match your criteria
          </h3>
          <p className="text-xs text-slate-500">
            Try adjusting your search terms or resetting your filters to view all available medical specialists.
          </p>
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
