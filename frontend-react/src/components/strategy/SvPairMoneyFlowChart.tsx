import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type { MfRowResult } from "./SvMoneyFlowChart";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartColors {
  bg: string;
  grid: string;
  text: string;
  border: string;
  tooltip: string;
}

interface SvPairMoneyFlowChartProps {
  chartData: MfRowResult[];
  cc: ChartColors;
  sym1: string;
  sym2: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SvPairMoneyFlowChart: React.FC<SvPairMoneyFlowChartProps> = ({
  chartData,
  cc,
  sym1,
  sym2,
}) => {
  const chartOptions = useMemo((): Highcharts.Options => {
    if (!chartData || chartData.length === 0) return {};

    const categories = chartData.map((row) => Date.parse(row.date));
    const pairLabel = `${sym1.toUpperCase()}/${sym2.toUpperCase()}`;

    // ── Series data ──────────────────────────────────────────────────────────

    const closeData = chartData.map((row) => ({ y: row.close }));
    const riaData = chartData.map((row) => ({ y: row.ria }));
    const riaTriggerData = chartData.map((row) => ({ y: row.ria_trigger }));
    const riaDiffData = chartData.map((row) => ({
      y: row.ria_diff,
      color: row.ria_diff > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));
    const macdData = chartData.map((row) => ({ y: row.macd }));
    const macdTriggerData = chartData.map((row) => ({ y: row.macd_trigger }));
    const macdDiffData = chartData.map((row) => ({
      y: row.macd_diff,
      color: row.macd_diff > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));
    const stochData = chartData.map((row) => ({ y: row.stoch }));
    const stochTriggerData = chartData.map((row) => ({ y: row.stoch_trigger }));
    const stochDiffData = chartData.map((row) => ({
      y: row.stoch_diff,
      color: row.stoch_diff > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));

    // ── Buy / Sell signals ───────────────────────────────────────────────────

    const buyPts = chartData
      .map((row, i) => (row.buy_rating === 2 ? { x: i, y: row.close } : null))
      .filter(Boolean) as { x: number; y: number }[];

    const sellPts = chartData
      .map((row, i) => (row.sell_rating === 2 ? { x: i, y: row.close } : null))
      .filter(Boolean) as { x: number; y: number }[];

    // ── Tick helpers ─────────────────────────────────────────────────────────

    const symTickPositioner = function (this: Highcharts.Axis): number[] {
      const max = Math.max(
        Math.abs(this.dataMax ?? 0),
        Math.abs(this.dataMin ?? 0),
      );
      const maxInt = Math.round(max) || 1;
      return [-maxInt, 0, maxInt];
    };

    const ratioTickPositioner = function (this: Highcharts.Axis): number[] {
      const positions: number[] = [];
      let tick = Math.floor((this.dataMin ?? 0) * 100) / 100;
      const range = (this.dataMax ?? 0) - (this.dataMin ?? 0);
      const increment = Math.ceil((range * 100) / 6) / 100 || 0.01;
      while (tick - increment <= (this.dataMax ?? 0)) {
        positions.push(Math.round(tick * 100) / 100);
        tick += increment;
      }
      return positions;
    };

    return {
      chart: {
        backgroundColor: cc.bg,
        height: 800,
        style: { fontFamily: "'Inter', 'Segoe UI', sans-serif" },
        animation: false,
        zooming: { type: "x" },
      },
      title: {
        text: `MoneyFlow Indicator (${pairLabel})`,
        style: { color: cc.text, fontSize: "14px", fontWeight: "600" },
      },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: {
        enabled: true,
        itemStyle: { color: cc.text, fontWeight: "500", fontSize: "11px" },
        itemHoverStyle: { color: "#ffffff" },
        backgroundColor: "transparent",
      },
      xAxis: {
        categories: categories as unknown as string[],
        labels: {
          formatter: function (
            this: Highcharts.AxisLabelsFormatterContextObject,
          ) {
            return Highcharts.dateFormat("%b %d, %Y", Number(this.value));
          },
          style: { color: cc.text, fontSize: "10px" },
          rotation: -30,
        },
        gridLineColor: cc.grid,
        lineColor: cc.border,
        tickColor: cc.border,
        crosshair: { color: "rgba(100,200,100,0.4)", width: 1 },
        tickInterval: Math.ceil(chartData.length / 12),
      },
      yAxis: [
        // ── Pane 0: Price Ratio ──────────────────────────────────────────────
        {
          title: {
            text: "Price Ratio",
            style: { color: cc.text },
            offset: 0,
            x: -37,
          },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "0%",
          height: "30%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          tickPositioner: ratioTickPositioner,
        },
        // ── Pane 1: SV MF & Signal (left) ────────────────────────────────────
        {
          title: {
            text: "SV MF & Signal",
            style: { color: cc.text },
            offset: 0,
            x: -37,
          },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "32%",
          height: "18%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          tickPositions: [0, 20, 50, 80, 100],
          plotLines: [
            { value: 20, color: cc.border, width: 1, dashStyle: "Dash" },
            { value: 80, color: cc.border, width: 1, dashStyle: "Dash" },
          ],
        },
        // ── Pane 1: SV MF Diff (right) ───────────────────────────────────────
        {
          title: {
            text: "SV MF Diff",
            style: { color: cc.text },
            offset: 0,
            x: 35,
          },
          labels: { offset: 0, x: 5, style: { color: cc.text } },
          top: "32%",
          height: "18%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: "transparent",
          opposite: true,
          tickPositions: [-50, 0, 50],
        },
        // ── Pane 2: MACD & Signal (left) ─────────────────────────────────────
        {
          title: {
            text: "MACD & Signal",
            style: { color: cc.text },
            offset: 0,
            x: -37,
          },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "52%",
          height: "18%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          plotLines: [{ value: 0, color: cc.border, width: 1 }],
          tickPositioner: symTickPositioner,
        },
        // ── Pane 2: MACD Diff (right) ─────────────────────────────────────────
        {
          title: {
            text: "MACD Diff",
            style: { color: cc.text },
            offset: 0,
            x: 35,
          },
          labels: { offset: 0, x: 5, style: { color: cc.text } },
          top: "52%",
          height: "18%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: "transparent",
          opposite: true,
          tickPositioner: symTickPositioner,
        },
        // ── Pane 3: Stoch & Signal (left) ────────────────────────────────────
        {
          title: {
            text: "Stoch & Signal",
            style: { color: cc.text },
            offset: 0,
            x: -37,
          },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "72%",
          height: "18%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          tickPositions: [0, 20, 50, 80, 100],
          plotLines: [
            { value: 20, color: cc.border, width: 1, dashStyle: "Dash" },
            { value: 80, color: cc.border, width: 1, dashStyle: "Dash" },
          ],
        },
        // ── Pane 3: Stoch Diff (right) ────────────────────────────────────────
        {
          title: {
            text: "Stochastic Diff",
            style: { color: cc.text },
            offset: 0,
            x: 35,
          },
          labels: { offset: 0, x: 5, style: { color: cc.text } },
          top: "72%",
          height: "18%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: "transparent",
          opposite: true,
          tickPositions: [-50, 0, 50],
        },
      ] as Highcharts.YAxisOptions[],

      tooltip: {
        backgroundColor: cc.tooltip,
        borderColor: cc.border,
        borderWidth: 1,
        borderRadius: 6,
        shadow: false,
        padding: 4,
        split: true,
        xDateFormat: "%b %d, %Y",
        style: { color: cc.text, fontSize: "11px" },
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          const idx = this.x as number;
          if (idx >= 0 && idx < chartData.length) {
            return chartData[idx].date;
          }
          return Highcharts.dateFormat("%b %d, %Y", Number(this.x));
        },
      },

      plotOptions: {
        series: {
          connectNulls: true,
          animation: false,
          states: { hover: { lineWidthPlus: 0 } },
          dataGrouping: { enabled: false },
        },
        column: { borderWidth: 0, pointPadding: 0, groupPadding: 0.05 },
        line: { lineWidth: 1.5 },
        scatter: { marker: { states: { hover: { enabled: true } } } },
      },

      series: [
        // ── Price Ratio line (Pane 0, y0) ────────────────────────────────────
        {
          id: "close",
          type: "line",
          name: `${pairLabel} Ratio`,
          data: closeData,
          yAxis: 0,
          lineWidth: 2,
          color: "#60a5fa",
          marker: { enabled: false },
          tooltip: { valueDecimals: 4 },
          zIndex: 5,
        },
        // ── Buy / Sell signals (Pane 0) ───────────────────────────────────────
        {
          type: "scatter",
          name: "Buy",
          data: buyPts,
          yAxis: 0,
          marker: {
            symbol: "triangle",
            radius: 7,
            fillColor: "#22c55e",
            lineColor: "#00ff88",
            lineWidth: 1,
          },
          tooltip: { pointFormat: "<b>BUY</b> @ {point.y:.4f}" },
          zIndex: 10,
          showInLegend: buyPts.length > 0,
        },
        {
          type: "scatter",
          name: "Sell",
          data: sellPts,
          yAxis: 0,
          marker: {
            symbol: "triangle-down",
            radius: 7,
            fillColor: "#ef4444",
            lineColor: "#ff4466",
            lineWidth: 1,
          },
          tooltip: { pointFormat: "<b>SELL</b> @ {point.y:.4f}" },
          zIndex: 10,
          showInLegend: sellPts.length > 0,
        },
        // ── SV MF lines (Pane 1 left, y1) ────────────────────────────────────
        {
          id: "ria",
          type: "line",
          name: "SV MF",
          data: riaData,
          yAxis: 1,
          lineWidth: 2,
          color: "#dd7612",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 2,
        },
        {
          id: "ria_trigger",
          type: "line",
          name: "SV MF Signal",
          data: riaTriggerData,
          yAxis: 1,
          lineWidth: 2,
          color: "#782ca8",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 3,
        },
        // ── SV MF Diff column (Pane 1 right, y2) ─────────────────────────────
        {
          id: "ria_diff",
          type: "column",
          name: "SV MF Diff",
          data: riaDiffData,
          yAxis: 2,
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 1,
        },
        // ── MACD lines (Pane 2 left, y3) ─────────────────────────────────────
        {
          id: "macd",
          type: "line",
          name: "MACD",
          data: macdData,
          yAxis: 3,
          lineWidth: 2,
          color: "#38bdf8",
          marker: { enabled: false },
          tooltip: { valueDecimals: 4 },
          zIndex: 2,
        },
        {
          id: "macd_trigger",
          type: "line",
          name: "MACD Signal",
          data: macdTriggerData,
          yAxis: 3,
          lineWidth: 2,
          color: "#fb923c",
          marker: { enabled: false },
          tooltip: { valueDecimals: 4 },
          zIndex: 3,
        },
        // ── MACD Diff column (Pane 2 right, y4) ──────────────────────────────
        {
          id: "macd_diff",
          type: "column",
          name: "MACD Diff",
          data: macdDiffData,
          yAxis: 4,
          marker: { enabled: false },
          tooltip: { valueDecimals: 4 },
          zIndex: 1,
        },
        // ── Stoch lines (Pane 3 left, y5) ────────────────────────────────────
        {
          id: "stoch",
          type: "line",
          name: "Stochastic",
          data: stochData,
          yAxis: 5,
          lineWidth: 2,
          color: "#a78bfa",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 2,
        },
        {
          id: "stoch_trigger",
          type: "line",
          name: "Stoch Signal",
          data: stochTriggerData,
          yAxis: 5,
          lineWidth: 2,
          color: "#f472b6",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 3,
        },
        // ── Stoch Diff column (Pane 3 right, y6) ─────────────────────────────
        {
          id: "stoch_diff",
          type: "column",
          name: "Stoch Diff",
          data: stochDiffData,
          yAxis: 6,
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 1,
        },
      ] as Highcharts.SeriesOptionsType[],

      responsive: {
        rules: [
          {
            condition: { maxWidth: 768 },
            chartOptions: { chart: { height: 650 } },
          },
        ],
      },
    };
  }, [chartData, cc, sym1, sym2]);

  return (
    <div
      className="border-round-lg overflow-hidden"
      style={{ background: cc.bg, boxShadow: "var(--sv-shadow-md)" }}
    >
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
};

export default SvPairMoneyFlowChart;
