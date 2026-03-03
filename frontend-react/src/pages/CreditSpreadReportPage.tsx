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

function getChangeStyle(v: number | null | undefined): React.CSSProperties {
  const n = Number(v);
  if (v == null || isNaN(n)) return { color: "var(--sv-text-muted)" };
  if (n > 0) return { color: "var(--sv-loss)", fontWeight: 600 };
  if (n < 0) return { color: "var(--sv-gain)", fontWeight: 600 };
  return { color: "var(--sv-text-muted)" };
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
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      gap: "0.75rem",
      color: "var(--sv-text-muted)",
    }}
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
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        fontSize: "0.66rem",
        color: "var(--sv-text-muted)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: "0.9rem",
        fontWeight: 700,
        color: color ?? "var(--sv-text-primary)",
        fontFamily: "monospace",
      }}
    >
      {value}
    </div>
  </div>
);

const PercentileBadge: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null || isNaN(Number(value))) {
    return <span style={{ color: "var(--sv-text-muted)" }}>—</span>;
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
      <span
        style={{
          display: "inline-block",
          background: bg,
          color: textColor,
          borderRadius: "0.3rem",
          padding: "0.15rem 0.45rem",
          fontWeight: 700,
          fontSize: "0.78rem",
          fontFamily: "monospace",
          minWidth: "2.6rem",
          textAlign: "center",
        }}
      >
        {(t * 100).toFixed(0)}%
      </span>
      <div
        style={{
          width: "2.6rem",
          height: "3px",
          borderRadius: "99px",
          background: "var(--sv-border)",
          overflow: "hidden",
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
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: "0.75rem",
      overflow: "hidden",
      boxShadow: "var(--sv-shadow-md)",
    }}
  >
    <div
      style={{
        padding: "0.875rem 1rem 0.65rem",
        borderBottom: "1px solid var(--sv-border)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}
    >
      <div>
        <div
          style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--sv-text-primary)" }}
        >
          {title}
        </div>
        <div
          style={{ fontSize: "0.73rem", color: "var(--sv-text-muted)", marginTop: "0.15rem" }}
        >
          {subtitle}
        </div>
      </div>
      {mode === "change" && (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
          <LegendDot color="var(--sv-gain)" label="Tightened" />
          <LegendDot color="var(--sv-loss)" label="Widened" />
        </div>
      )}
    </div>
    <div style={{ overflowX: "auto" }}>
      {loading ? (
        <div style={{ padding: "0.75rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="2rem" borderRadius="0.3rem" className="mb-2" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon="pi-table" text="No data available" />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.81rem" }}>
          <thead>
            <tr
              style={{
                background: "var(--sv-bg-surface)",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
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
                style={{
                  background:
                    i % 2 === 0 ? "transparent" : "var(--sv-bg-surface)",
                }}
              >
                <td style={{ ...tdStyle, minWidth: "7rem" }}>
                  <div style={{ fontWeight: 700, color: "var(--sv-text-primary)" }}>
                    {row.symbol as string}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)" }}>
                    {symNameMap[row.symbol as string] ?? ""}
                  </div>
                </td>
                {symbols.map((sym) => {
                  const v = row[sym] as number | null;
                  return (
                    <td
                      key={sym}
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        fontFamily: "monospace",
                        fontSize: "0.82rem",
                        ...(mode === "change" ? getChangeStyle(v) : {}),
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
  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
    <span style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)" }}>{label}</span>
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
    <div style={{ padding: "1.25rem 1.5rem", minHeight: "100vh" }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              marginBottom: "0.3rem",
            }}
          >
            <span
              style={{
                background: "var(--sv-accent-gradient)",
                borderRadius: "0.35rem",
                padding: "0.2rem 0.55rem",
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "var(--sv-text-inverse)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              FRED
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--sv-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Corporate Credit Spreads
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--sv-text-muted)" }}>
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
        <div
          style={{
            background: "var(--sv-danger-bg)",
            border: "1px solid var(--sv-danger)",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            color: "var(--sv-danger)",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <i className="pi pi-exclamation-triangle" />
          {error}
        </div>
      )}

      {/* ── Top Section: Percentiles + Chart ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {/* Left: OAS Percentile Rankings */}
        <div
          style={{
            background: "var(--sv-bg-card)",
            border: "1px solid var(--sv-border)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            boxShadow: "var(--sv-shadow-md)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: "0.875rem 1rem 0.65rem",
              borderBottom: "1px solid var(--sv-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "var(--sv-text-primary)",
                }}
              >
                OAS Percentile Rankings
              </div>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {["3M", "1Y", "5Y", "20Y"].map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: "0.66rem",
                      fontWeight: 600,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "0.25rem",
                      background: "var(--sv-bg-surface)",
                      color: "var(--sv-text-secondary)",
                      border: "1px solid var(--sv-border)",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                fontSize: "0.73rem",
                color: "var(--sv-text-muted)",
                marginTop: "0.2rem",
              }}
            >
              Click a row to load its 20-year history · Lower % = tighter spread = less stressed
            </div>
          </div>

          {/* Percentiles Table */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: "0.75rem" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    height="2.4rem"
                    borderRadius="0.3rem"
                    className="mb-2"
                  />
                ))}
              </div>
            ) : icsPercentiles.length === 0 ? (
              <EmptyState icon="pi-chart-bar" text="No data available" />
            ) : (
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--sv-bg-surface)",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <th style={{ ...thStyle, textAlign: "left" }}>Symbol</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      <span
                        id="oas-tip"
                        style={{
                          borderBottom: "1px dashed var(--sv-text-muted)",
                          cursor: "help",
                        }}
                      >
                        OAS
                      </span>
                    </th>
                    {periods.map((p) => (
                      <th
                        key={p.key}
                        style={{ ...thStyle, textAlign: "center" }}
                      >
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
                        onClick={() => setSelSymbol(row.symbol)}
                        style={{
                          cursor: "pointer",
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
                            style={{
                              fontWeight: 700,
                              color: isSelected
                                ? "var(--sv-accent)"
                                : "var(--sv-text-primary)",
                              letterSpacing: "0.03em",
                              fontSize: "0.84rem",
                            }}
                          >
                            {row.symbol}
                          </div>
                          <div
                            style={{
                              fontSize: "0.67rem",
                              color: "var(--sv-text-muted)",
                              marginTop: "0.05rem",
                            }}
                          >
                            {symNameMap[row.symbol] ?? ""}
                          </div>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            fontSize: "0.86rem",
                            color: "var(--sv-text-primary)",
                          }}
                        >
                          {fmtOas(row.current_oas)}
                        </td>
                        {periods.map((p) => (
                          <td
                            key={p.key}
                            style={{ ...tdStyle, textAlign: "center" }}
                          >
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

        {/* Right: Historical Chart */}
        <div
          style={{
            background: "var(--sv-bg-card)",
            border: "1px solid var(--sv-border)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            boxShadow: "var(--sv-shadow-md)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: "0.875rem 1rem 0.65rem",
              borderBottom: "1px solid var(--sv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "var(--sv-text-primary)",
                }}
              >
                20-Year Historical Spread
              </div>
              <div
                style={{
                  fontSize: "0.73rem",
                  color: "var(--sv-text-muted)",
                  marginTop: "0.15rem",
                }}
              >
                {selSymbol && symNameMap[selSymbol]
                  ? `${selSymbol} · ${symNameMap[selSymbol]}`
                  : "Select a row to explore history"}
              </div>
            </div>
            {selSymbol && histStats && (
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  flexShrink: 0,
                  paddingRight: "0.25rem",
                }}
              >
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
          <div style={{ flex: 1, padding: "0.35rem 0" }}>
            {histLoading ? (
              <div style={{ padding: "1rem 1.25rem" }}>
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
              style={{
                display: "flex",
                gap: "1rem",
                padding: "0.4rem 1rem 0.65rem",
                borderTop: "1px solid var(--sv-border-light)",
              }}
            >
              <ChartLegendItem color="rgba(239,68,68,0.22)" label="Above avg — elevated risk" />
              <ChartLegendItem color="rgba(34,197,94,0.18)" label="Below avg — compressed spread" />
              <ChartLegendItem color={cc.text} label="20Y average" dashed />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Intra-Credit Spread Tables ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
    <div
      style={{
        width: "22px",
        height: "3px",
        background: color,
        borderRadius: "2px",
        borderTop: dashed ? `1.5px dashed ${color}` : undefined,
        opacity: 0.85,
      }}
    />
    <span style={{ fontSize: "0.69rem", color: "var(--sv-text-muted)" }}>{label}</span>
  </div>
);

export default CreditSpreadReportPage;
