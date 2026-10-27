import React from "react";
import { Loader2, Stethoscope } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
          <Stethoscope className="w-7 h-7" />
        </div>
        <Loader2 className="w-6 h-6 text-teal-600 animate-spin absolute -bottom-1 -right-1" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">
          Loading Pearl Thoughts Healthcare...
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Retrieving live schedules and practitioner data
        </p>
      </div>
    </div>
  );
}
