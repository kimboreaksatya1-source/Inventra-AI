"use client";

import { useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ThemeProvider } from "./theme-provider";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import type { DashboardMetrics, OpportunityFeedItem, ProductWithMetrics } from "@/lib/types";

interface MetricsResponse {
  seeded: boolean;
  user?: { name: string; businessName: string; email: string };
  metrics?: DashboardMetrics;
  feed?: OpportunityFeedItem[];
  productMetrics?: ProductWithMetrics[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, loading, refresh } = useFetch<MetricsResponse>("/api/metrics");
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);

  // If not seeded, attempt a one-time seed then refresh
  useEffect(() => {
    if (data && !data.seeded) {
      fetch("/api/seed", { method: "POST" }).then(() => refresh());
    }
  }, [data, refresh]);

  const user = data?.user ?? null;
  const revenueAtRisk = data?.metrics?.revenueAtRisk ?? 0;
  const alertCount = data?.productMetrics
    ? data.productMetrics.filter(
        (p) => p.averageDailySales > 0 && p.daysRemaining < 7
      ).length + data.productMetrics.filter((p) => p.status === "overstock").length
    : 0;

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar variant="desktop" />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              variant="sheet"
              onClose={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={user}
            revenueAtRisk={revenueAtRisk}
            alertCount={alertCount}
            onOpenNav={() => setMobileNavOpen(true)}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          <footer className="mt-auto border-t border-border bg-background px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
              <p>
                © {new Date().getFullYear()} Inventra AI — Built for Cambodian SMEs.
              </p>
              <p className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                AI engine online · All systems operational
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}
