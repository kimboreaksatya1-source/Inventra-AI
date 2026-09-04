// Inventra AI — client-side PDF export of the Business Brief.
//
// jsPDF + jspdf-autotable are dynamically imported so the ~350 KB of PDF code is
// only fetched when the user actually clicks "Export PDF", and never enters the
// server render / build graph. Runs 100% in the browser — no Vercel function.
//
// All user / AI text is passed through latinize() before it is drawn: the core
// PDF fonts are Latin-1 only. See ./sanitize.ts for the full explanation and the
// documented Khmer limitation.

import type { jsPDF } from "jspdf";
import { money } from "../format";
import {
  latinize,
  pdfBriefProductName,
  pdfGeneratedOn,
  pdfSlug,
  repairSkuMentions,
  type PdfProductRef,
} from "./sanitize";
import type { BusinessBrief } from "../types";

const TEAL: [number, number, number] = [15, 118, 110]; // #0F766E
const CHARCOAL: [number, number, number] = [17, 24, 39]; // #111827
const MUTED: [number, number, number] = [100, 116, 139];

export async function exportBriefPdf(
  brief: BusinessBrief,
  business: string,
  /** analysis.products — lets the PDF swap Khmer / AI-written names for the
   *  recogniser's English canonical name (matched by SKU). */
  products: PdfProductRef[] = []
): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const businessName = latinize(business) || "Your Business";
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const generatedOn = pdfGeneratedOn(new Date(brief.generatedAt));

  doc.setProperties({
    title: `Inventra AI Business Brief — ${businessName}`,
    subject: `Inventory health, revenue risk and recommended actions for ${businessName}`,
    author: "Inventra AI",
    creator: "Inventra AI",
    keywords: "inventra, business brief, inventory, revenue at risk, FMCG",
  });

  // Letterhead
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...CHARCOAL);
  doc.text("Business Brief", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Prepared for ${businessName}  ·  ${generatedOn}  ·  Inventra AI`, margin, y);
  y += 12;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  /**
   * @param reserve total height the section needs (title + its content). When the
   *   page can't fit it, the whole section starts on a fresh page so the title
   *   never ends up orphaned above a page break.
   * @param gap space after the title baseline before the next element. Bump this
   *   when the section opens with a large element (e.g. the 26pt health score).
   */
  const sectionTitle = (
    n: number,
    title: string,
    opts?: { reserve?: number; gap?: number }
  ) => {
    y = ensureSpace(doc, y, opts?.reserve ?? 40, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TEAL);
    doc.text(`${n}.  ${title.toUpperCase()}`, margin, y);
    y += opts?.gap ?? 16;
  };

  const paragraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(latinize(text), contentWidth);
    y = ensureSpace(doc, y, lines.length * 14 + 10, margin);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 14;
  };

  // 1 — Executive Summary
  sectionTitle(1, "Executive Summary");
  paragraph(repairSkuMentions(brief.executiveSummary, products));

  // 2 — Critical Risks
  sectionTitle(2, "Critical Risks");
  if (brief.criticalRisks.length === 0) {
    paragraph("No products are projected to stock out within the next week.");
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Product", "Days Remaining", "Revenue at Risk", "Priority"]],
      body: brief.criticalRisks.map((r) => [
        pdfBriefProductName(r.product, products),
        r.daysRemaining > 0 ? String(r.daysRemaining) : "Out now",
        money(r.revenueAtRisk),
        r.priority,
      ]),
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: CHARCOAL },
      alternateRowStyles: { fillColor: [244, 248, 248] },
      styles: { fontSize: 9.5, cellPadding: 6 },
    });
    y = afterTable(doc, y);
  }

  // 3 — Revenue Opportunities
  sectionTitle(3, "Revenue Opportunities");
  if (brief.revenueOpportunities.length === 0) {
    paragraph("No standout growth opportunities in this dataset yet.");
  } else {
    brief.revenueOpportunities.forEach((o) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...CHARCOAL);
      y = ensureSpace(doc, y, 20, margin);
      doc.text(repairSkuMentions(o.title, products), margin, y);
      y += 14;
      paragraph(repairSkuMentions(o.observation, products));
      paragraph(`Recommended action: ${repairSkuMentions(o.recommendedAction, products)}`);
      doc.setTextColor(...TEAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      y = ensureSpace(doc, y, 18, margin);
      doc.text(
        `Modelled margin upside (~25% more orders): ${money(o.expectedRevenueImpact)}`,
        margin,
        y
      );
      y += 20;
    });
  }

  // 4 — Recommended Actions
  sectionTitle(4, "Recommended Actions");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Priority", "Action", "Reason", "Expected Impact"]],
    body: brief.recommendedActions.map((a) => [
      a.priority,
      repairSkuMentions(a.action, products),
      latinize(a.reason),
      latinize(a.expectedImpact),
    ]),
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
    bodyStyles: { textColor: CHARCOAL },
    alternateRowStyles: { fillColor: [244, 248, 248] },
    styles: { fontSize: 9.5, cellPadding: 6, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 110 } },
  });
  y = afterTable(doc, y);

  // 5 — Inventory Health Score.
  // Keep the title, the big score and the summary together: reserve the whole
  // block up front so a page break never lands between them, and open with a
  // wide gap so the 26pt score doesn't ride up into the 12pt title.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const healthLines = doc.splitTextToSize(latinize(brief.healthExplanation), contentWidth);
  const SCORE_GAP = 40; // title baseline → score baseline (~18pt visible gap)
  const healthBlock = SCORE_GAP + 20 + healthLines.length * 14 + 18;
  sectionTitle(5, "Inventory Health Score", { reserve: healthBlock, gap: SCORE_GAP });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...TEAL);
  doc.text(`${brief.healthScore} / 100`, margin, y);
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`  ${latinize(brief.healthLabel)}`, margin + 96, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(40, 40, 40);
  doc.text(healthLines, margin, y);
  y += healthLines.length * 14 + 14;

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Generated by Inventra AI  ·  ${generatedOn}`, margin, h - 24);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, h - 24, { align: "right" });
  }

  const stamp = new Date(brief.generatedAt).toISOString().slice(0, 10);
  doc.save(`inventra-business-brief-${pdfSlug(businessName)}-${stamp}.pdf`);
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function afterTable(doc: jsPDF, fallback: number): number {
  const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (last?.finalY ?? fallback) + 24;
}
