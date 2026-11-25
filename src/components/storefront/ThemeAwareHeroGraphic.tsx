"use client";

import React from "react";
import { Sparkles, Layers, Compass, Building, Briefcase } from "lucide-react";
import { ColorThemeTokens } from "@/types/template";
import { cn } from "@/utils/cn";

export interface ThemeAwareHeroGraphicProps {
  tokens: ColorThemeTokens;
  primaryColor: string;
  industry?: string;
  storeName?: string;
  className?: string;
  aspectRatio?: string;
  type?: "ecommerce" | "appointments" | "lead_gen";
}

export function ThemeAwareHeroGraphic({
  tokens,
  primaryColor,
  industry,
  storeName = "Store",
  className,
  aspectRatio = "aspect-[16/10]",
  type = "ecommerce",
}: ThemeAwareHeroGraphicProps) {
  // Select an appropriate subtle icon based on industry/type
  const getIndustryIcon = () => {
    const ind = (industry || "").toLowerCase();
    if (ind.includes("legal") || ind.includes("advisory") || type === "lead_gen") {
      return <Briefcase className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primaryColor }} />;
    }
    if (ind.includes("health") || ind.includes("consult") || type === "appointments") {
      return <Compass className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primaryColor }} />;
    }
    if (ind.includes("tech") || ind.includes("electronics")) {
      return <Layers className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primaryColor }} />;
    }
    if (ind.includes("home") || ind.includes("living") || ind.includes("fashion")) {
      return <Building className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primaryColor }} />;
    }
    return <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primaryColor }} />;
  };

  const getSublabel = () => {
    if (type === "appointments") return "Professional Practice & Advisory";
    if (type === "lead_gen") return "Commercial Strategy & Consultation";
    return "Curated Brand Collection";
  };

  const initials = storeName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      data-testid="theme-aware-hero-graphic"
      className={cn(
        "relative w-full overflow-hidden flex items-center justify-center border select-none transition-colors",
        aspectRatio,
        className
      )}
      style={{
        backgroundColor: tokens.cardBg,
        borderColor: tokens.border,
      }}
    >
      {/* Background ambient radial gradients matching active theme tokens */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle at 70% 30%, ${primaryColor} 0%, transparent 60%), radial-gradient(circle at 20% 80%, ${tokens.accent} 0%, transparent 50%)`,
        }}
      />

      {/* Elegant geometric architectural line pattern */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-grid-pattern"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={tokens.border}
              strokeWidth="0.75"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
        {/* Subtle decorative concentric arc */}
        <circle
          cx="85%"
          cy="15%"
          r="140"
          fill="none"
          stroke={tokens.accent}
          strokeWidth="1"
          strokeDasharray="4 6"
          opacity="0.4"
        />
        <circle
          cx="85%"
          cy="15%"
          r="200"
          fill="none"
          stroke={tokens.border}
          strokeWidth="1"
          opacity="0.3"
        />
      </svg>

      {/* Floating Center Glass Emblem */}
      <div
        className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border backdrop-blur-xs shadow-xs text-center max-w-[85%]"
        style={{
          backgroundColor: `${tokens.surface}CC`,
          borderColor: tokens.border,
        }}
      >
        <div
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-3 shadow-xs border transition-transform hover:scale-105"
          style={{
            backgroundColor: tokens.badgeBg,
            borderColor: tokens.border,
          }}
        >
          {getIndustryIcon()}
        </div>

        <div className="space-y-1">
          <span
            className="text-[10px] sm:text-xs font-bold tracking-widest uppercase block"
            style={{ color: tokens.accent }}
          >
            {getSublabel()}
          </span>
          <span
            className="text-sm sm:text-base font-extrabold tracking-tight block truncate max-w-[240px] sm:max-w-[320px]"
            style={{ color: tokens.text }}
          >
            {storeName}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 opacity-60">
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: primaryColor }} />
          <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: tokens.textMuted }}>
            {initials} • ESTABLISHED SHOWCASE
          </span>
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: primaryColor }} />
        </div>
      </div>
    </div>
  );
}
