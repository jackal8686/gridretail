import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 text-stone-900 dark:text-stone-100">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Page Not Found</h1>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          The requested page or storefront does not exist, has been unpublished, or is unavailable.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
