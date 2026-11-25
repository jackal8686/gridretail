import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { siteConfig } from "@/config/site";
import { parseSubdomain } from "@/lib/urls";

const geistSans = { variable: "" };
const geistMono = { variable: "" };

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const { isSubdomain } = parseSubdomain(host);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {isSubdomain ? children : <AppShell>{children}</AppShell>}
      </body>
    </html>
  );
}
