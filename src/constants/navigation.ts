export interface NavItem {
  title: string;
  href: string;
  iconName: "LayoutDashboard" | "BarChart3" | "Store" | "Users" | "Palette" | "Package" | "Settings";
  badge?: string;
  description: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    iconName: "LayoutDashboard",
    description: "Overview of retail demo stores and production metrics",
  },
  {
    title: "Stores",
    href: "/stores",
    iconName: "Store",
    description: "Manage client demo storefronts and deployment statuses",
  },
  {
    title: "Templates",
    href: "/templates",
    iconName: "Palette",
    description: "Pre-built e-commerce storefront designs and themes",
  },
  {
    title: "Settings",
    href: "/settings",
    iconName: "Settings",
    description: "Workspace configuration and team preferences",
  },
];
