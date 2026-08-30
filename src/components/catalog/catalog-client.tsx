"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/shared/badges";
import { VelocityChip } from "@/components/shared/fmcg-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { CatalogPayload } from "@/lib/types";

const CONF_FILTERS = [
  { id: "all", label: "All" },
  { id: "high", label: "≥ 90%" },
  { id: "mid", label: "70–89%" },
  { id: "low", label: "< 70%" },
] as const;

const ALL = "__all__";

export function CatalogClient() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const res = await fetch("/api/catalog");
      if (!res.ok) throw new Error("Failed to load the catalog");
      return (await res.json()) as CatalogPayload;
    },
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [brand, setBrand] = useState<string>(ALL);
  const [conf, setConf] = useState<(typeof CONF_FILTERS)[number]["id"]>("all");

  const rows = useMemo(() => {
    const list = data?.products ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (
        q &&
        !`${p.name} ${p.canonicalName} ${(p.aliases ?? []).join(" ")} ${p.brand ?? ""} ${p.sku} ${p.productCode ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (category !== ALL && p.category !== category) return false;
      if (brand !== ALL && (p.brand ?? "") !== brand) return false;
      const c = p.confidenceScore;
      if (conf === "high" && c < 0.9) return false;
      if (conf === "mid" && (c < 0.7 || c >= 0.9)) return false;
      if (conf === "low" && c >= 0.7) return false;
      return true;
    });
  }, [data, search, category, brand, conf]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Boxes}
        title="Couldn't load the catalog"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (!data?.hasData) {
    return (
      <EmptyState
        icon={Boxes}
        tone="teal"
        title="Your catalog is empty"
        description="Import a product file and Inventra builds the catalog automatically."
        action={
          <Button asChild>
            <Link href="/upload">Import data</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Product Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-built from your imports so every AI answer names products precisely. Read-only —
          nothing to manage here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Card className="flex-row items-baseline gap-1.5 px-3 py-2">
          <span className="text-lg font-bold tabular-nums">{data.productCount}</span>
          <span className="text-xs text-muted-foreground">products</span>
        </Card>
        <Card className="flex-row items-baseline gap-1.5 px-3 py-2">
          <span className="text-lg font-bold tabular-nums">{data.categoryCount}</span>
          <span className="text-xs text-muted-foreground">categories</span>
        </Card>
        <Card className="flex-row items-baseline gap-1.5 px-3 py-2">
          <span className="text-lg font-bold tabular-nums">{data.brands.length}</span>
          <span className="text-xs text-muted-foreground">brands</span>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, brand or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="lg:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {data.categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="lg:w-44">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All brands</SelectItem>
            {data.brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {CONF_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setConf(f.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                conf === f.id ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Velocity</TableHead>
              <TableHead className="w-40">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>
                  <span className="font-medium">{p.name}</span>
                  {p.isAutoGenerated && (
                    <span className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      auto
                    </span>
                  )}
                  {p.canonicalName && p.canonicalName.toLowerCase() !== p.name.toLowerCase() && (
                    <div className="text-[11px] text-muted-foreground">{p.canonicalName}</div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.brand || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell>
                  {p.velocity ? <VelocityChip velocity={p.velocity} /> : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <ConfidenceMeter value={Math.round(p.confidenceScore * 100)} size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No products match these filters.
          </p>
        )}
      </Card>
    </div>
  );
}
