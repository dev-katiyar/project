/**
 * Shared series color palette for portfolio charts.
 * Use getSeriesColor() in both ReturnsChart and PortfolioGrowthChart
 * to keep colors consistent across all chart types.
 */

// Named-series → fixed color
const NAMED: Record<string, string> = {
  portfolio: "#22c55e",   // green  — user's portfolio
  sp500:     "#38bdf8",   // sky    — S&P 500 / SPY
  "60/40":   "#f87171",   // coral  — 60/40 balanced index
  index:     "#fb923c",   // orange — generic index
};

// Fallback cycle for any extra / unknown series
const PALETTE = [
  "#a78bfa", // violet
  "#fbbf24", // amber
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f472b6", // pink
  "#4ade80", // light green
  "#facc15", // yellow
];

/**
 * Returns a darkened version of a hex color (for negative-value bars).
 * factor 0.0 = black, 1.0 = original. Default 0.5 gives a distinct dark tint.
 */
export function darkenColor(hex: string, factor = 0.5): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const cache = new Map<string, string>();
let cycleIdx = 0;

/** Returns a stable color for a given series name, consistent across all charts. */
export function getSeriesColor(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const lower = name.toLowerCase();
  let color: string;

  if (lower.includes("portfolio"))                                     color = NAMED.portfolio;
  else if (lower.includes("s&p") || lower.includes("spy") || lower.includes("sp500")) color = NAMED.sp500;
  else if (lower.includes("60/40"))                                    color = NAMED["60/40"];
  else if (lower.includes("index"))                                    color = NAMED.index;
  else {
    color = PALETTE[cycleIdx % PALETTE.length];
    cycleIdx++;
  }

  cache.set(name, color);
  return color;
}
