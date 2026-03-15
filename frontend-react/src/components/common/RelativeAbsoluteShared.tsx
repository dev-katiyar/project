/**
 * Shared constants, types, helpers, and sub-components used by
 * RelativeAbsoluteSectorsPage and RelativeAbsoluteHoldingsPanel.
 */
import React from "react";
import Highcharts from "highcharts";
import type { ThemeName } from "@/contexts/ThemeContext";

// ─── Constants ───────────────────────────────────────────────────────────────

export const CHART_COLORS: Record<
  ThemeName,
  { bg: string; grid: string; text: string; border: string }
> = {
  dark: { bg: "#121a2e", grid: "#1c2840", text: "#7a8da8", border: "#1c2840" },
  dim: { bg: "#1c2945", grid: "#283a5c", text: "#7a92b8", border: "#283a5c" },
  light: { bg: "#ffffff", grid: "#dfe7f5", text: "#4a5e78", border: "#c8d4ec" },
};

export const SERIES_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#6366f1",
  "#a855f7",
  "#0ea5e9",
  "#d946ef",
  "#fb923c",
];

export const SCORE_ZONES = [
  {
    label: "Very\nOversold",
    from: -1,
    to: -0.75,
    bg: "#052e16",
    border: "#14532d",
    textColor: "#4ade80",
  },
  {
    label: "Mod.\nOversold",
    from: -0.75,
    to: -0.25,
    bg: "#14532d",
    border: "#166534",
    textColor: "#86efac",
  },
  {
    label: "Neutral",
    from: -0.25,
    to: 0.25,
    bg: "#1e293b",
    border: "#334155",
    textColor: "#94a3b8",
  },
  {
    label: "Mod.\nOverbought",
    from: 0.25,
    to: 0.75,
    bg: "#7f1d1d",
    border: "#991b1b",
    textColor: "#fca5a5",
  },
  {
    label: "Very\nOverbought",
    from: 0.75,
    to: 1,
    bg: "#450a0a",
    border: "#7f1d1d",
    textColor: "#f87171",
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DataPoint {
  date: string;
  absolute_score: number;
  relative_score: number;
  symbol: string;
}

export type RelAbsOutput = Record<string, DataPoint[]>;

export type ChartColors = { bg: string; grid: string; text: string; border: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getScoreBg(value: number): string {
  if (value <= 0) {
    const intensity = Math.min(Math.abs(value), 1);
    const g = Math.round(100 + intensity * 120);
    return `rgb(0,${g},60)`;
  }
  const intensity = Math.min(value, 1);
  const r = Math.round(150 + intensity * 105);
  return `rgb(${r},25,25)`;
}

export function getScoreZoneLabel(score: number): string {
  if (score <= -0.75) return "Very Oversold";
  if (score <= -0.25) return "Mod. Oversold";
  if (Math.abs(score) < 0.25) return "Neutral";
  if (score < 0.75) return "Mod. Overbought";
  return "Very Overbought";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

export const ScoreBadge: React.FC<{
  value: number;
  onClick?: () => void;
  icon?: string;
}> = ({ value, onClick, icon = "pi-chart-line" }) => (
  <button
    onClick={onClick}
    title={getScoreZoneLabel(value)}
    className="inline-flex align-items-center justify-content-between border-none border-round font-bold"
    style={{
      gap: "0.35rem",
      padding: "0.22rem 0.55rem",
      background: getScoreBg(value),
      color: "#fff",
      fontSize: "0.78rem",
      minWidth: "5.2rem",
      letterSpacing: "0.02em",
      transition: "opacity 0.15s, transform 0.1s",
      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      cursor: onClick ? "pointer" : "default",
    }}
    onMouseEnter={(e) => {
      if (onClick)
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.opacity = "1";
    }}
  >
    <span>{value.toFixed(3)}</span>
    <i
      className={`pi ${icon}`}
      style={{ fontSize: "0.65rem", opacity: 0.75 }}
    />
  </button>
);

export const QuadrantTag: React.FC<{
  label: string;
  color: string;
  position: "tl" | "tr" | "bl" | "br";
}> = ({ label, color, position }) => {
  const isTop = position.startsWith("t");
  const isLeft = position.endsWith("l");
  return (
    <div
      style={{
        position: "absolute",
        top: isTop ? "0.5rem" : undefined,
        bottom: isTop ? undefined : "0.5rem",
        left: isLeft ? "1rem" : undefined,
        right: isLeft ? undefined : "1rem",
        fontSize: "0.65rem",
        fontWeight: 700,
        color,
        opacity: 0.55,
        pointerEvents: "none",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        lineHeight: 1.3,
        textAlign: isLeft ? "left" : "right",
      }}
    >
      {label}
    </div>
  );
};

// ─── Scatter chart builder ────────────────────────────────────────────────────

export function buildScatterChartOptions(
  relAbsOutput: RelAbsOutput,
  rows: Array<{ symbol: string; isInChart: boolean }>,
  showTail: boolean,
  tailLen: number,
  cc: ChartColors,
): Highcharts.Options {
  const visible = new Set(rows.filter((r) => r.isInChart).map((r) => r.symbol));
  const pts = showTail ? tailLen * 5 : 1;

  const series: Highcharts.SeriesLineOptions[] = Object.keys(relAbsOutput).map(
    (sym, idx) => {
      const sorted = [...relAbsOutput[sym]].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const dps = sorted.slice(Math.max(0, sorted.length - pts));
      return {
        type: "line",
        name: sym,
        visible: visible.has(sym),
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        lineWidth: 1.75,
        marker: {
          enabled: false,
          states: { hover: { enabled: true, radius: 4 } },
        },
        data: dps.map((dp, i) => ({
          x: dp.absolute_score,
          y: dp.relative_score,
          name: dp.date,
          ...(i === dps.length - 1 && {
            marker: {
              enabled: true,
              radius: 6,
              fillColor: SERIES_COLORS[idx % SERIES_COLORS.length],
              lineColor: "#fff",
              lineWidth: 1.5,
              symbol: "circle",
            },
            dataLabels: {
              enabled: true,
              formatter(this: any) {
                return `<b>${sym}</b>`;
              },
              style: {
                fontSize: "10px",
                fontWeight: "700",
                color: SERIES_COLORS[idx % SERIES_COLORS.length],
                textOutline: `2px ${cc.bg}`,
              },
            },
          }),
        })),
      };
    },
  );

  return {
    chart: {
      type: "line",
      backgroundColor: cc.bg,
      plotBackgroundColor: {
        linearGradient: { x1: 0, y1: 1, x2: 1, y2: 0 },
        stops: [
          [0, "rgba(34,197,94,0.22)"],
          [0.45, "rgba(0,0,0,0)"],
          [0.55, "rgba(0,0,0,0)"],
          [1, "rgba(239,68,68,0.22)"],
        ],
      },
      plotBorderWidth: 1,
      plotBorderColor: cc.grid,
      height: "100%",
      style: { fontFamily: "Inter, sans-serif" },
      animation: { duration: 300 },
      zooming: { type: "xy" },
    } as any,
    title: { text: "" },
    credits: { enabled: false },
    legend: { enabled: false },
    accessibility: { enabled: false },
    xAxis: {
      min: -1,
      max: 1,
      gridLineWidth: 1,
      gridLineColor: cc.grid,
      lineColor: cc.border,
      tickColor: cc.border,
      labels: {
        format: "{value:.1f}",
        style: { color: cc.text, fontSize: "11px" },
      },
      title: {
        text: "← Oversold  |  Absolute Score  |  Overbought →",
        style: { color: cc.text, fontWeight: "600", fontSize: "12px" },
      },
      plotBands: [
        {
          from: -1,
          to: 0,
          color: "transparent",
          label: {
            text: "OVERSOLD",
            style: {
              color: "rgba(74,222,128,0.5)",
              fontSize: "10px",
              fontWeight: "700",
            },
            align: "left",
            verticalAlign: "bottom",
            x: 10,
            y: -8,
          },
        },
        {
          from: 0,
          to: 1,
          color: "transparent",
          label: {
            text: "OVERBOUGHT",
            style: {
              color: "rgba(248,113,113,0.5)",
              fontSize: "10px",
              fontWeight: "700",
            },
            align: "right",
            x: -10,
            y: 18,
          },
        },
      ],
      plotLines: [
        {
          color: cc.text,
          dashStyle: "Dot",
          width: 1.5,
          value: 0,
          zIndex: 3,
        },
      ],
    },
    yAxis: {
      min: -1,
      max: 1,
      startOnTick: false,
      endOnTick: false,
      gridLineWidth: 1,
      gridLineColor: cc.grid,
      lineColor: cc.border,
      labels: {
        format: "{value:.1f}",
        style: { color: cc.text, fontSize: "11px" },
      },
      title: {
        text: "← Oversold  |  Relative Score (vs SPY)  |  Overbought →",
        style: { color: cc.text, fontWeight: "600", fontSize: "12px" },
      },
      plotBands: [],
      plotLines: [
        {
          color: cc.text,
          dashStyle: "Dot",
          width: 1.5,
          value: 0,
          zIndex: 3,
        },
      ],
    },
    tooltip: {
      backgroundColor: cc.bg,
      borderColor: cc.border,
      borderRadius: 8,
      style: { color: cc.text, fontSize: "12px" },
      useHTML: true,
      formatter(this: any) {
        const color = this.series.color;
        return `
          <div style="padding:0.5rem 0.6rem;min-width:180px">
            <div style="font-weight:700;margin-bottom:0.3rem;color:${color}">
              ${this.series.name}
            </div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:0.4rem">${this.point.name}</div>
            <div style="display:flex;justify-content:space-between;gap:1rem">
              <span>Absolute:</span>
              <b style="color:${getScoreBg(this.point.x)}">&nbsp;${this.point.x.toFixed(3)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1rem">
              <span>Relative:</span>
              <b>&nbsp;${this.point.y.toFixed(3)}</b>
            </div>
          </div>`;
      },
    },
    plotOptions: {
      series: {
        turboThreshold: 1000,
        states: { inactive: { opacity: 0.25 } },
        animation: { duration: 250 },
      },
    },
    series,
  };
}
