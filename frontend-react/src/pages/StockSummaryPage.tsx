import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { TabView, TabPanel } from "primereact/tabview";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

// ── Chart colour tokens ────────────────────────────────────────────────────────
const CHART_COLORS: Record<ThemeName, { bg: string; grid: string; text: string; border: string }> = {
  dark:  { bg: "#121a2e", grid: "#1c2840", text: "#7a8da8", border: "#1c2840" },
  dim:   { bg: "#1c2945", grid: "#283a5c", text: "#7a92b8", border: "#283a5c" },
  light: { bg: "#ffffff", grid: "#dfe7f5", text: "#4a5e78", border: "#c8d4ec" },
};

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtNum(v: any, d = 2): string {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPrice(v: any): string {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtChange(v: any): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
// pctDecimal: value is a decimal (0.05 → "5.00%")
function fmtPctDecimal(v: any): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${(n * 100) >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}
// pctDirect: value is already in % form (2.5 → "2.50%")
function fmtPctDirect(v: any): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function fmtLarge(v: any): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}
function fmtDate(ts: any): string {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Return tile heat-map colour ────────────────────────────────────────────────
function getReturnTileStyle(value: number, maxAbs: number): React.CSSProperties {
  if (isNaN(value) || maxAbs === 0) return { background: "var(--sv-bg-card)" };
  const t = Math.min(Math.abs(value) / maxAbs, 1);
  if (value >= 0) {
    return {
      background: `rgba(34, 197, 94, ${0.18 + t * 0.7})`,
      color: t > 0.4 ? "#fff" : "var(--sv-text-primary)",
    };
  }
  return {
    background: `rgba(239, 68, 68, ${0.18 + t * 0.7})`,
    color: t > 0.4 ? "#fff" : "var(--sv-text-primary)",
  };
}

// ── Range slider bar ──────────────────────────────────────────────────────────
const RangeBar: React.FC<{ low: number; high: number; current: number }> = ({ low, high, current }) => {
  const pct = high > low ? Math.min(Math.max((current - low) / (high - low), 0), 1) * 100 : 50;
  return (
    <div style={{ position: "relative", height: 6, borderRadius: 4, background: "var(--sv-border)", margin: "6px 0 4px" }}>
      <div style={{ position: "absolute", left: 0, width: `${pct}%`, top: 0, bottom: 0, borderRadius: 4, background: "var(--sv-accent)", opacity: 0.45 }} />
      <div style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: "var(--sv-accent)", border: "2px solid var(--sv-bg-card)", zIndex: 1 }} />
    </div>
  );
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface SearchResult { symbol: string; name: string }

interface LiveSymbol {
  companyname: string;
  asset_type: string;
}

interface TechRow {
  symbol: string;
  wtd: number; mtd: number; qtd: number; ytd: number;
  change_oneyearbeforedate_pct: number;
  priceChange2Year: number;
  priceChange3Year: number;
}

interface OverviewData {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketTime?: Date;
  averageDailyVolume3Month?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  marketCap?: number;
  beta?: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  lastDividendValue?: number;
  lastDividendDate?: Date;
  fiveYearAvgDividendYield?: number;
  dividendRateForward?: number;
  dividendYieldForward?: number;
  lastSplitFactor?: string;
  lastSplitDate?: Date;
  grossMargins?: number;
  profitMargins?: number;
  totalDebt?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  sharesOutstanding?: number;
  floatShares?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  sharesShort?: number;
  sharesShortDate?: Date;
  forwardPE?: number;
  trailingPE?: number;
  pegRatio?: number;
  priceToBook?: number;
  epsLastQuarter?: number;
  epsLastToLastQuarter?: number;
  epsLastYearActual?: number;
  epsCurrentQuarterEstimate?: number;
  epsNextQuarterEstimate?: number;
  epsCurrentYearEstimate?: number;
  revenueLastQuarter?: number;
  revenueLastToLastQuarter?: number;
  revenueLastYear?: number;
  revenueCurrentQuarterEstimate?: number;
  revenueNextQuarterEstimate?: number;
  revenueCurrentYearEstimate?: number;
  revenueNextYearEstimate?: number;
  longBusinessSummary?: string;
  revEarningAnnual?: Array<{ date: string; revenue: number; earnings: number }>;
  revEarningQuarterly?: Array<{ date: string; revenue: number; earnings: number }>;
  epsQuarterly?: Array<{ date: string; epsActual: number }>;
  // merged from tech data
  wtd?: number; mtd?: number; qtd?: number; ytd?: number;
  change_oneyearbeforedate_pct?: number;
  priceChange2Year?: number;
  priceChange3Year?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const RETURN_TILES: Array<{ key: keyof OverviewData; label: string }> = [
  { key: "wtd", label: "WTD" },
  { key: "mtd", label: "MTD" },
  { key: "qtd", label: "QTD" },
  { key: "ytd", label: "YTD" },
  { key: "change_oneyearbeforedate_pct", label: "1 Year" },
  { key: "priceChange2Year", label: "2 Year" },
  { key: "priceChange3Year", label: "3 Year" },
];

const ASSET_TYPE_SEVERITY: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  STOCKS: "success",
  ETFS: "info",
  FUNDS: "info",
  INDEXES: "warning",
  Crypto: "danger",
  FUTURE: "secondary",
};

// ── Tiny helpers ───────────────────────────────────────────────────────────────
const MetricRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-content-between align-items-center py-2"
    style={{ borderBottom: "1px solid var(--sv-border-light)" }}>
    <span style={{ color: "var(--sv-text-secondary)", fontSize: 13 }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: 13 }}>{value}</span>
  </div>
);

const StatCard: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div style={{ padding: "12px 14px", background: "var(--sv-bg-surface)", borderRadius: 10, border: "1px solid var(--sv-border)", height: "100%" }}>
    <div style={{ fontSize: 10, color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sv-text-primary)" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--sv-text-secondary)", marginTop: 3 }}>{sub}</div>}
  </div>
);

// ── Page Component ─────────────────────────────────────────────────────────────
const StockSummaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];

  const initialSymbol = searchParams.get("symbol") ?? "AAPL";
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchText, setSearchText] = useState(initialSymbol);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [liveSymbol, setLiveSymbol] = useState<LiveSymbol | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revFreq, setRevFreq] = useState<"quarterly" | "yearly">("quarterly");
  const [descExpanded, setDescExpanded] = useState(false);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    const upper = val.toUpperCase();
    setSearchText(upper);
    setShowDropdown(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!upper) return;
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search/${upper}`);
        setSearchResults((res.data as SearchResult[]).slice(0, 7));
        setShowDropdown(true);
      } catch { /* ignore */ }
    }, 400);
  };

  const selectSymbol = (sym: string) => {
    const s = sym.toUpperCase();
    setSymbol(s);
    setSearchText(s);
    setShowDropdown(false);
    setSearchParams({ symbol: s });
    localStorage.setItem("currentSymbol", s);
  };

  // ── Data load ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setOverview(null);
    setLiveSymbol(null);

    try {
      const [liveRes, techRes] = await Promise.all([
        api.get(`/symbol/live/${sym}`),
        api.post(`/symbol/model/NA`, sym),
      ]);

      // Live data is keyed by symbol
      const live: LiveSymbol = liveRes.data?.[sym] ?? liveRes.data;
      setLiveSymbol(live);

      const ovRes = await api.get(`/symbol/overview/${sym}`);
      const ov: OverviewData = { ...ovRes.data };

      // Convert Unix timestamps → Date
      for (const field of ["regularMarketTime", "lastDividendDate", "lastSplitDate", "sharesShortDate"] as const) {
        if (ov[field] && typeof ov[field] === "number") {
          (ov as any)[field] = new Date((ov[field] as unknown as number) * 1000);
        }
      }

      // Merge returns from tech data
      const tech = (techRes.data as TechRow[])?.find(t => t.symbol === sym);
      if (tech) {
        ov.wtd = tech.wtd;
        ov.mtd = tech.mtd;
        ov.qtd = tech.qtd;
        ov.ytd = tech.ytd;
        ov.change_oneyearbeforedate_pct = tech.change_oneyearbeforedate_pct;
        ov.priceChange2Year = tech.priceChange2Year;
        ov.priceChange3Year = tech.priceChange3Year;
      }

      setOverview(ov);
    } catch {
      setError(`Unable to load data for ${sym}. Please try another symbol.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(symbol); }, [symbol, loadData]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const maxAbsReturn = useMemo(() => {
    if (!overview) return 1;
    const vals = RETURN_TILES
      .map(t => overview[t.key] as number | undefined)
      .filter((v): v is number => v !== undefined && !isNaN(v));
    if (!vals.length) return 1;
    return Math.max(Math.abs(Math.min(...vals)), Math.abs(Math.max(...vals)), 0.01);
  }, [overview]);

  const assetType = liveSymbol?.asset_type ?? "STOCKS";
  const isStock = assetType === "STOCKS";
  const changePositive = (overview?.regularMarketChange ?? 0) >= 0;
  const changeColor = overview?.regularMarketChange !== undefined
    ? (changePositive ? "var(--sv-gain)" : "var(--sv-loss)")
    : "var(--sv-text-secondary)";

  // ── Chart data ─────────────────────────────────────────────────────────────
  const revSrc = revFreq === "yearly" ? overview?.revEarningAnnual : overview?.revEarningQuarterly;
  const revChartOpts = useMemo((): Highcharts.Options => ({
    chart: { type: "column", backgroundColor: cc.bg, height: 220, margin: [20, 10, 65, 65], borderRadius: 0 },
    title: { text: undefined },
    legend: { enabled: true, itemStyle: { color: cc.text, fontSize: "11px" }, align: "left" },
    xAxis: {
      categories: revSrc?.map(r => r.date.slice(0, 7)) ?? [],
      labels: { style: { color: cc.text, fontSize: "10px" }, rotation: -45 },
      lineColor: cc.grid, tickColor: cc.grid,
    },
    yAxis: {
      title: { text: null },
      labels: { style: { color: cc.text, fontSize: "11px" }, formatter() { return fmtLarge(this.value); } },
      gridLineColor: cc.grid,
    },
    series: [
      { type: "column", name: "Revenue", data: revSrc?.map(r => r.revenue) ?? [], color: "#3b82f6" },
      { type: "column", name: "Earnings", data: revSrc?.map(r => r.earnings) ?? [], color: "#22c55e" },
    ],
    plotOptions: { column: { borderWidth: 0, borderRadius: 3, groupPadding: 0.08 } },
    tooltip: { shared: true, formatter() { return this.points?.map(p => `<b>${p.series.name}</b>: $${fmtLarge(p.y)}`).join("<br/>") ?? ""; } },
    credits: { enabled: false },
  }), [revSrc, cc]);

  const epsSrc = overview?.epsQuarterly;
  const epsChartOpts = useMemo((): Highcharts.Options => ({
    chart: { type: "column", backgroundColor: cc.bg, height: 220, margin: [20, 10, 65, 60], borderRadius: 0 },
    title: { text: undefined },
    legend: { enabled: false },
    xAxis: {
      categories: epsSrc?.map(r => r.date.slice(0, 7)) ?? [],
      labels: { style: { color: cc.text, fontSize: "10px" }, rotation: -45 },
      lineColor: cc.grid, tickColor: cc.grid,
    },
    yAxis: {
      title: { text: null },
      labels: { style: { color: cc.text, fontSize: "11px" }, formatter() { return `$${(this.value as number).toFixed(2)}`; } },
      gridLineColor: cc.grid,
    },
    series: [{
      type: "column",
      name: "EPS",
      data: epsSrc?.map(r => ({ y: r.epsActual, color: r.epsActual >= 0 ? "#22c55e" : "#ef4444" })) ?? [],
      borderWidth: 0,
      borderRadius: 3,
    }],
    tooltip: { formatter() { return `<b>EPS</b>: $${(this.y as number).toFixed(2)}`; } },
    credits: { enabled: false },
  }), [epsSrc, cc]);

  // ── TradingView iframe ────────────────────────────────────────────────────
  const tvSrc = `https://www.tradingview.com/widgetembed/?frameElementId=tv_${symbol}&symbol=${symbol}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=${theme === "light" ? "light" : "dark"}&style=1&timezone=UTC&withdateranges=1&hideideas=1&locale=en`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Search / Header bar ─────────────────────────────────────────────── */}
      <div
        style={{ background: "var(--sv-bg-card)", borderBottom: "1px solid var(--sv-border)", padding: "10px 20px" }}
        className="flex align-items-center gap-3 flex-wrap"
      >
        {/* Search input + dropdown */}
        <div style={{ position: "relative" }}>
          <span className="p-input-icon-left" style={{ display: "block" }}>
            <i className="pi pi-search" style={{ color: "var(--sv-text-muted)" }} />
            <InputText
              value={searchText}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && searchText) selectSymbol(searchText); }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Search symbol…"
              style={{ width: 260, background: "var(--sv-bg-input)", border: "1px solid var(--sv-border)", color: "var(--sv-text-primary)" }}
            />
          </span>
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, width: 320,
              background: "var(--sv-bg-surface)", border: "1px solid var(--sv-border)",
              borderRadius: 10, boxShadow: "var(--sv-shadow-md)", zIndex: 1000,
              maxHeight: 300, overflowY: "auto",
            }}>
              {searchResults.map(r => (
                <div
                  key={r.symbol}
                  onMouseDown={() => selectSymbol(r.symbol)}
                  className="flex align-items-center gap-2 sv-dropdown-item"
                  style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid var(--sv-border-light)" }}
                >
                  <span style={{ fontWeight: 700, minWidth: 60, color: "var(--sv-accent)" }}>{r.symbol}</span>
                  <span style={{ fontSize: 12, color: "var(--sv-text-secondary)" }}>{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symbol label + asset badge */}
        {liveSymbol && (
          <>
            <div className="flex align-items-center gap-2">
              <span style={{ fontWeight: 800, fontSize: 17, color: "var(--sv-text-primary)", letterSpacing: "0.02em" }}>{symbol}</span>
              <span style={{ color: "var(--sv-text-secondary)", fontSize: 14 }}>{liveSymbol.companyname}</span>
            </div>
            <Tag value={assetType} severity={ASSET_TYPE_SEVERITY[assetType] ?? "secondary"} style={{ fontSize: 11 }} />
          </>
        )}
        {loading && <i className="pi pi-spin pi-spinner" style={{ color: "var(--sv-accent)", fontSize: 18 }} />}
      </div>

      {/* ── Price hero strip ──────────────────────────────────────────────────── */}
      <div
        style={{ background: "var(--sv-bg-surface)", borderBottom: "1px solid var(--sv-border)", padding: "16px 20px" }}
        className="flex align-items-start gap-4 flex-wrap"
      >
        {loading ? (
          <>
            <Skeleton width="140px" height="48px" />
            <Skeleton width="140px" height="32px" style={{ marginTop: 8 }} />
            <Skeleton width="300px" height="32px" style={{ marginTop: 8 }} />
          </>
        ) : overview ? (
          <>
            {/* Price + change */}
            <div>
              <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: "var(--sv-text-primary)", letterSpacing: "-0.02em" }}>
                {fmtPrice(overview.regularMarketPrice)}
              </div>
              <div className="flex align-items-center gap-2 mt-1">
                <span style={{ fontSize: 18, fontWeight: 700, color: changeColor }}>
                  {changePositive ? "+" : ""}{fmtChange(overview.regularMarketChange)}
                </span>
                <span style={{
                  fontSize: 14, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                  background: changePositive ? "var(--sv-success-bg)" : "var(--sv-danger-bg)",
                  color: changeColor,
                }}>
                  {fmtPctDirect(overview.regularMarketChangePercent)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--sv-text-muted)", marginTop: 4 }}>
                <i className="pi pi-clock mr-1" />
                {fmtDate(overview.regularMarketTime)}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 64, background: "var(--sv-border)", alignSelf: "center" }} />

            {/* Quick stats */}
            <div className="flex gap-4 flex-wrap" style={{ alignSelf: "center" }}>
              {[
                { label: "Open", value: fmtPrice(overview.regularMarketOpen) },
                { label: "Prev Close", value: fmtPrice(overview.regularMarketPreviousClose) },
                { label: "Volume", value: fmtLarge(overview.regularMarketVolume) },
                { label: "Mkt Cap", value: `$${fmtLarge(overview.marketCap)}` },
                { label: "Beta", value: fmtNum(overview.beta) },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div className="flex align-items-center gap-2" style={{ color: "var(--sv-danger)" }}>
            <i className="pi pi-exclamation-triangle" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* ── Return tiles ─────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--sv-bg-body)", borderBottom: "1px solid var(--sv-border)", padding: "10px 20px" }}>
        <div className="grid" style={{ margin: 0, gap: 0 }}>
          {RETURN_TILES.map(tile => {
            const val = overview?.[tile.key] as number | undefined;
            return (
              <div key={tile.key} className="col" style={{ padding: "0 4px" }}>
                {loading ? (
                  <Skeleton height="66px" borderRadius="8px" />
                ) : (
                  <div style={{
                    ...getReturnTileStyle(val ?? 0, maxAbsReturn),
                    borderRadius: 8, padding: "10px 6px", textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>{tile.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, lineHeight: 1 }}>
                      {val !== undefined && !isNaN(val)
                        ? `${val >= 0 ? "+" : ""}${(val * 100).toFixed(1)}%`
                        : "—"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main tab panel ─────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 20px" }}>
        <TabView>

          {/* ── Overview tab ───────────────────────────────────────────────── */}
          <TabPanel header="Overview" leftIcon="pi pi-chart-bar mr-2">

            {/* Day + 52-week ranges */}
            <div className="grid mb-3" style={{ margin: 0 }}>
              {/* Day range */}
              <div className="col-12 md:col-6 lg:col-4" style={{ padding: 4 }}>
                <div style={{ padding: "14px 16px", background: "var(--sv-bg-card)", borderRadius: 10, border: "1px solid var(--sv-border)", height: "100%" }}>
                  <div style={{ fontSize: 10, color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Day Range</div>
                  {loading ? <Skeleton height="44px" /> : (
                    <>
                      <RangeBar
                        low={overview?.regularMarketDayLow ?? 0}
                        high={overview?.regularMarketDayHigh ?? 0}
                        current={overview?.regularMarketPrice ?? 0}
                      />
                      <div className="flex justify-content-between mt-1">
                        <span style={{ fontSize: 12, color: "var(--sv-text-secondary)" }}>{fmtPrice(overview?.regularMarketDayLow)}</span>
                        <span style={{ fontSize: 12, color: "var(--sv-text-secondary)" }}>{fmtPrice(overview?.regularMarketDayHigh)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 52-week range */}
              <div className="col-12 md:col-6 lg:col-4" style={{ padding: 4 }}>
                <div style={{ padding: "14px 16px", background: "var(--sv-bg-card)", borderRadius: 10, border: "1px solid var(--sv-border)", height: "100%" }}>
                  <div style={{ fontSize: 10, color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>52-Week Range</div>
                  {loading ? <Skeleton height="44px" /> : (
                    <>
                      <RangeBar
                        low={overview?.fiftyTwoWeekLow ?? 0}
                        high={overview?.fiftyTwoWeekHigh ?? 0}
                        current={overview?.regularMarketPrice ?? 0}
                      />
                      <div className="flex justify-content-between mt-1">
                        <span style={{ fontSize: 12, color: "var(--sv-text-secondary)" }}>{fmtPrice(overview?.fiftyTwoWeekLow)}</span>
                        <span style={{ fontSize: 12, color: "var(--sv-text-secondary)" }}>{fmtPrice(overview?.fiftyTwoWeekHigh)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Extra stat cards */}
              {[
                {
                  label: "Avg Volume (3M)",
                  value: fmtLarge(overview?.averageDailyVolume3Month),
                  sub: `Today: ${fmtLarge(overview?.regularMarketVolume)}`,
                },
                {
                  label: "Dividend (TTM)",
                  value: overview?.trailingAnnualDividendRate ? `$${fmtNum(overview.trailingAnnualDividendRate)}` : "—",
                  sub: `Yield: ${fmtPctDecimal(overview?.trailingAnnualDividendYield)}`,
                },
                {
                  label: "Shares Outstanding",
                  value: fmtLarge(overview?.sharesOutstanding),
                  sub: `Float: ${fmtLarge(overview?.floatShares)}`,
                },
              ].map(s => (
                <div key={s.label} className="col-12 md:col-6 lg:col-4" style={{ padding: 4 }}>
                  {loading ? <Skeleton height="70px" borderRadius="10px" /> : <StatCard label={s.label} value={s.value} sub={s.sub} />}
                </div>
              ))}
            </div>

            {/* Revenue & EPS charts (stocks only) */}
            {isStock && (
              <div className="grid mb-3" style={{ margin: 0 }}>
                {/* Revenue & Earnings */}
                <div className="col-12 lg:col-6" style={{ padding: 4 }}>
                  <Card>
                    <div className="flex justify-content-between align-items-center mb-2">
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Revenue &amp; Earnings</span>
                      <div className="flex gap-1">
                        {(["quarterly", "yearly"] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setRevFreq(f)}
                            style={{
                              padding: "3px 12px", borderRadius: 6,
                              border: `1px solid ${revFreq === f ? "var(--sv-accent)" : "var(--sv-border)"}`,
                              background: revFreq === f ? "var(--sv-accent)" : "transparent",
                              color: revFreq === f ? "var(--sv-text-inverse)" : "var(--sv-text-secondary)",
                              cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}
                          >
                            {f === "quarterly" ? "Q" : "A"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {loading
                      ? <Skeleton height="220px" />
                      : revSrc?.length
                        ? <HighchartsReact highcharts={Highcharts} options={revChartOpts} />
                        : <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sv-text-muted)", fontSize: 13 }}>No data available</div>
                    }
                  </Card>
                </div>

                {/* EPS */}
                <div className="col-12 lg:col-6" style={{ padding: 4 }}>
                  <Card>
                    <div className="flex justify-content-between align-items-center mb-2">
                      <span style={{ fontWeight: 700, fontSize: 14 }}>EPS — Quarterly</span>
                    </div>
                    {loading
                      ? <Skeleton height="220px" />
                      : epsSrc?.length
                        ? <HighchartsReact highcharts={Highcharts} options={epsChartOpts} />
                        : <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sv-text-muted)", fontSize: 13 }}>No data available</div>
                    }
                  </Card>
                </div>
              </div>
            )}

            {/* Metrics inner tabs (stocks only) */}
            {isStock && (
              <div className="mb-3">
                <Card>
                  <TabView>
                    {/* Business Health */}
                    <TabPanel header="Business Health">
                      {loading ? <Skeleton height="120px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6" style={{ paddingRight: 24 }}>
                            {[
                              { label: "Gross Margin", value: fmtPctDecimal(overview?.grossMargins) },
                              { label: "Profit Margin", value: fmtPctDecimal(overview?.profitMargins) },
                              { label: "Return on Equity", value: fmtPctDecimal(overview?.returnOnEquity) },
                              { label: "Return on Assets", value: fmtPctDecimal(overview?.returnOnAssets) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6" style={{ paddingLeft: 24 }}>
                            {[
                              { label: "Total Debt", value: `$${fmtLarge(overview?.totalDebt)}` },
                              { label: "Debt / Equity", value: fmtNum(overview?.debtToEquity) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Stock Stats */}
                    <TabPanel header="Stock Stats">
                      {loading ? <Skeleton height="120px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6" style={{ paddingRight: 24 }}>
                            {[
                              { label: "Shares Outstanding", value: fmtLarge(overview?.sharesOutstanding) },
                              { label: "Float Shares", value: fmtLarge(overview?.floatShares) },
                              { label: "Insider Holdings %", value: fmtPctDecimal(overview?.heldPercentInsiders) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6" style={{ paddingLeft: 24 }}>
                            {[
                              { label: "Institutional Holdings %", value: fmtPctDecimal(overview?.heldPercentInstitutions) },
                              { label: "Shares Short", value: fmtLarge(overview?.sharesShort) },
                              { label: "Short Report Date", value: fmtDate(overview?.sharesShortDate) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Earnings */}
                    <TabPanel header="Earnings">
                      {loading ? <Skeleton height="160px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6" style={{ paddingRight: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Actual</div>
                            {[
                              { label: "EPS — Last Quarter", value: fmtPrice(overview?.epsLastQuarter) },
                              { label: "EPS — Prior Quarter", value: fmtPrice(overview?.epsLastToLastQuarter) },
                              { label: "EPS — Last Year", value: fmtPrice(overview?.epsLastYearActual) },
                              { label: "Revenue — Last Quarter", value: `$${fmtLarge(overview?.revenueLastQuarter)}` },
                              { label: "Revenue — Prior Quarter", value: `$${fmtLarge(overview?.revenueLastToLastQuarter)}` },
                              { label: "Revenue — Last Year", value: `$${fmtLarge(overview?.revenueLastYear)}` },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6" style={{ paddingLeft: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Estimates</div>
                            {[
                              { label: "EPS — Current Quarter Est.", value: fmtPrice(overview?.epsCurrentQuarterEstimate) },
                              { label: "EPS — Next Quarter Est.", value: fmtPrice(overview?.epsNextQuarterEstimate) },
                              { label: "EPS — Current Year Est.", value: fmtPrice(overview?.epsCurrentYearEstimate) },
                              { label: "Revenue — Current Quarter Est.", value: `$${fmtLarge(overview?.revenueCurrentQuarterEstimate)}` },
                              { label: "Revenue — Next Quarter Est.", value: `$${fmtLarge(overview?.revenueNextQuarterEstimate)}` },
                              { label: "Revenue — Current Year Est.", value: `$${fmtLarge(overview?.revenueCurrentYearEstimate)}` },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Valuation */}
                    <TabPanel header="Valuation">
                      {loading ? <Skeleton height="100px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6" style={{ paddingRight: 24 }}>
                            {[
                              { label: "Forward P/E", value: fmtNum(overview?.forwardPE) },
                              { label: "Trailing P/E", value: fmtNum(overview?.trailingPE) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6" style={{ paddingLeft: 24 }}>
                            {[
                              { label: "PEG Ratio", value: fmtNum(overview?.pegRatio) },
                              { label: "Price / Book", value: fmtNum(overview?.priceToBook) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Dividends & Splits */}
                    <TabPanel header="Dividends & Splits">
                      {loading ? <Skeleton height="140px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6" style={{ paddingRight: 24 }}>
                            {[
                              { label: "Dividend (TTM)", value: `$${fmtNum(overview?.trailingAnnualDividendRate)}` },
                              { label: "Dividend Yield (TTM)", value: fmtPctDecimal(overview?.trailingAnnualDividendYield) },
                              { label: "Last Dividend", value: `$${fmtNum(overview?.lastDividendValue)}` },
                              { label: "Last Dividend Date", value: fmtDate(overview?.lastDividendDate) },
                              { label: "5Y Avg Dividend Yield", value: fmtPctDirect(overview?.fiveYearAvgDividendYield) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6" style={{ paddingLeft: 24 }}>
                            {[
                              { label: "Forward Dividend", value: `$${fmtNum(overview?.dividendRateForward)}` },
                              { label: "Forward Yield", value: fmtPctDecimal(overview?.dividendYieldForward) },
                              { label: "Last Split Factor", value: overview?.lastSplitFactor ?? "—" },
                              { label: "Last Split Date", value: fmtDate(overview?.lastSplitDate) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>
                  </TabView>
                </Card>
              </div>
            )}

            {/* Company description */}
            {!loading && overview?.longBusinessSummary && (
              <Card>
                <div className="flex align-items-center justify-content-between mb-2">
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    <i className="pi pi-building mr-2" style={{ color: "var(--sv-accent)" }} />
                    About {liveSymbol?.companyname}
                  </span>
                  <button
                    onClick={() => setDescExpanded(x => !x)}
                    style={{ background: "none", border: "none", color: "var(--sv-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    {descExpanded ? "Show less" : "Read more"}
                  </button>
                </div>
                <p style={{ color: "var(--sv-text-secondary)", lineHeight: 1.75, fontSize: 13, margin: 0 }}>
                  {descExpanded
                    ? overview.longBusinessSummary
                    : `${overview.longBusinessSummary.slice(0, 320)}…`}
                </p>
              </Card>
            )}
          </TabPanel>

          {/* ── Live Chart tab ─────────────────────────────────────────────── */}
          <TabPanel header="Live Chart" leftIcon="pi pi-chart-line mr-2">
            <div style={{ width: "100%", height: 620, borderRadius: 10, overflow: "hidden", border: "1px solid var(--sv-border)" }}>
              <iframe
                key={`${symbol}-${theme}`}
                src={tvSrc}
                width="100%"
                height="100%"
                frameBorder={0}
                allowFullScreen
                title={`${symbol} TradingView Chart`}
              />
            </div>
          </TabPanel>

          {/* ── News tab ───────────────────────────────────────────────────── */}
          <TabPanel header="News" leftIcon="pi pi-newspaper mr-2">
            <div
              className="flex flex-column align-items-center justify-content-center gap-3"
              style={{ minHeight: 240, color: "var(--sv-text-muted)" }}
            >
              <i className="pi pi-newspaper" style={{ fontSize: 40, opacity: 0.35 }} />
              <span style={{ fontSize: 14 }}>News feed coming soon for <strong style={{ color: "var(--sv-text-primary)" }}>{symbol}</strong></span>
            </div>
          </TabPanel>

        </TabView>
      </div>
    </div>
  );
};

export default StockSummaryPage;
