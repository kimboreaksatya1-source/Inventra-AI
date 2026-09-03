"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingDialog } from "./pricing-dialog";

/** Demo-only "Free Trial" nudge — no billing, no backend. */
export function UpgradeCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Sparkles className="size-3.5 text-teal-600" />
        Free Trial
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        You are currently using Inventra AI Free.
      </p>
      <Button size="sm" className="mt-2.5 w-full" onClick={() => setOpen(true)}>
        Upgrade to Pro
      </Button>

      <PricingDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
