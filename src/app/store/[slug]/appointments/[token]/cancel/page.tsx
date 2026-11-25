import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { AppointmentCancellationClient } from "@/components/storefront/AppointmentCancellationClient";
import { serializeStore } from "@/lib/serialization";

export const metadata: Metadata = {
  title: "Cancel Appointment | Client Portal",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

interface CancelPageProps {
  params: Promise<{ slug: string; token: string }>;
}

export default async function AppointmentCancellationPage({ params }: CancelPageProps) {
  const { slug, token } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

  return (
    <AppointmentCancellationClient
      store={serializeStore(store)}
      token={token}
    />
  );
}
