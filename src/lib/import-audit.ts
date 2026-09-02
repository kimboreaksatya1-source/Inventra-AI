// Inventra AI — import transparency. Pure. Reconciles every uploaded spreadsheet
// row to a single outcome (imported / warning / skipped / merged) so no data
// loss is ever invisible.

import type {
  ImportAudit,
  ImportAuditRow,
  ImportRowStatus,
  RecognizeResponse,
} from "./types";

const RANK: Record<ImportRowStatus, number> = { imported: 0, warning: 1, merged: 2, skipped: 3 };

export interface BuildAuditInput {
  /** every row below the header, blank included */
  totalDataRows: number;
  /** 1-based source row for each non-blank row that reached applyMapping */
  rowNumbers: number[];
  /** 1-based rows dropped by the parser because every cell was empty */
  blankRowNumbers: number[];
  /** skips + warnings emitted by applyMapping (may be several per row) */
  mappingAudit: ImportAuditRow[];
  /** the recognition response — carries per-product sourceRows for merge tracking */
  recognize?: RecognizeResponse | null;
  /** source rows the user set to "ignored" in the review screen */
  ignoredSourceRows?: number[];
}

export function buildImportAudit(input: BuildAuditInput): ImportAudit {
  const byRow = new Map<number, ImportAuditRow>();

  const put = (a: ImportAuditRow) => {
    const cur = byRow.get(a.row);
    if (!cur) {
      byRow.set(a.row, a);
    } else if (RANK[a.status] > RANK[cur.status]) {
      byRow.set(a.row, a);
    } else if (a.status === cur.status && !cur.detail.includes(a.detail)) {
      byRow.set(a.row, { ...cur, detail: `${cur.detail} ${a.detail}`.trim() });
    }
  };

  for (const r of input.blankRowNumbers) {
    put({ row: r, name: "", status: "skipped", reason: "empty-row", detail: "Empty row — no data." });
  }
  for (const a of input.mappingAudit) put(a);

  // merges: keep the first source row, mark the rest as merged into that product
  for (const p of input.recognize?.products ?? []) {
    const rows = p.sourceRows ?? [];
    if (rows.length <= 1) continue;
    const [head, ...rest] = rows;
    for (const r of rest) {
      put({
        row: r,
        name: p.originalName,
        status: "merged",
        reason: "merged-duplicate",
        detail: `Duplicate of “${p.originalName}” (row ${head}) — quantities combined into one catalog line.`,
      });
    }
  }

  // user chose to skip these in review
  for (const r of input.ignoredSourceRows ?? []) {
    put({ row: r, name: byRow.get(r)?.name ?? "", status: "skipped", reason: "user-ignored", detail: "You chose to skip this product in review." });
  }

  const statusOf = (row: number): ImportRowStatus =>
    input.blankRowNumbers.includes(row) ? "skipped" : byRow.get(row)?.status ?? "imported";

  let imported = 0;
  let warning = 0;
  let skipped = 0;
  let merged = 0;
  for (const row of input.rowNumbers) {
    const s = statusOf(row);
    if (s === "imported") imported++;
    else if (s === "warning") warning++;
    else if (s === "merged") merged++;
    else skipped++;
  }
  skipped += input.blankRowNumbers.length;

  const rows = [...byRow.values()]
    .filter((a) => a.status !== "imported")
    .sort((a, b) => a.row - b.row);

  return {
    uploadedRows: input.totalDataRows,
    importedRows: imported,
    warningRows: warning,
    skippedRows: skipped,
    mergedRows: merged,
    rows,
  };
}

const REASON_LABEL: Record<string, string> = {
  "empty-row": "Empty row",
  "missing-name": "Missing product name",
  "invalid-name": "Product name too long",
  "invalid-stock": "Invalid stock value",
  "invalid-price": "Invalid selling price",
  "missing-sales": "No daily-sales value",
  "invalid-sales": "Invalid daily-sales value",
  "missing-cost": "No cost price",
  "invalid-cost": "Invalid cost price",
  "negative-stock": "Negative stock",
  "merged-duplicate": "Duplicate row",
  "row-limit": "Over the row limit",
  "user-ignored": "Skipped in review",
  ok: "OK",
};

export function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? "Other";
}

export function statusLabel(status: ImportRowStatus): string {
  return status === "imported"
    ? "Imported"
    : status === "warning"
    ? "Imported with warning"
    : status === "merged"
    ? "Merged"
    : "Skipped";
}
