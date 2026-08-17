"use client";

import { AppShell } from "@/components/shared/app-shell";
import { DashboardView } from "@/components/views/dashboard-view";
import { AiAdvisorView } from "@/components/views/ai-advisor-view";
import { RevenueProtectionView } from "@/components/views/revenue-protection-view";
import { InventoryHealthView } from "@/components/views/inventory-health-view";
import { ForecastView } from "@/components/views/forecast-view";
import { InsightsView } from "@/components/views/insights-view";
import { AlertsView } from "@/components/views/alerts-view";
import { SettingsView } from "@/components/views/settings-view";
import { useAppStore } from "@/lib/store";
import type { SectionId } from "@/lib/types";

const VIEWS: Record<SectionId, React.ComponentType> = {
  dashboard: DashboardView,
  "ai-advisor": AiAdvisorView,
  "revenue-protection": RevenueProtectionView,
  "inventory-health": InventoryHealthView,
  forecast: ForecastView,
  insights: InsightsView,
  alerts: AlertsView,
  settings: SettingsView,
};

export default function Home() {
  const activeSection = useAppStore((s) => s.activeSection);
  const View = VIEWS[activeSection] ?? DashboardView;
  return (
    <AppShell>
      <View />
    </AppShell>
  );
}
