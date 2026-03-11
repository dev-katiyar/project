import React, { useState, useEffect, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

/* ── Chart theme ─────────────────────────────────────────────────────────── */

interface ChartTheme {
  bg: string;
  grid: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    bg: "transparent",
    grid: "#1c2840",
    label: "#7a8da8",
    tooltipBg: "#0d1220",
    tooltipBorder: "#1c2840",
    tooltipText: "#e8edf5",
  },
  dim: {
    bg: "transparent",
    grid: "#2a3244",
    label: "#8899b0",
    tooltipBg: "#1a2030",
    tooltipBorder: "#2a3244",
    tooltipText: "#dde4f0",
  },
  light: {
    bg: "transparent",
    grid: "#e5e9f0",
    label: "#6b7a8d",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d0d7e2",
    tooltipText: "#1a2030",
  },
};

const SERIES_COLORS = [
  "#f5a623",
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#f87171",
  "#fb923c",
  "#e879f9",
  "#facc15",
  "#4ade80",
  "#60a5fa",
];

/* ── Known symbol-to-response-key mappings ───────────────────────────────── */

const SYMBOL_KEY_MAP: Record<string, string> = {
  "^GSPC": "S&P500",
  "^DJI": "Dow Jones",
  "^IXIC": "NASDAQ",
  "^RUT": "Russell 2000",
};

function resolveKey(sym: string, row: Record<string, unknown>): string {
  // Try the symbol itself first
  if (sym in row) return sym;
  // Try the built-in mapping
  const mapped = SYMBOL_KEY_MAP[sym];
  if (mapped && mapped in row) return mapped;
  // Fall back: find any non-date key as last resort (only for single-symbol calls)
  return sym;
}

/* ── Period selector ─────────────────────────────────────────────────────── */

export type Period =
  | "ytd"
  | "1month"
  | "3month"
  | "6month"
  | "1year"
  | "3year"
  | "All";

const PERIODS: { label: string; value: Period }[] = [
  { label: "YTD", value: "ytd" },
  { label: "1M", value: "1month" },
  { label: "3M", value: "3month" },
  { label: "6M", value: "6month" },
  { label: "1Y", value: "1year" },
  { label: "3Y", value: "3year" },
  { label: "Max", value: "All" },
];

/* ── Response parsing ────────────────────────────────────────────────────── */

/**
 * `/symbol/historical` returns:
 *   [{ date: "Jan 13, 2026", "S&P500": 24.98, AAPL: 223.5, ... }, ...]
 *
 * `symbols` is the list of ticker symbols passed to the API.
 * `displayNames` is an optional caller-supplied override map (ticker → response key).
 */
function parseResponse(
  raw: Record<string, unknown>[],
  symbols: string[],
  displayNames: Record<string, string>,
): Record<string, [number, number][]> {
  const out: Record<string, [number, number][]> = {};
  for (const sym of symbols) out[sym] = [];

  for (const row of raw) {
    const ts =
      row.date != null ? new Date(row.date as string).getTime() : null;
    if (ts == null || isNaN(ts)) continue;

    for (const sym of symbols) {
      // Prefer caller-supplied name, then built-in map, then raw symbol
      const key =
        displayNames[sym] ??
        (SYMBOL_KEY_MAP[sym] && SYMBOL_KEY_MAP[sym] in row
          ? SYMBOL_KEY_MAP[sym]
          : resolveKey(sym, row));
      const val = row[key];
      if (val != null) out[sym].push([ts, parseFloat(val as string)]);
    }
  }
  return out;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface SymbolHistoricalChartProps {
  /** Ticker symbols to plot (nulls filtered out). */
  symbols: (string | null | undefined)[];
  /**
   * Optional override of the response-object key for each symbol.
   * e.g. { "^GSPC": "S&P500" }  — only needed when the default mapping
   * doesn't cover your symbol.
   */
  displayNames?: Record<string, string>;
  /** Chart height in px (default 270) */
  height?: number;
  /** Show gradient fill under each series (default true) */
  filled?: boolean;
  /** Initial period (default "1year") */
  defaultPeriod?: Period;
}

const SymbolHistoricalChart: React.FC<SymbolHistoricalChartProps> = ({
  symbols,
  displayNames = {},
  height = 270,
  filled = true,
  defaultPeriod = "1year",
}) => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme];

  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [seriesData, setSeriesData] = useState<
    Record<string, [number, number][]>
  >({});
  const [loading, setLoading] = useState(false);

  const validSymbols = useMemo(
    () => symbols.filter((s): s is string => !!s),
    [symbols],
  );

  useEffect(() => {
    if (!validSymbols.length) {
      setSeriesData({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSeriesData({});

    api
      .post("/symbol/historical", {
        symbols: validSymbols.join(","),
        period,
      })
      .then(({ data: raw }) => {
        if (cancelled) return;
        const parsed = Array.isArray(raw)
          ? parseResponse(
              raw as Record<string, unknown>[],
              validSymbols,
              displayNames,
            )
          : {};
        setSeriesData(parsed);
      })
      .catch(() => {
        if (!cancelled) setSeriesData({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [validSymbols.join(","), period]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(
    (): Highcharts.Options => ({
      chart: {
        type: filled ? "area" : "line",
        backgroundColor: ct.bg,
        height,
        spacing: [4, 4, 8, 4],
        animation: false,
      },
      title: { text: undefined },
      xAxis: {
        type: "datetime",
        labels: { style: { color: ct.label, fontSize: "9px" } },
        lineColor: ct.grid,
        tickColor: ct.grid,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: ct.grid,
        labels: { style: { color: ct.label, fontSize: "9px" } },
      },
      series: validSymbols.map((sym, i): Highcharts.SeriesAreaOptions => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length];
        return {
          type: "area",
          name: displayNames[sym] ?? SYMBOL_KEY_MAP[sym] ?? sym,
          data: seriesData[sym] ?? [],
          color,
          fillColor: filled
            ? {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, `${color}44`],
                  [1, `${color}00`],
                ],
              }
            : "transparent",
          lineWidth: 2,
          marker: { enabled: false },
        };
      }),
      tooltip: {
        shared: validSymbols.length > 1,
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        style: { color: ct.tooltipText },
        xDateFormat: "%b %d, %Y",
        valueDecimals: 2,
      },
      legend: { enabled: validSymbols.length > 1 },
      credits: { enabled: false },
      accessibility: { enabled: false },
    }),
    [seriesData, ct, validSymbols, height, filled, displayNames],
  );

  /* ── Period bar ──────────────────────────────────────────────────────────── */

  const periodBar = (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "0.35rem",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          background: "var(--sv-bg-surface)",
          borderRadius: "0.5rem",
          padding: "2px",
          gap: "1px",
        }}
      >
        {PERIODS.map(({ label, value }) => {
          const active = period === value;
          return (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "0.2rem 0.45rem",
                borderRadius: "0.35rem",
                fontSize: "0.7rem",
                fontFamily: "inherit",
                fontWeight: active ? 700 : 400,
                color: active ? "var(--sv-accent)" : "var(--sv-text-secondary)",
                background: active ? "var(--sv-bg-card)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── States ──────────────────────────────────────────────────────────────── */

  if (!validSymbols.length) {
    return (
      <div>
        {periodBar}
        <div
          className="flex flex-column align-items-center justify-content-center"
          style={{ height, color: "var(--sv-text-muted)" }}
        >
          <i
            className="pi pi-chart-line mb-3"
            style={{ fontSize: "2.5rem", opacity: 0.2 }}
          />
          <span style={{ fontSize: "0.78rem" }}>No symbols selected</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {periodBar}
        <Skeleton height={`${height}px`} />
      </div>
    );
  }

  const hasAnyData = validSymbols.some(
    (sym) => (seriesData[sym]?.length ?? 0) > 0,
  );
  if (!hasAnyData) {
    return (
      <div>
        {periodBar}
        <div
          className="flex align-items-center justify-content-center"
          style={{ height, color: "var(--sv-text-muted)", fontSize: "0.78rem" }}
        >
          Historical data unavailable for&nbsp;
          <strong>{validSymbols.join(", ")}</strong>
        </div>
      </div>
    );
  }

  return (
    <div>
      {periodBar}
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default SymbolHistoricalChart;
