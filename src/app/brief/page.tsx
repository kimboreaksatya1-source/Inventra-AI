import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { BriefReport } from "@/components/brief/brief-report";

export const metadata: Metadata = {
  title: "Business Brief — Inventra AI",
};

export default function BriefPage() {
  return (
    <AppShell>
      <BriefReport />
    </AppShell>
  );
}
