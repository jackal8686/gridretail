import React from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

    const variantStyles = {
      primary:
        "bg-[#176B4D] text-white hover:bg-[#104D38] active:bg-[#0c3c2b] shadow-xs focus-visible:outline-[#176B4D]",
      secondary:
        "bg-[#E2F5E9] text-[#176B4D] hover:bg-[#d0eed9] active:bg-[#c0e6cb] focus-visible:outline-[#176B4D]",
      outline:
        "border border-[#E4E9E5] bg-white text-[#18231E] hover:bg-[#FAF9F6] hover:border-[#CCD5CE] active:bg-[#F0F4F1] focus-visible:outline-[#176B4D]",
      ghost:
        "text-[#18231E] hover:bg-[#F0F4F1] active:bg-[#E4E9E5] focus-visible:outline-[#176B4D]",
      danger:
        "bg-[#C43D3D] text-white hover:bg-[#a93434] active:bg-[#8f2c2c] focus-visible:outline-[#C43D3D]",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 min-h-[32px]",
      md: "text-sm px-3.5 py-2 gap-2 min-h-[40px]",
      lg: "text-base px-5 py-2.5 gap-2.5 min-h-[46px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!isLoading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </button>
    );
  }
);

Button.displayName = "Button";
