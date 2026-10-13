import React from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "error" | "brand";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-[#F0F4F1] text-[#4F5D56] border-[#E4E9E5]",
    brand: "bg-[#E2F5E9] text-[#176B4D] border-[#C8E8D5]",
    success: "bg-[#EAF7EE] text-[#16804A] border-[#BEE7CB]",
    warning: "bg-[#FEF7E6] text-[#B7791F] border-[#FCE1AA]",
    error: "bg-[#FDEAEA] text-[#C43D3D] border-[#F7BCBC]",
  };

  const dotStyles = {
    neutral: "bg-[#66736C]",
    brand: "bg-[#176B4D]",
    success: "bg-[#16804A]",
    warning: "bg-[#B7791F]",
    error: "bg-[#C43D3D]",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant])} />}
      <span>{children}</span>
    </span>
  );
}
