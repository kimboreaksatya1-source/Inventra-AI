import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Page not found — Inventra AI",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/inventra-mark.png"
            alt="Inventra AI"
            width={444}
            height={521}
            priority
            className="h-9 w-auto opacity-90"
          />
          <p className="text-3xl font-semibold tracking-tight text-teal-600">404</p>
          <h1 className="text-lg font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            That page doesn&apos;t exist. It may have moved, or the link is out of date.
          </p>
        </div>
        <Card className="p-6">
          <Button asChild className="w-full gap-2">
            <Link href="/">
              <Home className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
