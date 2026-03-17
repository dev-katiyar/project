import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { TabView, TabPanel } from "primereact/tabview";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";
import AssetLineChart from "@/components/common/AssetLineChart";

// ── Chart colour tokens ────────────────────────────────────────────────────────
const CHART_COLORS: Record<ThemeName, { bg: string; grid: string; text: string }> = {
  dark:  { bg: "#121a2e", grid: "#1c2840", text: "#7a8da8" },
  dim:   { bg: "#1c2945", grid: "#283a5c", text: "#7a92b8" },
  light: { bg: "#ffffff", grid: "#dfe7f5", text: "#4a5e78" },
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
function fmtPctDecimal(v: any): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${(n * 100) >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}
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
function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const h = Math.floor(diffMs / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

// ── Return tile heat-map colour ────────────────────────────────────────────────
function getReturnTileStyle(value: number, maxAbs: number): React.CSSProperties {
  if (isNaN(value) || maxAbs === 0) return { background: "var(--sv-bg-card)" };
  const t = Math.min(Math.abs(value) / maxAbs, 1);
  if (value >= 0) {
    return {
      background: `rgba(34, 197, 94, ${0.15 + t * 0.72})`,
      color: t > 0.4 ? "#fff" : "var(--sv-text-primary)",
    };
  }
  return {
    background: `rgba(239, 68, 68, ${0.15 + t * 0.72})`,
    color: t > 0.4 ? "#fff" : "var(--sv-text-primary)",
  };
}

// ── Range bar ──────────────────────────────────────────────────────────────────
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
interface LiveSymbol { companyname: string; asset_type: string }
interface TechRow {
  symbol: string;
  wtd: number; mtd: number; qtd: number; ytd: number;
  change_oneyearbeforedate_pct: number;
  priceChange2Year: number;
  priceChange3Year: number;
}
interface NewsItem { title: string; link: string; published: string }

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
  sharesShortPriorMonth?: number;
  sharesShortPriorMonthDate?: Date;
  insiderSharesLast6MonthBought?: number;
  insiderSharesLast6MonthBoughtCount?: number;
  insiderSharesLast6MonthSold?: number;
  insiderSharesLast6MonthSoldCount?: number;
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
  revenueLastToLastYear?: number;
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
  STOCKS: "success", ETFS: "info", FUNDS: "info", INDEXES: "warning", Crypto: "danger", FUTURE: "secondary",
};

// ── Small reusable helpers ─────────────────────────────────────────────────────
const MetricRow: React.FC<{ label: string; value: React.ReactNode; valueColor?: string }> = ({ label, value, valueColor }) => (
  <div className="flex justify-content-between align-items-center py-2 border-bottom-1 surface-border">
    <span className="text-sm text-color-secondary">{label}</span>
    <span className="text-sm font-semibold" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
  </div>
);

const KpiCard: React.FC<{ icon: string; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ icon, label, value, sub }) => (
  <div className="surface-overlay border-1 surface-border border-round-xl p-3 h-full">
    <div className="flex align-items-center gap-2 mb-2">
      <i className={`${icon} sv-text-accent`} style={{ fontSize: 14 }} />
      <span className="sv-info-label text-xs">{label}</span>
    </div>
    <div className="text-base font-bold text-color">{value}</div>
    {sub && <div className="text-xs text-color-secondary mt-1">{sub}</div>}
  </div>
);

// ── News feed ──────────────────────────────────────────────────────────────────
const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<NewsItem[]>("/rss/news")
      .then(({ data }) => setNews(Array.isArray(data) ? data.slice(0, 20) : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-column gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="56px" borderRadius="8px" />)}
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted" style={{ minHeight: 200 }}>
        <i className="pi pi-newspaper" style={{ fontSize: 36, opacity: 0.3 }} />
        <span className="text-sm">No news available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-2">
      {news.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <div
            className="surface-overlay border-1 surface-border border-round-lg p-3 flex align-items-start gap-3"
            style={{ transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--sv-accent)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--sv-shadow-sm)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <div style={{ width: 3, minHeight: 40, borderRadius: 2, background: "var(--sv-accent)", flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-color" style={{ lineHeight: 1.4 }}>{item.title}</div>
              <div className="flex align-items-center gap-2 mt-1">
                <span className="text-xs sv-text-muted">{timeAgo(item.published)}</span>
                <i className="pi pi-external-link sv-text-muted" style={{ fontSize: 10 }} />
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

      const live: LiveSymbol = liveRes.data?.[sym] ?? liveRes.data;
      setLiveSymbol(live);

      const ovRes = await api.get(`/symbol/overview/${sym}`);
      const ov: OverviewData = { ...ovRes.data };

      // Convert Unix timestamps → Date
      for (const field of [
        "regularMarketTime", "lastDividendDate", "lastSplitDate",
        "sharesShortDate", "sharesShortPriorMonthDate",
      ] as const) {
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
      title: { text: undefined },
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
      title: { text: undefined },
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
      <div className="surface-card border-bottom-1 surface-border px-4 py-2 flex align-items-center gap-3 flex-wrap">
        <div style={{ position: "relative" }}>
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search sv-text-muted" />
            <InputText
              value={searchText}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && searchText) selectSymbol(searchText); }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Search symbol…"
              className="sv-search-input"
              style={{ width: 240 }}
            />
          </IconField>
          {showDropdown && searchResults.length > 0 && (
            <div
              className="surface-overlay border-1 surface-border border-round-xl shadow-3"
              style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 320, zIndex: 1000, maxHeight: 300, overflowY: "auto" }}
            >
              {searchResults.map(r => (
                <div
                  key={r.symbol}
                  onMouseDown={() => selectSymbol(r.symbol)}
                  className="sv-dropdown-item flex align-items-center gap-2"
                  style={{ borderBottom: "1px solid var(--sv-border-light)" }}
                >
                  <span className="font-bold sv-text-accent sv-min-w-60">{r.symbol}</span>
                  <span className="text-xs text-color-secondary">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {liveSymbol && (
          <div className="flex align-items-center gap-2 flex-1 min-w-0">
            <span className="font-bold text-color" style={{ fontSize: 16, letterSpacing: "0.02em" }}>{symbol}</span>
            <span className="text-color-secondary text-sm">{liveSymbol.companyname}</span>
            <Tag value={assetType} severity={ASSET_TYPE_SEVERITY[assetType] ?? "secondary"} style={{ fontSize: 11 }} />
          </div>
        )}
        {loading && <i className="pi pi-spin pi-spinner sv-text-accent" style={{ fontSize: 18 }} />}
      </div>

      {/* ── Price hero ────────────────────────────────────────────────────────── */}
      <div className="surface-overlay border-bottom-1 surface-border px-4 py-3">
        {loading ? (
          <div className="grid" style={{ margin: 0 }}>
            <div className="col-12 md:col-auto p-2"><Skeleton width="180px" height="60px" /></div>
            <div className="col-12 md:col p-2"><Skeleton height="60px" /></div>
          </div>
        ) : overview ? (
          <div className="flex align-items-start gap-4 flex-wrap">

            {/* Price block */}
            <div style={{ minWidth: 180 }}>
              <div className="flex align-items-center gap-2">
                <i
                  className={changePositive ? "pi pi-arrow-up-right" : "pi pi-arrow-down-right"}
                  style={{ fontSize: 20, color: changeColor }}
                />
                <span className="font-bold text-color" style={{ fontSize: 38, lineHeight: 1, letterSpacing: "-0.01em" }}>
                  {fmtPrice(overview.regularMarketPrice)}
                </span>
              </div>
              <div className="flex align-items-center gap-2 mt-1">
                <span className="font-bold" style={{ fontSize: 16, color: changeColor }}>
                  {changePositive ? "+" : ""}{fmtChange(overview.regularMarketChange)}
                </span>
                <span
                  className="font-semibold border-round px-2 py-1"
                  style={{
                    fontSize: 13,
                    background: changePositive ? "var(--sv-success-bg)" : "var(--sv-danger-bg)",
                    color: changeColor,
                  }}
                >
                  {fmtPctDirect(overview.regularMarketChangePercent)}
                </span>
              </div>
              <div className="text-xs sv-text-muted mt-1 flex align-items-center gap-1">
                <i className="pi pi-clock" style={{ fontSize: 10 }} />
                {fmtDate(overview.regularMarketTime)}
              </div>
            </div>

            <Divider layout="vertical" style={{ height: 60, alignSelf: "center", margin: "0 4px" }} />

            {/* Quick stats grid */}
            <div className="grid flex-1" style={{ margin: 0, minWidth: 0 }}>
              {[
                { label: "Open", value: fmtPrice(overview.regularMarketOpen) },
                { label: "Prev Close", value: fmtPrice(overview.regularMarketPreviousClose) },
                { label: "Volume", value: fmtLarge(overview.regularMarketVolume) },
                { label: "Avg Vol (3M)", value: fmtLarge(overview.averageDailyVolume3Month) },
                { label: "Mkt Cap", value: `$${fmtLarge(overview.marketCap)}` },
                { label: "Beta", value: fmtNum(overview.beta) },
                { label: "Dividend", value: overview.trailingAnnualDividendRate ? `$${fmtNum(overview.trailingAnnualDividendRate)}` : "—" },
                { label: "Div Yield", value: fmtPctDecimal(overview.trailingAnnualDividendYield) },
              ].map(s => (
                <div key={s.label} className="col-6 md:col-3 lg:col p-2">
                  <div className="sv-info-label text-xs mb-1">{s.label}</div>
                  <div className="text-sm font-bold">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex align-items-center gap-2 sv-error-text">
            <i className="pi pi-exclamation-triangle" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* ── Return tiles ─────────────────────────────────────────────────────── */}
      <div className="surface-ground border-bottom-1 surface-border px-4 py-2">
        <div className="grid" style={{ margin: 0 }}>
          {RETURN_TILES.map(tile => {
            const val = overview?.[tile.key] as number | undefined;
            return (
              <div key={tile.key} className="col" style={{ padding: "0 3px" }}>
                {loading ? (
                  <Skeleton height="64px" borderRadius="8px" />
                ) : (
                  <div style={{
                    ...getReturnTileStyle(val ?? 0, maxAbsReturn),
                    borderRadius: 8, padding: "8px 6px", textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div className="sv-info-label" style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em" }}>{tile.label}</div>
                    <div className="font-bold" style={{ fontSize: 17, marginTop: 4, lineHeight: 1 }}>
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
      <div className="px-4 py-3">
        <TabView pt={{ root: { className: "sv-tabs" } }}>

          {/* ── Overview tab ─────────────────────────────────────────────────── */}
          <TabPanel header="Overview" leftIcon="pi pi-chart-bar mr-2">

            {/* Performance chart */}
            <Card className="mb-3">
              <div className="flex align-items-center gap-2 mb-2">
                <i className="pi pi-chart-line sv-text-accent" />
                <span className="font-bold text-sm">Price Performance</span>
              </div>
              {loading ? (
                <Skeleton height="270px" />
              ) : (
                <AssetLineChart
                  symbols={[symbol]}
                  height={270}
                  filled
                  defaultPeriod="1year"
                />
              )}
            </Card>

            {/* Range bars + KPI cards */}
            <div className="grid mb-3" style={{ margin: 0 }}>
              {/* Day range */}
              <div className="col-12 md:col-6 lg:col-4 p-1">
                <div className="surface-card border-1 surface-border border-round-xl p-3 h-full">
                  <div className="flex align-items-center gap-2 mb-2">
                    <i className="pi pi-calendar sv-text-accent" style={{ fontSize: 13 }} />
                    <span className="sv-info-label text-xs">Day Range</span>
                  </div>
                  {loading ? <Skeleton height="44px" /> : (
                    <>
                      <RangeBar
                        low={overview?.regularMarketDayLow ?? 0}
                        high={overview?.regularMarketDayHigh ?? 0}
                        current={overview?.regularMarketPrice ?? 0}
                      />
                      <div className="flex justify-content-between mt-1">
                        <span className="text-sm sv-loss font-semibold">{fmtPrice(overview?.regularMarketDayLow)}</span>
                        <span className="text-xs sv-text-muted self-center">{fmtPrice(overview?.regularMarketPrice)}</span>
                        <span className="text-sm sv-gain font-semibold">{fmtPrice(overview?.regularMarketDayHigh)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 52-week range */}
              <div className="col-12 md:col-6 lg:col-4 p-1">
                <div className="surface-card border-1 surface-border border-round-xl p-3 h-full">
                  <div className="flex align-items-center gap-2 mb-2">
                    <i className="pi pi-calendar-plus sv-text-accent" style={{ fontSize: 13 }} />
                    <span className="sv-info-label text-xs">52-Week Range</span>
                  </div>
                  {loading ? <Skeleton height="44px" /> : (
                    <>
                      <RangeBar
                        low={overview?.fiftyTwoWeekLow ?? 0}
                        high={overview?.fiftyTwoWeekHigh ?? 0}
                        current={overview?.regularMarketPrice ?? 0}
                      />
                      <div className="flex justify-content-between mt-1">
                        <span className="text-sm sv-loss font-semibold">{fmtPrice(overview?.fiftyTwoWeekLow)}</span>
                        <span className="text-xs sv-text-muted self-center">
                          {overview && overview.fiftyTwoWeekLow && overview.fiftyTwoWeekHigh
                            ? `${(((overview.regularMarketPrice ?? 0) - overview.fiftyTwoWeekLow) / (overview.fiftyTwoWeekHigh - overview.fiftyTwoWeekLow) * 100).toFixed(0)}% of range`
                            : ""}
                        </span>
                        <span className="text-sm sv-gain font-semibold">{fmtPrice(overview?.fiftyTwoWeekHigh)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KPI cards */}
              {[
                { icon: "pi pi-chart-bar", label: "Avg Volume (3M)", value: fmtLarge(overview?.averageDailyVolume3Month), sub: `Today: ${fmtLarge(overview?.regularMarketVolume)}` },
                { icon: "pi pi-wallet", label: "Dividend (TTM)", value: overview?.trailingAnnualDividendRate ? `$${fmtNum(overview.trailingAnnualDividendRate)}` : "—", sub: `Yield: ${fmtPctDecimal(overview?.trailingAnnualDividendYield)}` },
                { icon: "pi pi-users", label: "Shares Outstanding", value: fmtLarge(overview?.sharesOutstanding), sub: `Float: ${fmtLarge(overview?.floatShares)}` },
                { icon: "pi pi-globe", label: "Market Cap", value: `$${fmtLarge(overview?.marketCap)}`, sub: `Beta: ${fmtNum(overview?.beta)}` },
              ].map(s => (
                <div key={s.label} className="col-12 md:col-6 lg:col-4 p-1">
                  {loading
                    ? <Skeleton height="70px" borderRadius="10px" />
                    : <KpiCard icon={s.icon} label={s.label} value={s.value} sub={s.sub} />
                  }
                </div>
              ))}
            </div>

            {/* Revenue & EPS charts */}
            {isStock && (
              <div className="grid mb-3" style={{ margin: 0 }}>
                <div className="col-12 lg:col-6 p-1">
                  <Card>
                    <div className="flex justify-content-between align-items-center mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-money-bill sv-text-accent" style={{ fontSize: 13 }} />
                        <span className="font-bold text-sm">Revenue &amp; Earnings</span>
                      </div>
                      <div className="flex gap-1">
                        {(["quarterly", "yearly"] as const).map(f => (
                          <Button
                            key={f}
                            onClick={() => setRevFreq(f)}
                            label={f === "quarterly" ? "Q" : "A"}
                            className={`sv-option-btn${revFreq === f ? " active" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    {loading
                      ? <Skeleton height="220px" />
                      : revSrc?.length
                        ? <HighchartsReact highcharts={Highcharts} options={revChartOpts} />
                        : <div className="flex align-items-center justify-content-center text-sm sv-text-muted" style={{ height: 220 }}>No data available</div>
                    }
                  </Card>
                </div>

                <div className="col-12 lg:col-6 p-1">
                  <Card>
                    <div className="flex align-items-center gap-2 mb-2">
                      <i className="pi pi-chart-line sv-text-accent" style={{ fontSize: 13 }} />
                      <span className="font-bold text-sm">Earnings Per Share — Quarterly</span>
                    </div>
                    {loading
                      ? <Skeleton height="220px" />
                      : epsSrc?.length
                        ? <HighchartsReact highcharts={Highcharts} options={epsChartOpts} />
                        : <div className="flex align-items-center justify-content-center text-sm sv-text-muted" style={{ height: 220 }}>No data available</div>
                    }
                  </Card>
                </div>
              </div>
            )}

            {/* Fundamentals tabs */}
            {isStock && (
              <div className="mb-3">
                <Card>
                  <TabView pt={{ root: { className: "sv-tabs" } }}>

                    {/* Business Health */}
                    <TabPanel header="Business Health" leftIcon="pi pi-heart mr-2">
                      {loading ? <Skeleton height="130px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6 pr-3">
                            {[
                              { label: "Gross Margin", value: fmtPctDecimal(overview?.grossMargins), color: parseFloat(String(overview?.grossMargins)) > 0.3 ? "var(--sv-gain)" : undefined },
                              { label: "Profit Margin", value: fmtPctDecimal(overview?.profitMargins), color: parseFloat(String(overview?.profitMargins)) > 0 ? "var(--sv-gain)" : "var(--sv-loss)" },
                              { label: "Return on Equity (ROE)", value: fmtPctDecimal(overview?.returnOnEquity), color: parseFloat(String(overview?.returnOnEquity)) > 0 ? "var(--sv-gain)" : "var(--sv-loss)" },
                              { label: "Return on Assets (ROA)", value: fmtPctDecimal(overview?.returnOnAssets), color: parseFloat(String(overview?.returnOnAssets)) > 0 ? "var(--sv-gain)" : "var(--sv-loss)" },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} valueColor={m.color} />)}
                          </div>
                          <div className="col-12 md:col-6 pl-3">
                            {[
                              { label: "Total Debt", value: `$${fmtLarge(overview?.totalDebt)}` },
                              { label: "Debt / Equity", value: fmtNum(overview?.debtToEquity) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Stock Stats */}
                    <TabPanel header="Stock Stats" leftIcon="pi pi-chart-pie mr-2">
                      {loading ? <Skeleton height="180px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6 pr-3">
                            {[
                              { label: "Shares Outstanding", value: fmtLarge(overview?.sharesOutstanding) },
                              { label: "Float Shares", value: fmtLarge(overview?.floatShares) },
                              { label: "Insider Holdings", value: fmtPctDecimal(overview?.heldPercentInsiders) },
                              { label: "Institutional Holdings", value: fmtPctDecimal(overview?.heldPercentInstitutions) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6 pl-3">
                            {[
                              {
                                label: overview?.sharesShortDate
                                  ? `Shares Short (${fmtDate(overview.sharesShortDate)})`
                                  : "Shares Short",
                                value: fmtLarge(overview?.sharesShort),
                              },
                              {
                                label: overview?.sharesShortPriorMonthDate
                                  ? `Shares Short Prior Month (${fmtDate(overview.sharesShortPriorMonthDate)})`
                                  : "Shares Short Prior Month",
                                value: fmtLarge(overview?.sharesShortPriorMonth),
                              },
                              {
                                label: overview?.insiderSharesLast6MonthBoughtCount
                                  ? `Insider Bought (${overview.insiderSharesLast6MonthBoughtCount} txn, 6M)`
                                  : "Insider Bought (6M)",
                                value: fmtLarge(overview?.insiderSharesLast6MonthBought),
                                color: "var(--sv-gain)",
                              },
                              {
                                label: overview?.insiderSharesLast6MonthSoldCount
                                  ? `Insider Sold (${overview.insiderSharesLast6MonthSoldCount} txn, 6M)`
                                  : "Insider Sold (6M)",
                                value: fmtLarge(overview?.insiderSharesLast6MonthSold),
                                color: "var(--sv-loss)",
                              },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} valueColor={(m as any).color} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Earnings */}
                    <TabPanel header="Earnings" leftIcon="pi pi-dollar mr-2">
                      {loading ? <Skeleton height="200px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6 pr-3">
                            <div className="sv-info-label text-xs font-bold mb-2 flex align-items-center gap-1">
                              <i className="pi pi-check-circle" style={{ fontSize: 11 }} />
                              Actual
                            </div>
                            {[
                              { label: "EPS — Last Quarter", value: fmtPrice(overview?.epsLastQuarter) },
                              { label: "EPS — Prior Quarter", value: fmtPrice(overview?.epsLastToLastQuarter) },
                              { label: "EPS — Last Year", value: fmtPrice(overview?.epsLastYearActual) },
                              { label: "Revenue — Last Quarter", value: `$${fmtLarge(overview?.revenueLastQuarter)}` },
                              { label: "Revenue — Prior Quarter", value: `$${fmtLarge(overview?.revenueLastToLastQuarter)}` },
                              { label: "Revenue — Last Year", value: `$${fmtLarge(overview?.revenueLastYear)}` },
                              { label: "Revenue — Prior Year", value: `$${fmtLarge(overview?.revenueLastToLastYear)}` },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6 pl-3">
                            <div className="sv-info-label text-xs font-bold mb-2 flex align-items-center gap-1">
                              <i className="pi pi-calendar" style={{ fontSize: 11 }} />
                              Estimates
                            </div>
                            {[
                              { label: "EPS — Current Quarter", value: fmtPrice(overview?.epsCurrentQuarterEstimate) },
                              { label: "EPS — Next Quarter", value: fmtPrice(overview?.epsNextQuarterEstimate) },
                              { label: "EPS — Current Year", value: fmtPrice(overview?.epsCurrentYearEstimate) },
                              { label: "Revenue — Current Quarter", value: `$${fmtLarge(overview?.revenueCurrentQuarterEstimate)}` },
                              { label: "Revenue — Next Quarter", value: `$${fmtLarge(overview?.revenueNextQuarterEstimate)}` },
                              { label: "Revenue — Current Year", value: `$${fmtLarge(overview?.revenueCurrentYearEstimate)}` },
                              { label: "Revenue — Next Year", value: `$${fmtLarge(overview?.revenueNextYearEstimate)}` },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Valuation */}
                    <TabPanel header="Valuation" leftIcon="pi pi-tag mr-2">
                      {loading ? <Skeleton height="100px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6 pr-3">
                            {[
                              { label: "Forward P/E", value: fmtNum(overview?.forwardPE) },
                              { label: "Trailing P/E", value: fmtNum(overview?.trailingPE) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6 pl-3">
                            {[
                              { label: "PEG Ratio", value: fmtNum(overview?.pegRatio) },
                              { label: "Price / Book", value: fmtNum(overview?.priceToBook) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                        </div>
                      )}
                    </TabPanel>

                    {/* Dividends & Splits */}
                    <TabPanel header="Dividends & Splits" leftIcon="pi pi-percentage mr-2">
                      {loading ? <Skeleton height="160px" /> : (
                        <div className="grid" style={{ margin: 0 }}>
                          <div className="col-12 md:col-6 pr-3">
                            {[
                              { label: "Dividend (TTM)", value: `$${fmtNum(overview?.trailingAnnualDividendRate)}` },
                              { label: "Dividend Yield (TTM)", value: fmtPctDecimal(overview?.trailingAnnualDividendYield) },
                              { label: "Last Dividend", value: `$${fmtNum(overview?.lastDividendValue)}` },
                              { label: "Last Dividend Date", value: fmtDate(overview?.lastDividendDate) },
                              { label: "5Y Avg Dividend Yield", value: fmtPctDirect(overview?.fiveYearAvgDividendYield) },
                            ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                          </div>
                          <div className="col-12 md:col-6 pl-3">
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

            {/* About */}
            {!loading && overview?.longBusinessSummary && (
              <Card>
                <div className="flex align-items-center justify-content-between mb-3">
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-building sv-text-accent" style={{ fontSize: 14 }} />
                    <span className="font-bold text-sm">About {liveSymbol?.companyname}</span>
                  </div>
                  <Button
                    link
                    label={descExpanded ? "Show less" : "Read more"}
                    onClick={() => setDescExpanded(x => !x)}
                    className="p-0 text-sm font-semibold"
                  />
                </div>
                <p className="text-sm text-color-secondary m-0" style={{ lineHeight: 1.8 }}>
                  {descExpanded
                    ? overview.longBusinessSummary
                    : `${overview.longBusinessSummary.slice(0, 380)}…`}
                </p>
              </Card>
            )}
          </TabPanel>

          {/* ── Live Chart tab ────────────────────────────────────────────────── */}
          <TabPanel header="Live Chart" leftIcon="pi pi-chart-line mr-2">
            <div className="border-1 surface-border border-round-xl overflow-hidden" style={{ width: "100%", height: 620 }}>
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

          {/* ── News tab ──────────────────────────────────────────────────────── */}
          <TabPanel header="News" leftIcon="pi pi-newspaper mr-2">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-newspaper sv-text-accent" />
              <span className="font-bold text-sm">Market News</span>
            </div>
            <NewsFeed />
          </TabPanel>

        </TabView>
      </div>
    </div>
  );
};

export default StockSummaryPage;
