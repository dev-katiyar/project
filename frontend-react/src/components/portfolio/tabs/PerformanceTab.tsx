import React, { useState, useEffect, useMemo, useCallback } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { SelectButton } from "primereact/selectbutton";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "yearly" | "quarterly" | "monthly";

interface PerfRow {
  [key: string]: string | number;
}

interface PerfData {
  names: string[];
  yearly?: PerfRow[];
  quarterly?: PerfRow[];
  monthly?: PerfRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERIES_COLORS: Record<string, string> = {
  default: "#4f8ef7",
  "60/40": "#f87171",
  "S&P": "#38bdf8",
  sp500: "#38bdf8",
};

function getSeriesColor(name: string): string {
  if (name.includes("60/40")) return SERIES_COLORS["60/40"];
  if (name.toLowerCase().includes("s&p") || name.toLowerCase().includes("sp500"))
    return SERIES_COLORS["S&P"];
  return SERIES_COLORS.default;
}

const FREQ_COL: Record<Frequency, string> = {
  yearly: "year",
  quarterly: "quarter",
  monthly: "month",
};

function buildChartData(
  rows: PerfRow[] | undefined,
  names: string[],
  catCol: string,
): { categories: string[]; series: Highcharts.SeriesColumnOptions[] } {
  if (!rows || rows.length === 0) return { categories: [], series: [] };

  const categories = rows.map((r) => String(r[catCol] ?? ""));
  const series: Highcharts.SeriesColumnOptions[] = names.map((name) => ({
    type: "column",
    name,
    color: getSeriesColor(name),
    data: rows.map((r) => {
      const val = Number(r[name] ?? 0);
      return {
        y: Number(val.toFixed(2)),
        color: val < 0 ? undefined : undefined, // use series color
      };
    }),
  }));

  return { categories, series };
}

// ─── Chart theme ──────────────────────────────────────────────────────────────

const CHART_BG: Record<string, { bg: string; grid: string; text: string; tooltip: string }> = {
  dark:  { bg: "transparent", grid: "#1c2840", text: "#7a8da8", tooltip: "#07090f" },
  dim:   { bg: "transparent", grid: "#223354", text: "#7a92b8", tooltip: "#0f1729" },
  light: { bg: "transparent", grid: "#e5e7eb", text: "#4a5568", tooltip: "#ffffff" },
};

// ─── Bar chart ────────────────────────────────────────────────────────────────

const ReturnsChart: React.FC<{
  categories: string[];
  series: Highcharts.SeriesColumnOptions[];
  title: string;
}> = ({ categories, series, title }) => {
  const { theme } = useTheme();
  const cc = CHART_BG[theme] ?? CHART_BG.dark;

  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "column",
        backgroundColor: cc.bg,
        height: 320,
        style: { fontFamily: "inherit" },
      },
      title: { text: "" },
      xAxis: {
        categories,
        labels: {
          style: { color: cc.text, fontSize: "0.72rem" },
          rotation: categories.length > 12 ? -45 : 0,
        },
        lineColor: cc.grid,
        tickColor: cc.grid,
      },
      yAxis: {
        title: {
          text: "Return (%)",
          style: { color: cc.text, fontSize: "0.75rem" },
        },
        labels: {
          format: "{value}%",
          style: { color: cc.text, fontSize: "0.72rem" },
        },
        gridLineColor: cc.grid,
        plotLines: [
          {
            color: cc.grid,
            width: 1,
            value: 0,
            zIndex: 4,
          },
        ],
      },
      legend: {
        itemStyle: { color: cc.text, fontSize: "0.78rem", fontWeight: "normal" },
        enabled: series.length > 1,
      },
      tooltip: {
        backgroundColor: cc.tooltip,
        style: { color: "#cdd8ee", fontSize: "0.8rem" },
        shared: true,
        valueSuffix: "%",
      },
      plotOptions: {
        column: {
          borderRadius: 3,
          groupPadding: 0.1,
          pointPadding: 0.05,
          negativeColor: "var(--sv-loss)",
        },
      },
      series,
      credits: { enabled: false },
    }),
    [categories, series, cc],
  );

  if (!categories.length) {
    return (
      <div
        className="flex align-items-center justify-content-center"
        style={{ height: "320px", color: "var(--sv-text-muted)", fontSize: "0.85rem" }}
      >
        No {title.toLowerCase()} data available
      </div>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  portfolioId: number | string;
  active: boolean;
}

const PerformanceTab: React.FC<Props> = ({ portfolioId, active }) => {
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("quarterly");

  const loadPerf = useCallback(async () => {
    if (perfData || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/modelportfolio/performance/${portfolioId}`);
      setPerfData(res.data);
    } catch {
      setError("Failed to load performance data.");
    } finally {
      setLoading(false);
    }
  }, [portfolioId, perfData, loading]);

  useEffect(() => {
    if (active) loadPerf();
  }, [active, loadPerf]);

  const freqOptions = [
    { label: "Yearly", value: "yearly" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Monthly", value: "monthly" },
  ];

  const chartData = useMemo(() => {
    if (!perfData) return { categories: [], series: [] };
    const rows = perfData[frequency];
    const catCol = FREQ_COL[frequency];
    return buildChartData(rows, perfData.names ?? [], catCol);
  }, [perfData, frequency]);

  return (
    <div style={{ padding: "1rem" }}>
      {loading && (
        <>
          <Skeleton height="2.5rem" width="240px" className="mb-3" borderRadius="8px" />
          <Skeleton height="320px" borderRadius="8px" />
        </>
      )}

      {error && !loading && (
        <div
          style={{ padding: "2rem", textAlign: "center", color: "var(--sv-loss)" }}
        >
          <i className="pi pi-exclamation-triangle" style={{ fontSize: "1.5rem" }} />
          <p style={{ marginTop: "0.5rem" }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Frequency selector */}
          <div className="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "var(--sv-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <i className="pi pi-chart-bar mr-2" />
              Returns — {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
            </div>
            <SelectButton
              value={frequency}
              onChange={(e) => e.value && setFrequency(e.value as Frequency)}
              options={freqOptions}
              optionLabel="label"
              optionValue="value"
              style={{ fontSize: "0.8rem" }}
            />
          </div>

          <div
            style={{
              background: "var(--sv-bg-surface)",
              border: "1px solid var(--sv-border)",
              borderRadius: "10px",
              padding: "1rem",
            }}
          >
            <ReturnsChart
              categories={chartData.categories}
              series={chartData.series}
              title={frequency}
            />
          </div>

          {/* Benchmark legend note */}
          {perfData?.names && perfData.names.length > 1 && (
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.72rem",
                color: "var(--sv-text-muted)",
                textAlign: "center",
              }}
            >
              Benchmarks: {perfData.names.slice(1).join(", ")}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceTab;
