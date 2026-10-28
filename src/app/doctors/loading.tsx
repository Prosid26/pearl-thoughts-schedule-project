import React from "react";
import { Stethoscope } from "lucide-react";

export default function DoctorsLoading() {
  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-slate-200 pb-6 space-y-3">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider">
          <Stethoscope className="w-4 h-4 text-teal-500" />
          <span>Practitioner Directory</span>
        </div>
        <div className="h-8 bg-slate-200 rounded-lg w-72" />
        <div className="h-4 bg-slate-100 rounded w-96 max-w-full" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="h-11 bg-slate-100 rounded-xl flex-1" />
          <div className="h-11 bg-slate-100 rounded-xl w-full md:w-56" />
          <div className="h-11 bg-slate-100 rounded-xl w-full md:w-48" />
        </div>
        <div className="flex items-center gap-2 overflow-hidden pt-1">
          <div className="h-6 w-16 bg-slate-100 rounded-full" />
          <div className="h-6 w-24 bg-teal-100/60 rounded-full" />
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
          <div className="h-6 w-28 bg-slate-100 rounded-full" />
        </div>
      </div>

      {/* Count Skeleton */}
      <div className="h-4 bg-slate-200/70 rounded w-44" />

      {/* Grid of Doctor Cards Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50/80 border border-teal-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-teal-100/70 rounded-full w-20" />
                <div className="h-5 bg-slate-200 rounded w-36" />
                <div className="h-3.5 bg-slate-100 rounded w-full" />
                <div className="h-3.5 bg-slate-100 rounded w-24" />
              </div>
            </div>
            <div className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="h-4 bg-slate-100 rounded w-28" />
              <div className="h-8 bg-teal-100 rounded-lg w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
