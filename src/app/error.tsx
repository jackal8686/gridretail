"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors safely without leaking stack traces to public visitors
    console.error("[GridRetail Global Error Boundary]", error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 text-stone-900 dark:text-stone-100">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          An unexpected system condition occurred. Our technical operations log has recorded the incident.
        </p>
        {error.digest && (
          <div className="font-mono text-[11px] text-stone-500 bg-stone-100 dark:bg-stone-800 p-2 rounded-lg">
            Error Reference: {error.digest}
          </div>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
