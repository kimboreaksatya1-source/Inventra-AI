import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { RiskOverview } from "@/components/revenue-risk/risk-overview";
import { RiskTableSection } from "@/components/revenue-risk/risk-table-section";

export const metadata: Metadata = {
  title: "Revenue Risk — Inventra AI",
};

export default function RevenueRiskPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revenue Protection Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What&apos;s at risk, how much money, and what to reorder first.
          </p>
        </div>
        <RiskOverview />
        <RiskTableSection />
      </div>
    </AppShell>
  );
}
