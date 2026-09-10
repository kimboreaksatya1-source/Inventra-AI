import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  ListChecks,
  ShieldAlert,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadDemoButton } from "@/components/dashboard/load-demo-button";

/**
 * First-login / empty-state onboarding for Inventra AI.
 *
 * Shown on the home route until the user has imported a catalog. Its job is to
 * make a first-time judge or pilot SME understand — without clicking anything —
 * what Inventra does, who it is for, what to upload, and what they get back, and
 * to make "Upload CSV" the obvious primary action with demo data as the safe
 * secondary path.
 */
export function FirstRun() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 sm:space-y-20">
      <Hero />
      <WhoItsFor />
      <DataFormat />
      <WhatYouGet />
      <DemoExplainer />
      <MvpNotice />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section 1 — Hero                                                    */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section>
      <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
        <Sparkles className="size-4" />
        Inventory intelligence for small businesses
      </div>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Turn Inventory Data into Business Decisions
      </h1>

      <p className="mt-3 max-w-2xl text-muted-foreground">
        Inventra AI analyzes your inventory spreadsheet and helps you prevent
        stockouts, reduce overstock, protect revenue, and discover growth
        opportunities.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg" className="gap-2">
          <Link href="/upload">
            <FileSpreadsheet className="size-4" />
            Upload Inventory CSV
          </Link>
        </Button>
        <LoadDemoButton size="lg" label="Try Demo Data" />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Upload your own CSV for a real analysis, or load demo data to explore
        every feature first.
      </p>

      {/* What happens after upload */}
      <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Step n={1} label="Upload your CSV" />
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <Step n={2} label="Inventra AI analyzes it" />
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <Step n={3} label="Review your brief & actions" />
      </ol>
    </section>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex size-5 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 tabular-nums dark:bg-teal-950/40 dark:text-teal-300">
        {n}
      </span>
      <span className="font-medium">{label}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Section 2 — Who it's for                                            */
/* ------------------------------------------------------------------ */

const AUDIENCE = [
  { icon: Store, label: "Mini Mart" },
  { icon: ShoppingBasket, label: "Convenience Store" },
  { icon: ShoppingCart, label: "Grocery Store" },
  { icon: Store, label: "Small Retail Shops" },
] as const;

function WhoItsFor() {
  return (
    <section>
      <SectionHeading
        eyebrow="Who it's for"
        title="Currently optimized for"
        description="Inventra AI is tuned for fast-moving consumer goods and small store catalogs — a few hundred to a few thousand products."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AUDIENCE.map(({ icon: Icon, label }) => (
          <Card key={label} className="items-center gap-2 p-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-medium">{label}</span>
          </Card>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Wrench className="mt-0.5 size-3.5 shrink-0" />
        Future versions will support direct POS integrations and automated
        inventory synchronization.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 3 — Supported data format                                   */
/* ------------------------------------------------------------------ */

const COLUMNS: {
  name: string;
  need: "Required" | "Recommended";
  note?: string;
}[] = [
  { name: "Product Name", need: "Required" },
  { name: "Stock Quantity", need: "Required" },
  { name: "Selling Price", need: "Required" },
  { name: "SKU", need: "Recommended", note: "matches products across imports" },
  { name: "Category", need: "Recommended", note: "groups risk by department" },
  {
    name: "Cost Price",
    need: "Recommended",
    note: "unlocks margin & cash-flow",
  },
  {
    name: "Daily Sales",
    need: "Recommended",
    note: "unlocks stockout risk & forecasts",
  },
];

const SAMPLE_ROWS = [
  ["Coca-Cola 330ml Can", "BEV-001", "Beverage", "84", "0.42", "0.60", "42"],
  [
    "Vital Drinking Water 500ml",
    "WTR-001",
    "Water",
    "430",
    "0.14",
    "0.25",
    "60",
  ],
  [
    "MAMA Instant Noodles Pork",
    "NDL-001",
    "Instant Noodles",
    "470",
    "0.19",
    "0.30",
    "38",
  ],
  ["Dutch Lady UHT Milk 1L", "DRY-001", "Dairy", "52", "1.20", "1.60", "15"],
];

function DataFormat() {
  return (
    <section>
      <SectionHeading
        eyebrow="Before you upload"
        title="What data do I need?"
        description="One row per product. Column names can be anything — Inventra AI maps them for you and lets you review before importing."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Format + columns */}
        <Card className="gap-4 p-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-teal-600" />
            <span className="text-sm font-semibold">
              Supported format: CSV (.csv)
            </span>
          </div>

          <ul className="grid gap-1.5">
            {COLUMNS.map((c) => (
              <li
                key={c.name}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <span
                  className={
                    c.need === "Required"
                      ? "rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      : "rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  }
                >
                  {c.need}
                </span>
                {c.note && (
                  <span className="text-xs text-muted-foreground">
                    — {c.note}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <Button asChild variant="outline" className="w-full gap-2 sm:w-fit">
            <a href="/inventra-sample.csv" download>
              <Download className="size-4" />
              Download Sample CSV
            </a>
          </Button>
        </Card>

        {/* Sample table */}
        <Card className="gap-3 p-5">
          <span className="text-sm font-semibold">Sample</span>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">
                    Product Name
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">
                    SKU
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-1.5 font-medium">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">
                    Stock
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">
                    Cost
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">
                    Price
                  </th>
                  <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">
                    Daily Sales
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {SAMPLE_ROWS.map((r) => (
                  <tr
                    key={r[1]}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-1.5 py-1.5 font-medium">
                      {r[0]}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-muted-foreground">
                      {r[1]}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-muted-foreground">
                      {r[2]}
                    </td>
                    <td className="px-1.5 py-1.5 text-right">{r[3]}</td>
                    <td className="px-1.5 py-1.5 text-right">${r[4]}</td>
                    <td className="px-1.5 py-1.5 text-right">${r[5]}</td>
                    <td className="px-1.5 py-1.5 text-right">{r[6]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Prices in your store currency. Missing cost or daily-sales values
            are kept — the features that need them are simply skipped, never
            guessed.
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 4 — What you'll get                                         */
/* ------------------------------------------------------------------ */

const OUTPUTS = [
  {
    icon: FileText,
    title: "Business Brief",
    body: "Inventory health score, revenue at risk, and an executive summary you can export as a PDF.",
  },
  {
    icon: ShieldAlert,
    title: "Revenue Risk Analysis",
    body: "Products likely to stock out, how soon, and the revenue exposed if they do.",
  },
  {
    icon: ListChecks,
    title: "AI Action Center",
    body: "Prioritized recommendations — what to reorder, how much, and what to stop ordering.",
  },
  {
    icon: Bot,
    title: "Business Copilot",
    body: "Ask about your inventory and business performance in plain language and get answers from your real numbers.",
  },
] as const;

function WhatYouGet() {
  return (
    <section>
      <SectionHeading
        eyebrow="After you upload"
        title="What you'll get"
        description="Every output is generated from your imported data and refreshes each time you re-import."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {OUTPUTS.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="gap-2 p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
              <Icon className="size-5" />
            </span>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 5 — Demo data explainer                                     */
/* ------------------------------------------------------------------ */

function DemoExplainer() {
  return (
    <section>
      <Card className="gap-3 border-teal-200 bg-teal-50/40 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-teal-600" />
          <h2 className="text-lg font-semibold">Just exploring?</h2>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Not ready to upload your own data? Load a sample inventory dataset — a
          fictional Phnom Penh mini-mart — and explore every Inventra AI feature
          instantly. You can clear it and import your own catalog anytime.
        </p>
        <div>
          <LoadDemoButton label="Load Demo Data" />
        </div>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 6 — MVP notice                                              */
/* ------------------------------------------------------------------ */

function MvpNotice() {
  return (
    <section>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-teal-600" />
        <p>
          <span className="font-medium text-foreground">MVP:</span> Inventra AI
          currently supports CSV inventory imports. POS integrations and
          automatic synchronization are planned for future releases.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
