import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { ProcurementClient } from "@/components/procurement/procurement-client";

export const metadata: Metadata = {
  title: "Procurement — Inventra AI",
};

export default function ProcurementPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Procurement Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What to buy next, how much, and why — order quantities sized to keep fast movers 21 days
            covered, medium 30, slow 45.
          </p>
        </div>
        <ProcurementClient />
      </div>
    </AppShell>
  );
}
