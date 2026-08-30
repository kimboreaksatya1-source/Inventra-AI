import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { CashflowClient } from "@/components/cashflow/cashflow-client";

export const metadata: Metadata = {
  title: "Cash Flow — Inventra AI",
};

export default function CashflowPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Flow Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where your working capital is tied up — inventory value, cash locked in slow and dead
            stock, and the products consuming the most capital.
          </p>
        </div>
        <CashflowClient />
      </div>
    </AppShell>
  );
}
