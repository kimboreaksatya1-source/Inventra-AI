"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoModeBadge } from "@/components/app/demo-mode-badge";
import { useIsDemo } from "@/hooks/use-is-demo";

/**
 * The single "go import your data" call-to-action used by every empty / gated
 * feature state. For the shared demo account there is nothing to import — the
 * sample catalog is fixed — so it renders the "Demo Mode" badge instead.
 */
export function ImportCta({
  label = "Import data",
  size,
  className,
}: {
  label?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const isDemo = useIsDemo();

  if (isDemo) return <DemoModeBadge className={className} />;

  return (
    <Button asChild size={size} className={className}>
      <Link href="/upload">{label}</Link>
    </Button>
  );
}
