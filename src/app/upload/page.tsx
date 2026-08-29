import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { UploadClient } from "@/components/upload/upload-client";

export const metadata: Metadata = {
  title: "Upload Data — Inventra AI",
};

export default function UploadPage() {
  return (
    <AppShell>
      <UploadClient />
    </AppShell>
  );
}
