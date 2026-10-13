"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  wrapperClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, value, onChange, onClear, placeholder = "Search...", ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full max-w-md", wrapperClassName)}>
        <Search className="absolute left-3.5 h-4 w-4 text-[#66736C] pointer-events-none select-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border border-[#E4E9E5] bg-white py-2 pl-9 pr-9 text-sm text-[#18231E] placeholder-[#909D96]",
            "transition-colors duration-150 focus:border-[#176B4D] focus:outline-none focus:ring-1 focus:ring-[#176B4D]",
            className
          )}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-0.5 rounded-full text-[#66736C] hover:text-[#18231E] hover:bg-[#F0F4F1] transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
