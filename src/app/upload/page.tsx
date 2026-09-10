import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/app/app-shell";
import { UploadClient } from "@/components/upload/upload-client";
import { DemoUploadNotice } from "@/components/upload/demo-upload-notice";

export const metadata: Metadata = {
  title: "Upload Data — Inventra AI",
};

export default async function UploadPage() {
  const session = await auth();
  const isDemo = session?.user?.isDemo === true;

  return (
    <AppShell>{isDemo ? <DemoUploadNotice /> : <UploadClient />}</AppShell>
  );
}
