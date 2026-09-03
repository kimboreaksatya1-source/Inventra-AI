"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Boxes,
  FileText,
  FlaskConical,
  ListChecks,
  PackageCheck,
  ShieldAlert,
  Upload,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/catalog", label: "Catalog", icon: Boxes },
  { href: "/brief", label: "Brief", icon: FileText },
  { href: "/revenue-risk", label: "Revenue Risk", icon: ShieldAlert },
  { href: "/simulator", label: "Simulator", icon: FlaskConical },
  { href: "/procurement", label: "Procurement", icon: PackageCheck },
  { href: "/cashflow", label: "Cash Flow", icon: Wallet },
  { href: "/copilot", label: "Copilot", icon: Bot },
] as const;

/**
 * Demo mode — hides modules that aren't in the redesigned demo flow yet so
 * judges don't land on them. The routes still exist and work directly by URL;
 * flip DEMO_MODE to false (or clear DEMO_HIDDEN) to restore the full nav.
 */
const DEMO_MODE = true;
const DEMO_HIDDEN = new Set<string>(["/simulator", "/procurement", "/cashflow"]);

export function FlowNav() {
  const pathname = usePathname();
  const steps = DEMO_MODE ? STEPS.filter((s) => !DEMO_HIDDEN.has(s.href)) : STEPS;
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {steps.map((step) => {
        const active = pathname === step.href;
        const Icon = step.icon;
        return (
          <Link
            key={step.href}
            href={step.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="hidden lg:inline">{step.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
