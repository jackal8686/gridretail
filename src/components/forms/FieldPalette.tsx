import React from "react";
import { FormFieldType } from "@/types/lead";
import {
  Type,
  Mail,
  Phone,
  AlignLeft,
  ChevronDownSquare,
  CheckCircle2,
  CheckSquare,
  Calendar,
  Hash,
} from "lucide-react";

interface FieldPaletteItem {
  type: FormFieldType;
  label: string;
  icon: React.ElementType;
  description: string;
}

export const PALETTE_FIELDS: FieldPaletteItem[] = [
  { type: "text", label: "Single-line Text", icon: Type, description: "Names, titles, single short answers" },
  { type: "email", label: "Email Address", icon: Mail, description: "Electronic mail with auto-format validation" },
  { type: "phone", label: "Phone Number", icon: Phone, description: "International / domestic telephone numbers" },
  { type: "textarea", label: "Long Text / Notes", icon: AlignLeft, description: "Multi-line comments, project descriptions" },
  { type: "select", label: "Dropdown Select", icon: ChevronDownSquare, description: "Single option chosen from collapsible list" },
  { type: "radio", label: "Radio Buttons", icon: CheckCircle2, description: "Mutually exclusive selection from visible list" },
  { type: "checkbox", label: "Checkbox Options", icon: CheckSquare, description: "Multiple choice toggles or consent boxes" },
  { type: "date", label: "Date Picker", icon: Calendar, description: "Target delivery dates or preferred meetings" },
  { type: "number", label: "Numeric Field", icon: Hash, description: "Quantity, budget ranges, headcount" },
];

interface FieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
}

export const FieldPalette: React.FC<FieldPaletteProps> = ({ onAddField }) => {
  return (
    <div className="bg-white rounded-xl border border-[#E4E9E5] p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#F0F4F1]">
        <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
          Field Palette (9 Types)
        </h4>
        <span className="text-[10px] text-[#66736C]">Click to add</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {PALETTE_FIELDS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onAddField(item.type)}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#E4E9E5] bg-[#FAF9F6] hover:bg-[#E2F5E9]/50 hover:border-[#176B4D] text-left transition-all group cursor-pointer"
            >
              <div className="h-7 w-7 rounded-md bg-white border border-[#E4E9E5] flex items-center justify-center text-[#176B4D] group-hover:scale-105 transition-transform shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18231E] group-hover:text-[#176B4D] truncate">
                  {item.label}
                </p>
                <p className="text-[10px] text-[#66736C] line-clamp-1">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
