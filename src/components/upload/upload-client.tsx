"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dropzone } from "./dropzone";
import { PreviewTable } from "./preview-table";
import { ImportStepper, type ImportStage } from "./import-stepper";
import { buildParsePreview, ParseError } from "@/lib/parse";
import { useImportMutation } from "@/lib/queries";
import type { ParsePreview } from "@/lib/types";

type Phase = "idle" | "parsing" | "preview" | "importing" | "done";

const SAMPLE = `Product,Category,Stock,DailySales,SellingPrice,CostPrice
Coca-Cola,Beverage,18,6,1.2,0.8
Water,Beverage,20,4,0.5,0.3
Noodles,Food,12,5,0.4,0.2`;

export function UploadClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<ImportStage>("parse");
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const importMutation = useImportMutation();

  async function handleFile(file: File) {
    setError(null);
    setPhase("parsing");
    try {
      const result = await buildParsePreview(file);
      setPreview(result);
      setPhase("preview");
    } catch (e) {
      setPhase("idle");
      setError(
        e instanceof ParseError
          ? e.message
          : "Something went wrong while reading the file."
      );
    }
  }

  async function handleImport() {
    if (!preview || preview.validRows.length === 0) return;
    setPhase("importing");
    setStage("validate");
    try {
      await sleep(400);
      setStage("commit");
      const res = await importMutation.mutateAsync({
        fileName: preview.fileName,
        rows: preview.validRows,
      });
      setImported(res.imported);
      setStage("done");
      setPhase("done");
      toast.success(`Imported ${res.imported} products`, {
        description: "Your business brief is ready to generate.",
      });
    } catch (e) {
      setPhase("preview");
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  }

  function reset() {
    setPreview(null);
    setError(null);
    setImported(0);
    setPhase("idle");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import your business data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a product export as CSV or Excel. Inventra reads it, checks every row, and turns it
          into an executive brief.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Import problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(phase === "idle" || phase === "parsing") && (
        <>
          <Dropzone onFile={handleFile} disabled={phase === "parsing"} />
          {phase === "parsing" && (
            <p className="text-sm text-muted-foreground">Reading your file…</p>
          )}
          <Card className="gap-3 border-dashed p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-teal-600" />
              Expected format
            </div>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              {SAMPLE}
            </pre>
            <p className="text-xs text-muted-foreground">
              Column names are flexible — <code>Product</code>/<code>Name</code>,{" "}
              <code>Stock</code>/<code>Quantity</code>, <code>SellingPrice</code>/<code>Price</code>{" "}
              are all recognised.
            </p>
          </Card>
        </>
      )}

      {phase === "preview" && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatChip tone="ok" label={`${preview.validRows.length} ready to import`} />
            {preview.errorCount > 0 && (
              <StatChip tone="error" label={`${preview.errorCount} row(s) with errors`} />
            )}
            {preview.warningCount > 0 && (
              <StatChip tone="warn" label={`${preview.warningCount} warning(s)`} />
            )}
            <span className="text-xs text-muted-foreground">from {preview.fileName}</span>
          </div>

          <PreviewTable preview={preview} />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleImport}
              disabled={preview.validRows.length === 0 || importMutation.isPending}
            >
              Import {preview.validRows.length} product{preview.validRows.length === 1 ? "" : "s"}
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              Choose a different file
            </Button>
          </div>
          {preview.errorCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Rows with errors are skipped. Fix them in your spreadsheet and re-upload to include them.
            </p>
          )}
        </div>
      )}

      {phase === "importing" && (
        <Card className="p-6">
          <ImportStepper stage={stage} />
        </Card>
      )}

      {phase === "done" && (
        <Card className="items-start gap-4 p-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{imported} products imported</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Inventra has analyzed your catalog. Here is where to go next.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/brief">
                <FileText className="size-4" />
                View Business Brief
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/revenue-risk">
                <ShieldAlert className="size-4" />
                View Revenue Risk
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

function StatChip({
  tone,
  label,
}: {
  tone: "ok" | "warn" | "error";
  label: string;
}) {
  const cls = {
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    error: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  }[tone];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
