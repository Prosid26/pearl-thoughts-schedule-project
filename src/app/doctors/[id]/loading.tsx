import React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DoctorDetailLoading() {
  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-text"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Specialists Directory</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-5 space-y-6">
          <div className="clinic-card p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-sage/30 border border-warm-border shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-sage/50 rounded-full w-24" />
                <div className="h-6 bg-warm-border/60 rounded w-40" />
                <div className="h-4 bg-warm-border/40 rounded w-48" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-sage/10 rounded-xl border border-warm-border/60">
              <div className="space-y-1">
                <div className="h-3 bg-warm-border/50 rounded w-16" />
                <div className="h-5 bg-terracotta/40 rounded w-20" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-warm-border/50 rounded w-16" />
                <div className="h-5 bg-warm-border/60 rounded w-20" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-4 bg-warm-border/50 rounded w-32" />
              <div className="h-3.5 bg-warm-border/30 rounded w-full" />
              <div className="h-3.5 bg-warm-border/30 rounded w-5/6" />
            </div>

            <div className="pt-2 border-t border-warm-border/60 space-y-2">
              <div className="h-4 bg-warm-border/50 rounded w-28" />
              <div className="h-3.5 bg-warm-border/30 rounded w-4/5" />
            </div>
          </div>
        </div>

        {/* Right Column Skeleton (Booking Flow) */}
        <div className="lg:col-span-7">
          <div className="clinic-card overflow-hidden">
            <div className="bg-forest p-6 text-ivory flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 bg-sage/30 rounded w-32" />
                <div className="h-6 bg-ivory/30 rounded w-48" />
              </div>
              <div className="h-8 bg-terracotta/40 rounded-xl w-24" />
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="h-4 bg-warm-border/50 rounded w-40" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <div key={d} className="w-16 h-16 rounded-xl bg-warm-border/30" />
                  ))}
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-warm-border/60">
                <div className="h-4 bg-warm-border/50 rounded w-48" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className="h-10 rounded-xl bg-warm-border/30" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
