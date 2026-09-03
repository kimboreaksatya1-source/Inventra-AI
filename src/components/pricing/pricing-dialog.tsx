"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  period?: string;
  highlight?: boolean;
  cta: string;
  ctaDisabled?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    cta: "Current plan",
    ctaDisabled: true,
    features: [
      "1 business",
      "Dashboard access",
      "Revenue Risk Center",
      "Action Center",
      "Limited AI Copilot",
    ],
  },
  {
    name: "Pro",
    price: "$10",
    period: "/month",
    highlight: true,
    cta: "Upgrade to Pro",
    features: [
      "Unlimited AI Copilot",
      "Smart reorder recommendations",
      "Revenue protection alerts",
      "PDF reports",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cta: "Contact sales",
    features: ["Multi-store management", "Team collaboration", "Custom integrations"],
  },
];

export function PricingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  function choose(plan: Plan) {
    onOpenChange(false);
    toast("Demo mode — no payment is processed.", {
      description: `You selected the ${plan.name} plan.`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Inventra AI Pricing</DialogTitle>
          <DialogDescription>
            Pick the plan that fits your shop. This is a demo — no payment is taken.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-0.5 sm:max-h-none sm:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col rounded-xl border p-4",
                p.highlight
                  ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
                  : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide">{p.name}</h3>
                {p.highlight && (
                  <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-medium text-white">
                    Popular
                  </span>
                )}
              </div>

              <p className="mt-1.5">
                <span className="text-xl font-bold tabular-nums">{p.price}</span>
                {p.period && (
                  <span className="text-xs text-muted-foreground">{p.period}</span>
                )}
              </p>

              <ul className="mt-3 flex-1 space-y-1.5 text-xs">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        p.highlight ? "text-teal-600" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={p.highlight ? "default" : "outline"}
                size="sm"
                className="mt-4 w-full"
                disabled={p.ctaDisabled}
                onClick={() => choose(p)}
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
