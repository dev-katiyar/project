import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MfRowResult {
  actualclose: number;
  buy_rating: number;
  close: number;
  cmf: number;
  date: string;
  index: number;
  macd: number;
  macd_diff: number;
  macd_trigger: number;
  ria: number;
  ria_diff: number;
  ria_trigger: number;
  sell_rating: number;
  stoch: number;
  stoch_diff: number;
  stoch_trigger: number;
  symbol: string;
  x?: number;
}

interface ChartColors {
  bg: string;
  grid: string;
  text: string;
  border: string;
  tooltip: string;
}

interface SvMoneyFlowChartProps {
  chartData: MfRowResult[];
  cc: ChartColors;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SvMoneyFlowChart: React.FC<SvMoneyFlowChartProps> = ({
  chartData,
  cc,
}) => {
  const chartOptions = useMemo((): Highcharts.Options => {
    if (!chartData || chartData.length === 0) return {};

    const categories = chartData.map((row) => Date.parse(row.date));
    const symbol = chartData[0]?.symbol ?? "";

    // ── Series data ────────────────────────────────────────────────────────

    const closeData = chartData.map((row) => ({ y: row.close }));
    const riaData = chartData.map((row) => ({ y: row.ria }));
    const riaTriggerData = chartData.map((row) => ({ y: row.ria_trigger }));
    const riaDiffData = chartData.map((row) => ({
      y: row.ria_diff,
      color:
        row.ria_diff > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));
    const macdData = chartData.map((row) => ({ y: row.macd }));
    const macdTriggerData = chartData.map((row) => ({ y: row.macd_trigger }));
    const macdDiffData = chartData.map((row) => ({
      y: row.macd_diff,
      color:
        row.macd_diff > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));
    const cmfData = chartData.map((row) => ({
      y: row.cmf ?? 0,
      color:
        (row.cmf ?? 0) > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));
    const stochData = chartData.map((row) => ({ y: row.stoch }));
    const stochTriggerData = chartData.map((row) => ({
      y: row.stoch_trigger,
    }));
    const stochDiffData = chartData.map((row) => ({
      y: row.stoch_diff,
      color:
        row.stoch_diff > 0 ? "rgb(51, 157, 51)" : "rgba(255, 0, 0, 0.9)",
    }));

    // ── Buy / Sell signal scatter points ───────────────────────────────────
    // Flags require the Highcharts Stock module; we use scatter triangle
    // markers placed on the close-price pane instead.
    const buyPts = chartData
      .map((row, i) =>
        row.buy_rating === 2 ? { x: i, y: row.close } : null,
      )
      .filter(Boolean) as { x: number; y: number }[];

    const sellPts = chartData
      .map((row, i) =>
        row.sell_rating === 2 ? { x: i, y: row.close } : null,
      )
      .filter(Boolean) as { x: number; y: number }[];

    // ── Tick helper ────────────────────────────────────────────────────────
    const symTickPositioner = function (
      this: Highcharts.Axis,
    ): number[] {
      const max = Math.max(
        Math.abs(this.dataMax ?? 0),
        Math.abs(this.dataMin ?? 0),
      );
      const maxInt = Math.round(max) || 1;
      return [-maxInt, 0, maxInt];
    };

    return {
      chart: {
        backgroundColor: cc.bg,
        height: 900,
        style: { fontFamily: "'Inter', 'Segoe UI', sans-serif" },
        animation: false,
        zooming: { type: "x" },
      },
      title: {
        text: `MoneyFlow Indicator ( ${symbol} )`,
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
        // Pass timestamps as categories so series data can use {y} only
        categories: categories as unknown as string[],
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
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
        // ── Pane 0: Close Price ──────────────────────────────────────────
        {
          title: { text: "Close Price", style: { color: cc.text }, offset: 0, x: -37 },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "0%",
          height: "32%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          tickPositioner: function (this: Highcharts.Axis) {
            const positions: number[] = [];
            let tick = Math.floor(this.dataMin ?? 0);
            const range = (this.dataMax ?? 0) - (this.dataMin ?? 0);
            const increment = Math.ceil(range / 6) || 1;
            while (tick - increment <= (this.dataMax ?? 0)) {
              positions.push(tick);
              tick += increment;
            }
            return positions;
          },
        },
        // ── Pane 1: SV MF Ind & Signal (left) ───────────────────────────
        {
          title: { text: "SV MF & Signal", style: { color: cc.text }, offset: 0, x: -37 },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "34%",
          height: "15%",
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
        // ── Pane 1: SV MF Diff (right / opposite) ───────────────────────
        {
          title: { text: "SV MF Diff", style: { color: cc.text }, offset: 0, x: 35 },
          labels: { offset: 0, x: 5, style: { color: cc.text } },
          top: "34%",
          height: "15%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: "transparent",
          opposite: true,
          tickPositions: [-50, 0, 50],
        },
        // ── Pane 2: MACD & Signal (left) ────────────────────────────────
        {
          title: { text: "MACD & Signal", style: { color: cc.text }, offset: 0, x: -37 },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "51%",
          height: "15%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          plotLines: [{ value: 0, color: cc.border, width: 1 }],
          tickPositioner: symTickPositioner,
        },
        // ── Pane 2: MACD Diff (right / opposite) ────────────────────────
        {
          title: { text: "MACD Diff", style: { color: cc.text }, offset: 0, x: 35 },
          labels: { offset: 0, x: 5, style: { color: cc.text } },
          top: "51%",
          height: "15%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: "transparent",
          opposite: true,
          tickPositioner: symTickPositioner,
        },
        // ── Pane 3: Money Flow / CMF (left) ─────────────────────────────
        {
          title: { text: "Money Flow", style: { color: cc.text }, offset: 0, x: -37 },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "68%",
          height: "15%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          plotLines: [{ value: 0, color: cc.border, width: 1 }],
          tickPositioner: function (this: Highcharts.Axis) {
            const rawMax = Math.max(
              Math.abs(this.dataMax ?? 0),
              Math.abs(this.dataMin ?? 0),
            );
            const max = parseFloat(rawMax.toFixed(2)) || 0.1;
            return [-max, -0.05, 0, 0.05, max];
          },
        },
        // ── Pane 3: empty opposite ───────────────────────────────────────
        {
          title: { text: "", offset: 0, x: 35 },
          labels: { enabled: false },
          top: "68%",
          height: "15%",
          offset: 0,
          lineWidth: 0,
          gridLineColor: "transparent",
          opposite: true,
        },
        // ── Pane 4: Stoch & Signal (left) ───────────────────────────────
        {
          title: { text: "Stoch & Signal", style: { color: cc.text }, offset: 0, x: -37 },
          labels: { offset: 0, x: -5, style: { color: cc.text } },
          top: "85%",
          height: "15%",
          offset: 0,
          lineWidth: 2,
          lineColor: cc.border,
          gridLineColor: cc.grid,
          tickPositions: [0, 50, 100],
          plotLines: [
            { value: 20, color: cc.border, width: 1, dashStyle: "Dash" },
            { value: 80, color: cc.border, width: 1, dashStyle: "Dash" },
          ],
        },
        // ── Pane 4: Stoch Diff (right / opposite) ───────────────────────
        {
          title: { text: "Stochastic Diff", style: { color: cc.text }, offset: 0, x: 35 },
          labels: { offset: 0, x: 5, style: { color: cc.text } },
          top: "85%",
          height: "15%",
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
        // ── Lines (Pane 0) ──────────────────────────────────────────────
        {
          id: "close",
          type: "line",
          name: "Close Price",
          data: closeData,
          yAxis: 0,
          lineWidth: 2,
          color: "#60a5fa",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 5,
        },
        // ── Buy / Sell scatter signals (Pane 0) ─────────────────────────
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
          tooltip: { pointFormat: "<b>BUY</b> @ {point.y:.2f}" },
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
          tooltip: { pointFormat: "<b>SELL</b> @ {point.y:.2f}" },
          zIndex: 10,
          showInLegend: sellPts.length > 0,
        },
        // ── SV MF Indicator lines (Pane 1 left, y1) ─────────────────────
        {
          id: "ria",
          type: "line",
          name: "SV MF Ind",
          data: riaData,
          yAxis: 1,
          lineWidth: 2,
          color: "#006400",
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
          color: "#3366ff",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 3,
        },
        // ── SV MF Diff column (Pane 1 right, y2) ────────────────────────
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
        // ── MACD lines (Pane 2 left, y3) ────────────────────────────────
        {
          id: "macd",
          type: "line",
          name: "MACD",
          data: macdData,
          yAxis: 3,
          lineWidth: 2,
          color: "#3385ff",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
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
          tooltip: { valueDecimals: 2 },
          zIndex: 3,
        },
        // ── MACD Diff column (Pane 2 right, y4) ─────────────────────────
        {
          id: "macd_diff",
          type: "column",
          name: "MACD Diff",
          data: macdDiffData,
          yAxis: 4,
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 1,
        },
        // ── CMF column (Pane 3 left, y5) ────────────────────────────────
        {
          id: "cmf",
          type: "column",
          name: "Money Flow",
          data: cmfData,
          yAxis: 5,
          marker: { enabled: false },
          tooltip: { valueDecimals: 4 },
          zIndex: 1,
        },
        // ── Stochastic lines (Pane 4 left, y7) ──────────────────────────
        {
          id: "stoch",
          type: "line",
          name: "Stochastic",
          data: stochData,
          yAxis: 7,
          lineWidth: 2,
          color: "#802000",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 2,
        },
        {
          id: "stoch_trigger",
          type: "line",
          name: "Stochastic Signal",
          data: stochTriggerData,
          yAxis: 7,
          lineWidth: 2,
          color: "#ff6633",
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 3,
        },
        // ── Stoch Diff column (Pane 4 right, y8) ────────────────────────
        {
          id: "stoch_diff",
          type: "column",
          name: "Stochastic Diff",
          data: stochDiffData,
          yAxis: 8,
          marker: { enabled: false },
          tooltip: { valueDecimals: 2 },
          zIndex: 1,
        },
      ] as Highcharts.SeriesOptionsType[],

      responsive: {
        rules: [
          {
            condition: { maxWidth: 768 },
            chartOptions: { chart: { height: 700 } },
          },
        ],
      },
    };
  }, [chartData, cc]);

  return (
    <div
      className="border-round-lg overflow-hidden"
      style={{ background: cc.bg, boxShadow: "var(--sv-shadow-md)" }}
    >
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
};

export default SvMoneyFlowChart;
