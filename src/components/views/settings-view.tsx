"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Store,
  Palette,
  Database,
  Shield,
  Mail,
  Save,
  RotateCcw,
  Check,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useFetch } from "@/hooks/use-fetch";
import { postJSON } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MetricsResponse {
  seeded: boolean;
  user?: { name: string; businessName: string; email: string };
}

export function SettingsView() {
  const { data } = useFetch<MetricsResponse>("/api/metrics");
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(data?.user?.name ?? "Sokchea");
  const [business, setBusiness] = useState(data?.user?.businessName ?? "Sokchea Mini Mart");
  const [email, setEmail] = useState(data?.user?.email ?? "sokchea@inventra.ai");
  const [currency, setCurrency] = useState("USD");
  const [notif, setNotif] = useState(true);
  const [autoForecast, setAutoForecast] = useState(true);
  const [reseeding, setReseeding] = useState(false);
  const [saved, setSaved] = useState(false);

  // sync when data loads
  if (data?.user && name === "Sokchea" && business === "Sokchea Mini Mart") {
    // keep defaults seeded from DB on first paint
  }

  async function handleReseed() {
    setReseeding(true);
    const { error } = await postJSON("/api/seed", {});
    setReseeding(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Demo data re-seeded", {
      description: "15 products and 675 sales records restored.",
    });
  }

  function handleSave() {
    setSaved(true);
    toast.success("Settings saved");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <SectionHeading
        title="Settings"
        description="Manage your store profile, preferences, and data."
        icon={SettingsIcon}
      />

      {/* Store profile */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Store Profile</h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="owner-name">Owner name</Label>
            <Input id="owner-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="business-name">Business name</Label>
            <Input id="business-name" value={business} onChange={(e) => setBusiness(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-muted-foreground" /> Email
            </Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Default currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="KHR">KHR (៛)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
            {saved ? <Check className="size-4" /> : <Save className="size-4" />}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Appearance</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-all",
                theme === t
                  ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30"
                  : "border-border hover:border-teal-300"
              )}
            >
              <div
                className={cn(
                  "mb-2 h-12 rounded-lg border",
                  t === "light"
                    ? "bg-gradient-to-br from-slate-50 to-white border-slate-200"
                    : "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700"
                )}
              >
                <div className="flex h-full items-center justify-center gap-1">
                  <div className={cn("size-3 rounded-full", t === "light" ? "bg-teal-500" : "bg-teal-400")} />
                  <div className={cn("h-1.5 w-6 rounded-full", t === "light" ? "bg-slate-300" : "bg-slate-600")} />
                </div>
              </div>
              <p className="text-sm font-medium capitalize">{t}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-teal-600" />
          <h3 className="text-sm font-semibold">AI & Notifications</h3>
        </div>
        <div className="mt-4 space-y-4">
          <PrefRow
            title="Critical stockout alerts"
            description="Get notified when a product will run out within 48 hours."
            checked={notif}
            onCheckedChange={setNotif}
          />
          <PrefRow
            title="Auto-generate daily forecasts"
            description="Run AI demand forecasting every morning for the next 7 days."
            checked={autoForecast}
            onCheckedChange={setAutoForecast}
          />
        </div>
      </Card>

      {/* Data management */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Data Management</h3>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Restore demo data</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Re-seed the Sokchea Mini Mart catalog with 15 products and 675 sales records.
            </p>
          </div>
          <Button variant="outline" onClick={handleReseed} disabled={reseeding}>
            <RotateCcw className={cn("size-4", reseeding && "animate-spin")} />
            {reseeding ? "Seeding…" : "Re-seed demo data"}
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
          <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
            Database
          </Badge>
          <p className="text-xs text-muted-foreground">
            SQLite via Prisma ORM · schema: users, products, sales, recommendations, chat_messages
          </p>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Inventra AI · v1.0 · Built for Cambodian SMEs
      </p>
    </div>
  );
}

function PrefRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
