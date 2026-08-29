"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportBriefPdf } from "@/lib/pdf";
import type { BusinessBrief } from "@/lib/types";

export function ExportPdfButton({
  brief,
  business,
}: {
  brief: BusinessBrief;
  business: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          exportBriefPdf(brief, business);
        } catch (e) {
          console.error(e);
          toast.error("Could not generate the PDF.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      Export PDF
    </Button>
  );
}
