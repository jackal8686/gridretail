export type TemplateStyle = 
  | "Editorial & Minimal" 
  | "High-Tech Dark" 
  | "Warm Organic" 
  | "Vibrant Modern" 
  | "Classic Boutique" 
  | "Bold Grid" 
  | "Clean Nordic" 
  | "Luxury Haute";

export interface Template {
  id: string;
  name: string;
  description: string;
  industry: string;
  style: TemplateStyle;
  featured: boolean;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  layoutType: "Grid" | "Split" | "Editorial" | "Showcase";
  compatibleIndustries: string[];
  thumbnailGradient: string;
}
