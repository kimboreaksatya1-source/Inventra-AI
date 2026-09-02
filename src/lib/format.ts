// Number, currency & date formatting helpers

/**
 * Whole-dollar for readable aggregates, but keeps cents for small non-round
 * values so sub-dollar unit prices ($0.35) and precise figures ($15.75) don't
 * collapse to "$0" / "$16". Used by the analysis engine, Copilot evidence,
 * procurement and cash-flow strings.
 */
export function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const rounded = Math.round(v * 100) / 100;
  const decimals = Math.abs(rounded) < 100 && !Number.isInteger(rounded) ? 2 : 0;
  return `$${rounded.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatCurrency(
  value: number,
  opts: { compact?: boolean; decimals?: number } = {}
): string {
  const { compact = false, decimals = 0 } = opts;
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatSigned(value: number, prefix = "+"): string {
  return `${value >= 0 ? prefix : ""}${formatNumber(value)}`;
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function daysUntilLabel(days: number): string {
  if (days <= 0) return "Out of stock";
  if (days < 1) return "< 1 day";
  if (days === 1) return "1 day";
  return `${Math.floor(days)} days`;
}
