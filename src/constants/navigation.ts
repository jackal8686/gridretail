export interface NavItem {
  title: string;
  href: string;
  iconName: "LayoutDashboard" | "Store" | "Users" | "Palette" | "Package" | "Settings";
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
    badge: "6",
    description: "Manage client demo storefronts and deployment statuses",
  },
  {
    title: "Clients",
    href: "/clients",
    iconName: "Users",
    description: "Client portfolios, industry tags and account owners",
  },
  {
    title: "Templates",
    href: "/templates",
    iconName: "Palette",
    badge: "8",
    description: "Pre-built e-commerce storefront designs and themes",
  },
  {
    title: "Products",
    href: "/products",
    iconName: "Package",
    description: "Demo product catalog, pricing and stock data",
  },
  {
    title: "Settings",
    href: "/settings",
    iconName: "Settings",
    description: "Workspace configuration and team preferences",
  },
];
