"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

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
          <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Inventra hit an unexpected error loading this page. Your data is safe — this is usually
            temporary.
          </p>
        </div>
        <Card className="gap-3 p-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => reset()} className="flex-1 gap-2">
              <RotateCcw className="size-4" />
              Try again
            </Button>
            <Button asChild variant="outline" className="flex-1 gap-2">
              <Link href="/">
                <Home className="size-4" />
                Back to dashboard
              </Link>
            </Button>
          </div>
          {error.digest && (
            <p className="text-center text-[11px] text-muted-foreground">
              Reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
