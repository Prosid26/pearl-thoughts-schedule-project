import React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DoctorDetailLoading() {
  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Specialists Directory</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-teal-50 border border-teal-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-teal-100/70 rounded-full w-24" />
                <div className="h-6 bg-slate-200 rounded w-40" />
                <div className="h-4 bg-slate-100 rounded w-48" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-5 bg-teal-100 rounded w-20" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-5 bg-slate-200 rounded w-20" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-3.5 bg-slate-100 rounded w-full" />
              <div className="h-3.5 bg-slate-100 rounded w-5/6" />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="h-3.5 bg-slate-100 rounded w-4/5" />
            </div>
          </div>
        </div>

        {/* Right Column Skeleton (Booking Flow) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-teal-800 to-teal-900 p-6 text-white flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 bg-teal-600/50 rounded w-32" />
                <div className="h-6 bg-teal-700/60 rounded w-48" />
              </div>
              <div className="h-8 bg-teal-700/60 rounded w-24" />
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-40" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <div key={d} className="w-16 h-16 rounded-xl bg-slate-100" />
                  ))}
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-48" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className="h-10 rounded-xl bg-slate-100" />
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
