"use client";

import { Bot, ClipboardList, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One-time orientation card for the shared demo account. Pure presentation —
 * the show-once / localStorage logic lives in <DemoWelcomeGate/>.
 */
export function DemoWelcome({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-welcome-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-2 text-teal-600">
          <span className="flex size-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
            <Sparkles className="size-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Demo Mode
          </span>
        </div>

        <h2
          id="demo-welcome-title"
          className="mt-4 text-2xl font-semibold tracking-tight"
        >
          Welcome to Inventra AI
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Turn inventory data into business decisions.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You are exploring a sample business:{" "}
          <span className="font-medium text-foreground">
            Phnom Penh Mini-Mart
          </span>
          . All inventory data is sample data created for demonstration purposes.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What you can try
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            <li className="flex items-center gap-2 text-sm">
              <ShieldAlert className="size-4 shrink-0 text-teal-600" />
              Revenue Risk
            </li>
            <li className="flex items-center gap-2 text-sm">
              <ClipboardList className="size-4 shrink-0 text-teal-600" />
              Action Center
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Bot className="size-4 shrink-0 text-teal-600" />
              Business Copilot
            </li>
          </ul>
        </div>

        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-teal-500" />
            Sample inventory loaded
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-teal-500" />
            AI-generated insights
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-teal-500" />
            Business Copilot enabled
          </li>
        </ul>

        <Button size="lg" className="mt-6 w-full gap-2" onClick={onEnter}>
          <Sparkles className="size-4" />
          Enter Demo
        </Button>
      </div>
    </div>
  );
}
