import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { ActionsClient } from "@/components/actions/actions-client";

export const metadata: Metadata = {
  title: "Action Center — Inventra AI",
};

export default function ActionsPage() {
  return (
    <AppShell>
      <ActionsClient />
    </AppShell>
  );
}
