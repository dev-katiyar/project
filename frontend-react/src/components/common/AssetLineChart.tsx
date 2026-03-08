import React, { useState, useEffect, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

/* ── Chart theme (mirrors DashboardPage palette) ────────────────────────── */

interface ChartTheme {
  bg: string;
  grid: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  accent: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    bg: "transparent", grid: "#1c2840", label: "#7a8da8",
    tooltipBg: "#0d1220", tooltipBorder: "#1c2840", tooltipText: "#e8edf5",
    accent: "#f5a623",
  },
  dim: {
    bg: "transparent", grid: "#2a3244", label: "#8899b0",
    tooltipBg: "#1a2030", tooltipBorder: "#2a3244", tooltipText: "#dde4f0",
    accent: "#f5a623",
  },
  light: {
    bg: "transparent", grid: "#e5e9f0", label: "#6b7a8d",
    tooltipBg: "#ffffff", tooltipBorder: "#d0d7e2", tooltipText: "#1a2030",
    accent: "#e07b00",
  },
};

/* Distinct series colors (work across all themes) */
const SERIES_COLORS = [
  "#f5a623", "#38bdf8", "#a78bfa", "#34d399", "#f87171",
  "#fb923c", "#e879f9", "#facc15", "#4ade80", "#60a5fa",
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function normalizeResponse(raw: unknown[]): [number, number][] {
  if (!Array.isArray(raw) || !raw.length) return [];
  const first = raw[0] as Record<string, unknown>;
  if (Array.isArray(first)) return raw as [number, number][];
  if (first.date != null && first.close != null)
    return raw.map((d: any) => [new Date(d.date).getTime(), parseFloat(d.close)]);
  if (first.t != null && first.c != null)
    return raw.map((d: any) => [d.t * 1000, parseFloat(d.c)]);
  if (first.timestamp != null && first.close != null)
    return raw.map((d: any) => [d.timestamp * 1000, parseFloat(d.close)]);
  return [];
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface AssetLineChartProps {
  /** Symbols to plot. Pass an empty array or null-ish values to show empty state. */
  symbols: (string | null | undefined)[];
  /** Chart height in px (default 270) */
  height?: number;
  /** Show gradient fill under each series (default true) */
  filled?: boolean;
}

const AssetLineChart: React.FC<AssetLineChartProps> = ({
  symbols,
  height = 270,
  filled = true,
}) => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme];

  const validSymbols = useMemo(
    () => symbols.filter((s): s is string => !!s),
    [symbols],
  );

  // Map of symbol → data points
  const [seriesData, setSeriesData] = useState<Record<string, [number, number][]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!validSymbols.length) {
      setSeriesData({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSeriesData({});

    Promise.all(
      validSymbols.map((sym) =>
        api
          .get("/symbol/historical", { params: { tickers: sym } })
          .then(({ data: raw }) => ({ sym, pts: normalizeResponse(Array.isArray(raw) ? raw : []) }))
          .catch(() => ({ sym, pts: [] as [number, number][] })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, [number, number][]> = {};
      for (const { sym, pts } of results) map[sym] = pts;
      setSeriesData(map);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [validSymbols.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo((): Highcharts.Options => ({
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
        name: sym,
        data: seriesData[sym] ?? [],
        color,
        fillColor: filled
          ? {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [[0, `${color}44`], [1, `${color}00`]],
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
  }), [seriesData, ct, validSymbols, height, filled]);

  /* ── Empty / loading / no-data states ─────────────────────────────────── */

  if (!validSymbols.length) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center"
        style={{ height, color: "var(--sv-text-muted)" }}
      >
        <i className="pi pi-chart-line mb-3" style={{ fontSize: "2.5rem", opacity: 0.2 }} />
        <span style={{ fontSize: "0.78rem" }}>No symbols selected</span>
      </div>
    );
  }

  if (loading) return <Skeleton height={`${height}px`} />;

  const hasAnyData = validSymbols.some((sym) => (seriesData[sym]?.length ?? 0) > 0);
  if (!hasAnyData) {
    return (
      <div
        className="flex align-items-center justify-content-center"
        style={{ height, color: "var(--sv-text-muted)", fontSize: "0.78rem" }}
      >
        Historical data unavailable for&nbsp;
        <strong>{validSymbols.join(", ")}</strong>
      </div>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default AssetLineChart;
