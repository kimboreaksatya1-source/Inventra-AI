"use client";

import { Menu, Bell, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

export function Header({
  user,
  revenueAtRisk,
  alertCount,
  onOpenNav,
}: {
  user: { name: string; businessName: string } | null;
  revenueAtRisk: number;
  alertCount: number;
  onOpenNav: () => void;
}) {
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "IN";
  const setSection = useAppStore((s) => s.setSection);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Search */}
      <div className="relative hidden sm:block max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products, insights…"
          className="h-9 pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        {/* Revenue at risk pill */}
        <button
          onClick={() => setSection("revenue-protection")}
          className="hidden md:inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
        >
          <ShieldAlert className="size-3.5" />
          <span className="tabular-nums">{formatCurrency(revenueAtRisk)}</span>
          <span className="text-red-500/70 font-medium">at risk</span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
          onClick={() => setSection("alerts")}
        >
          <Bell className="size-4" />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </Button>

        <ThemeToggle />

        <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <Avatar className="size-9 ring-1 ring-border">
            <AvatarFallback className="bg-teal-600 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-semibold text-foreground">{user?.name ?? "Owner"}</p>
            <p className="text-[11px] text-muted-foreground">{user?.businessName ?? "Your Store"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
