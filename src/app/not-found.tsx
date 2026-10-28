import React from "react";
import Link from "next/link";
import { Stethoscope, Home, ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="py-20 px-4 flex flex-col items-center justify-center">
      <div className="clinic-card p-8 sm:p-10 max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-lg bg-sage text-forest border border-sage-dark/60 flex items-center justify-center mx-auto">
          <Stethoscope className="w-6 h-6 text-forest" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-forest uppercase tracking-wider font-sans">
            Status 404 • Clinical Route Missing
          </span>
          <h2 className="font-serif text-2xl font-bold text-ink">
            Page Not Located
          </h2>
          <p className="text-xs text-ink-muted leading-relaxed font-sans">
            The requested medical specialist, appointment schedule, or page does
            not exist or has been shifted to a new wing.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-3">
          <Link
            href="/"
            className="btn-forest text-xs px-4 py-2 gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>

          <Link
            href="/doctors"
            className="btn-ivory text-xs px-4 py-2 gap-1.5"
          >
            <span>Consult Specialists</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
