"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-terracotta/20 border border-terracotta/40 flex items-center justify-center text-ink shadow-xs">
        <AlertCircle className="w-7 h-7 text-ink" />
      </div>

      <div className="space-y-1.5">
        <h2 className="font-serif text-2xl font-normal text-ink">
          Unexpected Clinical Exception
        </h2>
        <p className="text-xs text-muted-text leading-relaxed">
          {error.message ||
            "An unexpected interruption occurred during clinical request processing. The clinic state remains secure."}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="btn-forest inline-flex items-center gap-1.5 text-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>

        <Link
          href="/"
          className="btn-ivory inline-flex items-center gap-1.5 text-xs"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Clinic Home</span>
        </Link>
      </div>
    </div>
  );
}
