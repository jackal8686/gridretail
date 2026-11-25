"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Form fields remain empty by default - no automatic prepopulation of credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (res?.error) {
        if (res.error.includes("ACCOUNT_DISABLED")) {
          setErrorMessage("This account has been disabled by a workspace administrator.");
        } else {
          setErrorMessage("Invalid email or password. Please verify your credentials.");
        }
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex h-12 w-12 rounded-xl bg-[#176B4D] items-center justify-center text-white font-bold text-xl shadow-xs mb-3">
          GR
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18231E]">
          GridRetail
        </h1>
        <p className="text-xs sm:text-sm text-[#66736C] mt-1">
          GridRetail — Internal Website Generation Platform
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E4E9E5] shadow-lg p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#18231E]">Admin Login</h2>
          <p className="text-xs text-[#66736C] mt-0.5">
            Enter authorized administrator credentials to access the workspace.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-[#FDEAEA] border border-[#F7BCBC] text-xs text-[#C43D3D] flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1.5" htmlFor="email">
              Employee Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#66736C]" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gridretail.internal"
                className="w-full rounded-lg border border-[#E4E9E5] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#18231E] placeholder-[#909D96] transition-colors focus:border-[#176B4D] focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#18231E]" htmlFor="password">
                Password
              </label>
              <span className="text-[11px] text-[#66736C]">Min. 8 characters</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#66736C]" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[#E4E9E5] bg-white py-2.5 pl-10 pr-10 text-sm text-[#18231E] placeholder-[#909D96] transition-colors focus:border-[#176B4D] focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66736C] hover:text-[#18231E] p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign In as Admin
          </Button>
        </form>
      </div>

      {/* Security notice footer */}
      <p className="text-[11px] text-[#909D96] mt-6 text-center">
        GridRetail Platform • Internal Corporate System • Unauthorized access prohibited
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-sm text-[#66736C]">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
