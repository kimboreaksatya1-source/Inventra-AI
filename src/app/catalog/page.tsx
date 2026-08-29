import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { CatalogClient } from "@/components/catalog/catalog-client";

export const metadata: Metadata = {
  title: "Catalog — Inventra AI",
};

export default function CatalogPage() {
  return (
    <AppShell>
      <CatalogClient />
    </AppShell>
  );
}
