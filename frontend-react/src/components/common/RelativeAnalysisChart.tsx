/**
 * 3-pane Relative/Absolute Analysis chart
 *
 * Pane 0 (top 49%)   — RA Score line with Overbought / Neutral / Oversold plotBands
 * Pane 1 (bottom 49%, left)  — Price Change lines for symbol1 (and symbol2 if present)
 * Pane 2 (bottom 49%, right) — Diff columns, green = positive, red = negative
 *
 * Key-naming convention (mirrors the reference Angular chart):
 *   multiplier ==  1 (absolute)  → combinedKey = `${symbol1}_${symbol2}`
 *   multiplier == -1 (relative)  → combinedKey = `${symbol2}_${symbol1}`
 *   score field : `${combinedKey}_score`
 *   diff  field : `${combinedKey}_diff`
 */
import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type { ChartColors } from "./RelativeAbsoluteShared";

export interface RelativeAnalysisChartProps {
  data: any[];
  symbol1: string;
  /** benchmark / secondary symbol — pass same as symbol1 for absolute analysis */
  symbol2: string;
  /** 1 = absolute, -1 = relative */
  multiplier: 1 | -1;
  cc: ChartColors;
  height?: number;
  /** Label for the score series and yAxis title */
  scoreLabel?: string;
}

const PANE_GAP = 2; // % gap between the two panes

function buildOptions(
  data: any[],
  symbol1: string,
  symbol2: string,
  multiplier: 1 | -1,
  cc: ChartColors,
  height: number,
  scoreLabel: string,
): Highcharts.Options {
  const combinedKey =
    multiplier === -1
      ? `${symbol2}_${symbol1}`
      : `${symbol1}_${symbol2}`;

  const scoreKey = `${combinedKey}_score`;
  const diffKey = `${combinedKey}_diff`;
  const categories = data.map((d) => d.date);
  const tickInterval = Math.max(1, Math.ceil(categories.length / 8));

  /* ── Series data ─────────────────────────────────────────────── */
  const scoreData = data.map((d) => ({
    y: d[scoreKey] != null ? Number(d[scoreKey]) * multiplier : null,
  }));

  const sym1Data = data.map((d) => ({ y: d[symbol1] ?? null }));
  const isRelative = symbol1 !== symbol2;
  const sym2Data = isRelative
    ? data.map((d) => ({ y: d[symbol2] ?? null }))
    : null;

  const diffData = data.map((d) => {
    const raw = d[diffKey];
    const val = raw != null ? Number(raw) * multiplier : null;
    return {
      y: val,
      color:
        val != null
          ? val > 0
            ? "rgba(74,222,128,0.85)"
            : "rgba(239,68,68,0.85)"
          : undefined,
    };
  });

  /* ── plotBands for score pane ────────────────────────────────── */
  const plotBands: Highcharts.YAxisPlotBandsOptions[] = [
    {
      color: {
        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 } as any,
        stops: [
          [0, "rgba(239,68,68,0.28)"],
          [1, "rgba(239,68,68,0.04)"],
        ] as any,
      },
      from: 0.25,
      to: 1,
      label: {
        text: "Overbought",
        style: { color: "#f87171", fontWeight: "bold", fontSize: "10px" },
      },
    },
    {
      color: "rgba(148,163,184,0.07)",
      from: -0.25,
      to: 0.25,
      label: {
        text: "Neutral",
        style: { color: cc.text, fontWeight: "bold", fontSize: "10px" },
        y: -3,
      },
    },
    {
      color: {
        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 } as any,
        stops: [
          [0, "rgba(74,222,128,0.04)"],
          [1, "rgba(74,222,128,0.28)"],
        ] as any,
      },
      from: -1,
      to: -0.25,
      label: {
        text: "Oversold",
        style: { color: "#4ade80", fontWeight: "bold", fontSize: "10px" },
      },
    },
  ];

  /* ── Series list (order matters for zIndex) ──────────────────── */
  const series: Highcharts.SeriesOptionsType[] = [
    // Diff columns → yAxis 2
    {
      type: "column",
      name: `${symbol1}${isRelative ? ` − ${symbol2}` : " Diff"}`,
      yAxis: 2,
      data: diffData as any,
      borderWidth: 0,
      tooltip: { valueDecimals: 2 },
      zIndex: 0,
    },
    // sym1 price line → yAxis 1
    {
      type: "line",
      name: symbol1,
      yAxis: 1,
      data: sym1Data as any,
      color: "#3b82f6",
      lineWidth: 2,
      marker: { enabled: false },
      tooltip: { valueDecimals: 2 },
      zIndex: 2,
    },
    // sym2 price line (only for relative) → yAxis 1
    ...(sym2Data
      ? [
          {
            type: "line" as const,
            name: symbol2,
            yAxis: 1,
            data: sym2Data as any,
            color: "#ef4444",
            lineWidth: 2,
            marker: { enabled: false },
            tooltip: { valueDecimals: 2 },
            zIndex: 2,
          },
        ]
      : []),
    // RA Score line → yAxis 0
    {
      type: "line",
      name: scoreLabel,
      yAxis: 0,
      data: scoreData as any,
      color: "#22c55e",
      lineWidth: 2,
      marker: { enabled: false },
      tooltip: { valueDecimals: 3 },
      zIndex: 1,
    },
  ];

  const topH = `${49}%`;
  const botT = `${51}%`;
  const botH = `${49}%`;

  /* ── Full Highcharts options ─────────────────────────────────── */
  return {
    chart: {
      backgroundColor: cc.bg,
      height,
      style: { fontFamily: "Inter, sans-serif" },
      animation: false,
      marginRight: 60, // room for opposite yAxis labels
    },
    title: { text: "" },
    credits: { enabled: false },
    accessibility: { enabled: false },
    exporting: { enabled: false },

    xAxis: {
      categories,
      tickInterval,
      labels: {
        rotation: -35,
        style: { color: cc.text, fontSize: "10px" },
      },
      lineColor: cc.border,
      tickColor: cc.border,
      crosshair: { color: cc.text, dashStyle: "Dot", width: 1 } as any,
    },

    yAxis: [
      /* ─── [0] RA Score — top pane ─── */
      {
        title: {
          text: scoreLabel,
          style: { color: cc.text, fontSize: "10px" },
          offset: 0,
          x: -30,
        },
        labels: { style: { color: cc.text, fontSize: "10px" }, x: -5 },
        top: "0%",
        height: topH,
        offset: 0,
        lineWidth: 1,
        lineColor: cc.border,
        gridLineColor: cc.grid,
        tickPositions: [-1, -0.75, -0.25, 0, 0.25, 0.75, 1],
        plotBands,
        plotLines: [
          { color: cc.text, dashStyle: "Dot", width: 1, value: 0 },
        ],
      },

      /* ─── [1] Price Change — bottom pane, left ─── */
      {
        title: {
          text: "Price Change (%)",
          style: { color: cc.text, fontSize: "10px" },
          offset: 0,
          x: -30,
        },
        labels: { style: { color: cc.text, fontSize: "10px" }, x: -5 },
        top: botT,
        height: botH,
        offset: 0,
        lineWidth: 1,
        lineColor: cc.border,
        gridLineColor: cc.grid,
        plotLines: [
          { color: cc.text, dashStyle: "Dot", width: 1, value: 0 },
        ],
        tickPositioner(this: any) {
          const max = parseFloat(
            Math.max(
              Math.abs(this.dataMax ?? 0),
              Math.abs(this.dataMin ?? 0),
            ).toFixed(2),
          );
          return [-max, 0, max] as any;
        },
      },

      /* ─── [2] Diff — bottom pane, right (opposite) ─── */
      {
        title: {
          text: "Diff (%)",
          style: { color: cc.text, fontSize: "10px" },
          offset: 0,
          x: 25,
        },
        labels: { style: { color: cc.text, fontSize: "10px" }, x: 5 },
        top: botT,
        height: botH,
        offset: 0,
        lineWidth: 1,
        opposite: true,
        gridLineColor: "transparent",
        tickPositioner(this: any) {
          const max = parseFloat(
            Math.max(
              Math.abs(this.dataMax ?? 0),
              Math.abs(this.dataMin ?? 0),
            ).toFixed(2),
          );
          return [-max, 0, max] as any;
        },
      },
    ],

    legend: {
      enabled: true,
      itemStyle: { color: cc.text, fontSize: "11px" },
      itemHoverStyle: { color: "#ffffff" },
    },

    tooltip: {
      backgroundColor: cc.bg,
      borderColor: cc.border,
      borderRadius: 6,
      style: { color: cc.text, fontSize: "11px" },
      split: true,
      padding: 4,
      shadow: false,
    },

    plotOptions: {
      series: { connectNulls: true },
      column: { borderWidth: 0 },
      line: { marker: { enabled: false } },
    },

    series,
  };
}

/* ── Component ────────────────────────────────────────────────────── */

const RelativeAnalysisChart: React.FC<RelativeAnalysisChartProps> = ({
  data,
  symbol1,
  symbol2,
  multiplier,
  cc,
  height = 500,
  scoreLabel = "RA Score",
}) => {
  const options = useMemo(
    () => buildOptions(data, symbol1, symbol2, multiplier, cc, height, scoreLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, symbol1, symbol2, multiplier, cc, height, scoreLabel],
  );

  if (!data.length) return null;

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default RelativeAnalysisChart;
