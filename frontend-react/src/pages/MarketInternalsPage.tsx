import React, { useState, useEffect, useCallback, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

/* ── Period selector ──────────────────────────────────────────────────────── */

type Period =
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

/* ── Chart theme ──────────────────────────────────────────────────────────── */

interface ChartTheme {
  grid: string;
  label: string;
  title: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  gain: string;
  loss: string;
  accent: string;
  muted: string;
  blue: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    grid: "#1c2840",
    label: "#7a8da8",
    title: "#e8edf5",
    tooltipBg: "#0d1220",
    tooltipBorder: "#2a3a5c",
    tooltipText: "#e8edf5",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#f5a623",
    muted: "#64748b",
    blue: "#60a5fa",
  },
  dim: {
    grid: "#283a5c",
    label: "#7a92b8",
    title: "#d8e0f0",
    tooltipBg: "#162038",
    tooltipBorder: "#2e4472",
    tooltipText: "#d8e0f0",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#2e5be6",
    muted: "#64748b",
    blue: "#60a5fa",
  },
  light: {
    grid: "#e2e8f0",
    label: "#4a5e78",
    title: "#0d1425",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0d1425",
    gain: "#16a34a",
    loss: "#dc2626",
    accent: "#2e5be6",
    muted: "#94a3b8",
    blue: "#3b82f6",
  },
};

/* ── Fear/Greed plot bands ────────────────────────────────────────────────── */

const FEAR_GREED_BANDS: Highcharts.AxisPlotBandsOptions[] = [
  {
    from: 0,
    to: 25,
    color: "rgba(239,68,68,0.07)",
    label: {
      text: "Extreme Fear",
      align: "left",
      x: 6,
      style: { color: "rgba(239,68,68,0.55)", fontSize: "10px" },
    },
  },
  {
    from: 25,
    to: 45,
    color: "rgba(251,146,60,0.05)",
    label: {
      text: "Fear",
      align: "left",
      x: 6,
      style: { color: "rgba(251,146,60,0.55)", fontSize: "10px" },
    },
  },
  {
    from: 45,
    to: 55,
    color: "rgba(234,179,8,0.05)",
    label: {
      text: "Neutral",
      align: "left",
      x: 6,
      style: { color: "rgba(234,179,8,0.55)", fontSize: "10px" },
    },
  },
  {
    from: 55,
    to: 75,
    color: "rgba(34,197,94,0.05)",
    label: {
      text: "Greed",
      align: "left",
      x: 6,
      style: { color: "rgba(34,197,94,0.55)", fontSize: "10px" },
    },
  },
  {
    from: 75,
    to: 100,
    color: "rgba(22,163,74,0.07)",
    label: {
      text: "Extreme Greed",
      align: "left",
      x: 6,
      style: { color: "rgba(22,163,74,0.55)", fontSize: "10px" },
    },
  },
];

/* ── Data helpers ─────────────────────────────────────────────────────────── */

interface SeriesCfg {
  name: string;
  color: string;
  legend: string;
  yAxis?: number;
}

function buildSeries(
  data: any[],
  cfgs: SeriesCfg[],
  catCol: string,
): Highcharts.SeriesLineOptions[] {
  const series: Highcharts.SeriesLineOptions[] = cfgs.map((c) => ({
    type: "line",
    name: c.legend,
    color: c.color,
    yAxis: c.yAxis ?? 0,
    data: [] as [number, number][],
    marker: { enabled: false },
    lineWidth: 2,
  }));
  for (const item of data) {
    const ts = Date.parse(item[catCol]);
    cfgs.forEach((c, i) => {
      const raw = item[c.name];
      const v = raw !== undefined && raw !== null ? parseFloat(raw) : null;
      (series[i].data as [number, number][]).push([ts, v as number]);
    });
  }
  return series;
}

function getLatest(data: any[], field: string): number | null {
  if (!data?.length) return null;
  const v = data[data.length - 1][field];
  return v !== undefined && v !== null ? parseFloat(v) : null;
}

/* ── Highcharts options builder ───────────────────────────────────────────── */

function buildChartOpts(
  ct: ChartTheme,
  series: Highcharts.SeriesLineOptions[],
  opts: {
    yAxisText?: string;
    yAxisMin?: number;
    yAxisMax?: number;
    dualAxis?: {
      left: string;
      right: string;
      leftMin?: number;
      leftMax?: number;
    };
    plotBands?: Highcharts.AxisPlotBandsOptions[];
  } = {},
): Highcharts.Options {
  const yAxis: Highcharts.YAxisOptions | Highcharts.YAxisOptions[] =
    opts.dualAxis
      ? [
          {
            title: {
              text: opts.dualAxis.left,
              style: { color: ct.label, fontSize: "11px" },
            },
            gridLineColor: ct.grid,
            labels: { style: { color: ct.label, fontSize: "11px" } },
            min: opts.dualAxis.leftMin,
            max: opts.dualAxis.leftMax,
            plotBands: opts.plotBands,
          },
          {
            title: {
              text: opts.dualAxis.right,
              style: { color: ct.label, fontSize: "11px" },
            },
            opposite: true,
            gridLineColor: "transparent",
            labels: { style: { color: ct.label, fontSize: "11px" } },
          },
        ]
      : {
          title: {
            text: opts.yAxisText ?? "",
            style: { color: ct.label, fontSize: "11px" },
          },
          gridLineColor: ct.grid,
          labels: { style: { color: ct.label, fontSize: "11px" } },
          min: opts.yAxisMin,
          max: opts.yAxisMax,
          plotBands: opts.plotBands,
          startOnTick: false,
          endOnTick: false,
        };

  return {
    chart: {
      type: "line",
      backgroundColor: "transparent",
      height: 265,
      animation: { duration: 500 },
      style: { fontFamily: "Inter, sans-serif" },
      spacing: [4, 4, 8, 4],
    },
    credits: { enabled: false },
    exporting: { enabled: false },
    title: { text: "" },
    legend: {
      enabled: true,
      itemStyle: { color: ct.label, fontWeight: "400", fontSize: "11px" },
      itemHoverStyle: { color: ct.title },
      margin: 6,
    },
    xAxis: {
      type: "datetime",
      gridLineColor: ct.grid,
      lineColor: ct.grid,
      tickColor: ct.grid,
      labels: {
        style: { color: ct.label, fontSize: "10px" },
        format: "{value:%b '%y}",
      },
    },
    yAxis,
    tooltip: {
      shared: true,
      backgroundColor: ct.tooltipBg,
      borderColor: ct.tooltipBorder,
      borderRadius: 8,
      style: { color: ct.tooltipText, fontSize: "12px" },
      xDateFormat: "%b %d, %Y",
    },
    plotOptions: {
      series: {
        connectNulls: true,
        marker: { enabled: false },
        states: { hover: { lineWidthPlus: 1 } },
      },
    },
    series,
  };
}

/* ── Period selector component ────────────────────────────────────────────── */

function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "2px",
        background: "var(--sv-bg-surface)",
        borderRadius: "8px",
        padding: "2px",
        flexShrink: 0,
      }}
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: "3px 7px",
            fontSize: "11px",
            fontWeight: value === p.value ? 700 : 400,
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            background: value === p.value ? "var(--sv-accent)" : "transparent",
            color: value === p.value ? "#fff" : "var(--sv-text-secondary)",
            transition: "all 0.15s ease",
            lineHeight: 1.4,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ── Chart card component ─────────────────────────────────────────────────── */

interface BadgeInfo {
  text: string;
  color: string;
}

interface ChartCardProps {
  title: string;
  icon: string;
  description: string;
  badge?: BadgeInfo;
  period: Period;
  onPeriodChange: (p: Period) => void;
  loading: boolean;
  chartOptions: Highcharts.Options | null;
}

function ChartCard({
  title,
  icon,
  description,
  badge,
  period,
  onPeriodChange,
  loading,
  chartOptions,
}: ChartCardProps) {
  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        borderRadius: "14px",
        padding: "16px 18px",
        boxShadow: "var(--sv-shadow-md)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        height: "100%",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: "var(--sv-accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              className={`pi ${icon}`}
              style={{ fontSize: "15px", color: "var(--sv-accent)" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "13.5px",
                color: "var(--sv-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--sv-text-muted)",
                marginTop: "2px",
              }}
            >
              {description}
            </div>
          </div>
          {badge && (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: "100px",
                fontSize: "11px",
                fontWeight: 700,
                background: `${badge.color}1a`,
                color: badge.color,
                border: `1px solid ${badge.color}44`,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {badge.text}
            </span>
          )}
        </div>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {/* Chart area */}
      {loading ? (
        <Skeleton height="265px" borderRadius="8px" />
      ) : chartOptions ? (
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      ) : (
        <div
          style={{
            height: 265,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sv-text-muted)",
            fontSize: "13px",
          }}
        >
          <span className="pi pi-inbox" style={{ marginRight: 6 }} />
          No data available
        </div>
      )}
    </div>
  );
}

/* ── Fear/Greed helpers ───────────────────────────────────────────────────── */

function fgLabel(v: number | null): string {
  if (v === null) return "–";
  if (v < 25) return "Extreme Fear";
  if (v < 45) return "Fear";
  if (v < 55) return "Neutral";
  if (v < 75) return "Greed";
  return "Extreme Greed";
}

function fgColor(v: number | null, ct: ChartTheme): string {
  if (v === null) return ct.muted;
  if (v < 25) return ct.loss;
  if (v < 45) return "#f97316";
  if (v < 55) return "#eab308";
  if (v < 75) return "#86efac";
  return ct.gain;
}

function sentimentLabel(v: number | null): string {
  if (v === null) return "–";
  if (v > 50) return "Bullish";
  if (v < -50) return "Bearish";
  return "Neutral";
}

function sentimentColor(v: number | null, ct: ChartTheme): string {
  if (v === null) return ct.muted;
  if (v > 50) return ct.gain;
  if (v < -50) return ct.loss;
  return "#eab308";
}

/* ── KPI card ─────────────────────────────────────────────────────────────── */

interface KpiCardProps {
  icon: string;
  label: string;
  value: string | null;
  sub: string;
  color: string;
}

function KpiCard({ icon, label, value, sub, color }: KpiCardProps) {
  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        borderRadius: "12px",
        padding: "14px 18px",
        boxShadow: "var(--sv-shadow-sm)",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "10px",
          background: `${color}1a`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span className={`pi ${icon}`} style={{ fontSize: "20px", color }} />
      </div>
      <div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--sv-text-secondary)",
            marginBottom: "3px",
          }}
        >
          {label}
        </div>
        <div
          style={{ fontSize: "21px", fontWeight: 700, color, lineHeight: 1 }}
        >
          {value ?? <Skeleton width="60px" height="21px" />}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--sv-text-muted)",
            marginTop: "3px",
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */

const MarketInternalsPage: React.FC = () => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme];

  /* Periods */
  const [sentimentPeriod, setSentimentPeriod] = useState<Period>("3year");
  const [buySellPeriod, setBuySellPeriod] = useState<Period>("3year");
  const [obosPeriod, setObosPeriod] = useState<Period>("3year");
  const [movAvgPeriod, setMovAvgPeriod] = useState<Period>("3year");
  const [fgPeriod, setFgPeriod] = useState<Period>("3year");
  const [techPeriod, setTechPeriod] = useState<Period>("3year");

  /* Data */
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [buySellData, setBuySellData] = useState<any[]>([]);
  const [obosData, setObosData] = useState<any[]>([]);
  const [movAvgData, setMovAvgData] = useState<any[]>([]);
  const [fgData, setFgData] = useState<any[]>([]);
  const [techData, setTechData] = useState<any[]>([]);

  /* Loading */
  const [loadingSentiment, setLoadingSentiment] = useState(true);
  const [loadingBuySell, setLoadingBuySell] = useState(true);
  const [loadingObos, setLoadingObos] = useState(true);
  const [loadingMovAvg, setLoadingMovAvg] = useState(true);
  const [loadingFg, setLoadingFg] = useState(true);
  const [loadingTech, setLoadingTech] = useState(true);

  /* Fetch functions */
  const fetchSentiment = useCallback((p: Period) => {
    setLoadingSentiment(true);
    api
      .get(`/symbol/technicalHistory/sentiment/${p}`)
      .then((r) => {
        setSentimentData(r.data);
        setLoadingSentiment(false);
      })
      .catch(() => setLoadingSentiment(false));
  }, []);

  const fetchBuySell = useCallback((p: Period) => {
    setLoadingBuySell(true);
    api
      .get(`/symbol/technicalHistory/buySellRatio/${p}`)
      .then((r) => {
        setBuySellData(r.data);
        setLoadingBuySell(false);
      })
      .catch(() => setLoadingBuySell(false));
  }, []);

  const fetchObos = useCallback((p: Period) => {
    setLoadingObos(true);
    api
      .get(`/symbol/technicalHistory/obos/${p}`)
      .then((r) => {
        setObosData(r.data);
        setLoadingObos(false);
      })
      .catch(() => setLoadingObos(false));
  }, []);

  const fetchMovAvg = useCallback((p: Period) => {
    setLoadingMovAvg(true);
    api
      .get(`/symbol/indtechnicalHistory/movAvg/${p}`)
      .then((r) => {
        setMovAvgData(r.data);
        setLoadingMovAvg(false);
      })
      .catch(() => setLoadingMovAvg(false));
  }, []);

  const fetchFg = useCallback((p: Period) => {
    setLoadingFg(true);
    api
      .get(`/symbol/technicalHistory/fear_greed_price/${p}/SPY`)
      .then((r) => {
        setFgData(r.data);
        setLoadingFg(false);
      })
      .catch(() => setLoadingFg(false));
  }, []);

  const fetchTech = useCallback((p: Period) => {
    setLoadingTech(true);
    api
      .get(`/symbol/technicalHistory/fear_greed_price/${p}/SPY`)
      .then((r) => {
        setTechData(r.data);
        setLoadingTech(false);
      })
      .catch(() => setLoadingTech(false));
  }, []);

  /* Effects */
  useEffect(() => {
    fetchSentiment(sentimentPeriod);
  }, [fetchSentiment, sentimentPeriod]);
  useEffect(() => {
    fetchBuySell(buySellPeriod);
  }, [fetchBuySell, buySellPeriod]);
  useEffect(() => {
    fetchObos(obosPeriod);
  }, [fetchObos, obosPeriod]);
  useEffect(() => {
    fetchMovAvg(movAvgPeriod);
  }, [fetchMovAvg, movAvgPeriod]);
  useEffect(() => {
    fetchFg(fgPeriod);
  }, [fetchFg, fgPeriod]);
  useEffect(() => {
    fetchTech(techPeriod);
  }, [fetchTech, techPeriod]);

  /* Latest values for KPI strip */
  const latestSentiment = getLatest(sentimentData, "meter_score");
  const latestFg = getLatest(fgData, "fear_greed");
  const latestAbove50 = getLatest(movAvgData, "movavg50");
  const latestStrongBuy = getLatest(buySellData, "StrongBuy");
  const latestStrongSell = getLatest(buySellData, "StrongSell");

  const buySellBalance =
    latestStrongBuy !== null && latestStrongSell !== null
      ? latestStrongBuy - latestStrongSell
      : null;

  /* ── Chart options ────────────────────────────────────────────────────── */

  const sentimentOpts = useMemo((): Highcharts.Options | null => {
    if (!sentimentData.length) return null;
    return buildChartOpts(
      ct,
      buildSeries(
        sentimentData,
        [{ name: "meter_score", color: ct.gain, legend: "Sentiment Score" }],
        "date",
      ),
      { yAxisText: "Sentiment Value", yAxisMin: -105, yAxisMax: 105 },
    );
  }, [sentimentData, ct]);

  const buySellOpts = useMemo((): Highcharts.Options | null => {
    if (!buySellData.length) return null;
    return buildChartOpts(
      ct,
      buildSeries(
        buySellData,
        [
          { name: "StrongBuy", color: ct.gain, legend: "Strong Buy" },
          { name: "StrongSell", color: ct.loss, legend: "Strong Sell" },
        ],
        "date",
      ),
      { yAxisText: "# Stocks" },
    );
  }, [buySellData, ct]);

  const obosOpts = useMemo((): Highcharts.Options | null => {
    if (!obosData.length) return null;
    return buildChartOpts(
      ct,
      buildSeries(
        obosData,
        [
          { name: "Overbought", color: ct.loss, legend: "Overbought" },
          { name: "Oversold", color: ct.gain, legend: "Oversold" },
        ],
        "date",
      ),
      { yAxisText: "% of Stocks" },
    );
  }, [obosData, ct]);

  const movAvgOpts = useMemo((): Highcharts.Options | null => {
    if (!movAvgData.length) return null;
    return buildChartOpts(
      ct,
      buildSeries(
        movAvgData,
        [
          { name: "movavg150", color: ct.loss, legend: "150-Day SMA" },
          { name: "movavg75", color: ct.gain, legend: "75-Day SMA" },
          { name: "movavg50", color: ct.accent, legend: "50-Day SMA" },
        ],
        "rating_date",
      ),
      { yAxisText: "% of Stocks", yAxisMin: 0, yAxisMax: 105 },
    );
  }, [movAvgData, ct]);

  const fgOpts = useMemo((): Highcharts.Options | null => {
    if (!fgData.length) return null;
    return buildChartOpts(
      ct,
      buildSeries(
        fgData,
        [
          {
            name: "fear_greed",
            color: ct.accent,
            legend: "Fear/Greed",
            yAxis: 0,
          },
          { name: "SPY", color: ct.muted, legend: "SPY Price", yAxis: 1 },
        ],
        "date",
      ),
      {
        dualAxis: {
          left: "Fear/Greed (0–100)",
          right: "SPY",
          leftMin: 0,
          leftMax: 100,
        },
        plotBands: FEAR_GREED_BANDS,
      },
    );
  }, [fgData, ct]);

  const techOpts = useMemo((): Highcharts.Options | null => {
    if (!techData.length) return null;
    return buildChartOpts(
      ct,
      buildSeries(
        techData,
        [
          {
            name: "technical",
            color: ct.blue,
            legend: "Technical Score",
            yAxis: 0,
          },
          { name: "SPY", color: ct.muted, legend: "SPY Price", yAxis: 1 },
        ],
        "date",
      ),
      {
        dualAxis: {
          left: "Technical (0–100)",
          right: "SPY",
          leftMin: 0,
          leftMax: 100,
        },
      },
    );
  }, [techData, ct]);

  /* ── KPI data ─────────────────────────────────────────────────────────── */

  const kpis: KpiCardProps[] = [
    {
      icon: "pi-chart-bar",
      label: "SV Sentiment",
      value: latestSentiment !== null ? latestSentiment.toFixed(1) : null,
      sub: sentimentLabel(latestSentiment),
      color: sentimentColor(latestSentiment, ct),
    },
    {
      icon: "pi-heart",
      label: "Fear / Greed",
      value: latestFg !== null ? latestFg.toFixed(0) : null,
      sub: fgLabel(latestFg),
      color: fgColor(latestFg, ct),
    },
    {
      icon: "pi-chart-line",
      label: "Above 50-Day SMA",
      value: latestAbove50 !== null ? `${latestAbove50.toFixed(1)}%` : null,
      sub:
        latestAbove50 !== null
          ? latestAbove50 > 60
            ? "Strong breadth"
            : latestAbove50 > 40
              ? "Mixed breadth"
              : "Narrow market"
          : "",
      color:
        latestAbove50 !== null
          ? latestAbove50 > 60
            ? ct.gain
            : latestAbove50 > 40
              ? "#eab308"
              : ct.loss
          : ct.muted,
    },
    {
      icon: "pi-sort-alt",
      label: "Buy / Sell Balance",
      value:
        buySellBalance !== null
          ? buySellBalance > 0
            ? `+${buySellBalance.toFixed(0)}`
            : buySellBalance.toFixed(0)
          : null,
      sub:
        buySellBalance !== null
          ? buySellBalance > 0
            ? "Buyers dominating"
            : buySellBalance < 0
              ? "Sellers dominating"
              : "Balanced"
          : "",
      color:
        buySellBalance !== null
          ? buySellBalance > 0
            ? ct.gain
            : ct.loss
          : ct.muted,
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div
      className="sv-page-min-h"
      style={{ padding: "20px 24px 32px", background: "var(--sv-bg-body)" }}
    >
      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid" style={{ marginBottom: "6px" }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="col-12 sm:col-6 lg:col-3">
            <KpiCard {...kpi} />
          </div>
        ))}
      </div>

      {/* ── Section divider ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "18px 0 14px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--sv-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            whiteSpace: "nowrap",
          }}
        >
          Historical Charts
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--sv-border)" }} />
      </div>

      {/* ── Charts grid ─────────────────────────────────────────────────── */}
      <div className="grid">
        {/* Sentiment */}
        <div className="col-12 md:col-6">
          <ChartCard
            title="SimpleVisor Sentiment"
            icon="pi-chart-bar"
            description="Proprietary sentiment meter — positive = bullish, negative = bearish"
            badge={
              latestSentiment !== null
                ? {
                    text: `${sentimentLabel(latestSentiment)} ${latestSentiment.toFixed(1)}`,
                    color: sentimentColor(latestSentiment, ct),
                  }
                : undefined
            }
            period={sentimentPeriod}
            onPeriodChange={setSentimentPeriod}
            loading={loadingSentiment}
            chartOptions={sentimentOpts}
          />
        </div>

        {/* Buy/Sell Ratio */}
        <div className="col-12 md:col-6">
          <ChartCard
            title="Strong Buy / Strong Sell Ratio"
            icon="pi-sort-alt"
            description="Count of S&P 500 stocks with strong buy vs. strong sell signals"
            badge={
              buySellBalance !== null
                ? {
                    text:
                      buySellBalance > 0
                        ? `Buyers +${buySellBalance.toFixed(0)}`
                        : `Sellers ${buySellBalance.toFixed(0)}`,
                    color: buySellBalance > 0 ? ct.gain : ct.loss,
                  }
                : undefined
            }
            period={buySellPeriod}
            onPeriodChange={setBuySellPeriod}
            loading={loadingBuySell}
            chartOptions={buySellOpts}
          />
        </div>

        {/* Overbought / Oversold */}
        <div className="col-12 md:col-6">
          <ChartCard
            title="Overbought / Oversold Count"
            icon="pi-sliders-h"
            description="Percentage of S&P 500 stocks in overbought or oversold territory"
            period={obosPeriod}
            onPeriodChange={setObosPeriod}
            loading={loadingObos}
            chartOptions={obosOpts}
          />
        </div>

        {/* Moving Averages */}
        <div className="col-12 md:col-6">
          <ChartCard
            title="Stocks Above Moving Averages"
            icon="pi-chart-line"
            description="Percentage of S&P 500 stocks trading above their 50, 75 & 150-day SMAs"
            badge={
              latestAbove50 !== null
                ? {
                    text: `50-SMA: ${latestAbove50.toFixed(1)}%`,
                    color: latestAbove50 > 50 ? ct.gain : ct.loss,
                  }
                : undefined
            }
            period={movAvgPeriod}
            onPeriodChange={setMovAvgPeriod}
            loading={loadingMovAvg}
            chartOptions={movAvgOpts}
          />
        </div>

        {/* Fear / Greed */}
        <div className="col-12 md:col-6">
          <ChartCard
            title="Fear / Greed Index"
            icon="pi-heart"
            description="Market emotion index: 0 = Extreme Fear, 100 = Extreme Greed — overlaid with SPY"
            badge={
              latestFg !== null
                ? {
                    text: `${fgLabel(latestFg)} · ${latestFg.toFixed(0)}`,
                    color: fgColor(latestFg, ct),
                  }
                : undefined
            }
            period={fgPeriod}
            onPeriodChange={setFgPeriod}
            loading={loadingFg}
            chartOptions={fgOpts}
          />
        </div>

        {/* Technical Gauge */}
        <div className="col-12 md:col-6">
          <ChartCard
            title="Technical Gauge"
            icon="pi-cog"
            description="Composite technical health score of the S&P 500 — overlaid with SPY price"
            period={techPeriod}
            onPeriodChange={setTechPeriod}
            loading={loadingTech}
            chartOptions={techOpts}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketInternalsPage;
