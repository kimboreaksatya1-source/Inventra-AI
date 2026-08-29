"use client";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { Sparkles, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  variant: "desktop" | "sheet";
  onClose?: () => void;
}

export function Sidebar({ variant, onClose }: SidebarProps) {
  const activeSection = useAppStore((s) => s.activeSection);
  const setSection = useAppStore((s) => s.setSection);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between gap-2 px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-teal-900/30">
            <Image
              src="/inventra-logo.png"
              alt="Inventra"
              width={36}
              height={36}
              className="size-9 scale-125 object-cover"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-white">Inventra</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-teal-300/80">
              AI Copilot
            </p>
          </div>
        </div>
        {variant === "sheet" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-teal-500/15 text-white ring-1 ring-inset ring-teal-400/30"
                    : "text-slate-300 hover:bg-sidebar-accent hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] shrink-0 transition-colors",
                    active ? "text-teal-300" : "text-slate-400 group-hover:text-teal-300"
                  )}
                  strokeWidth={2}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <span className="size-1.5 rounded-full bg-teal-400" />}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer / upgrade card */}
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl bg-gradient-to-br from-teal-500/10 to-transparent p-3 ring-1 ring-inset ring-teal-400/20">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-teal-300" />
            <p className="text-xs font-semibold text-white">Inventra Pro</p>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            Unlock unlimited AI forecasts & multi-store analytics.
          </p>
          <Button
            size="sm"
            className="mt-2 h-7 w-full bg-teal-500 text-white hover:bg-teal-400 text-xs"
          >
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}
