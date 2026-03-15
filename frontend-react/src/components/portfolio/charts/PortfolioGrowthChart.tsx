import React, { useState, useEffect, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Card } from "primereact/card";
import { Skeleton } from "primereact/skeleton";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";
import { getSeriesColor } from "@/components/portfolio/charts/chartColors";

// ─── Period config ────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "YTD", value: "ytd" },
  { label: "1M",  value: "1month" },
  { label: "3M",  value: "3month" },
  { label: "6M",  value: "6month" },
  { label: "1Y",  value: "1year" },
  { label: "3Y",  value: "3year" },
  { label: "Max", value: "All" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

interface HistoricalRow {
  date: string;
  [key: string]: number | string;
}

// ─── Chart theme ──────────────────────────────────────────────────────────────

const CHART_THEME: Record<string, { bg: string; grid: string; text: string; tooltip: string }> = {
  dark:  { bg: "transparent", grid: "#1c2840", text: "#7a8da8", tooltip: "#07090f" },
  dim:   { bg: "transparent", grid: "#223354", text: "#7a92b8", tooltip: "#0f1729" },
  light: { bg: "transparent", grid: "#e5e7eb", text: "#4a5568", tooltip: "#ffffff" },
};


// ─── Stat Pill ────────────────────────────────────────────────────────────────

const StatPill: React.FC<{
  icon: string;
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => {
  const isPos = value >= 0;
  const color = isPos ? "var(--sv-gain)" : "var(--sv-loss)";
  const bg = highlight
    ? isPos ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"
    : "var(--sv-bg-surface)";
  const border = highlight
    ? isPos ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)"
    : "1px solid var(--sv-border)";

  return (
    <div
      className="flex align-items-center gap-2 border-round-lg px-3 py-2"
      style={{ background: bg, border }}
    >
      <i className={`pi ${icon}`} style={{ fontSize: "0.78rem", color }} />
      <span className="sv-text-muted" style={{ fontSize: "0.72rem" }}>
        {label}
      </span>
      <span className="font-bold" style={{ fontSize: "0.88rem", color }}>
        {isPos ? "+" : ""}{value}%
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  portfolioId: number | string;
  portfolioName?: string;
  active?: boolean;
}

const PortfolioGrowthChart: React.FC<Props> = ({
  portfolioId,
  portfolioName,
  active = true,
}) => {
  const { theme } = useTheme();
  const cc = CHART_THEME[theme] ?? CHART_THEME.dark;

  const [period, setPeriod] = useState<Period>("1year");
  const [data, setData] = useState<HistoricalRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setData(null);
      try {
        const ready = await api.get(`/modelportfolio/dataready/${portfolioId}`);
        if (cancelled) return;
        if (ready.data?.status === 1) {
          const res = await api.post("/modelportfolio/historical", {
            portfolio: portfolioId,
            period,
          });
          if (!cancelled) setData(res.data ?? []);
        } else {
          if (!cancelled) setError("Portfolio data is being prepared. Please try again shortly.");
        }
      } catch {
        if (!cancelled) setError("Failed to load historical data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [active, portfolioId, period]);

  // ── Derive chart data ───────────────────────────────────────────────────────

  const { chartSeries, categories, portfolioKey, stats } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartSeries: [], categories: [], portfolioKey: "", stats: null };
    }

    const keys = Object.keys(data[0]).filter(k => k !== "date");

    const pKey =
      (portfolioName && keys.includes(portfolioName) ? portfolioName : null) ??
      keys.find(k => k.toLowerCase().includes("portfolio")) ??
      keys.find(k =>
        !k.toLowerCase().includes("s&p") &&
        !k.toLowerCase().includes("spy") &&
        !k.toLowerCase().includes("index") &&
        !k.toLowerCase().includes("60/40"),
      ) ??
      keys[0];

    const bKey =
      keys.find(k => k.toLowerCase().includes("s&p") || k.toLowerCase().includes("spy")) ??
      keys.find(k => k.toLowerCase().includes("index") || k.toLowerCase().includes("60/40")) ??
      "";

    const cats = data.map(d => d.date as string);

    const lines: Highcharts.SeriesLineOptions[] = keys.map(key => ({
      type: "line",
      name: key,
      data: data.map(d => parseFloat(Number(d[key]).toFixed(3))),
      color: getSeriesColor(key),
      lineWidth: key === pKey ? 3 : 2,
      marker: { enabled: false },
      yAxis: 0,
      zIndex: key === pKey ? 2 : 1,
    }));

    const diffSeries: Highcharts.SeriesColumnOptions | null =
      pKey && bKey
        ? {
            type: "column",
            name: "vs Benchmark",
            data: data.map(d => {
              const val = Number(d[pKey]) - Number(d[bKey]);
              return { y: parseFloat(val.toFixed(3)), color: val >= 0 ? "#22c55e" : "#ef4444" };
            }),
            yAxis: 1,
            zIndex: -1,
            showInLegend: false,
          }
        : null;

    const last = data[data.length - 1];
    const portfolioReturn = parseFloat(Number(last[pKey]).toFixed(2));
    const benchmarkReturn = bKey ? parseFloat(Number(last[bKey]).toFixed(2)) : null;
    const outperformance =
      benchmarkReturn !== null
        ? parseFloat((portfolioReturn - benchmarkReturn).toFixed(2))
        : null;

    return {
      chartSeries: diffSeries ? [...lines, diffSeries] : lines,
      categories: cats,
      portfolioKey: pKey,
      stats: { portfolioReturn, benchmarkReturn, benchmarkName: bKey, outperformance },
    };
  }, [data, portfolioName]);

  // ── Chart options ───────────────────────────────────────────────────────────

  const chartOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        backgroundColor: cc.bg,
        height: 460,
        style: { fontFamily: "inherit" },
        spacing: [10, 5, 10, 5],
      },
      title: { text: "" },
      credits: { enabled: false },
      exporting: { enabled: false },
      xAxis: {
        categories,
        labels: {
          style: { color: cc.text, fontSize: "0.7rem" },
          step: Math.max(1, Math.ceil(categories.length / 14)),
        },
        lineColor: cc.grid,
        tickColor: cc.grid,
      },
      yAxis: [
        {
          top: "0%",
          height: "62%",
          title: {
            text: "Price Change %",
            style: { color: cc.text, fontSize: "0.72rem" },
          },
          labels: {
            format: "{value}%",
            style: { color: cc.text, fontSize: "0.7rem" },
          },
          gridLineColor: cc.grid,
          plotLines: [{ value: 0, color: cc.grid, width: 1, zIndex: 4 }],
        },
        {
          top: "67%",
          height: "30%",
          offset: 0,
          title: {
            text: "vs Benchmark %",
            style: { color: cc.text, fontSize: "0.7rem" },
          },
          labels: {
            format: "{value}%",
            style: { color: cc.text, fontSize: "0.7rem" },
          },
          gridLineColor: cc.grid,
          plotLines: [{ value: 0, color: cc.grid, width: 1, zIndex: 4 }],
        },
      ],
      legend: {
        itemStyle: { color: cc.text, fontSize: "0.78rem", fontWeight: "normal" },
        enabled: true,
      },
      tooltip: {
        backgroundColor: cc.tooltip,
        style: { color: "#cdd8ee", fontSize: "0.8rem" },
        shared: true,
        valueDecimals: 2,
        valueSuffix: "%",
      },
      plotOptions: {
        series: { turboThreshold: 0 },
        line: { marker: { enabled: false } },
        column: { borderRadius: 2, groupPadding: 0.05 },
      },
      series: chartSeries as Highcharts.SeriesOptionsType[],
    }),
    [cc, categories, chartSeries],
  );

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? "1Y";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header row */}
      <div className="flex align-items-start justify-content-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="flex align-items-center gap-2">
            <i
              className="pi pi-chart-line"
              style={{ color: "var(--sv-accent)", fontSize: "1rem" }}
            />
            <span
              className="font-bold"
              style={{ fontSize: "0.95rem", color: "var(--sv-text-primary)" }}
            >
              Portfolio Growth
            </span>
          </div>
          <div className="sv-text-muted mt-1" style={{ fontSize: "0.72rem" }}>
            Cumulative % change vs benchmark &middot;{" "}
            {portfolioKey || "Portfolio"} &mdash; {periodLabel}
          </div>
        </div>

        {/* Period selector */}
        <div
          className="flex gap-1"
          style={{
            background: "var(--sv-bg-surface)",
            border: "1px solid var(--sv-border)",
            borderRadius: "8px",
            padding: "3px",
          }}
        >
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "0.25rem 0.55rem",
                fontSize: "0.72rem",
                fontWeight: period === p.value ? "700" : "500",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s",
                background:
                  period === p.value ? "var(--sv-accent)" : "transparent",
                color:
                  period === p.value ? "#fff" : "var(--sv-text-secondary)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {stats && !loading && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <StatPill
            icon="pi-briefcase"
            label="Your Portfolio"
            value={stats.portfolioReturn}
          />
          {stats.benchmarkReturn !== null && (
            <StatPill
              icon="pi-chart-bar"
              label={stats.benchmarkName}
              value={stats.benchmarkReturn}
            />
          )}
          {stats.outperformance !== null && (
            <StatPill
              icon={stats.outperformance >= 0 ? "pi-arrow-up-right" : "pi-arrow-down-right"}
              label="vs Benchmark"
              value={stats.outperformance}
              highlight
            />
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div>
          <div className="flex gap-2 mb-3">
            <Skeleton height="2.5rem" width="150px" borderRadius="8px" />
            <Skeleton height="2.5rem" width="150px" borderRadius="8px" />
            <Skeleton height="2.5rem" width="150px" borderRadius="8px" />
          </div>
          <Skeleton height="460px" borderRadius="8px" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="sv-alert-error border-round p-4 flex flex-column align-items-center gap-2 text-center">
          <i className="pi pi-exclamation-triangle text-2xl" />
          <p className="m-0 text-sm">{error}</p>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && categories.length > 0 && (
        <Card className="p-2">
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          {/* Plain-language legend guide */}
          <div
            className="flex gap-3 justify-content-center mt-2 flex-wrap sv-text-muted"
            style={{ fontSize: "0.7rem" }}
          >
            <span className="flex align-items-center gap-1">
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "3px",
                  background: "#22c55e",
                  borderRadius: "2px",
                }}
              />
              Your Portfolio
            </span>
            <span className="flex align-items-center gap-1">
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "3px",
                  background: "#38bdf8",
                  borderRadius: "2px",
                }}
              />
              Market Index (S&amp;P 500)
            </span>
            <span className="flex align-items-center gap-1">
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "3px",
                  background: "#f87171",
                  borderRadius: "2px",
                }}
              />
              Balanced Index (60/40)
            </span>
            <span className="flex align-items-center gap-1">
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  background: "#22c55e",
                  borderRadius: "2px",
                  opacity: 0.8,
                }}
              />
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  background: "#ef4444",
                  borderRadius: "2px",
                  opacity: 0.8,
                  marginLeft: "2px",
                }}
              />
              Outperformance vs Benchmark
            </span>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && data !== null && categories.length === 0 && (
        <div
          className="flex flex-column align-items-center justify-content-center sv-text-muted text-sm gap-2"
          style={{ height: "460px" }}
        >
          <i
            className="pi pi-chart-line"
            style={{ fontSize: "2rem", opacity: 0.3 }}
          />
          <p className="m-0">No historical data available for this period</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioGrowthChart;
