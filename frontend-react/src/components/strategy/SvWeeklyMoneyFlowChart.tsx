import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklyMfRowResult {
  actualclose: number;
  buy_rating: number;
  close: number;
  cmf: number;
  date: string;
  macd: number;
  macd1: number;
  macd1_diff: number;
  macd1_trigger: number;
  macd2: number;
  macd2_diff: number;
  macd2_trigger: number;
  macd_diff: number;
  macd_trigger: number;
  ria: number;
  ria_diff: number;
  ria_trigger: number;
  rsi14: number;
  sell_rating: number;
  sma13: number;
  sma34: number;
  sma_diff: number;
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

interface SvWeeklyMoneyFlowChartProps {
  chartData: WeeklyMfRowResult[];
  cc: ChartColors;
  sma1Period?: number;
  sma2Period?: number;
  rsiPeriod?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

// Chart layout (5 panes, pixel-based):
// Pane 0 – Price:          top=35,   height=200
// Pane 1 – WMA:            top=255,  height=200  (yAxis 1 left, yAxis 2 right)
// Pane 2 – MACD(12,26,12): top=475,  height=200  (yAxis 3 left, yAxis 4 right)
// Pane 3 – MACD(24,54,21): top=695,  height=200  (yAxis 5 left, yAxis 6 right)
// Pane 4 – RSI:            top=915,  height=200
// Total chart height: ~1155px

const PANE_HEIGHT = 200;
const PANE_GAP = 20;
const TOP_OFFSET = 35;

function paneTop(pane: number) {
  return TOP_OFFSET + pane * (PANE_HEIGHT + PANE_GAP);
}

const CHART_HEIGHT =
  TOP_OFFSET + 5 * PANE_HEIGHT + 4 * PANE_GAP + 60; // ~1155

const SvWeeklyMoneyFlowChart: React.FC<SvWeeklyMoneyFlowChartProps> = ({
  chartData,
  cc,
  sma1Period = 13,
  sma2Period = 34,
  rsiPeriod = 14,
}) => {
  const chartOptions = useMemo((): Highcharts.Options => {
    if (!chartData || chartData.length === 0) return {};

    const categories = chartData.map((row) => Date.parse(row.date));
    const symbol = chartData[0]?.symbol ?? "";

    // ── Pane 0: Price ────────────────────────────────────────────────────────
    const closeData = chartData.map((row) => ({ y: row.close }));

    const buyScatterData: [number, number][] = [];
    const sellScatterData: [number, number][] = [];
    chartData.forEach((row, i) => {
      const ts = categories[i];
      if (row.buy_rating > 0) buyScatterData.push([ts, row.close]);
      if (row.sell_rating > 0) sellScatterData.push([ts, row.close]);
    });

    // ── Pane 1: WMA ──────────────────────────────────────────────────────────
    const sma13Data = chartData.map((row) => ({ y: row.sma13 }));
    const sma34Data = chartData.map((row) => ({ y: row.sma34 }));
    const smaDiffData = chartData.map((row) => ({
      y: row.sma_diff,
      color: row.sma_diff >= 0 ? "rgb(51,157,51)" : "rgba(255,0,0,0.9)",
    }));

    // ── Pane 2: MACD1 ────────────────────────────────────────────────────────
    const macd1Data = chartData.map((row) => ({ y: row.macd1 }));
    const macd1TriggerData = chartData.map((row) => ({ y: row.macd1_trigger }));
    const macd1DiffData = chartData.map((row) => ({
      y: row.macd1_diff,
      color: row.macd1_diff >= 0 ? "rgb(51,157,51)" : "rgba(255,0,0,0.9)",
    }));

    // ── Pane 3: MACD2 ────────────────────────────────────────────────────────
    const macd2Data = chartData.map((row) => ({ y: row.macd2 }));
    const macd2TriggerData = chartData.map((row) => ({ y: row.macd2_trigger }));
    const macd2DiffData = chartData.map((row) => ({
      y: row.macd2_diff,
      color: row.macd2_diff >= 0 ? "rgb(51,157,51)" : "rgba(255,0,0,0.9)",
    }));

    // ── Pane 4: RSI ──────────────────────────────────────────────────────────
    const rsiData = chartData.map((row) => ({ y: row.rsi14 }));

    const axisBase = {
      gridLineColor: cc.grid,
      lineColor: cc.border,
      tickColor: cc.border,
      labels: { style: { color: cc.text, fontSize: "10px" }, x: -4 },
      title: { text: "" },
      offset: 0,
      lineWidth: 1,
    };

    const yAxes: Highcharts.YAxisOptions[] = [
      // 0 – Price (pane 0, left)
      {
        ...axisBase,
        top: paneTop(0),
        height: PANE_HEIGHT,
        opposite: false,
        title: { text: `${symbol} Price`, style: { color: cc.text, fontSize: "10px" } },
      },
      // 1 – WMA lines (pane 1, left)
      {
        ...axisBase,
        top: paneTop(1),
        height: PANE_HEIGHT,
        opposite: false,
        title: { text: `WMA(${sma1Period}) & WMA(${sma2Period})`, style: { color: cc.text, fontSize: "10px" } },
      },
      // 2 – WMA diff columns (pane 1, right)
      {
        ...axisBase,
        top: paneTop(1),
        height: PANE_HEIGHT,
        opposite: true,
        labels: { ...axisBase.labels, x: 4 },
        plotLines: [{ value: 0, color: cc.border, width: 1 }],
      },
      // 3 – MACD1 lines (pane 2, left)
      {
        ...axisBase,
        top: paneTop(2),
        height: PANE_HEIGHT,
        opposite: false,
        title: { text: "MACD(12,26,12)", style: { color: cc.text, fontSize: "10px" } },
        plotLines: [{ value: 0, color: cc.border, width: 1 }],
      },
      // 4 – MACD1 diff columns (pane 2, right)
      {
        ...axisBase,
        top: paneTop(2),
        height: PANE_HEIGHT,
        opposite: true,
        labels: { ...axisBase.labels, x: 4 },
        plotLines: [{ value: 0, color: cc.border, width: 1 }],
      },
      // 5 – MACD2 lines (pane 3, left)
      {
        ...axisBase,
        top: paneTop(3),
        height: PANE_HEIGHT,
        opposite: false,
        title: { text: "MACD(24,54,21)", style: { color: cc.text, fontSize: "10px" } },
        plotLines: [{ value: 0, color: cc.border, width: 1 }],
      },
      // 6 – MACD2 diff columns (pane 3, right)
      {
        ...axisBase,
        top: paneTop(3),
        height: PANE_HEIGHT,
        opposite: true,
        labels: { ...axisBase.labels, x: 4 },
        plotLines: [{ value: 0, color: cc.border, width: 1 }],
      },
      // 7 – RSI (pane 4, left)
      {
        ...axisBase,
        top: paneTop(4),
        height: PANE_HEIGHT,
        opposite: false,
        min: 0,
        max: 100,
        title: { text: `RSI(${rsiPeriod})`, style: { color: cc.text, fontSize: "10px" } },
        tickPositions: [0, 30, 50, 70, 100],
        plotLines: [
          { value: 30, color: "#22c55e", width: 1, dashStyle: "Dash" as const },
          { value: 70, color: "#ef4444", width: 1, dashStyle: "Dash" as const },
        ],
      },
    ];

    const series: Highcharts.SeriesOptionsType[] = [
      // ── Pane 0: Close price ─────────────────────────────────────────────────
      {
        type: "line",
        id: "close",
        name: `${symbol} Weekly Close`,
        data: closeData,
        yAxis: 0,
        xAxis: 0,
        color: "#60a5fa",
        lineWidth: 1.5,
        marker: { enabled: false },
        zIndex: 5,
        tooltip: { valueDecimals: 2 },
      },
      // Buy signals
      {
        type: "scatter",
        name: "Buy Signal",
        data: buyScatterData,
        yAxis: 0,
        xAxis: 0,
        marker: {
          symbol: "triangle",
          radius: 7,
          fillColor: "#22c55e",
          lineColor: "#00ff88",
          lineWidth: 1,
        },
        tooltip: { pointFormat: "<b>BUY</b> @ {point.y:.2f}" },
        zIndex: 10,
        showInLegend: true,
      },
      // Sell signals
      {
        type: "scatter",
        name: "Sell Signal",
        data: sellScatterData,
        yAxis: 0,
        xAxis: 0,
        marker: {
          symbol: "triangle-down",
          radius: 7,
          fillColor: "#ef4444",
          lineColor: "#ff4466",
          lineWidth: 1,
        },
        tooltip: { pointFormat: "<b>SELL</b> @ {point.y:.2f}" },
        zIndex: 10,
        showInLegend: true,
      },
      // ── Pane 1: WMA lines ────────────────────────────────────────────────────
      {
        type: "line",
        name: `WMA(${sma1Period})`,
        data: sma13Data,
        yAxis: 1,
        xAxis: 0,
        color: "#dd7612",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 2 },
      },
      {
        type: "line",
        name: `WMA(${sma2Period})`,
        data: sma34Data,
        yAxis: 1,
        xAxis: 0,
        color: "#782ca8",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 2 },
      },
      // ── Pane 1: WMA diff columns ─────────────────────────────────────────────
      {
        type: "column",
        name: `WMA Diff`,
        data: smaDiffData,
        yAxis: 2,
        xAxis: 0,
        borderWidth: 0,
        pointPadding: 0,
        groupPadding: 0,
        tooltip: { valueDecimals: 4 },
      },
      // ── Pane 2: MACD1 lines ──────────────────────────────────────────────────
      {
        type: "line",
        name: "MACD(12,26,12)",
        data: macd1Data,
        yAxis: 3,
        xAxis: 0,
        color: "#38bdf8",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 4 },
      },
      {
        type: "line",
        name: "MACD(12,26,12) Signal",
        data: macd1TriggerData,
        yAxis: 3,
        xAxis: 0,
        color: "#fb923c",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 4 },
      },
      // ── Pane 2: MACD1 diff columns ───────────────────────────────────────────
      {
        type: "column",
        name: "MACD(12,26,12) Diff",
        data: macd1DiffData,
        yAxis: 4,
        xAxis: 0,
        borderWidth: 0,
        pointPadding: 0,
        groupPadding: 0,
        tooltip: { valueDecimals: 4 },
      },
      // ── Pane 3: MACD2 lines ──────────────────────────────────────────────────
      {
        type: "line",
        name: "MACD(24,54,21)",
        data: macd2Data,
        yAxis: 5,
        xAxis: 0,
        color: "#a78bfa",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 4 },
      },
      {
        type: "line",
        name: "MACD(24,54,21) Signal",
        data: macd2TriggerData,
        yAxis: 5,
        xAxis: 0,
        color: "#f472b6",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 4 },
      },
      // ── Pane 3: MACD2 diff columns ───────────────────────────────────────────
      {
        type: "column",
        name: "MACD(24,54,21) Diff",
        data: macd2DiffData,
        yAxis: 6,
        xAxis: 0,
        borderWidth: 0,
        pointPadding: 0,
        groupPadding: 0,
        tooltip: { valueDecimals: 4 },
      },
      // ── Pane 4: RSI ──────────────────────────────────────────────────────────
      {
        type: "line",
        name: `RSI(${rsiPeriod})`,
        data: rsiData,
        yAxis: 7,
        xAxis: 0,
        color: "#34d399",
        lineWidth: 1.5,
        marker: { enabled: false },
        tooltip: { valueDecimals: 2 },
      },
    ];

    return {
      chart: {
        backgroundColor: cc.bg,
        height: CHART_HEIGHT,
        style: { fontFamily: "'Inter', 'Segoe UI', sans-serif" },
        animation: false,
        zooming: { type: "x" },
        marginLeft: 70,
        marginRight: 70,
      },
      title: { text: undefined },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: {
        enabled: true,
        itemStyle: { color: cc.text, fontWeight: "500", fontSize: "11px" },
        itemHoverStyle: { color: "#ffffff" },
        backgroundColor: "transparent",
        maxHeight: 60,
      },
      tooltip: {
        shared: false,
        split: true,
        backgroundColor: cc.tooltip,
        borderColor: cc.border,
        borderRadius: 6,
        style: { color: "#d8e4f0", fontSize: "11px" },
        xDateFormat: "%b %d, %Y",
      },
      plotOptions: {
        series: {
          animation: false,
          states: { hover: { lineWidthPlus: 0 } },
          dataGrouping: { enabled: false },
          connectNulls: true,
        },
        column: { borderWidth: 0, pointPadding: 0, groupPadding: 0 },
        line: { lineWidth: 1.5 },
      },
      xAxis: {
        type: "datetime",
        categories: categories as unknown as string[],
        crosshair: true,
        labels: {
          style: { color: cc.text, fontSize: "10px" },
          formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
            return Highcharts.dateFormat("%b %d, %Y", this.value as number);
          },
        },
        gridLineColor: cc.grid,
        lineColor: cc.border,
        tickColor: cc.border,
      },
      yAxis: yAxes,
      series,
    };
  }, [chartData, cc, sma1Period, sma2Period, rsiPeriod]);

  return (
    <div
      className="border-round-lg overflow-hidden"
      style={{ background: cc.bg, boxShadow: "var(--sv-shadow-md)" }}
    >
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
};

export default SvWeeklyMoneyFlowChart;
