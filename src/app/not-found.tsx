import React from "react";
import Link from "next/link";
import { Stethoscope, Home, ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
        <Stethoscope className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
          404 Not Found
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900">
          Page Not Located
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The requested healthcare page, specialist, or appointment route does
          not exist or has been moved.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>

        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <span>Find Doctors</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
