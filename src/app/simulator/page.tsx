import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { SimulatorClient } from "@/components/simulator/simulator-client";

export const metadata: Metadata = {
  title: "Scenario Simulator — Inventra AI",
};

export default function SimulatorPage() {
  return (
    <AppShell>
      <SimulatorClient />
    </AppShell>
  );
}
