"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: FilterSelectOption[];
  wrapperClassName?: string;
}

export function FilterSelect({
  label,
  options,
  value,
  onChange,
  className,
  wrapperClassName,
  ...props
}: FilterSelectProps) {
  return (
    <div className={cn("relative flex items-center", wrapperClassName)}>
      {label && <span className="text-xs font-medium text-[#66736C] mr-2 shrink-0">{label}:</span>}
      <div className="relative inline-block w-full">
        <select
          value={value}
          onChange={onChange}
          className={cn(
            "w-full appearance-none rounded-lg border border-[#E4E9E5] bg-white py-2 pl-3 pr-8 text-sm text-[#18231E]",
            "transition-colors duration-150 focus:border-[#176B4D] focus:outline-none focus:ring-1 focus:ring-[#176B4D] cursor-pointer",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#66736C]" />
      </div>
    </div>
  );
}
