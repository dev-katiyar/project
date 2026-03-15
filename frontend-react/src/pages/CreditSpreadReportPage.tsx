import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Tooltip } from "primereact/tooltip";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SymNameMap {
  [symbol: string]: string;
}

interface PeriodKey {
  key: string;
}

interface OasRow {
  symbol: string;
  current_oas: number;
  [period: string]: number | string;
}

interface IntraCreditRow {
  symbol: string;
  [sym: string]: number | string;
}

interface IntraCreditData {
  date: string;
  data: IntraCreditRow[];
}

interface CreditSpreadResponse {
  symbols: string[];
  sym_name_map: SymNameMap;
  intra_credit_spread_last: IntraCreditData;
  intra_credit_spread_change_4wk: IntraCreditData;
  periods: PeriodKey[];
  sym_oas_percentiles: { data: OasRow[] };
}

interface HistDataPoint {
  symbol: string;
  date: string;
  spread: number;
}

interface HistStats {
  mean: number;
  max: number;
  min?: number;
}

// ── Theme-aware chart palette ──────────────────────────────────────────────────

const CHART_COLORS: Record<
  ThemeName,
  { bg: string; grid: string; text: string; border: string; tooltip: string }
> = {
  dark: {
    bg: "#121a2e",
    grid: "#1c2840",
    text: "#7a8da8",
    border: "#1c2840",
    tooltip: "#0d1220",
  },
  dim: {
    bg: "#1c2945",
    grid: "#283a5c",
    text: "#7a92b8",
    border: "#283a5c",
    tooltip: "#162038",
  },
  light: {
    bg: "#ffffff",
    grid: "#dfe7f5",
    text: "#4a5e78",
    border: "#c8d4ec",
    tooltip: "#f8fafe",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtOas(v: number | null | undefined): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function fmtCell(v: number | null | undefined): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "—";
  return n.toFixed(2);
}

function fmtChange(v: number | null | undefined): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

function getChangeClass(v: number | null | undefined): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "sv-text-muted";
  if (n > 0) return "sv-text-loss font-semibold";
  if (n < 0) return "sv-text-gain font-semibold";
  return "sv-text-muted";
}

function periodLabel(key: string): string {
  const map: Record<string, string> = {
    "3_Month": "3M",
    "1_Year": "1Y",
    "5_Year": "5Y",
    "20_Year": "20Y",
  };
  return map[key] ?? key;
}

// ── Shared table styles ────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.7rem",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--sv-text-secondary)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--sv-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.7rem",
  borderBottom: "1px solid var(--sv-border-light)",
  verticalAlign: "middle",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div
    className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted"
    style={{ height: "200px" }}
  >
    <i className={`pi ${icon}`} style={{ fontSize: "2.5rem", opacity: 0.2 }} />
    <span style={{ fontSize: "0.85rem" }}>{text}</span>
  </div>
);

const StatPill: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="text-center">
    <div className="sv-info-label" style={{ fontSize: "0.66rem" }}>
      {label}
    </div>
    <div
      className="font-bold"
      style={{
        fontSize: "0.9rem",
        color: color ?? "var(--sv-text-primary)",
      }}
    >
      {value}
    </div>
  </div>
);

const PercentileBadge: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null || isNaN(Number(value))) {
    return <span className="sv-text-muted">—</span>;
  }
  const t = Number(value);
  let bg: string, textColor: string;
  if (t < 0.2) {
    bg = "rgba(34,197,94,0.18)";
    textColor = "var(--sv-gain)";
  } else if (t < 0.4) {
    bg = "rgba(34,197,94,0.10)";
    textColor = "var(--sv-gain)";
  } else if (t < 0.6) {
    bg = "rgba(245,166,35,0.14)";
    textColor = "var(--sv-warning)";
  } else if (t < 0.8) {
    bg = "rgba(239,68,68,0.14)";
    textColor = "var(--sv-loss)";
  } else {
    bg = "rgba(239,68,68,0.25)";
    textColor = "var(--sv-loss)";
  }
  return (
    <div className="flex flex-column align-items-center gap-1">
      <span
        className="font-bold text-center border-round"
        style={{
          display: "inline-block",
          background: bg,
          color: textColor,
          padding: "0.15rem 0.45rem",
          fontSize: "0.78rem",
          minWidth: "2.6rem",
        }}
      >
        {(t * 100).toFixed(0)}%
      </span>
      <div
        className="border-round-xl overflow-hidden"
        style={{
          width: "2.6rem",
          height: "3px",
          background: "var(--sv-border)",
        }}
      >
        <div
          style={{
            width: `${t * 100}%`,
            height: "100%",
            background: textColor,
            borderRadius: "99px",
          }}
        />
      </div>
    </div>
  );
};

// Intra-credit spread matrix table
interface IntraCreditTableProps {
  title: string;
  subtitle: string;
  data: IntraCreditRow[];
  symbols: string[];
  symNameMap: SymNameMap;
  loading: boolean;
  mode: "value" | "change";
}

const IntraCreditTable: React.FC<IntraCreditTableProps> = ({
  title,
  subtitle,
  data,
  symbols,
  symNameMap,
  loading,
  mode,
}) => (
  <div
    className="flex flex-column overflow-hidden h-full surface-card border-1 surface-border border-round-lg"
    style={{ boxShadow: "var(--sv-shadow-md)" }}
  >
    <div className="flex align-items-start justify-content-between gap-3 px-3 pt-3 pb-2 border-bottom-1 surface-border">
      <div>
        <div className="font-bold" style={{ fontSize: "0.88rem" }}>
          {title}
        </div>
        <div className="sv-text-muted mt-1" style={{ fontSize: "0.73rem" }}>
          {subtitle}
        </div>
      </div>
      {mode === "change" && (
        <div className="flex gap-3 align-items-center flex-shrink-0">
          <LegendDot color="var(--sv-gain)" label="Tightened" />
          <LegendDot color="var(--sv-loss)" label="Widened" />
        </div>
      )}
    </div>
    <div className="overflow-x-auto">
      {loading ? (
        <div className="p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="2rem" borderRadius="0.3rem" className="mb-2" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon="pi-table" text="No data available" />
      ) : (
        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.81rem" }}>
          <thead>
            <tr className="surface-section sticky top-0 z-1">
              <th style={{ ...thStyle, textAlign: "left" }}>Rating</th>
              {symbols.map((sym) => (
                <th key={sym} style={{ ...thStyle, textAlign: "center" }}>
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.symbol as string}
                className={i % 2 === 0 ? "" : "surface-section"}
              >
                <td style={{ ...tdStyle, minWidth: "7rem" }}>
                  <div className="font-bold" style={{ color: "var(--sv-text-primary)" }}>
                    {row.symbol as string}
                  </div>
                  <div className="sv-text-muted" style={{ fontSize: "0.68rem" }}>
                    {symNameMap[row.symbol as string] ?? ""}
                  </div>
                </td>
                {symbols.map((sym) => {
                  const v = row[sym] as number | null;
                  return (
                    <td
                      key={sym}
                      className={mode === "change" ? `text-center ${getChangeClass(v)}` : "text-center"}
                      style={{
                        ...tdStyle,
                        fontSize: "0.82rem",
                      }}
                    >
                      {mode === "value" ? fmtCell(v) : fmtChange(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex align-items-center gap-1">
    <div
      className="border-circle flex-shrink-0"
      style={{ width: "8px", height: "8px", background: color }}
    />
    <span className="sv-text-muted" style={{ fontSize: "0.7rem" }}>{label}</span>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const CreditSpreadReportPage: React.FC = () => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];

  const [data, setData] = useState<CreditSpreadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selSymbol, setSelSymbol] = useState<string | null>(null);
  const [histData, setHistData] = useState<HistDataPoint[] | null>(null);
  const [histStats, setHistStats] = useState<HistStats | null>(null);
  const [histLoading, setHistLoading] = useState(false);

  // ── Fetch main data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/fred_api/oas_data/intra_credit_yield_spreads");
      if (res.data?.error) {
        setError("Issue in server. Contact Support.");
        return;
      }
      const d: CreditSpreadResponse = res.data;
      setData(d);
      if (d.sym_name_map) {
        setSelSymbol(Object.keys(d.sym_name_map)[0] ?? null);
      }
    } catch {
      setError("Failed to load credit spread data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Fetch historical data for selected symbol ────────────────────────────────

  useEffect(() => {
    if (!selSymbol) return;
    setHistData(null);
    setHistStats(null);
    setHistLoading(true);
    api
      .get(`/fred_api/oas_data/historical/${selSymbol}/20year`)
      .then((res) => {
        if (res.data?.data && res.data?.stats) {
          const sorted = [...(res.data.data as HistDataPoint[])].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setHistData(sorted);
          setHistStats(res.data.stats as HistStats);
        }
      })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [selSymbol]);

  // ── Chart options ────────────────────────────────────────────────────────────

  const chartOptions = useMemo((): Highcharts.Options => {
    if (!histData || !histStats) return {};
    const categories = histData.map((d) => d.date);
    const seriesData = histData.map((d) => d.spread);
    const symName = data?.sym_name_map?.[selSymbol ?? ""] ?? "";

    return {
      chart: {
        backgroundColor: cc.bg,
        height: 330,
        animation: false,
        style: { fontFamily: "Inter, sans-serif" },
        spacingTop: 10,
        spacingBottom: 8,
        spacingLeft: 4,
        spacingRight: 12,
      },
      title: { text: "" },
      subtitle: {
        text: `${selSymbol}${symName ? ` · ${symName}` : ""} — 20-Year Historical OAS`,
        style: { color: cc.text, fontSize: "0.78rem" },
        align: "left",
        x: 8,
        y: 6,
      },
      credits: { enabled: false },
      exporting: { enabled: false },
      accessibility: { enabled: false },
      xAxis: {
        categories,
        tickInterval: Math.ceil(categories.length / 8),
        labels: {
          rotation: -35,
          style: { color: cc.text, fontSize: "10px" },
        },
        lineColor: cc.border,
        tickColor: cc.border,
      },
      yAxis: {
        title: {
          text: "Spread Over US Treasury (%)",
          style: { color: cc.text, fontSize: "11px" },
        },
        gridLineColor: cc.grid,
        labels: {
          format: "{value:.2f}",
          style: { color: cc.text },
        },
        max: histStats.max,
        endOnTick: false,
        plotLines: [
          {
            color: cc.text,
            width: 1.5,
            dashStyle: "Dash",
            value: histStats.mean,
            label: {
              text: `20Y Avg: ${histStats.mean.toFixed(2)}%`,
              style: { color: cc.text, fontSize: "11px", fontWeight: "600" },
              align: "right",
              x: -10,
            },
          },
        ],
        plotBands: [
          {
            color: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(239,68,68,0.22)"],
                [1, "rgba(239,68,68,0.04)"],
              ],
            } as Highcharts.GradientColorObject,
            from: histStats.mean,
            to: histStats.max * 1.1,
          },
          {
            color: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(34,197,94,0.04)"],
                [1, "rgba(34,197,94,0.20)"],
              ],
            } as Highcharts.GradientColorObject,
            from: 0,
            to: histStats.mean,
          },
        ],
      },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: cc.tooltip,
        borderColor: cc.border,
        style: { color: cc.text },
        pointFormat: "Spread: <b>{point.y:.2f}%</b>",
      },
      series: [
        {
          type: "line",
          name: selSymbol ?? "",
          data: seriesData,
          color: "#3b82f6",
          lineWidth: 1.5,
          marker: { enabled: false },
        },
      ],
      plotOptions: {
        series: {
          turboThreshold: 5000,
          animation: false,
        },
      },
    };
  }, [histData, histStats, cc, selSymbol, data]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const symNameMap = data?.sym_name_map ?? {};
  const icsPercentiles = data?.sym_oas_percentiles?.data ?? [];
  const periods = data?.periods ?? [];
  const symbols = data?.symbols ?? [];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sv-page-min-h">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex align-items-start justify-content-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="flex align-items-center gap-2 mb-1">
            <span
              className="font-bold border-round"
              style={{
                background: "var(--sv-accent-gradient)",
                padding: "0.2rem 0.55rem",
                fontSize: "0.65rem",
                color: "var(--sv-text-inverse)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              FRED
            </span>
            <h1 className="m-0 font-bold sv-page-title" style={{ fontSize: "1.35rem" }}>
              Corporate Credit Spreads
            </h1>
          </div>
          <p className="m-0 text-sm sv-text-muted">
            Option-Adjusted Spreads (OAS) vs US Treasuries · Bank of America indices ·
            Federal Reserve Economic Data
          </p>
        </div>
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          size="small"
          severity="secondary"
          loading={loading}
          onClick={fetchData}
          tooltip="Reload latest data"
          tooltipOptions={{ position: "left" }}
        />
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="sv-alert-error flex align-items-center gap-2 border-round p-3 mb-4 text-sm">
          <i className="pi pi-exclamation-triangle" />
          {error}
        </div>
      )}

      {/* ── Top Section: Percentiles + Chart ─────────────────────────────────── */}
      <div className="grid mb-3">
        {/* Left: OAS Percentile Rankings */}
        <div className="col-12 lg:col-5" style={{ minWidth: 0 }}>
          <div
            className="flex flex-column overflow-hidden h-full surface-card border-1 surface-border border-round-lg"
            style={{ boxShadow: "var(--sv-shadow-md)" }}
          >
            {/* Card Header */}
            <div className="px-3 pt-3 pb-2 border-bottom-1 surface-border">
              <div className="flex align-items-center justify-content-between">
                <div className="font-bold" style={{ fontSize: "0.88rem" }}>
                  OAS Percentile Rankings
                </div>
                <div className="flex gap-1">
                  {["3M", "1Y", "5Y", "20Y"].map((p) => (
                    <span
                      key={p}
                      className="font-semibold border-round surface-section border-1 surface-border"
                      style={{
                        fontSize: "0.66rem",
                        padding: "0.15rem 0.4rem",
                        color: "var(--sv-text-secondary)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sv-text-muted mt-1" style={{ fontSize: "0.73rem" }}>
                Click a row to load its 20-year history · Lower % = tighter spread = less stressed
              </div>
            </div>

            {/* Percentiles Table */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} height="2.4rem" borderRadius="0.3rem" className="mb-2" />
                  ))}
                </div>
              ) : icsPercentiles.length === 0 ? (
                <EmptyState icon="pi-chart-bar" text="No data available" />
              ) : (
                <table
                  className="w-full"
                  style={{ borderCollapse: "collapse", fontSize: "0.82rem" }}
                >
                  <thead>
                    <tr className="surface-section sticky top-0 z-1">
                      <th style={{ ...thStyle, textAlign: "left" }}>Symbol</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        <span
                          id="oas-tip"
                          className="cursor-help"
                          style={{ borderBottom: "1px dashed var(--sv-text-muted)" }}
                        >
                          OAS
                        </span>
                      </th>
                      {periods.map((p) => (
                        <th key={p.key} style={{ ...thStyle, textAlign: "center" }}>
                          {periodLabel(p.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {icsPercentiles.map((row, i) => {
                      const isSelected = row.symbol === selSymbol;
                      return (
                        <tr
                          key={row.symbol}
                          className="cursor-pointer"
                          onClick={() => setSelSymbol(row.symbol)}
                          style={{
                            background: isSelected
                              ? "var(--sv-accent-bg)"
                              : i % 2 === 0
                              ? "transparent"
                              : "var(--sv-bg-surface)",
                            borderLeft: isSelected
                              ? "3px solid var(--sv-accent)"
                              : "3px solid transparent",
                            transition: "background 0.12s",
                          }}
                        >
                          <td style={{ ...tdStyle, paddingLeft: "0.5rem" }}>
                            <div
                              className="font-bold"
                              style={{
                                color: isSelected ? "var(--sv-accent)" : "var(--sv-text-primary)",
                                letterSpacing: "0.03em",
                                fontSize: "0.84rem",
                              }}
                            >
                              {row.symbol}
                            </div>
                            <div className="sv-text-muted mt-1" style={{ fontSize: "0.67rem" }}>
                              {symNameMap[row.symbol] ?? ""}
                            </div>
                          </td>
                          <td
                            className="text-right font-semibold"
                            style={{
                              ...tdStyle,
                              fontSize: "0.86rem",
                              color: "var(--sv-text-primary)",
                            }}
                          >
                            {fmtOas(row.current_oas)}
                          </td>
                          {periods.map((p) => (
                            <td key={p.key} className="text-center" style={tdStyle}>
                              <PercentileBadge value={row[p.key] as number} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right: Historical Chart */}
        <div className="col-12 lg:col-7" style={{ minWidth: 0 }}>
          <div
            className="flex flex-column overflow-hidden h-full surface-card border-1 surface-border border-round-lg"
            style={{ boxShadow: "var(--sv-shadow-md)" }}
          >
            {/* Card Header */}
            <div className="flex align-items-center justify-content-between gap-3 px-3 pt-3 pb-2 border-bottom-1 surface-border">
              <div>
                <div className="font-bold" style={{ fontSize: "0.88rem" }}>
                  20-Year Historical Spread
                </div>
                <div className="sv-text-muted mt-1" style={{ fontSize: "0.73rem" }}>
                  {selSymbol && symNameMap[selSymbol]
                    ? `${selSymbol} · ${symNameMap[selSymbol]}`
                    : "Select a row to explore history"}
                </div>
              </div>
              {selSymbol && histStats && (
                <div className="flex gap-4 flex-shrink-0 pr-1">
                  <StatPill label="20Y Avg" value={`${histStats.mean.toFixed(2)}%`} />
                  <StatPill
                    label="Max"
                    value={`${histStats.max.toFixed(2)}%`}
                    color="var(--sv-loss)"
                  />
                  {histStats.min != null && (
                    <StatPill
                      label="Min"
                      value={`${histStats.min.toFixed(2)}%`}
                      color="var(--sv-gain)"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Chart area */}
            <div className="flex-1 py-1">
              {histLoading ? (
                <div className="p-4">
                  <Skeleton height="310px" borderRadius="0.5rem" />
                </div>
              ) : histData ? (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              ) : (
                <EmptyState
                  icon="pi-chart-line"
                  text="Select a symbol from the table to view its 20-year spread history"
                />
              )}
            </div>

            {/* Chart legend */}
            {histData && (
              <div
                className="flex gap-3 px-3 py-2"
                style={{ borderTop: "1px solid var(--sv-border-light)" }}
              >
                <ChartLegendItem color="rgba(239,68,68,0.22)" label="Above avg — elevated risk" />
                <ChartLegendItem color="rgba(34,197,94,0.18)" label="Below avg — compressed spread" />
                <ChartLegendItem color={cc.text} label="20Y average" dashed />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Intra-Credit Spread Tables ───────────────────────── */}
      <div className="grid">
        <div className="col-12 md:col-6">
          <IntraCreditTable
            title="Intra Credit Spread"
            subtitle={
              data?.intra_credit_spread_last?.date
                ? `As of ${data.intra_credit_spread_last.date}`
                : "Latest available"
            }
            data={data?.intra_credit_spread_last?.data ?? []}
            symbols={symbols}
            symNameMap={symNameMap}
            loading={loading}
            mode="value"
          />
        </div>
        <div className="col-12 md:col-6">
          <IntraCreditTable
            title="4-Week Spread Change"
            subtitle={
              data?.intra_credit_spread_change_4wk?.date
                ? `Since ${data.intra_credit_spread_change_4wk.date}`
                : "4-week rolling change"
            }
            data={data?.intra_credit_spread_change_4wk?.data ?? []}
            symbols={symbols}
            symNameMap={symNameMap}
            loading={loading}
            mode="change"
          />
        </div>
      </div>

      {/* ── Tooltip ──────────────────────────────────────────────────────────── */}
      <Tooltip
        target="#oas-tip"
        content="Option-Adjusted Spread (OAS): Yield difference between a corporate bond index and an equivalent-maturity US Treasury. Source: Bank of America / Federal Reserve FRED."
        position="top"
      />
    </div>
  );
};

// Tiny chart legend helper
const ChartLegendItem: React.FC<{
  color: string;
  label: string;
  dashed?: boolean;
}> = ({ color, label, dashed }) => (
  <div className="flex align-items-center gap-1">
    <div
      className="border-round"
      style={{
        width: "22px",
        height: "3px",
        background: color,
        borderTop: dashed ? `1.5px dashed ${color}` : undefined,
        opacity: 0.85,
      }}
    />
    <span className="sv-text-muted" style={{ fontSize: "0.69rem" }}>{label}</span>
  </div>
);

export default CreditSpreadReportPage;
