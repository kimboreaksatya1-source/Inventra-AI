import PptxGenJS from "pptxgenjs";

const OUT = "c:/Users/SC/Documents/WebDeverlop/inventra/design/inventra-pitch/Inventra-AI-Pitch-Deck.pptx";

// ---- palette ----
const C = {
  indigo: "312E81", indigo2: "4338CA", indigo3: "6366F1", indigo4: "818CF8",
  ind50: "EEF2FF", ind100: "C7D2FE", ind200: "A5B4FC",
  em: "10B981", em2: "34D399", em3: "6EE7B7", em700: "047857", em800: "065F46", em50: "ECFDF5",
  ink: "0F172A", s800: "1E293B", s700: "334155", s600: "475569", s500: "64748B",
  s400: "94A3B8", s300: "CBD5E1", s200: "E2E8F0", soft: "F8FAFC", white: "FFFFFF",
  rose50: "FFF1F2", rose300: "FDA4AF", rose800: "9F1239",
};
const DISP = "Segoe UI";
const BODY = "Segoe UI";

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "W", width: 13.333, height: 7.5 });
pptx.layout = "W";
pptx.author = "Inventra AI";
pptx.company = "Inventra AI";
pptx.title = "Inventra AI — The AI Operating Copilot for Cambodian SMEs";

const P = (px) => px / 96; // 96px == 1in == matches the 1280x720 canvas

function box(s, x, y, w, h, o = {}) {
  s.addShape("roundRect", {
    x: P(x), y: P(y), w: P(w), h: P(h),
    rectRadius: P(o.r ?? 12),
    rotate: o.rot,
    fill: o.fill === null ? { type: "none" } : { color: o.fill ?? C.white, transparency: o.ft ?? 0 },
    line: o.line === null ? { type: "none" } : { color: o.line ?? C.s200, width: o.lw ?? 1, dashType: o.dash },
    shadow: o.shadow ? { type: "outer", color: C.ink, opacity: 0.06, blur: 4, offset: 1, angle: 90 } : undefined,
  });
}
function rct(s, x, y, w, h, fill, o = {}) {
  s.addShape("rect", { x: P(x), y: P(y), w: P(w), h: P(h), fill: { color: fill }, line: { type: "none" }, ...o });
}
function ell(s, x, y, w, h, o = {}) {
  s.addShape("ellipse", {
    x: P(x), y: P(y), w: P(w), h: P(h),
    fill: o.fill ? { color: o.fill } : { type: "none" },
    line: o.line ? { color: o.line, width: o.lw ?? 1.5, dashType: o.dash } : { type: "none" },
  });
}
function ln(s, x1, y1, x2, y2, color, w = 1.5, dash) {
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  s.addShape("line", {
    x: P(x), y: P(y), w: P(Math.abs(x2 - x1) || 0.001), h: P(Math.abs(y2 - y1) || 0.001),
    line: { color, width: w, dashType: dash },
    flipH: x2 < x1, flipV: y2 < y1,
  });
}
function tri(s, x, y, w, h, fill, rot = 0) {
  s.addShape("triangle", { x: P(x), y: P(y), w: P(w), h: P(h), fill: { color: fill }, line: { type: "none" }, rotate: rot });
}
function dArrow(s, x, y, w = 12, h = 15, color = C.s300) {
  s.addShape("downArrow", { x: P(x), y: P(y), w: P(w), h: P(h), fill: { color }, line: { type: "none" } });
}
function T(s, text, x, y, w, h, o = {}) {
  s.addText(text, {
    x: P(x), y: P(y), w: P(w), h: P(h), margin: 0,
    fontFace: o.face ?? BODY, fontSize: o.size ?? 11, bold: o.bold ?? false, italic: o.italic ?? false,
    color: o.color ?? C.ink, align: o.align ?? "left", valign: o.valign ?? "top",
    lineSpacing: o.ls, lineSpacingMultiple: o.lh, charSpacing: o.cs, rotate: o.rot, wrap: o.wrap ?? true,
    shrinkText: o.shrink ?? false,
  });
}

// ---- shared chrome ----
function mark(s, x, y, sz) {
  const u = sz / 24;
  box(s, x, y, sz, sz, { fill: C.indigo, line: null, r: sz * 0.29 });
  ell(s, x + 8 * u - 2 * u, y + 15.5 * u - 2 * u, 4 * u, 4 * u, { fill: C.em });
  ell(s, x + 16 * u - 2 * u, y + 8.5 * u - 2 * u, 4 * u, 4 * u, { fill: C.soft });
  ell(s, x + 16.5 * u - 1.6 * u, y + 16 * u - 1.6 * u, 3.2 * u, 3.2 * u, { fill: C.indigo4 });
  ln(s, x + 8 * u, y + 15.5 * u, x + 16 * u, y + 8.5 * u, C.em, 1.4);
  ln(s, x + 16 * u, y + 8.5 * u, x + 16.5 * u, y + 16 * u, C.em, 1.4);
}
function header(s, label, num, dark = false) {
  const sub = dark ? C.s500 : C.s500;
  const ink = dark ? C.soft : C.ink;
  const slash = dark ? C.s700 : C.s300;
  mark(s, 64, 44, 22);
  T(s, "Inventra AI", 94, 43, 160, 22, { bold: true, size: 10.5, color: ink, valign: "middle" });
  s.addText(
    [
      { text: label.toUpperCase() + "   ", options: { color: sub } },
      { text: "/   ", options: { color: slash } },
      { text: num, options: { color: sub } },
    ],
    { x: P(816), y: P(43), w: P(400), h: P(22), margin: 0, align: "right", valign: "middle", fontFace: BODY, bold: true, fontSize: 8.5, charSpacing: 2 }
  );
}
function footer(s, right, dark = false) {
  const c = dark ? C.s600 : C.s400;
  T(s, "Inventra AI — Confidential", 64, 686, 400, 18, { size: 8, color: c });
  T(s, right, 616, 686, 600, 18, { size: 8, color: c, align: "right" });
}
function accentBar(s) {
  rct(s, 0, 0, 780, 3, C.indigo);
  rct(s, 780, 0, 500, 3, C.em);
}
function eyebrow(s, text, color) {
  T(s, text.toUpperCase(), 64, 100, 900, 16, { bold: true, size: 9, color, cs: 2.6 });
}

// small line-art icon inside a tinted tile
function iconTile(s, x, y, motif, tint = C.ind50, stroke = C.indigo, sz = 34) {
  box(s, x, y, sz, sz, { fill: tint, line: null, r: 9 });
  const cx = x + sz / 2, cy = y + sz / 2;
  if (motif === "trend") {
    ln(s, x + 8, y + 23, x + 15, y + 16, stroke, 2);
    ln(s, x + 15, y + 16, x + 19, y + 19, stroke, 2);
    ln(s, x + 19, y + 19, x + 26, y + 11, stroke, 2);
  } else if (motif === "coin") {
    ell(s, cx - 8, cy - 8, 16, 16, { line: stroke, lw: 2 });
    ln(s, cx, cy - 5, cx, cy + 5, stroke, 2);
  } else if (motif === "box") {
    box(s, cx - 8, cy - 8, 16, 16, { fill: null, line: stroke, lw: 2, r: 3 });
    ln(s, cx - 4, cy + 1, cx - 1, cy + 4, stroke, 2);
    ln(s, cx - 1, cy + 4, cx + 5, cy - 3, stroke, 2);
  } else if (motif === "pulse") {
    ln(s, x + 7, cy, x + 12, cy, stroke, 2);
    ln(s, x + 12, cy, x + 15, cy - 7, stroke, 2);
    ln(s, x + 15, cy - 7, x + 19, cy + 7, stroke, 2);
    ln(s, x + 19, cy + 7, x + 22, cy, stroke, 2);
    ln(s, x + 22, cy, x + 27, cy, stroke, 2);
  } else if (motif === "chart") {
    ln(s, x + 9, y + 25, x + 9, y + 18, stroke, 2.4);
    ln(s, x + 15, y + 25, x + 15, y + 12, stroke, 2.4);
    ln(s, x + 21, y + 25, x + 21, y + 16, stroke, 2.4);
    ln(s, x + 26, y + 25, x + 26, y + 20, stroke, 2.4);
  } else if (motif === "chat") {
    box(s, cx - 9, cy - 7, 18, 13, { fill: null, line: stroke, lw: 2, r: 4 });
    tri(s, cx - 5, cy + 4, 6, 6, stroke, 180);
  } else if (motif === "cube") {
    ln(s, cx, cy - 9, cx + 8, cy - 4, stroke, 2);
    ln(s, cx + 8, cy - 4, cx + 8, cy + 5, stroke, 2);
    ln(s, cx + 8, cy + 5, cx, cy + 10, stroke, 2);
    ln(s, cx, cy + 10, cx - 8, cy + 5, stroke, 2);
    ln(s, cx - 8, cy + 5, cx - 8, cy - 4, stroke, 2);
    ln(s, cx - 8, cy - 4, cx, cy - 9, stroke, 2);
    ln(s, cx - 8, cy - 4, cx, cy + 1, stroke, 2);
    ln(s, cx + 8, cy - 4, cx, cy + 1, stroke, 2);
    ln(s, cx, cy + 1, cx, cy + 10, stroke, 2);
  } else if (motif === "store") {
    ln(s, x + 8, y + 14, x + 26, y + 14, stroke, 2);
    ln(s, x + 10, y + 9, x + 24, y + 9, stroke, 2);
    ln(s, x + 8, y + 14, x + 8, y + 25, stroke, 2);
    ln(s, x + 26, y + 14, x + 26, y + 25, stroke, 2);
  } else if (motif === "people") {
    ell(s, x + 9, y + 9, 7, 7, { line: stroke, lw: 2 });
    ell(s, x + 18, y + 9, 7, 7, { line: stroke, lw: 2 });
    ln(s, x + 7, y + 26, x + 13, y + 19, stroke, 2);
    ln(s, x + 20, y + 19, x + 26, y + 26, stroke, 2);
  } else if (motif === "tag") {
    box(s, cx - 9, cy - 9, 12, 12, { fill: null, line: stroke, lw: 2, r: 2, rot: 45 });
  } else if (motif === "gauge") {
    ell(s, cx - 9, cy - 9, 18, 18, { line: stroke, lw: 2 });
    ln(s, cx, cy, cx + 5, cy - 5, stroke, 2);
  } else if (motif === "scale") {
    ln(s, cx, cy - 9, cx, cy + 9, stroke, 2);
    ln(s, cx - 8, cy - 5, cx + 8, cy - 5, stroke, 2);
    ell(s, cx - 11, cy + 4, 6, 6, { line: stroke, lw: 1.6 });
    ell(s, cx + 5, cy + 4, 6, 6, { line: stroke, lw: 1.6 });
  }
}

function bulletRow(s, x, y, w, dotColor, runs, o = {}) {
  ell(s, x, y + 6, 6, 6, { fill: dotColor });
  s.addText(runs, { x: P(x + 16), y: P(y - 2), w: P(w - 16), h: P(o.h ?? 22), margin: 0, fontFace: BODY, fontSize: o.size ?? 10.5, color: o.color ?? C.s700, lineSpacingMultiple: 1.3, valign: "top" });
}

// =====================================================================
// SLIDE 1 — COVER
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  // faint frame accents
  rct(s, 0, 0, 1280, 4, C.indigo);
  mark(s, 64, 56, 26);
  T(s, "Inventra AI", 100, 55, 200, 26, { bold: true, size: 12, color: C.soft, valign: "middle" });

  T(s, "STARTUP CONCEPT DOCUMENT", 64, 208, 700, 16, { bold: true, size: 9, color: C.em2, cs: 3 });
  T(s, "Inventra AI", 60, 232, 720, 110, { face: DISP, bold: true, size: 54, color: C.soft });
  T(s, "The AI Operating Copilot for Cambodian SMEs", 64, 352, 700, 40, { size: 20, color: C.s300, lh: 1.3 });

  rct(s, 64, 430, 3, 62, C.em);
  T(s, "Helping SMEs make smarter business decisions, not just manage inventory.", 84, 428, 540, 66, { size: 12.5, italic: true, color: C.s200, lh: 1.45 });

  // orbital illustration, centered ~ (1006, 372)
  const cx = 1006, cy = 372;
  ell(s, cx - 210, cy - 210, 420, 420, { line: C.s800, lw: 1.5 });
  ell(s, cx - 150, cy - 150, 300, 300, { line: C.indigo2, lw: 1.4, dash: "dash" });
  ell(s, cx - 92, cy - 92, 184, 184, { line: C.s700, lw: 1.4 });
  const nodes = [
    [cx, cy - 168, 26, C.indigo, C.indigo3],
    [cx + 165, cy, 22, C.ink, C.s700],
    [cx - 150, cy + 96, 20, C.ink, C.s700],
    [cx + 115, cy + 130, 18, C.ink, C.s700],
  ];
  nodes.forEach(([nx, ny, r]) => ln(s, cx, cy, nx, ny, C.em, 1.4));
  nodes.forEach(([nx, ny, r, f, l]) => ell(s, nx - r, ny - r, r * 2, r * 2, { fill: f, line: l, lw: 1.4 }));
  // core
  box(s, cx - 44, cy - 44, 88, 88, { fill: C.em, line: null, r: 22 });
  ln(s, cx - 16, cy + 2, cx - 4, cy + 14, C.ink, 4.5);
  ln(s, cx - 4, cy + 14, cx + 18, cy - 12, C.ink, 4.5);
  T(s, "FORECAST", cx - 40, cy - 205, 120, 14, { size: 7.5, bold: true, color: C.s400, align: "center" });
  T(s, "CASH FLOW", cx + 120, cy - 8, 120, 14, { size: 7.5, bold: true, color: C.s400 });
  T(s, "DEAD STOCK", cx - 240, cy + 92, 120, 14, { size: 7.5, bold: true, color: C.s400, align: "right" });
  T(s, "RISK", cx + 92, cy + 150, 80, 14, { size: 7.5, bold: true, color: C.s400, align: "center" });

  T(s, "Prepared for the AIM Competition  ·  August 2026", 64, 660, 500, 18, { size: 9, color: C.s500 });
  T(s, "CONFIDENTIAL", 716, 660, 500, 18, { size: 9, color: C.s500, align: "right", cs: 2 });
}

// =====================================================================
// SLIDE 2 — VISION
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "Vision", "01");
  eyebrow(s, "The Vision", C.em);
  s.addText(
    [
      { text: "Inventra AI is not an inventory system.", options: { breakLine: true, color: C.ink } },
      { text: "It is an ", options: { color: C.ink } },
      { text: "AI Operating Copilot.", options: { color: C.indigo } },
    ],
    { x: P(64), y: P(124), w: P(1000), h: P(110), margin: 0, fontFace: DISP, bold: true, fontSize: 30, lineSpacingMultiple: 1.12 }
  );

  T(s, "Today, many Cambodian SMEs make critical decisions on intuition, fragmented spreadsheets, paper records, and incomplete information.", 64, 250, 452, 90, { size: 11.25, color: C.s700, lh: 1.55 });
  s.addText(
    [
      { text: "Inventra AI transforms operational data into ", options: { color: C.s700 } },
      { text: "actionable business intelligence", options: { color: C.ink, bold: true } },
      { text: " — a virtual business analyst, available 24/7.", options: { color: C.s700 } },
    ],
    { x: P(64), y: P(340), w: P(452), h: P(80), margin: 0, fontFace: BODY, fontSize: 11.25, lineSpacingMultiple: 1.55 }
  );

  box(s, 64, 452, 452, 96, { fill: C.indigo, line: null, r: 16 });
  T(s, "INSTEAD OF ASKING", 88, 474, 400, 14, { size: 8.5, bold: true, color: C.ind200, cs: 2.4 });
  T(s, "\u201CHow much stock do I have?\u201D", 88, 496, 400, 34, { size: 18, bold: true, color: C.ind200 });

  T(s, "BUSINESS OWNERS CAN ASK", 566, 250, 500, 14, { size: 8.5, bold: true, color: C.em700, cs: 2.4 });
  const qs = [
    ["trend", "What should I buy next week?"],
    ["coin", "Which products are hurting cash flow?"],
    ["chart", "Which products will likely sell out soon?"],
    ["box", "Which items are becoming dead stock?"],
    ["gauge", "Where am I losing profit?"],
  ];
  let qy = 276;
  qs.forEach(([m, label], i) => {
    box(s, 566, qy, 650, 52, { fill: C.white, line: C.s200, r: 12, shadow: true });
    const tint = i % 2 ? C.em50 : C.ind50;
    const stroke = i % 2 ? C.em : C.indigo;
    iconTile(s, 582, qy + 9, m, tint, stroke, 34);
    T(s, label, 634, qy, 560, 52, { size: 12, bold: true, color: C.ink, valign: "middle" });
    qy += 62;
  });

  footer(s, "AI Decision Intelligence Platform for SMEs");
}

// =====================================================================
// SLIDE 3 — THE PROBLEM
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "The Problem", "02");
  eyebrow(s, "The Problem", C.em);
  s.addText(
    [
      { text: "SMEs are drowning in data", options: { color: C.ink, breakLine: true } },
      { text: "but starving for ", options: { color: C.ink, breakLine: false } },
      { text: "insights.", options: { color: C.indigo } },
    ],
    { x: P(64), y: P(124), w: P(1000), h: P(100), margin: 0, fontFace: DISP, bold: true, fontSize: 30, lineSpacingMultiple: 1.12 }
  );

  // workflow column
  T(s, "CURRENT SME WORKFLOW", 64, 244, 330, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const flow = [
    ["Sales", C.white, C.s200, C.ink],
    ["Excel & paper records", C.white, C.s200, C.ink],
    ["Manual decisions", C.white, C.s200, C.ink],
    ["Stockouts", C.rose50, C.rose300, C.rose800],
    ["Lost revenue", C.rose800, C.rose800, C.rose50],
  ];
  let fy = 270;
  flow.forEach(([label, fill, line, col], i) => {
    box(s, 64, fy, 330, 44, { fill, line, r: 11 });
    T(s, label, 82, fy, 300, 44, { size: 12, bold: i >= 3, color: col, valign: "middle" });
    fy += 44;
    if (i < flow.length - 1) { dArrow(s, 64 + 165 - 6, fy + 2, 12, 14, i >= 3 ? C.rose300 : C.s300); fy += 18; }
  });

  // pain points
  T(s, "PAIN POINTS", 436, 244, 388, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const pains = [
    [{ text: "Inventory decisions are made by ", options: { color: C.s700 } }, { text: "guesswork", options: { color: C.ink, bold: true } }, { text: ".", options: { color: C.s700 } }],
    [{ text: "Cash is ", options: { color: C.s700 } }, { text: "trapped", options: { color: C.ink, bold: true } }, { text: " in slow-moving products.", options: { color: C.s700 } }],
    [{ text: "Owners cannot ", options: { color: C.s700 } }, { text: "predict future demand", options: { color: C.ink, bold: true } }, { text: ".", options: { color: C.s700 } }],
    [{ text: "Business data exists but is rarely turned into insight.", options: { color: C.s700 } }],
    [{ text: "SMEs lack ", options: { color: C.s700 } }, { text: "affordable BI tools", options: { color: C.ink, bold: true } }, { text: ".", options: { color: C.s700 } }],
  ];
  let py = 274;
  pains.forEach((runs) => { bulletRow(s, 436, py, 388, C.indigo, runs, { h: 40, size: 11 }); py += 40; });

  // equation
  T(s, "COMPOUNDING INTO", 868, 244, 348, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const eq = ["Inventory problem", "+", "Cash flow problem", "+", "Decision problem", "="];
  let ey = 272;
  eq.forEach((t) => {
    if (t === "+" || t === "=") { T(s, t, 868, ey, 348, 20, { size: 15, bold: true, color: C.s400, align: "center" }); ey += 26; }
    else { box(s, 868, ey, 348, 38, { fill: C.ind50, line: C.ind100, r: 10 }); T(s, t, 868, ey, 348, 38, { size: 11, bold: true, color: C.indigo, align: "center", valign: "middle" }); ey += 46; }
  });
  box(s, 868, ey, 348, 46, { fill: C.ink, line: null, r: 10 });
  T(s, "Business growth problem", 868, ey, 348, 46, { size: 12, bold: true, color: C.soft, align: "center", valign: "middle" });

  footer(s, "AI Decision Intelligence Platform for SMEs");
}

// =====================================================================
// SLIDE 4 — PLATFORM
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "The Platform", "03");
  eyebrow(s, "The Platform", C.em);
  T(s, "AI-Powered Business Decision Intelligence", 64, 120, 1100, 50, { face: DISP, bold: true, size: 27 });

  const mods = [
    ["trend", C.ind50, C.indigo, "AI Demand Forecasting", "Predicts future demand from historical sales patterns.", ["Demand trends", "Seasonal patterns", "Growth signals"], C.ind50, C.indigo],
    ["coin", C.em50, C.em, "AI Cash Flow Optimizer", "Recommends what to buy against an available budget.", ["Budget-aware buys", "Turnover priority"], C.em50, C.em700],
    ["box", C.ind50, C.indigo, "Dead Stock Intelligence", "Detects products consuming capital without earning revenue.", ["Slow movers", "Overstock risk", "Locked capital"], C.ind50, C.indigo],
    ["pulse", C.em50, C.em, "Business Health Monitor", "Continuously analyzes overall business performance.", ["Revenue trends", "Category performance", "Operational risk"], C.em50, C.em700],
  ];
  const gx = 64, gy = 210, cw = 320, ch = 150, gxg = 12, gyg = 14;
  mods.forEach((m, i) => {
    const x = gx + (i % 2) * (cw + gxg);
    const y = gy + Math.floor(i / 2) * (ch + gyg);
    box(s, x, y, cw, ch, { fill: C.white, line: C.s200, r: 14, shadow: true });
    iconTile(s, x + 18, y + 18, m[0], m[1], m[2], 34);
    T(s, m[3], x + 18, y + 62, cw - 36, 20, { size: 12.5, bold: true });
    T(s, m[4], x + 18, y + 84, cw - 36, 34, { size: 9.5, color: C.s500, lh: 1.4 });
    let cxp = x + 18;
    const cyp = y + ch - 26;
    m[5].forEach((tag) => {
      const tw = 9 + tag.length * 5.4;
      box(s, cxp, cyp, tw, 17, { fill: m[6], line: null, r: 6 });
      T(s, tag, cxp, cyp, tw, 17, { size: 7.8, bold: true, color: m[7], align: "center", valign: "middle" });
      cxp += tw + 6;
    });
  });

  // chat mockup
  const chx = 740, chy = 210, chw = 476, chh = 372;
  box(s, chx, chy, chw, chh, { fill: C.ink, line: null, r: 16 });
  box(s, chx + 18, chy + 16, 18, 18, { fill: C.em, line: null, r: 5 });
  ln(s, chx + 22, chy + 25, chx + 26, chy + 29, C.ink, 2.4);
  ln(s, chx + 26, chy + 29, chx + 33, chy + 21, C.ink, 2.4);
  T(s, "AI Copilot Chat", chx + 44, chy + 14, 240, 22, { size: 11, bold: true, color: C.soft, valign: "middle" });
  box(s, chx + chw - 62, chy + 16, 44, 18, { fill: C.em800, line: null, r: 5 });
  T(s, "Live", chx + chw - 62, chy + 16, 44, 18, { size: 7.5, bold: true, color: C.em2, align: "center", valign: "middle" });
  rct(s, chx + 18, chy + 46, chw - 36, 1, C.s800);

  // user bubble 1
  box(s, chx + chw - 18 - 300, chy + 60, 300, 34, { fill: C.indigo, line: null, r: 12 });
  T(s, "I have a $500 budget this week. What should I reorder?", chx + chw - 18 - 300 + 12, chy + 60, 276, 34, { size: 9.5, color: C.ind50, valign: "middle" });

  // ai bubble
  box(s, chx + 18, chy + 104, 380, 170, { fill: C.s800, line: null, r: 12 });
  T(s, "Prioritise these — highest turnover per dollar:", chx + 30, chy + 116, 356, 18, { size: 9.5, color: C.s200 });
  const rec = [["Coca-Cola", "$180"], ["Instant Noodles", "$210"], ["Bottled Water", "$110"]];
  let ry = chy + 138;
  rec.forEach(([n, v]) => {
    box(s, chx + 30, ry, 356, 24, { fill: C.ink, line: null, r: 7 });
    T(s, n, chx + 40, ry, 250, 24, { size: 9, bold: true, color: C.soft, valign: "middle" });
    T(s, v, chx + 30, ry, 346, 24, { size: 9, bold: true, color: C.em2, align: "right", valign: "middle" });
    ry += 28;
  });
  T(s, "Skip: dried snacks — 40 days of cover already in stock.", chx + 30, ry + 2, 356, 16, { size: 8, color: C.s400 });

  // user bubble 2
  box(s, chx + chw - 18 - 260, chy + 286, 260, 30, { fill: C.indigo, line: null, r: 12 });
  T(s, "What is my biggest inventory risk?", chx + chw - 18 - 260 + 12, chy + 286, 236, 30, { size: 9.5, color: C.ind50, valign: "middle" });

  // input
  box(s, chx + 18, chy + chh - 46, chw - 36, 30, { fill: C.s800, line: null, r: 10 });
  T(s, "Ask about demand, cash flow, profit…", chx + 30, chy + chh - 46, 360, 30, { size: 9, color: C.s500, valign: "middle" });
  ln(s, chx + chw - 44, chy + chh - 31, chx + chw - 30, chy + chh - 31, C.em2, 2);
  tri(s, chx + chw - 34, chy + chh - 36, 8, 10, C.em2, 90);

  footer(s, "Five modules, one copilot");
}

// =====================================================================
// SLIDE 5 — DIFFERENTIATION
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "Differentiation", "04");
  eyebrow(s, "Why Inventra AI is different", C.em);
  s.addText(
    [
      { text: "From record-keeping to ", options: { color: C.ink } },
      { text: "decision-making", options: { color: C.indigo } },
    ],
    { x: P(64), y: P(120), w: P(1100), h: P(48), margin: 0, fontFace: DISP, bold: true, fontSize: 27 }
  );

  // left panel
  box(s, 64, 206, 520, 250, { fill: C.white, line: C.s200, r: 16 });
  T(s, "TRADITIONAL INVENTORY SOFTWARE", 88, 228, 480, 14, { size: 8.5, bold: true, color: C.s400, cs: 1.6 });
  T(s, "Tells you what happened", 88, 244, 480, 26, { size: 15, bold: true, color: C.s700 });
  const trad = ["Records stock levels", "Generates static reports", "Sends threshold alerts", "Leaves analysis to the owner"];
  let ty = 288;
  trad.forEach((t) => {
    ell(s, 88, ty + 2, 15, 15, { line: C.s300, lw: 2 });
    ln(s, 92, ty + 9.5, 99, ty + 9.5, C.s400, 2);
    T(s, t, 114, ty - 1, 440, 20, { size: 11, color: C.s500 });
    ty += 34;
  });

  T(s, "VS", 596, 320, 40, 24, { face: DISP, size: 14, bold: true, color: C.s400, align: "center" });

  // right panel
  box(s, 648, 196, 568, 270, { fill: C.indigo, line: null, r: 16, shadow: true });
  T(s, "INVENTRA AI", 672, 220, 520, 14, { size: 8.5, bold: true, color: C.ind200, cs: 1.6 });
  T(s, "Tells you what to do next", 672, 236, 520, 26, { size: 15, bold: true, color: C.soft });
  const smart = ["Predicts demand", "Optimizes purchases", "Detects risks early", "Explains decisions", "Delivers business intelligence", "Conversational AI assistant"];
  smart.forEach((t, i) => {
    const x = 672 + (i % 2) * 270;
    const y = 280 + Math.floor(i / 2) * 40;
    ell(s, x, y + 1, 16, 16, { fill: C.em });
    ln(s, x + 4, y + 8.5, x + 7, y + 12, C.ink, 2.2);
    ln(s, x + 7, y + 12, x + 12, y + 5, C.ink, 2.2);
    T(s, t, x + 26, y - 1, 244, 20, { size: 10.5, bold: true, color: C.soft });
  });

  // statement band
  box(s, 64, 500, 1152, 116, { fill: C.ink, line: null, r: 16 });
  rct(s, 96, 524, 3, 68, C.em);
  s.addText(
    [
      { text: "Traditional systems tell you what happened.", options: { breakLine: true, color: C.soft } },
      { text: "Inventra AI tells you what to do next.", options: { color: C.em2 } },
    ],
    { x: P(120), y: P(524), w: P(1060), h: P(70), margin: 0, fontFace: DISP, bold: true, fontSize: 18, lineSpacingMultiple: 1.32 }
  );

  footer(s, "AI Decision Intelligence Platform for SMEs");
}

// =====================================================================
// SLIDE 6 — AI ARCHITECTURE
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  rct(s, 0, 0, 1280, 4, C.indigo);
  header(s, "AI Architecture", "05", true);
  T(s, "AI ARCHITECTURE", 64, 92, 700, 14, { size: 9, bold: true, color: C.em2, cs: 3 });
  T(s, "How the AI brain works", 64, 110, 900, 44, { face: DISP, bold: true, size: 25.5, color: C.soft });

  const L = 64, R = 1216, W = R - L;
  T(s, "DATA INPUTS", L, 176, 400, 12, { size: 8, bold: true, color: C.s500, cs: 2 });
  const ins = ["Sales data", "Inventory data", "Business rules", "Market signals"];
  const iw = (W - 3 * 14) / 4;
  ins.forEach((t, i) => {
    const x = L + i * (iw + 14);
    box(s, x, 194, iw, 42, { fill: C.s800, line: C.s700, r: 11 });
    T(s, t, x + 14, 194, iw - 28, 42, { size: 11, bold: true, color: C.soft, valign: "middle" });
  });
  dArrow(s, (L + R) / 2 - 8, 244, 16, 18, C.s600);

  box(s, L, 270, W, 64, { fill: C.indigo2, line: null, r: 13 });
  box(s, L + 22, 290, 24, 24, { fill: C.em, line: null, r: 6 });
  ln(s, L + 27, 302, L + 31, 306, C.ink, 2.4);
  ln(s, L + 31, 306, L + 38, 297, C.ink, 2.4);
  T(s, "AI Intelligence Layer", L + 60, 280, 600, 20, { size: 13, bold: true, color: C.soft });
  T(s, "Cleans, correlates and reasons over every signal in real time", L + 60, 302, 700, 18, { size: 10, color: C.ind100 });
  dArrow(s, (L + R) / 2 - 8, 342, 16, 18, C.s600);

  T(s, "SPECIALISED ENGINES", L, 372, 400, 12, { size: 8, bold: true, color: C.s500, cs: 2 });
  const eng = [["trend", "Forecasting Engine"], ["cube", "Risk Detection Engine"], ["coin", "Cash Flow Optimizer"], ["chart", "Insight Generator"]];
  eng.forEach(([m, t], i) => {
    const x = L + i * (iw + 14);
    box(s, x, 390, iw, 70, { fill: "0B1220", line: "1E3A34", r: 11 });
    box(s, x + 14, 404, 16, 16, { fill: C.em800, line: null, r: 5 });
    ell(s, x + 19, 409, 6, 6, { fill: C.em2 });
    T(s, t, x + 14, 428, iw - 28, 20, { size: 10.5, bold: true, color: C.soft });
  });
  dArrow(s, (L + R) / 2 - 8, 468, 16, 18, C.s600);

  box(s, L, 496, W, 60, { fill: C.em, line: null, r: 13 });
  s.addShape("rightArrow", { x: P(L + 20), y: P(518), w: P(24), h: P(16), fill: { color: C.ink }, line: { type: "none" } });
  T(s, "Recommendations & Actions", L + 56, 496, 500, 60, { size: 13, bold: true, color: C.ink, valign: "middle" });
  T(s, "delivered in the dashboard & copilot chat", L + 52, 496, W - 84, 60, { size: 10, bold: true, color: C.em800, align: "right", valign: "middle" });

  footer(s, "A modern SaaS decision-intelligence stack", true);
}

// =====================================================================
// SLIDE 7 — TARGET MARKET
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "Target Market", "06");
  eyebrow(s, "Target Market", C.em);
  s.addText(
    [
      { text: "Enterprise decision intelligence at ", options: { color: C.ink } },
      { text: "SME pricing", options: { color: C.indigo } },
    ],
    { x: P(64), y: P(120), w: P(1100), h: P(48), margin: 0, fontFace: DISP, bold: true, fontSize: 27 }
  );

  T(s, "PRIMARY CUSTOMERS", 64, 206, 420, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const cust = [["store", "Mini marts"], ["box", "Convenience stores"], ["cube", "Small distributors"], ["tag", "Retail SMEs"], ["people", "Growing family businesses"]];
  let cy = 230;
  cust.forEach(([m, t]) => {
    box(s, 64, cy, 420, 46, { fill: C.white, line: C.s200, r: 12 });
    iconTile(s, 78, cy + 7, m, C.ind50, C.indigo, 32);
    T(s, t, 126, cy, 340, 46, { size: 12, bold: true, valign: "middle" });
    cy += 54;
  });

  // positioning matrix
  T(s, "MARKET POSITIONING", 536, 206, 400, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const mx = 536, my = 230, mw = 680, mh = 270;
  box(s, mx, my, mw, mh, { fill: C.white, line: C.s200, r: 16 });
  ln(s, mx + 20, my + mh / 2, mx + mw - 20, my + mh / 2, C.s200, 1);
  ln(s, mx + mw / 2, my + 20, mx + mw / 2, my + mh - 20, C.s200, 1);
  T(s, "HIGH INTELLIGENCE", mx, my + 10, mw, 12, { size: 7.5, bold: true, color: C.s400, align: "center", cs: 1.4 });
  T(s, "LOW INTELLIGENCE", mx, my + mh - 22, mw, 12, { size: 7.5, bold: true, color: C.s400, align: "center", cs: 1.4 });
  T(s, "LOW COST", mx - 6, my + mh / 2 - 7, 90, 14, { size: 7.5, bold: true, color: C.s400, rot: 270, cs: 1.4, align: "center" });
  T(s, "HIGH COST", mx + mw - 84, my + mh / 2 - 7, 90, 14, { size: 7.5, bold: true, color: C.s400, rot: 90, cs: 1.4, align: "center" });

  const pt = (fx, fy, label, big) => {
    const x = mx + fx * mw, y = my + fy * mh;
    if (big) {
      ell(s, x - 14, y - 14, 28, 28, { fill: C.em50 });
      ell(s, x - 8, y - 8, 16, 16, { fill: C.em });
      T(s, label, x - 60, y + 14, 120, 16, { size: 9.5, bold: true, color: C.em700, align: "center" });
    } else {
      ell(s, x - 5, y - 5, 10, 10, { fill: C.s300 });
      T(s, label, x - 70, y + 8, 140, 28, { size: 8.5, bold: true, color: C.s500, align: "center", lh: 1.15 });
    }
  };
  pt(0.19, 0.6, "Spreadsheets & paper");
  pt(0.72, 0.64, "Traditional inventory apps");
  pt(0.79, 0.24, "SAP · Oracle · Dynamics");
  pt(0.24, 0.26, "Inventra AI", true);

  // opportunity band
  box(s, 64, 520, 1152, 120, { fill: C.indigo, line: null, r: 16 });
  T(s, "THE PROBLEM", 92, 542, 500, 12, { size: 8, bold: true, color: C.ind200, cs: 1.8 });
  T(s, "Most SMEs cannot afford enterprise systems like SAP, Oracle, or Microsoft Dynamics.", 92, 558, 500, 60, { size: 11, color: C.s200, lh: 1.4 });
  rct(s, 632, 542, 1, 78, C.indigo2);
  T(s, "THE OPPORTUNITY", 664, 542, 500, 12, { size: 8, bold: true, color: C.em3, cs: 1.8 });
  T(s, "Deliver enterprise-level decision intelligence at a price SMEs can actually pay.", 664, 558, 500, 60, { size: 11, color: C.s200, lh: 1.4 });

  footer(s, "AI Decision Intelligence Platform for SMEs");
}

// =====================================================================
// SLIDE 8 — BUILD WEEK MVP
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "Build Week MVP", "07");
  eyebrow(s, "MVP for the AIM Competition", C.em);
  T(s, "Build Week MVP", 64, 120, 900, 48, { face: DISP, bold: true, size: 27 });

  T(s, "SHIPPING IN BUILD WEEK", 64, 210, 400, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const feats = ["Inventory Dashboard", "AI Demand Forecast", "AI Reorder Intelligence", "Dead Stock Detection", "AI Business Copilot Chat"];
  let ffy = 236;
  feats.forEach((t) => {
    box(s, 64, ffy, 400, 50, { fill: C.white, line: C.s200, r: 12 });
    ell(s, 84, ffy + 16, 18, 18, { fill: C.em });
    ln(s, 88, ffy + 25, 92, ffy + 29, C.white, 2.2);
    ln(s, 92, ffy + 29, 99, ffy + 21, C.white, 2.2);
    T(s, t, 116, ffy, 330, 50, { size: 12, bold: true, valign: "middle" });
    ffy += 58;
  });

  T(s, "LIVE DEMO SCENARIO", 516, 210, 400, 14, { size: 8.5, bold: true, color: C.s500, cs: 2 });
  const step = (n, label, y, opt = {}) => {
    box(s, 516, y, 700, 50, { fill: opt.fill || C.white, line: opt.line || C.s200, r: 12 });
    box(s, 532, y + 12, 26, 26, { fill: opt.numBg || C.ind50, line: null, r: 8 });
    T(s, String(n), 532, y + 12, 26, 26, { size: 11, bold: true, color: opt.numCol || C.indigo, align: "center", valign: "middle" });
    T(s, label, 574, y, 620, 50, { size: 12, bold: true, color: opt.col || C.ink, valign: "middle" });
  };
  step(1, "Owner uploads sales records", 236);
  dArrow(s, 560, 292, 12, 14);
  step(2, "AI analyzes the data", 312);
  dArrow(s, 560, 368, 12, 14);

  box(s, 516, 388, 700, 82, { fill: C.ink, line: null, r: 12 });
  box(s, 532, 400, 26, 26, { fill: C.em, line: null, r: 8 });
  T(s, "3", 532, 400, 26, 26, { size: 11, bold: true, color: C.ink, align: "center", valign: "middle" });
  T(s, "AI detects", 574, 396, 300, 22, { size: 12, bold: true, color: C.soft });
  const chips = ["Upcoming stock shortages", "Dead stock", "Cash flow risks"];
  let cxp = 532;
  chips.forEach((t) => {
    const w = 16 + t.length * 5.6;
    box(s, cxp, 434, w, 24, { fill: C.s800, line: null, r: 8 });
    T(s, t, cxp, 434, w, 24, { size: 8.5, bold: true, color: C.soft, align: "center", valign: "middle" });
    cxp += w + 8;
  });
  dArrow(s, 560, 478, 12, 14, C.em3);

  box(s, 516, 498, 700, 50, { fill: C.em50, line: C.em3, r: 12 });
  box(s, 532, 510, 26, 26, { fill: C.em, line: null, r: 8 });
  T(s, "4", 532, 510, 26, 26, { size: 11, bold: true, color: C.white, align: "center", valign: "middle" });
  T(s, "AI delivers actionable recommendations", 574, 498, 620, 50, { size: 12, bold: true, color: C.em700, valign: "middle" });

  footer(s, "Upload → analyze → detect → act");
}

// =====================================================================
// SLIDE 9 — FUTURE VISION
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.soft };
  accentBar(s);
  header(s, "Future Vision", "08");
  eyebrow(s, "Future Vision", C.em);
  T(s, "The AI Operating System for SMEs", 64, 120, 1100, 48, { face: DISP, bold: true, size: 27 });

  const caps = [
    ["cube", "Supplier intelligence", "Compare suppliers on price, reliability and lead time.", false],
    ["box", "Smart purchasing", "Auto-generated purchase orders tuned to demand.", false],
    ["coin", "Dynamic pricing", "Price recommendations that protect margin and turnover.", false],
    ["trend", "Financial forecasting", "Project revenue, cash and working capital forward.", false],
    ["chart", "Performance benchmarking", "See how the business compares to similar SMEs.", false],
    ["chat", "Khmer-language AI advisor", "Advice in the language every owner already speaks.", true],
  ];
  const gx = 64, gy = 208, cw = 373, ch = 132, gg = 14;
  caps.forEach((c, i) => {
    const x = gx + (i % 3) * (cw + gg);
    const y = gy + Math.floor(i / 3) * (ch + gg);
    const dark = c[3];
    box(s, x, y, cw, ch, { fill: dark ? C.indigo : C.white, line: dark ? null : C.s200, r: 14 });
    iconTile(s, x + 18, y + 18, c[0], dark ? "3B378E" : C.ind50, dark ? C.em2 : C.indigo, 30);
    T(s, c[1], x + 18, y + 56, cw - 36, 20, { size: 12, bold: true, color: dark ? C.soft : C.ink });
    T(s, c[2], x + 18, y + 78, cw - 36, 40, { size: 9.5, color: dark ? C.ind100 : C.s500, lh: 1.4 });
  });

  box(s, 64, 500, 1152, 116, { fill: C.ink, line: null, r: 16 });
  rct(s, 96, 522, 3, 72, C.em);
  s.addText(
    [
      { text: "Every Cambodian SME deserves access to an ", options: { color: C.soft } },
      { text: "AI business analyst.", options: { color: C.em2 } },
    ],
    { x: P(120), y: P(522), w: P(1060), h: P(72), margin: 0, fontFace: DISP, bold: true, fontSize: 19, lineSpacingMultiple: 1.3, valign: "middle" }
  );

  footer(s, "From copilot to operating system");
}

// =====================================================================
// SLIDE 10 — CLOSING
// =====================================================================
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  rct(s, 0, 0, 1280, 4, C.indigo);
  rct(s, 0, 716, 1280, 4, C.em);

  mark(s, 612, 196, 56);
  T(s, "Inventra AI", 0, 278, 1280, 70, { face: DISP, bold: true, size: 44, color: C.soft, align: "center" });
  T(s, "The AI Operating Copilot for Cambodian SMEs", 0, 352, 1280, 30, { size: 15, color: C.s300, align: "center" });
  rct(s, 618, 412, 44, 3, C.em);
  s.addText(
    [
      { text: "\u201CEvery Cambodian SME deserves access to an ", options: { color: C.soft } },
      { text: "AI business analyst.", options: { color: C.em2 } },
      { text: "\u201D", options: { color: C.soft } },
    ],
    { x: P(280), y: P(444), w: P(720), h: P(80), margin: 0, fontFace: DISP, bold: true, fontSize: 18, align: "center", lineSpacingMultiple: 1.35 }
  );
  s.addText(
    [
      { text: "[contact email]", options: { color: C.s400 } },
      { text: "     •     ", options: { color: C.s700 } },
      { text: "[website]", options: { color: C.s400 } },
      { text: "     •     ", options: { color: C.s700 } },
      { text: "AIM Competition — August 2026", options: { color: C.s400 } },
    ],
    { x: P(0), y: P(548), w: P(1280), h: P(20), margin: 0, align: "center", fontFace: BODY, bold: true, fontSize: 10 }
  );
  T(s, "Inventra AI — Confidential", 64, 662, 400, 18, { size: 8, color: C.s600 });
  T(s, "THANK YOU", 816, 662, 400, 18, { size: 8, color: C.s600, align: "right", cs: 2 });
}

await pptx.writeFile({ fileName: OUT });
console.log("wrote", OUT);
