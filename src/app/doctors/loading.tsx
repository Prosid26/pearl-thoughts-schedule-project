import React from "react";
import { Stethoscope } from "lucide-react";

export default function DoctorsLoading() {
  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-warm-border pb-6 space-y-3">
        <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-widest">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Practitioner Directory</span>
        </div>
        <div className="h-9 bg-warm-border/60 rounded-xl w-80" />
        <div className="h-4 bg-warm-border/40 rounded-lg w-96 max-w-full" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="clinic-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="h-11 bg-warm-border/30 rounded-xl flex-1" />
          <div className="h-11 bg-warm-border/30 rounded-xl w-full md:w-56" />
          <div className="h-11 bg-warm-border/30 rounded-xl w-full md:w-48" />
        </div>
        <div className="flex items-center gap-2 overflow-hidden pt-1">
          <div className="h-6 w-16 bg-warm-border/30 rounded-full" />
          <div className="h-6 w-24 bg-sage/60 rounded-full" />
          <div className="h-6 w-24 bg-warm-border/30 rounded-full" />
          <div className="h-6 w-24 bg-warm-border/30 rounded-full" />
          <div className="h-6 w-28 bg-warm-border/30 rounded-full" />
        </div>
      </div>

      {/* Count Skeleton */}
      <div className="h-4 bg-warm-border/40 rounded w-44" />

      {/* Grid of Doctor Cards Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="clinic-card p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sage/30 border border-warm-border shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-sage/50 rounded-full w-20" />
                <div className="h-5 bg-warm-border/60 rounded w-36" />
                <div className="h-3.5 bg-warm-border/40 rounded w-full" />
                <div className="h-3.5 bg-warm-border/40 rounded w-24" />
              </div>
            </div>
            <div className="h-10 bg-warm-border/20 rounded-xl border border-warm-border/50" />
            <div className="flex items-center justify-between pt-2 border-t border-warm-border/60">
              <div className="h-4 bg-warm-border/40 rounded w-28" />
              <div className="h-8 bg-forest/20 rounded-lg w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
