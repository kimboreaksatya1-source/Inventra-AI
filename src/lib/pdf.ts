// Inventra AI — client-side PDF export of the Business Brief.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BusinessBrief } from "./types";

const TEAL: [number, number, number] = [15, 118, 110]; // #0F766E
const CHARCOAL: [number, number, number] = [17, 24, 39]; // #111827
const MUTED: [number, number, number] = [100, 116, 139];

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function exportBriefPdf(brief: BusinessBrief, business: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const dateStr = new Date(brief.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
  doc.text(`Prepared for ${business}  ·  ${dateStr}  ·  Inventra AI`, margin, y);
  y += 12;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  const sectionTitle = (n: number, title: string) => {
    y = ensureSpace(doc, y, 40, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TEAL);
    doc.text(`${n}.  ${title.toUpperCase()}`, margin, y);
    y += 16;
  };

  const paragraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, contentWidth);
    y = ensureSpace(doc, y, lines.length * 14 + 10, margin);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 14;
  };

  // 1 — Executive Summary
  sectionTitle(1, "Executive Summary");
  paragraph(brief.executiveSummary);

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
        r.product,
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
      doc.text(o.title, margin, y);
      y += 14;
      paragraph(o.observation);
      paragraph(`Recommended action: ${o.recommendedAction}`);
      doc.setTextColor(...TEAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      y = ensureSpace(doc, y, 18, margin);
      doc.text(`Expected revenue impact: ${money(o.expectedRevenueImpact)}`, margin, y);
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
      a.action,
      a.reason,
      a.expectedImpact,
    ]),
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
    bodyStyles: { textColor: CHARCOAL },
    alternateRowStyles: { fillColor: [244, 248, 248] },
    styles: { fontSize: 9.5, cellPadding: 6, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 110 } },
  });
  y = afterTable(doc, y);

  // 5 — Inventory Health Score
  sectionTitle(5, "Inventory Health Score");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...TEAL);
  y = ensureSpace(doc, y, 34, margin);
  doc.text(`${brief.healthScore} / 100`, margin, y);
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`  ${brief.healthLabel}`, margin + 96, y);
  y += 20;
  paragraph(brief.healthExplanation);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const h = doc.internal.pageSize.getHeight();
    doc.text(
      `Generated by Inventra AI — ${dateStr}`,
      margin,
      h - 24
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, h - 24, { align: "right" });
  }

  const stamp = new Date(brief.generatedAt).toISOString().slice(0, 10);
  doc.save(`inventra-business-brief-${stamp}.pdf`);
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
