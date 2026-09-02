"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, CheckCircle2, FileText, ListChecks, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dropzone } from "./dropzone";
import { ImportStepper, type ImportStage } from "./import-stepper";
import { ColumnMappingStep } from "./column-mapping-step";
import { RecognitionReview } from "./recognition-review";
import { ImportSummaryBar, ImportDetails } from "./import-audit";
import { parseWorkbook, ParseError, type ParsedWorkbook } from "@/lib/import/parse";
import { applyMapping, detectColumnMapping } from "@/lib/catalog/column-mapping";
import { buildImportAudit, reasonLabel } from "@/lib/import/audit";
import type {
  ColumnMapping,
  ImportAudit,
  ImportAuditRow,
  RecognizeResponse,
  ReviewProduct,
} from "@/lib/types";

type Step = "upload" | "map" | "review" | "importing" | "done";

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map columns" },
  { id: "review", label: "Review products" },
  { id: "done", label: "Import" },
];

export function UploadClient() {
  const qc = useQueryClient();
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [stage, setStage] = useState<ImportStage>("parse");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [detected, setDetected] = useState<ColumnMapping | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [review, setReview] = useState<RecognizeResponse | null>(null);
  const [mappingAudit, setMappingAudit] = useState<ImportAuditRow[]>([]);
  const [audit, setAudit] = useState<ImportAudit | null>(null);
  const [imported, setImported] = useState(0);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const wb = await parseWorkbook(file);
      const det = detectColumnMapping(wb.headers);
      setWorkbook(wb);
      setDetected(det.mapping);
      setMapping(det.mapping);
      setStep("map");
    } catch (e) {
      setError(e instanceof ParseError ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function runRecognition() {
    if (!workbook || !mapping) return;
    const { rows, audit: mAudit } = applyMapping(
      workbook.rows,
      mapping,
      workbook.rowNumbers,
      workbook.blankRowNumbers
    );
    setMappingAudit(mAudit);
    if (rows.length === 0) {
      const reasons = [...new Set(mAudit.filter((a) => a.status === "skipped").map((a) => reasonLabel(a.reason)))];
      setError(
        `No usable product rows with this mapping — all ${workbook.totalDataRows} rows were skipped${
          reasons.length ? ` (${reasons.join(", ")})` : ""
        }. Check the column mapping.`
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/catalog/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: workbook.fileName,
          rows: rows.map((r) => ({
            sourceRow: r.sourceRow,
            name: r.name,
            productCode: r.productCode,
            brand: r.brand,
            category: r.category,
            stock: r.stock,
            dailySales: r.dailySales,
            sellingPrice: r.sellingPrice,
            costPrice: r.costPrice,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Recognition failed");
      }
      const data = (await res.json()) as RecognizeResponse;
      setReview(data);
      setAudit(
        buildImportAudit({
          totalDataRows: workbook.totalDataRows,
          rowNumbers: workbook.rowNumbers,
          blankRowNumbers: workbook.blankRowNumbers,
          mappingAudit: mAudit,
          recognize: data,
        })
      );
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recognition failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!workbook || !review) return;
    const keep = review.products.filter((p) => p.status !== "ignored");
    if (keep.length === 0) {
      setError("Every product is set to “ignore” — keep at least one to import.");
      return;
    }
    setStep("importing");
    setStage("validate");
    setBusy(true);
    try {
      await sleep(350);
      setStage("commit");
      const res = await fetch("/api/catalog/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: workbook.fileName, products: review.products }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Import failed");
      }
      const data = (await res.json()) as { imported: number };
      setImported(data.imported);
      const ignoredSourceRows = review.products
        .filter((p) => p.status === "ignored")
        .flatMap((p) => p.sourceRows ?? []);
      setAudit(
        buildImportAudit({
          totalDataRows: workbook.totalDataRows,
          rowNumbers: workbook.rowNumbers,
          blankRowNumbers: workbook.blankRowNumbers,
          mappingAudit,
          recognize: review,
          ignoredSourceRows,
        })
      );
      setStage("done");
      setStep("done");
      qc.invalidateQueries();
      // The dashboard / brief / catalog pages are server-rendered — refresh their
      // RSC payloads so they reflect the new catalog immediately.
      router.refresh();
      toast.success(`${data.imported} products in your catalog`);
    } catch (e) {
      setStep("review");
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setWorkbook(null);
    setDetected(null);
    setMapping(null);
    setReview(null);
    setMappingAudit([]);
    setAudit(null);
    setImported(0);
    setError(null);
    setStep("upload");
  }

  const activeIndex = STEP_LABELS.findIndex(
    (s) => s.id === (step === "importing" ? "done" : step)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import your business data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop any product export — Inventra reads the columns, recognises each product, and builds
          your catalog automatically.
        </p>
      </div>

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {STEP_LABELS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={
                i <= activeIndex
                  ? "font-medium text-teal-600 dark:text-teal-400"
                  : "text-muted-foreground"
              }
            >
              {i + 1}. {s.label}
            </span>
            {i < STEP_LABELS.length - 1 && <span className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Import problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "upload" && (
        <>
          <Dropzone onFile={handleFile} disabled={busy} />
          {busy && <p className="text-sm text-muted-foreground">Reading your file…</p>}
          <Card className="gap-2 border-dashed p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-teal-600" />
              No template required
            </div>
            <p className="text-xs text-muted-foreground">
              Columns can be named anything — <code>SKU</code>, <code>Item Code</code>,{" "}
              <code>Description</code>, <code>Qty</code>, <code>On Hand</code>, <code>ADS</code>,{" "}
              <code>Sale Price</code>, or their Khmer equivalents. Missing brand, category or SKU are
              filled in for you.
            </p>
          </Card>
        </>
      )}

      {step === "map" && workbook && detected && mapping && (
        <ColumnMappingStep
          fileName={workbook.fileName}
          headers={workbook.headers}
          rows={workbook.rows}
          detected={detected}
          mapping={mapping}
          onChange={setMapping}
          onBack={reset}
          onContinue={runRecognition}
          busy={busy}
        />
      )}

      {step === "review" && review && (
        <RecognitionReview
          products={review.products}
          aiUsed={review.aiUsed}
          audit={audit}
          onChange={(next) => setReview({ ...review, products: next })}
          onImport={runImport}
          onBack={() => setStep("map")}
          busy={busy}
        />
      )}

      {step === "importing" && (
        <Card className="p-6">
          <ImportStepper stage={stage} />
        </Card>
      )}

      {step === "done" && (
        <Card className="items-start gap-4 p-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="w-full">
            <h2 className="text-lg font-semibold">{imported} products in your catalog</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Inventra recognised and catalogued your products. Every AI answer now uses their real
              names and SKUs.
            </p>
            {audit && (
              <div className="mt-4 space-y-3">
                <ImportSummaryBar audit={audit} />
                <ImportDetails audit={audit} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/actions">
                <ListChecks className="size-4" />
                View Action Center
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/catalog">
                <Boxes className="size-4" />
                View Catalog
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/brief">
                <FileText className="size-4" />
                Business Brief
              </Link>
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              Import another file
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
