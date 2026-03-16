import React, { useState, useEffect, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";
import SymbolHistoricalChart from "@/components/common/SymbolHistoricalChart";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SymbolData {
  symbol: string;
  companyName?: string;
  price?: number;
  priceChange?: number | string;
  priceChangePct?: number;
  volume?: number;
  marketCap?: number | string;
  sector?: string;
  // Performance
  mom?: number;
  wtd?: number;
  mtd?: number;
  qtd?: number;
  ytd?: number;
  change_oneMonth_pct?: number;
  change_oneyearbeforedate_pct?: number;
  priceChange2Year?: number;
  priceChange3Year?: number;
  // Technicals
  rsi?: number;
  macdhist?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  week_high_52?: number;
  week_low_52?: number;
  beta?: number;
  // Fundamentals
  trailingPE?: number;
  priceToBook?: number;
  trailingEps?: number;
  profitMargins?: number;
  dividendYield?: number;
}

type ViewMode = "chart" | "table";
type ChartType = "column" | "heatmap" | "line";
type TableType = "overview" | "performance" | "technicals" | "fundamentals";

interface ChartMetric {
  key: keyof SymbolData;
  label: string;
  format: "percent" | "decimal";
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CHART_METRICS: ChartMetric[] = [
  { key: "mom", label: "Momentum", format: "decimal" },
  { key: "priceChangePct", label: "Day Chg %", format: "percent" },
  { key: "mtd", label: "MTD %", format: "percent" },
  { key: "qtd", label: "QTD %", format: "percent" },
  { key: "ytd", label: "YTD %", format: "percent" },
  { key: "change_oneMonth_pct", label: "1 Month %", format: "percent" },
  { key: "change_oneyearbeforedate_pct", label: "1 Year %", format: "percent" },
];

const CHART_THEME: Record<
  ThemeName,
  {
    bg: string;
    grid: string;
    label: string;
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
  }
> = {
  dark: {
    bg: "transparent",
    grid: "#1c2840",
    label: "#7a8da8",
    tooltipBg: "#0d1220",
    tooltipBorder: "#1c2840",
    tooltipText: "#e8edf5",
  },
  dim: {
    bg: "transparent",
    grid: "#2a3244",
    label: "#8899b0",
    tooltipBg: "#1a2030",
    tooltipBorder: "#2a3244",
    tooltipText: "#dde4f0",
  },
  light: {
    bg: "transparent",
    grid: "#e5e9f0",
    label: "#6b7a8d",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d0d7e2",
    tooltipText: "#1a2030",
  },
};

const GAIN_COLOR: Record<ThemeName, string> = {
  dark: "#22c55e",
  dim: "#22c55e",
  light: "#16a34a",
};

const LOSS_COLOR: Record<ThemeName, string> = {
  dark: "#ef4444",
  dim: "#ef4444",
  light: "#dc2626",
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function fmtVal(v: number | undefined, format: "percent" | "decimal"): string {
  if (v == null || isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n >= 0 ? "+" : "";
  return format === "percent"
    ? `${sign}${n.toFixed(2)}%`
    : `${sign}${n.toFixed(2)}`;
}

function fmtCurrency(v: number | undefined): string {
  if (v == null || isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtLargeNum(v: number | undefined): string {
  if (v == null || isNaN(Number(v))) return "—";
  const n = Number(v);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtDecimal(v: number | undefined): string {
  if (v == null || isNaN(Number(v))) return "—";
  return Number(v).toFixed(2);
}

function pctClass(v: number | undefined): string {
  if (v == null || isNaN(Number(v))) return "sv-text-muted";
  return Number(v) >= 0 ? "sv-text-gain" : "sv-text-loss";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const PillGroup = <T extends string>({
  options,
  active,
  onSelect,
}: {
  options: { value: T; label: string }[];
  active: T;
  onSelect: (v: T) => void;
}) => (
  <div
    style={{
      display: "inline-flex",
      background: "var(--sv-bg-input)",
      borderRadius: "0.45rem",
      padding: "2px",
      gap: "2px",
    }}
  >
    {options.map(({ value, label }) => {
      const isActive = value === active;
      return (
        <button
          key={value}
          onClick={() => onSelect(value)}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "0.22rem 0.65rem",
            borderRadius: "0.35rem",
            fontSize: "0.72rem",
            fontFamily: "inherit",
            fontWeight: isActive ? 700 : 400,
            color: isActive ? "var(--sv-accent)" : "var(--sv-text-secondary)",
            background: isActive ? "var(--sv-bg-card)" : "transparent",
            transition: "all 0.12s",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatChip — one summary insight card
// ─────────────────────────────────────────────────────────────────────────────

const StatChip: React.FC<{
  icon: string;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color }) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      borderRadius: "0.65rem",
      padding: "0.55rem 1rem",
      border: "1px solid var(--sv-border)",
      display: "flex",
      alignItems: "center",
      gap: "0.65rem",
      flex: "1 1 130px",
      minWidth: "120px",
    }}
  >
    <i
      className={`pi ${icon}`}
      style={{
        fontSize: "1.05rem",
        color: color ?? "var(--sv-text-muted)",
        flexShrink: 0,
      }}
    />
    <div>
      <div
        style={{
          fontSize: "0.62rem",
          color: "var(--sv-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          color: color ?? "var(--sv-text-primary)",
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface StockRadarPanelProps {
  symbols: string[];
  title?: string;
  onSymbolClick?: (symbol: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const StockRadarPanel: React.FC<StockRadarPanelProps> = ({
  symbols,
  title = "Stock Radar",
  onSymbolClick,
}) => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme];

  const [data, setData] = useState<SymbolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("table");
  const [chartType, setChartType] = useState<ChartType>("column");
  const [tableType, setTableType] = useState<TableType>("performance");
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>(
    CHART_METRICS[2], // MTD by default
  );

  // ── Fetch data ──────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbols.length) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData([]);

    api
      .post("/symbol/fundamental_technical/NA", JSON.stringify(symbolsKey))
      .then(({ data: res }) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived summary stats ────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!data.length) return null;
    const gainers = data.filter((d) => (d.priceChangePct ?? 0) > 0).length;
    const avgYtd = data.reduce((s, d) => s + (d.ytd ?? 0), 0) / data.length;
    const byYtd = [...data].sort((a, b) => (b.ytd ?? 0) - (a.ytd ?? 0));
    const avgMom = data.reduce((s, d) => s + (d.mom ?? 0), 0) / data.length;
    return {
      total: data.length,
      gainers,
      avgYtd,
      best: byYtd[0],
      avgMom,
    };
  }, [data]);

  // ── Column chart options ─────────────────────────────────────────────────

  const columnChartOptions = useMemo((): Highcharts.Options => {
    const sorted = [...data].sort(
      (a, b) =>
        Number(b[selectedMetric.key] ?? 0) - Number(a[selectedMetric.key] ?? 0),
    );
    const gainC = GAIN_COLOR[theme];
    const lossC = LOSS_COLOR[theme];
    return {
      chart: {
        type: "column",
        backgroundColor: ct.bg,
        height: 340,
        spacing: [12, 8, 16, 8],
        animation: false,
      },
      title: { text: undefined },
      xAxis: {
        categories: sorted.map((d) => d.symbol),
        labels: {
          style: {
            color: ct.label,
            fontSize: sorted.length > 20 ? "8px" : "10px",
            fontWeight: "600",
          },
          rotation: sorted.length > 15 ? -45 : 0,
        },
        lineColor: ct.grid,
        tickColor: ct.grid,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: ct.grid,
        labels: {
          style: { color: ct.label, fontSize: "9px" },
          formatter: function () {
            const v = this.value as number;
            return selectedMetric.format === "percent"
              ? `${v.toFixed(1)}%`
              : v.toFixed(1);
          },
        },
        plotLines: [
          { value: 0, color: ct.label, width: 1, dashStyle: "Solid" },
        ],
      },
      series: [
        {
          type: "column",
          name: selectedMetric.label,
          data: sorted.map((d) => {
            const v = Number(d[selectedMetric.key] ?? 0);
            return {
              y: v,
              color: v >= 0 ? gainC : lossC,
              name: d.symbol,
            };
          }),
          borderRadius: 3,
          borderWidth: 0,
        } as Highcharts.SeriesColumnOptions,
      ],
      tooltip: {
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        style: { color: ct.tooltipText, fontSize: "12px" },
        formatter: function () {
          const v = this.y as number;
          const disp = fmtVal(v, selectedMetric.format);
          return `<b>${this.key}</b><br/>${selectedMetric.label}: <b>${disp}</b>`;
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      accessibility: { enabled: false },
      plotOptions: {
        column: {
          cursor: "pointer",
          point: {
            events: {
              click: function () {
                onSymbolClick?.(String(this.name));
              },
            },
          },
        },
      },
    };
  }, [data, selectedMetric, ct, theme, onSymbolClick]);

  // ── Heatmap grid ─────────────────────────────────────────────────────────

  const renderHeatmap = () => {
    if (!data.length) return null;
    const values = data.map((d) => Number(d[selectedMetric.key] ?? 0));
    const maxAbs = Math.max(...values.map(Math.abs), 0.01);

    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          padding: "0.5rem 0",
          minHeight: "280px",
          alignContent: "flex-start",
        }}
      >
        {data.map((d) => {
          const v = Number(d[selectedMetric.key] ?? 0);
          const intensity = Math.min(Math.abs(v) / maxAbs, 1);
          const bgColor =
            v >= 0
              ? `rgba(34,197,94,${0.12 + intensity * 0.68})`
              : `rgba(239,68,68,${0.12 + intensity * 0.68})`;
          const textBright = intensity > 0.45;
          return (
            <div
              key={d.symbol}
              onClick={() => onSymbolClick?.(d.symbol)}
              title={`${d.symbol}: ${fmtVal(v, selectedMetric.format)}`}
              style={{
                background: bgColor,
                borderRadius: "0.55rem",
                padding: "0.55rem 0.85rem",
                minWidth: "76px",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.07)",
                transition: "transform 0.1s, box-shadow 0.1s",
                textAlign: "center",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                  "scale(1.06)";
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "var(--sv-shadow-md)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                  "scale(1)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  color: textBright ? "#fff" : "var(--sv-text-primary)",
                }}
              >
                {d.symbol}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  marginTop: "0.15rem",
                  color: textBright
                    ? v >= 0
                      ? "#dcfce7"
                      : "#fee2e2"
                    : "var(--sv-text-secondary)",
                }}
              >
                {fmtVal(v, selectedMetric.format)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Table cell renderers ─────────────────────────────────────────────────

  const symBody = (row: SymbolData) => (
    <span
      className="sv-text-accent font-semibold cursor-pointer"
      style={{ fontSize: "0.82rem" }}
      onClick={() => onSymbolClick?.(row.symbol)}
    >
      {row.symbol}
    </span>
  );

  const pctBody =
    (field: keyof SymbolData) =>
    (row: SymbolData): React.ReactNode => {
      const v = row[field] as number | undefined;
      return (
        <span className={pctClass(v)} style={{ fontSize: "0.8rem" }}>
          {fmtVal(v, "percent")}
        </span>
      );
    };

  const numBody =
    (field: keyof SymbolData, fmt: (v: number | undefined) => string) =>
    (row: SymbolData): React.ReactNode => {
      const v = row[field] as number | undefined;
      return (
        <span style={{ fontSize: "0.8rem", color: "var(--sv-text-secondary)" }}>
          {fmt(v)}
        </span>
      );
    };

  const rangeBar52W = (r: SymbolData): React.ReactNode => {
    const { week_low_52: low, week_high_52: high, price: current } = r;
    if (!low || !high || !current || high <= low)
      return <span className="sv-text-muted text-xs">—</span>;
    const pct = Math.min(
      100,
      Math.max(0, ((current - low) / (high - low)) * 100),
    );
    const markerColor =
      pct >= 75
        ? "var(--sv-gain)"
        : pct <= 25
          ? "var(--sv-loss)"
          : "var(--sv-accent)";
    const markerHex = pct >= 75 ? "#22c55e" : pct <= 25 ? "#ef4444" : "#6366f1";
    return (
      <div style={{ minWidth: 130 }}>
        <div style={{ position: "relative", marginBottom: "0.35rem" }}>
          <div
            style={{
              height: 7,
              borderRadius: 4,
              background:
                "linear-gradient(to right, #ef4444 0%, #f97316 25%, #6366f1 50%, #22c55e 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: `calc(${pct}% - 6px)`,
                top: -3,
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: markerColor,
                border: "2px solid var(--sv-bg-card)",
                boxShadow: `0 0 7px ${markerHex}80`,
              }}
            />
          </div>
        </div>
        <div
          className="flex justify-content-between"
          style={{ fontSize: "0.6rem" }}
        >
          <span style={{ color: "#ef4444" }}>{fmtCurrency(low)}</span>
          <span style={{ color: markerColor, fontWeight: 700 }}>
            {Math.round(pct)}%
          </span>
          <span style={{ color: "#22c55e" }}>{fmtCurrency(high)}</span>
        </div>
      </div>
    );
  };

  // ── Tables ───────────────────────────────────────────────────────────────

  const renderTable = () => {
    const skRows = Array.from({ length: 7 }, (_, i) => ({
      symbol: `_${i}`,
    }));
    const skBody = () => <Skeleton height="0.85rem" />;

    if (loading) {
      return (
        <DataTable value={skRows} size="small">
          {Array.from({ length: 7 }).map((_, i) => (
            <Column
              key={i}
              header={<Skeleton height="0.7rem" width="4rem" />}
              body={skBody}
            />
          ))}
        </DataTable>
      );
    }

    if (!data.length) return null;

    const frozenSym = (
      <Column
        key="sym"
        header="Symbol"
        field="symbol"
        body={symBody}
        style={{ width: "5.5rem", minWidth: "5.5rem" }}
        frozen
      />
    );

    if (tableType === "overview") {
      return (
        <DataTable
          value={data}
          size="small"
          scrollable
          scrollHeight="360px"
          rowHover
        >
          {frozenSym}
          <Column
            header="Name"
            field="name"
            style={{ minWidth: "10rem" }}
            body={(r: SymbolData) => (
              <span className="sv-text-muted" style={{ fontSize: "0.78rem" }}>
                {r.companyName ?? "—"}
              </span>
            )}
          />
          <Column
            header="Price"
            field="price"
            align="right"
            body={numBody("price", fmtCurrency)}
          />
          <Column
            header="1D Change"
            align="right"
            sortable
            sortField="priceChangePct"
            body={(r: SymbolData) => (
              <span
                className={pctClass(r.priceChangePct)}
                style={{ fontSize: "0.8rem" }}
              >
                {r.priceChange != null
                  ? (Number(r.priceChange) >= 0 ? "+" : "") +
                    Number(r.priceChange).toFixed(2) +
                    " "
                  : ""}
                ({fmtVal(r.priceChangePct, "percent")})
              </span>
            )}
          />
          <Column
            header="Mkt Cap"
            field="marketCap"
            align="right"
            body={numBody("marketCap", fmtLargeNum)}
          />
          <Column
            header="52W Range"
            style={{ minWidth: "9rem" }}
            body={rangeBar52W}
          />
          <Column
            header="Beta"
            field="beta"
            align="right"
            sortable
            body={(r: SymbolData) => (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--sv-text-secondary)",
                }}
              >
                {r.beta != null ? Number(r.beta).toFixed(2) : "—"}
              </span>
            )}
          />
          <Column
            header="Sector"
            field="sector"
            body={(r: SymbolData) => (
              <span className="sv-text-muted" style={{ fontSize: "0.75rem" }}>
                {r.sector ?? "—"}
              </span>
            )}
          />
        </DataTable>
      );
    }

    if (tableType === "performance") {
      return (
        <DataTable
          value={data}
          size="small"
          scrollable
          scrollHeight="360px"
          rowHover
          sortField="ytd"
          sortOrder={-1}
        >
          {frozenSym}
          <Column
            header="1D %"
            align="right"
            sortable
            sortField="priceChangePct"
            body={pctBody("priceChangePct")}
          />
          <Column
            header="WTD %"
            align="right"
            sortable
            sortField="wtd"
            body={pctBody("wtd")}
          />
          <Column
            header="MTD %"
            align="right"
            sortable
            sortField="mtd"
            body={pctBody("mtd")}
          />
          <Column
            header="QTD %"
            align="right"
            sortable
            sortField="qtd"
            body={pctBody("qtd")}
          />
          <Column
            header="YTD %"
            align="right"
            sortable
            sortField="ytd"
            body={pctBody("ytd")}
          />
          <Column
            header="1M %"
            align="right"
            sortable
            sortField="change_oneMonth_pct"
            body={pctBody("change_oneMonth_pct")}
          />
          <Column
            header="1Y %"
            align="right"
            sortable
            sortField="change_oneyearbeforedate_pct"
            body={pctBody("change_oneyearbeforedate_pct")}
          />
          <Column
            header="2Y %"
            align="right"
            sortable
            sortField="priceChange2Year"
            body={pctBody("priceChange2Year")}
          />
          <Column
            header="3Y %"
            align="right"
            sortable
            sortField="priceChange3Year"
            body={pctBody("priceChange3Year")}
          />
        </DataTable>
      );
    }

    if (tableType === "technicals") {
      return (
        <DataTable
          value={data}
          size="small"
          scrollable
          scrollHeight="360px"
          rowHover
          sortField="mom"
          sortOrder={-1}
        >
          {frozenSym}
          <Column
            header="Momentum"
            align="right"
            sortable
            sortField="mom"
            body={(r: SymbolData) => (
              <span
                className={pctClass(r.mom)}
                style={{ fontSize: "0.8rem", fontWeight: 600 }}
              >
                {fmtDecimal(r.mom)}
              </span>
            )}
          />
          <Column
            header="RSI"
            align="right"
            sortable
            sortField="rsi"
            body={(r: SymbolData) => {
              const v = r.rsi;
              const color =
                v == null
                  ? "var(--sv-text-muted)"
                  : v >= 70
                    ? "var(--sv-danger)"
                    : v <= 30
                      ? "var(--sv-success)"
                      : "var(--sv-text-secondary)";
              return (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color,
                    fontWeight: v != null && (v >= 70 || v <= 30) ? 700 : 400,
                  }}
                >
                  {fmtDecimal(v)}
                </span>
              );
            }}
          />
          <Column
            header="MACD Hist"
            align="right"
            sortable
            sortField="macdhist"
            body={(r: SymbolData) => (
              <span
                className={pctClass(r.macdhist)}
                style={{ fontSize: "0.8rem" }}
              >
                {fmtDecimal(r.macdhist)}
              </span>
            )}
          />
          <Column
            header="SMA 20"
            align="right"
            sortable
            sortField="sma20"
            body={numBody("sma20", fmtCurrency)}
          />
          <Column
            header="SMA 50"
            align="right"
            sortable
            sortField="sma50"
            body={numBody("sma50", fmtCurrency)}
          />
          <Column
            header="SMA 200"
            align="right"
            sortable
            sortField="sma200"
            body={numBody("sma200", fmtCurrency)}
          />
        </DataTable>
      );
    }

    if (tableType === "fundamentals") {
      return (
        <DataTable
          value={data}
          size="small"
          scrollable
          scrollHeight="360px"
          rowHover
        >
          {frozenSym}
          <Column
            header="P/E"
            align="right"
            sortable
            sortField="trailingPE"
            body={numBody("trailingPE", fmtDecimal)}
          />
          <Column
            header="P/B"
            align="right"
            sortable
            sortField="priceToBook"
            body={numBody("priceToBook", fmtDecimal)}
          />
          <Column
            header="EPS"
            align="right"
            sortable
            sortField="trailingEps"
            body={numBody("trailingEps", fmtCurrency)}
          />
          <Column
            header="Profit Margin %"
            align="right"
            sortable
            sortField="profitMargins"
            body={pctBody("profitMargins")}
          />
          <Column
            header="Div Yield %"
            align="right"
            sortable
            sortField="dividendYield"
            body={pctBody("dividendYield")}
          />
          <Column
            header="Mkt Cap"
            align="right"
            sortable
            sortField="marketCap"
            body={numBody("marketCap", fmtLargeNum)}
          />
        </DataTable>
      );
    }

    return null;
  };

  // ── Summary stats bar ────────────────────────────────────────────────────

  const renderStats = () => {
    if (loading) {
      return (
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              height="56px"
              style={{ flex: "1 1 130px", minWidth: "120px" }}
              borderRadius="0.65rem"
            />
          ))}
        </div>
      );
    }
    if (!stats) return null;

    const gainerRatio = stats.gainers / stats.total;
    return (
      <div className="flex flex-wrap gap-2 mb-3">
        <StatChip icon="pi-list" label="Symbols" value={String(stats.total)} />
        <StatChip
          icon="pi-arrow-up-right"
          label="Gaining Today"
          value={`${stats.gainers} of ${stats.total}`}
          color={gainerRatio >= 0.5 ? "var(--sv-success)" : "var(--sv-danger)"}
        />
        <StatChip
          icon="pi-calendar"
          label="Avg YTD Return"
          value={fmtVal(stats.avgYtd, "percent")}
          color={stats.avgYtd >= 0 ? "var(--sv-success)" : "var(--sv-danger)"}
        />
        <StatChip
          icon="pi-star"
          label="Top YTD Pick"
          value={
            stats.best
              ? `${stats.best.symbol} (${fmtVal(stats.best.ytd, "percent")})`
              : "—"
          }
          color="var(--sv-accent)"
        />
      </div>
    );
  };

  // ── Guard: nothing to show ───────────────────────────────────────────────

  if (!symbols.length) return null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="sv-data-card">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.6rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--sv-border)",
        }}
      >
        {/* Title + count */}
        <div className="flex align-items-center gap-2">
          <i
            className="pi pi-chart-scatter sv-text-accent"
            style={{ fontSize: "1rem" }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "var(--sv-text-primary)",
            }}
          >
            {title}
          </span>
          {!loading && data.length > 0 && (
            <span
              style={{
                background: "var(--sv-accent-bg)",
                color: "var(--sv-accent)",
                borderRadius: "1rem",
                padding: "0.1rem 0.55rem",
                fontSize: "0.68rem",
                fontWeight: 700,
              }}
            >
              {data.length}
            </span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Metric picker (charts, non-line) */}
        {view === "chart" && chartType !== "line" && (
          <select
            value={selectedMetric.key as string}
            onChange={(e) => {
              const m = CHART_METRICS.find((x) => x.key === e.target.value);
              if (m) setSelectedMetric(m);
            }}
            style={{
              background: "var(--sv-bg-input)",
              border: "1px solid var(--sv-border)",
              borderRadius: "0.4rem",
              padding: "0.25rem 0.65rem",
              fontSize: "0.75rem",
              color: "var(--sv-text-primary)",
              cursor: "pointer",
            }}
          >
            {CHART_METRICS.map((m) => (
              <option key={m.key as string} value={m.key as string}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        {/* Chart-type pills (charts only) */}
        {view === "chart" && (
          <PillGroup<ChartType>
            options={[
              { value: "column", label: "Bar" },
              { value: "heatmap", label: "Heatmap" },
              { value: "line", label: "Line" },
            ]}
            active={chartType}
            onSelect={setChartType}
          />
        )}

        {/* Table-type pills (tables only) */}
        {view === "table" && (
          <PillGroup<TableType>
            options={[
              { value: "performance", label: "Performance" },
              { value: "overview", label: "Overview" },
              { value: "technicals", label: "Technicals" },
              { value: "fundamentals", label: "Fundamentals" },
            ]}
            active={tableType}
            onSelect={setTableType}
          />
        )}

        {/* View toggle: Tables | Charts */}
        <PillGroup<ViewMode>
          options={[
            { value: "table", label: "Tables" },
            { value: "chart", label: "Charts" },
          ]}
          active={view}
          onSelect={setView}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "0.85rem 1rem" }}>
        {renderStats()}

        {loading ? (
          <Skeleton height="340px" borderRadius="0.5rem" />
        ) : !data.length ? (
          <div
            className="flex flex-column align-items-center justify-content-center sv-text-muted"
            style={{ height: "200px", gap: "0.75rem" }}
          >
            <i
              className="pi pi-chart-bar"
              style={{ fontSize: "2rem", opacity: 0.2 }}
            />
            <span style={{ fontSize: "0.82rem" }}>
              No data available for selected symbols
            </span>
          </div>
        ) : view === "chart" ? (
          <>
            {chartType === "column" && (
              <HighchartsReact
                highcharts={Highcharts}
                options={columnChartOptions}
              />
            )}
            {chartType === "heatmap" && renderHeatmap()}
            {chartType === "line" && (
              <SymbolHistoricalChart
                symbols={symbols}
                height={340}
                defaultPeriod="ytd"
              />
            )}
          </>
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
};

export default StockRadarPanel;
