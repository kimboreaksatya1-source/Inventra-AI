# Copilot ↔ inventory dataset lifecycle

Binds every Copilot conversation to the inventory dataset (`ImportBatch`) it was
grounded in, so recommendations from an old catalog can never mix with a new one.

Branch: `feat/copilot-dataset-lifecycle` — **not deployed.** Ship after the
competition.

## What changed

| Area | Change |
|---|---|
| Schema | `ChatSession` gains nullable `datasetId` (FK → `ImportBatch`, `ON DELETE SET NULL`) + denormalised `datasetName` / `datasetUploadedAt` / `datasetProductCount`. `ImportBatch` back-relation. New index `(userId, datasetId)`. |
| `commitImport` / `commitCatalog` | Return `datasetId`, `datasetName`, `datasetUploadedAt`, `productCount` (additive — no logic change). |
| `POST /api/copilot/sessions` | Stamps the current (or an explicit) dataset onto the new session. Accepts `datasetId?`. |
| `GET /api/copilot/sessions` | Returns per-session dataset metadata + `stale` + top-level `currentDatasetId`. |
| `POST /api/copilot/chat` | Rejects a message with **409 `STALE_DATASET`** when the session's `datasetId` differs from the current dataset. This is req 9 — a Dataset-A conversation cannot receive a Dataset-B answer. |
| Copilot UI | Stale session → read-only: composer disabled + an amber banner with **"Start a new analysis"** (creates a session bound to the current dataset). Sidebar groups conversations by dataset (name · product count · date); stale rows get a **"previous inventory"** chip. |
| Upload UI | After a successful import while a non-empty conversation exists → **"New Inventory Detected"** modal. *Start New Analysis* → new bound session + `/copilot`. *Keep Current Conversation* → the old session becomes stale automatically. |
| Seed script | Binds the seeded conversation to the demo dataset. |

**Backward compatible:** `datasetId IS NULL` sessions are never stale, never
blocked, and render under "Earlier conversations".

## Migration strategy

The migration `20260904120000_conversation_dataset_binding` is **committed but not
applied** (the app's `.env` points at production).

1. **Dev / staging:** `DATABASE_URL=<dev> npx prisma migrate deploy` — verify the
   SQL is `ADD COLUMN … NULL` only (it is; no rewrite, no lock beyond a brief
   catalog update).
2. **Production, out-of-band, *before* deploying the code:**
   `DATABASE_URL=<prod> DIRECT_URL=<prod-direct> npx prisma migrate deploy`
   Do **not** add `migrate deploy` to the Vercel `buildCommand` — a failed
   migration would fail the build and strand prod on old code.
3. **Deploy the code** (Vercel runs `prisma generate` in its build).
4. **Optional backfill** (safe any time, or skip — NULL is handled):
   the commented `UPDATE` at the bottom of the migration file sets each existing
   session's `datasetId` to the user's latest `ImportBatch`.
5. **Rollback:** columns are additive + nullable; reverting the code is safe with
   them present. Drop them in a follow-up migration only if abandoning the
   feature.

## Test checklist

- Import file A → open Copilot → it binds to A → ask a question.
- Import file B → "New Inventory Detected" modal appears.
  - *Start New Analysis* → lands on `/copilot` with a fresh briefing bound to B;
    the A conversation is now read-only with the banner.
  - *Keep Current Conversation* → stay; the A conversation shows the banner and a
    disabled composer; the sidebar shows an A group and a B group.
- In the stale A conversation, force a POST to `/api/copilot/chat` → `409
  STALE_DATASET`.
- A conversation with `datasetId = null` (pre-migration) → no banner, composer
  works, grouped under "Earlier conversations".
- Delete an `ImportBatch` → its sessions keep `datasetName` (denormalised), FK
  nulled.
