"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, FileText, FlaskConical, ListChecks, ShieldAlert, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/brief", label: "Brief", icon: FileText },
  { href: "/revenue-risk", label: "Revenue Risk", icon: ShieldAlert },
  { href: "/simulator", label: "Simulator", icon: FlaskConical },
  { href: "/copilot", label: "Copilot", icon: Bot },
] as const;

export function FlowNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin">
      {STEPS.map((step) => {
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
            <span className="hidden md:inline">{step.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
