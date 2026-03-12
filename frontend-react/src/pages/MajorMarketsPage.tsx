import React, { useState, useEffect, useCallback, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Dropdown } from "primereact/dropdown";
import SymbolHistoricalChart from "@/components/common/SymbolHistoricalChart";
import TechnicalRatingGaugeChart from "@/components/common/TechnicalRatingGaugeChart";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

/* ── Constants ────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { id: "8", name: "Indices", itemName: "Index" },
  { id: "4", name: "Sectors", itemName: "Sector" },
  { id: "5", name: "Assets", itemName: "Asset" },
];

const PERIODS = [
  { label: "YTD", value: "ytd" },
  { label: "1M", value: "1month" },
  { label: "1Y", value: "1year" },
  { label: "2Y", value: "2year" },
  { label: "3Y", value: "3year" },
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
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    grid: "#1c2840",
    label: "#7a8da8",
    title: "#e8edf5",
    tooltipBg: "#0d1220",
    tooltipBorder: "#1c2840",
    tooltipText: "#e8edf5",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#f5a623",
  },
  dim: {
    grid: "#283a5c",
    label: "#7a92b8",
    title: "#d8e0f0",
    tooltipBg: "#162038",
    tooltipBorder: "#283a5c",
    tooltipText: "#d8e0f0",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#2e5be6",
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
  },
};

/* ── Types ────────────────────────────────────────────────────────────────── */

interface SymbolProfile {
  symbol: string;
  alternate_name: string;
  price?: number;
  change?: number;
  change_pct?: number;
  description?: string;
  country?: string;
  exchange?: string;
  sector?: string;
}

interface PerformanceItem {
  symbol: string;
  alternate_name: string;
  ytd?: number;
  "1month"?: number;
  "1year"?: number;
  "2year"?: number;
  "3year"?: number;
}

interface TechnicalsData {
  symbol?: string;
  rating?: string;
  rating_value?: number;
  buy_count?: number;
  sell_count?: number;
  neutral_count?: number;
  ma_rating?: string;
  ma_buy?: number;
  ma_sell?: number;
  ma_neutral?: number;
  oscillators_rating?: string;
  osc_buy?: number;
  osc_sell?: number;
  osc_neutral?: number;
  rsi?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  stoch_k?: number;
  stoch_d?: number;
  cci?: number;
  adx?: number;
  sma_20?: number;
  sma_50?: number;
  sma_100?: number;
  sma_200?: number;
  ema_10?: number;
  ema_20?: number;
  ema_50?: number;
  price?: number;
}

/* ── Formatters ───────────────────────────────────────────────────────────── */

const fmtPct = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const fmtPrice = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n)
    ? "—"
    : n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

/* ── Reusable Panel card ──────────────────────────────────────────────────── */

const Panel: React.FC<{
  title?: string;
  extra?: React.ReactNode;
  height?: number | string;
  children: React.ReactNode;
}> = ({ title, extra, height, children }) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 12,
      padding: "1rem 1.25rem",
      height: height
        ? typeof height === "number"
          ? `${height}px`
          : height
        : undefined,
      display: "flex",
      flexDirection: "column",
      boxShadow: "var(--sv-shadow-md)",
    }}
  >
    {title && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          paddingBottom: "0.6rem",
          borderBottom: "1px solid var(--sv-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "var(--sv-text-primary)",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </span>
        {extra}
      </div>
    )}
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
  </div>
);

/* ── Period button group ──────────────────────────────────────────────────── */

const PeriodButtons: React.FC<{
  selected: string;
  onChange: (p: string) => void;
}> = ({ selected, onChange }) => (
  <div
    style={{
      display: "flex",
      gap: 2,
      background: "var(--sv-bg-surface)",
      borderRadius: 6,
      padding: "2px",
    }}
  >
    {PERIODS.map((p) => (
      <button
        key={p.value}
        onClick={() => onChange(p.value)}
        style={{
          padding: "0.2rem 0.5rem",
          borderRadius: 4,
          border: "none",
          cursor: "pointer",
          fontSize: "0.7rem",
          fontWeight: selected === p.value ? 700 : 500,
          color:
            selected === p.value
              ? "var(--sv-text-inverse)"
              : "var(--sv-text-secondary)",
          background: selected === p.value ? "var(--sv-accent)" : "transparent",
          transition: "all 0.15s",
        }}
      >
        {p.label}
      </button>
    ))}
  </div>
);

/* ── Moving Averages card ─────────────────────────────────────────────────── */

const MovingAveragesCard: React.FC<{
  data: TechnicalsData | null;
  loading: boolean;
}> = ({ data, loading }) => {
  if (loading)
    return (
      <>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height="1.4rem" className="mb-2" />
        ))}
      </>
    );
  if (!data)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No data available
      </p>
    );

  const price = data.price ?? 0;
  const mas = [
    { label: "SMA 20", value: data.sma_20 },
    { label: "SMA 50", value: data.sma_50 },
    { label: "SMA 200", value: data.sma_200 },
    { label: "EMA 20", value: data.ema_20 },
    { label: "EMA 50", value: data.ema_50 },
  ].filter((m) => m.value != null && m.value !== 0);

  if (mas.length === 0)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No MA data
      </p>
    );

  return (
    <div>
      {mas.map((ma) => {
        const above = price > 0 && price > (ma.value as number);
        const diff =
          price > 0
            ? ((price - (ma.value as number)) / (ma.value as number)) * 100
            : null;
        return (
          <div
            key={ma.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.6rem",
            }}
          >
            <span
              style={{ fontSize: "0.75rem", color: "var(--sv-text-secondary)" }}
            >
              {ma.label}
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span
                style={{ fontSize: "0.72rem", color: "var(--sv-text-primary)" }}
              >
                {(ma.value as number).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
              {diff !== null && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.35rem",
                    borderRadius: 4,
                    color: above ? "#22c55e" : "#ef4444",
                    background: above
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(239,68,68,0.12)",
                  }}
                >
                  {above ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Symbol Profile card ──────────────────────────────────────────────────── */

const SymbolProfileCard: React.FC<{
  profile: SymbolProfile | null;
  loading: boolean;
}> = ({ profile, loading }) => {
  if (loading)
    return (
      <div>
        <Skeleton height="1rem" width="40%" className="mb-1" />
        <Skeleton height="1.4rem" width="70%" className="mb-2" />
        <Skeleton height="2rem" width="55%" className="mb-2" />
        <Skeleton height="1rem" className="mb-1" />
        <Skeleton height="1rem" />
      </div>
    );
  if (!profile)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No profile
      </p>
    );

  const chg = profile.change_pct ?? profile.change;
  const isGain = chg != null && chg >= 0;

  return (
    <div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--sv-text-muted)",
          marginBottom: "0.15rem",
          letterSpacing: "0.05em",
        }}
      >
        {profile.symbol}
      </div>
      <div
        style={{
          fontSize: "0.9rem",
          fontWeight: 700,
          color: "var(--sv-text-primary)",
          lineHeight: 1.3,
          marginBottom: "0.75rem",
        }}
      >
        {profile.alternate_name || profile.symbol}
      </div>

      {profile.price != null && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.625rem",
            marginBottom: "0.75rem",
          }}
        >
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--sv-text-primary)",
            }}
          >
            {fmtPrice(profile.price)}
          </span>
          {chg != null && (
            <span
              style={{
                fontSize: "0.825rem",
                fontWeight: 600,
                color: isGain ? "var(--sv-gain)" : "var(--sv-loss)",
              }}
            >
              {fmtPct(chg)}
            </span>
          )}
        </div>
      )}

      {profile.sector && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--sv-text-muted)",
            marginBottom: "0.25rem",
          }}
        >
          <i className="pi pi-tag mr-1" style={{ fontSize: "0.65rem" }} />
          {profile.sector}
        </div>
      )}
      {profile.exchange && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--sv-text-muted)",
            marginBottom: "0.25rem",
          }}
        >
          <i className="pi pi-building mr-1" style={{ fontSize: "0.65rem" }} />
          {profile.exchange}
        </div>
      )}
      {profile.country && (
        <div style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)" }}>
          <i
            className="pi pi-map-marker mr-1"
            style={{ fontSize: "0.65rem" }}
          />
          {profile.country}
        </div>
      )}
    </div>
  );
};

/* ── RSI card ─────────────────────────────────────────────────────────────── */

const RsiCard: React.FC<{ data: TechnicalsData | null; loading: boolean }> = ({
  data,
  loading,
}) => {
  if (loading)
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="1.5rem" className="mb-2" />
        ))}
      </>
    );
  if (!data)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No data available
      </p>
    );

  const rsi = data.rsi ?? data.rsi_14;

  const rsiMeta = (v: number) => {
    if (v >= 70) return { label: "Overbought", color: "#ef4444" };
    if (v >= 60) return { label: "Bullish", color: "#f5a623" };
    if (v >= 40) return { label: "Neutral", color: "#94a3b8" };
    if (v >= 30) return { label: "Bearish", color: "#f97316" };
    return { label: "Oversold", color: "#22c55e" };
  };

  if (rsi == null)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No RSI data
      </p>
    );

  const { label, color } = rsiMeta(rsi);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.625rem",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{ fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1 }}
        >
          {rsi.toFixed(1)}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "0.2rem 0.6rem",
            borderRadius: 6,
            color,
            background: `${color}20`,
          }}
        >
          {label}
        </span>
      </div>

      {/* Gradient bar */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background:
              "linear-gradient(to right, #22c55e 0%, #f97316 30%, #94a3b8 50%, #f97316 70%, #ef4444 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `calc(${rsi}% - 7px)`,
              top: -3,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: color,
              border: "2px solid var(--sv-bg-card)",
              boxShadow: `0 0 8px ${color}80`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.7rem",
          }}
        >
          <span style={{ fontSize: "0.6rem", color: "#22c55e" }}>
            0 Oversold
          </span>
          <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>50</span>
          <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>
            100 Overbought
          </span>
        </div>
      </div>

      {/* Extra oscillators */}
      {[
        { label: "MACD", value: data.macd, isChange: true },
        { label: "Stochastic K", value: data.stoch_k, isChange: false },
        { label: "CCI", value: data.cci, isChange: true },
      ]
        .filter((r) => r.value != null)
        .map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.3rem",
            }}
          >
            <span
              style={{ fontSize: "0.72rem", color: "var(--sv-text-secondary)" }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: row.isChange
                  ? (row.value as number) >= 0
                    ? "var(--sv-gain)"
                    : "var(--sv-loss)"
                  : "var(--sv-text-primary)",
              }}
            >
              {(row.value as number).toFixed(2)}
            </span>
          </div>
        ))}
    </div>
  );
};

/* ── Chart empty state ────────────────────────────────────────────────────── */

const ChartEmpty: React.FC<{ icon: string; text: string }> = ({
  icon,
  text,
}) => (
  <div
    style={{
      height: "100%",
      minHeight: 200,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--sv-text-muted)",
    }}
  >
    <i
      className={`pi ${icon}`}
      style={{ fontSize: "1.75rem", marginBottom: "0.5rem", opacity: 0.4 }}
    />
    <span style={{ fontSize: "0.8rem" }}>{text}</span>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Main Page ────────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */

const MajorMarketsPage: React.FC = () => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme] ?? CHART_THEME.dim;

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [symbolProfiles, setSymbolProfiles] = useState<SymbolProfile[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolProfile | null>(
    null,
  );
  const [performanceData, setPerformanceData] = useState<PerformanceItem[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("1year");

  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [loadingTechnicals, setLoadingTechnicals] = useState(false);

  /* ── Load all symbols for a category ─────────────────────────────────── */
  const loadSymbols = useCallback(async (categoryId: string) => {
    setLoadingSymbols(true);
    setSymbolProfiles([]);
    setSelectedSymbol(null);
    setPerformanceData([]);
    setTechnicals(null);
    try {
      const { data: symbolList } = await api.get<string[]>(
        `/symbol/list_type/${categoryId}`,
      );
      if (!symbolList?.length) return;
      const tickers = symbolList.join(",");
      const [profileRes, perfRes] = await Promise.all([
        api.get<SymbolProfile[]>("/symbol/info", {
          params: { tickers, detail: "profile" },
        }),
        api.get<PerformanceItem[]>("/symbol/info", {
          params: { tickers, detail: "performance" },
        }),
      ]);
      const profiles = (profileRes.data ?? []).sort(
        (a, b) => symbolList.indexOf(a.symbol) - symbolList.indexOf(b.symbol),
      );
      setSymbolProfiles(profiles);
      setPerformanceData(perfRes.data ?? []);
      if (profiles.length) setSelectedSymbol(profiles[0]);
    } catch (e) {
      console.error("Failed to load market symbols", e);
    } finally {
      setLoadingSymbols(false);
    }
  }, []);

  /* ── Load technicals ──────────────────────────────────────────────────── */
  const loadTechnicals = useCallback(async (symbol: string) => {
    setLoadingTechnicals(true);
    try {
      const { data } = await api.get<TechnicalsData[]>(
        `/symbol/technical/${symbol}`,
      );
      setTechnicals(data?.[0] ?? null);
    } catch {
      setTechnicals(null);
    } finally {
      setLoadingTechnicals(false);
    }
  }, []);

  /* ── Effects ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    loadSymbols(CATEGORIES[0].id);
  }, [loadSymbols]);

  useEffect(() => {
    if (selectedSymbol?.symbol) {
      loadTechnicals(selectedSymbol.symbol);
    }
  }, [selectedSymbol, loadTechnicals]);

  /* ── Category switch ──────────────────────────────────────────────────── */
  const handleCategoryChange = useCallback(
    (cat: (typeof CATEGORIES)[0]) => {
      setSelectedCategory(cat);
      loadSymbols(cat.id);
    },
    [loadSymbols],
  );

  /* ── Peers bar chart ──────────────────────────────────────────────────── */
  const peersChartOptions = useMemo((): Highcharts.Options => {
    const pts = performanceData
      .map((item) => ({
        name: item.alternate_name || item.symbol,
        y: (item as any)[selectedPeriod] as number | null,
      }))
      .filter((d) => d.y != null)
      .sort((a, b) => (b.y ?? 0) - (a.y ?? 0));

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 250,
        spacing: [4, 4, 12, 4],
        style: { fontFamily: "inherit" },
        animation: { duration: 400 },
      },
      title: { text: undefined },
      xAxis: {
        categories: pts.map((d) => d.name),
        labels: { style: { color: ct.label, fontSize: "9px" }, rotation: -40 },
        lineColor: ct.grid,
        tickColor: ct.grid,
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          style: { color: ct.label, fontSize: "9px" },
          formatter() {
            return `${this.value}%`;
          },
        },
        gridLineColor: ct.grid,
        plotLines: [{ value: 0, color: ct.grid, width: 1 }],
      },
      series: [
        {
          type: "column",
          name: "Return",
          data: pts.map((d) => ({
            y: d.y,
            color: (d.y ?? 0) >= 0 ? ct.gain : ct.loss,
            name: d.name,
          })),
          borderRadius: 4,
          borderWidth: 0,
        },
      ],
      tooltip: {
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        style: { color: ct.tooltipText },
        formatter() {
          const pt = this.point as any;
          return `<b>${pt.name}</b><br/>${pt.y >= 0 ? "+" : ""}${pt.y?.toFixed(2)}%`;
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
    };
  }, [performanceData, selectedPeriod, ct]);

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mt-0 mb-1 sv-page-title">
          Major Markets
        </h1>
        <p className="mt-0 text-sm text-color-secondary">
          Indices, sectors and asset class performance at a glance
        </p>
      </div>

      {/* ── Controls bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.875rem",
          marginBottom: "1rem",
          padding: "0.75rem 1.125rem",
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
          borderRadius: 12,
          boxShadow: "var(--sv-shadow-sm)",
        }}
      >
        {/* Category switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--sv-bg-surface)",
            borderRadius: 8,
            padding: "3px",
            gap: 2,
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat)}
              style={{
                padding: "0.3rem 0.875rem",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: selectedCategory.id === cat.id ? 700 : 500,
                color:
                  selectedCategory.id === cat.id
                    ? "var(--sv-text-inverse)"
                    : "var(--sv-text-secondary)",
                background:
                  selectedCategory.id === cat.id
                    ? "var(--sv-accent)"
                    : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Symbol dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--sv-text-secondary)",
              fontWeight: 500,
            }}
          >
            {selectedCategory.itemName}:
          </span>
          {loadingSymbols ? (
            <Skeleton height="2rem" width="200px" />
          ) : (
            <Dropdown
              value={selectedSymbol}
              options={symbolProfiles}
              optionLabel="alternate_name"
              onChange={(e) => setSelectedSymbol(e.value)}
              style={{ minWidth: "160px", fontSize: "0.75rem" }}
              pt={{
                root: { style: { fontSize: "0.75rem" } },
                input: {
                  style: { fontSize: "0.75rem", padding: "0.25rem 0.5rem" },
                },
                trigger: { style: { width: "1.75rem" } },
                item: {
                  style: { fontSize: "0.75rem", padding: "0.25rem 0.5rem" },
                },
                filterInput: {
                  style: { fontSize: "0.75rem", padding: "0.25rem 0.5rem" },
                },
              }}
              placeholder="Select…"
              filter
            />
          )}
        </div>

        {/* Quick price badge */}
        {selectedSymbol && !loadingSymbols && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            {selectedSymbol.price != null && (
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--sv-text-primary)",
                    lineHeight: 1,
                  }}
                >
                  {fmtPrice(selectedSymbol.price)}
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--sv-text-muted)",
                    marginTop: "0.1rem",
                    letterSpacing: "0.04em",
                  }}
                >
                  {selectedSymbol.symbol}
                </div>
              </div>
            )}
            {(selectedSymbol.change_pct ?? selectedSymbol.change) != null &&
              (() => {
                const chg = selectedSymbol.change_pct ?? selectedSymbol.change!;
                return (
                  <div
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: 8,
                      background:
                        chg >= 0
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(239,68,68,0.12)",
                      color: chg >= 0 ? "var(--sv-gain)" : "var(--sv-loss)",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                    }}
                  >
                    {fmtPct(chg)}
                  </div>
                );
              })()}
          </div>
        )}
      </div>

      {/* ── Market ticker strip ── */}
      {!loadingSymbols && symbolProfiles.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            overflowX: "auto",
            padding: "0.25rem 0 0.75rem",
            scrollbarWidth: "thin",
          }}
        >
          {symbolProfiles.map((sym) => {
            const perf = performanceData.find((p) => p.symbol === sym.symbol);
            const val = perf
              ? ((perf as any)[selectedPeriod] as number | null)
              : null;
            const isSelected = selectedSymbol?.symbol === sym.symbol;
            return (
              <button
                key={sym.symbol}
                onClick={() => setSelectedSymbol(sym)}
                style={{
                  flexShrink: 0,
                  padding: "0.45rem 0.875rem",
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? "var(--sv-accent)" : "var(--sv-border)"}`,
                  background: isSelected
                    ? "var(--sv-accent-bg)"
                    : "var(--sv-bg-card)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  boxShadow: isSelected ? "var(--sv-shadow-glow)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--sv-text-primary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sym.alternate_name || sym.symbol}
                </div>
                {val != null && (
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      marginTop: "0.1rem",
                      color: val >= 0 ? "var(--sv-gain)" : "var(--sv-loss)",
                    }}
                  >
                    {fmtPct(val)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid mb-3">
        {/* Historical line chart */}
        <div className="col-12 md:col-7 p-1">
          <Panel title="Historical Performance" height={320}>
            <SymbolHistoricalChart
              symbols={[selectedSymbol?.symbol ?? null]}
              height={215}
            />
          </Panel>
        </div>

        {/* Peers comparison bar chart */}
        <div className="col-12 md:col-5 p-1">
          <Panel
            title="Peer Comparison"
            height={320}
            extra={
              <PeriodButtons
                selected={selectedPeriod}
                onChange={setSelectedPeriod}
              />
            }
          >
            {loadingSymbols ? (
              <Skeleton height="240px" />
            ) : performanceData.length > 0 ? (
              <HighchartsReact
                highcharts={Highcharts}
                options={peersChartOptions}
              />
            ) : (
              <ChartEmpty
                icon="pi-chart-bar"
                text="Performance data unavailable"
              />
            )}
          </Panel>
        </div>
      </div>

      {/* ── Technical analysis row ── */}
      <div className="grid">
        <div className="col-12 sm:col-6 lg:col-3 p-1">
          <Panel title="Technical Rating" height={255}>
            <TechnicalRatingGaugeChart
              value={
                technicals?.rating != null
                  ? parseInt(technicals.rating)
                  : undefined
              }
              loading={loadingTechnicals}
            />
          </Panel>
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-1">
          <Panel title="Moving Averages" height={230}>
            <MovingAveragesCard data={technicals} loading={loadingTechnicals} />
          </Panel>
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-1">
          <Panel title="Symbol Profile" height={230}>
            <SymbolProfileCard
              profile={selectedSymbol}
              loading={loadingSymbols}
            />
          </Panel>
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-1">
          <Panel title="RSI Indicator" height={230}>
            <RsiCard data={technicals} loading={loadingTechnicals} />
          </Panel>
        </div>
      </div>
    </>
  );
};

export default MajorMarketsPage;
