import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { CopilotClient } from "@/components/copilot/copilot-client";

export const metadata: Metadata = {
  title: "AI Copilot — Inventra AI",
};

export default function CopilotPage() {
  return (
    <AppShell bleed>
      <CopilotClient />
    </AppShell>
  );
}
