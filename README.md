# Inventra AI

**An AI Operating Copilot for SMEs** — it turns your business data into decisions, not dashboards.

Inventra reads a product export and answers the questions that actually move a small business:

- What should I do next?
- What products are at risk?
- Where am I losing revenue?
- What opportunities should I act on?

## The flow

```
/upload  →  analysis engine  →  /brief  →  /revenue-risk
```

| Route | What it does |
| --- | --- |
| `/upload` | Drag & drop a CSV/Excel export. Every row is parsed and validated in the browser, previewed, then committed. |
| `/brief` | An executive consulting brief: executive summary, critical risks, revenue opportunities, recommended actions, and a 0–100 inventory health score. Exportable to PDF. |
| `/revenue-risk` | Every product ranked by revenue at risk, with search, sorting, and risk-level filtering. |

## Stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui** · **Lucide**
- **Prisma** → **PostgreSQL** (Supabase)
- **TanStack Query** · **Zod**
- **DeepSeek** (OpenAI-compatible) for the brief narrative, with a deterministic fallback when no key is set
- **xlsx** for parsing · **jsPDF** for export

## Getting started

```bash
bun install

cp .env.example .env
# Fill in:
#   DATABASE_URL   – Postgres pooler URL (port 6543, ?pgbouncer=true)
#   DIRECT_URL     – Postgres direct/session URL (port 5432) for migrations
#   AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET – Google OAuth (required)
#   DEEPSEEK_API_KEY – optional

bun run db:migrate     # apply migrations
bun run db:generate    # generate Prisma client
bun run dev            # http://localhost:3000  → sign in with Google
```

Try it with [`samples/inventra-demo.csv`](samples/inventra-demo.csv) — a 38-SKU Cambodian mini-mart catalog with a realistic risk / overstock spread.

## Analysis engine

`src/lib/analysis.ts` — pure functions over `Product.dailySales`:

- `daysRemaining = stock / dailySales`
- risk level: **Critical** `< 3d` · **High** `< 7d` · **Medium** `< 14d` · **Low** `≥ 14d`
- `estimatedRevenueAtRisk = daysUntilStockout × dailySales × sellingPrice`
- `inventoryHealthScore` (0–100) = stockout risk (40%) + inventory balance (30%) + product health (30%)

## Project layout

```
deploy/            Caddyfile (self-hosted / standalone deployment)
docs/              project report, founder cheat sheet, work log, design/ decks
prisma/            schema + migrations
samples/           inventra-demo.csv (demo catalog) + products-sample.csv
src/
  auth.ts          Auth.js v5 entrypoint (Prisma adapter, Node runtime)
  auth.config.ts   edge-safe auth config (providers, callbacks) — used by middleware
  proxy.ts         route protection — everything but /login + /api/auth requires a session
  app/             App Router pages + api/ route handlers
  components/       feature UI (upload/, brief/, revenue-risk/, copilot/, auth/, …) + ui/ (shadcn)
  hooks/
  lib/
    auth-helpers.ts requireAuth() / getSessionUserId() guards
    analysis.ts    the engine (days remaining, revenue at risk, health score)
    brief.ts       AI brief + deterministic fallback
    validation.ts  Zod + row validation
    catalog/       product recognition + column mapping
    copilot/       chat engine, context, evidence/grounding, command palette
    import/        parse.ts (CSV/XLSX → rows), index.ts (commit), audit.ts
    pdf/           jsPDF report + purchase-plan export
    queries/       TanStack Query hooks (brief, actions, copilot, simulator)
```

## Scripts

| Command | |
| --- | --- |
| `bun run dev` | Dev server (webpack) on port 3000 |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run db:migrate` / `db:generate` | Prisma migrations / client |
| `bun run db:reset` | Drop + replay migrations (dev only) |
