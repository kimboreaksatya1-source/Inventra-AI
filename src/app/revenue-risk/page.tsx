import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { RiskTable } from "@/components/revenue-risk/risk-table";

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
            Every product ranked by the revenue you stand to lose if it runs out. Sort, search, and
            filter to decide what to reorder first.
          </p>
        </div>
        <RiskTable />
      </div>
    </AppShell>
  );
}
