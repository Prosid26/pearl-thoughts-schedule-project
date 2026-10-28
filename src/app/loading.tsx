import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-forest text-ivory flex items-center justify-center shadow-md">
          <svg
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 3v18M3 12h18" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" fill="#DCE5D8" fillOpacity="0.4" />
          </svg>
        </div>
        <Loader2 className="w-5 h-5 text-terracotta animate-spin absolute -bottom-1 -right-1" />
      </div>
      <div className="text-center">
        <p className="font-serif text-base font-normal text-ink">
          Medrella Modern Private Clinic
        </p>
        <p className="text-xs text-muted-text mt-0.5">
          Connecting to clinical practice registry and live schedules...
        </p>
      </div>
    </div>
  );
}
