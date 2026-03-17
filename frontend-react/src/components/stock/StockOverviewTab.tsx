import React, { useState, useEffect, useCallback, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { TabView, TabPanel } from "primereact/tabview";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";
import AssetLineChart from "@/components/common/AssetLineChart";

// ── Chart colour tokens ─────────────────────────────────────────────────────
const CHART_COLORS: Record<ThemeName, { bg: string; grid: string; text: string }> = {
  dark:  { bg: "#121a2e", grid: "#1c2840", text: "#7a8da8" },
  dim:   { bg: "#1c2945", grid: "#283a5c", text: "#7a92b8" },
  light: { bg: "#ffffff", grid: "#dfe7f5", text: "#4a5e78" },
};

// ── Formatters ──────────────────────────────────────────────────────────────
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
  return `${n >= 0 ? "+" : ""}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  if (Math.abs(n) >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}
function fmtDate(ts: any): string {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(ts: any): string {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Return tile heat-map colour ─────────────────────────────────────────────
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

// ── Types ───────────────────────────────────────────────────────────────────
interface TechRow {
  symbol: string;
  wtd: number; mtd: number; qtd: number; ytd: number;
  change_oneyearbeforedate_pct: number;
  priceChange2Year: number;
  priceChange3Year: number;
}

export interface OverviewData {
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

const RETURN_TILES: Array<{ key: keyof OverviewData; label: string }> = [
  { key: "wtd",                        label: "WTD"    },
  { key: "mtd",                        label: "MTD"    },
  { key: "qtd",                        label: "QTD"    },
  { key: "ytd",                        label: "YTD"    },
  { key: "change_oneyearbeforedate_pct", label: "1 Year" },
  { key: "priceChange2Year",           label: "2 Year" },
  { key: "priceChange3Year",           label: "3 Year" },
];

// ── Small reusable sub-components ───────────────────────────────────────────
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

const RangeBar: React.FC<{ low: number; high: number; current: number }> = ({ low, high, current }) => {
  const pct = high > low ? Math.min(Math.max((current - low) / (high - low), 0), 1) * 100 : 50;
  return (
    <div style={{ position: "relative", height: 6, borderRadius: 4, background: "var(--sv-border)", margin: "6px 0 4px" }}>
      <div style={{ position: "absolute", left: 0, width: `${pct}%`, top: 0, bottom: 0, borderRadius: 4, background: "var(--sv-accent)", opacity: 0.45 }} />
      <div style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: "var(--sv-accent)", border: "2px solid var(--sv-bg-card)", zIndex: 1 }} />
    </div>
  );
};

// ── Props ───────────────────────────────────────────────────────────────────
interface StockOverviewTabProps {
  symbol: string;
  companyName?: string;
  assetType?: string;
}

// ── Component ───────────────────────────────────────────────────────────────
const StockOverviewTab: React.FC<StockOverviewTabProps> = ({ symbol, companyName, assetType }) => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revFreq, setRevFreq] = useState<"quarterly" | "yearly">("quarterly");
  const [descExpanded, setDescExpanded] = useState(false);

  const loadData = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setOverview(null);

    try {
      const [techRes, ovRes] = await Promise.all([
        api.post("/symbol/model/NA", sym),
        api.get(`/symbol/overview/${sym}`),
      ]);

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
      setError(`Unable to load overview data for ${sym}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDescExpanded(false);
    loadData(symbol);
  }, [symbol, loadData]);

  // ── Derived values ────────────────────────────────────────────────────────
  const maxAbsReturn = useMemo(() => {
    if (!overview) return 1;
    const vals = RETURN_TILES
      .map(t => overview[t.key] as number | undefined)
      .filter((v): v is number => v !== undefined && !isNaN(v));
    if (!vals.length) return 1;
    return Math.max(Math.abs(Math.min(...vals)), Math.abs(Math.max(...vals)), 0.01);
  }, [overview]);

  const isStock = (assetType ?? "STOCKS") === "STOCKS";
  const changePositive = (overview?.regularMarketChange ?? 0) >= 0;
  const changeColor = overview?.regularMarketChange !== undefined
    ? (changePositive ? "var(--sv-gain)" : "var(--sv-loss)")
    : "var(--sv-text-secondary)";

  // ── Chart options ─────────────────────────────────────────────────────────
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
      { type: "column", name: "Revenue",  data: revSrc?.map(r => r.revenue)  ?? [], color: "#3b82f6" },
      { type: "column", name: "Earnings", data: revSrc?.map(r => r.earnings) ?? [], color: "#22c55e" },
    ],
    plotOptions: { column: { borderWidth: 0, borderRadius: 3, groupPadding: 0.08 } },
    tooltip: { shared: true, formatter() { return this.points?.map(p => `<b>${p.series.name}</b>: $${fmtLarge(p.y)}`).join("<br/>") ?? ""; } },
    credits: { enabled: false },
    accessibility: { enabled: false },
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
    accessibility: { enabled: false },
  }), [epsSrc, cc]);

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex align-items-center gap-2 sv-error-text p-3">
        <i className="pi pi-exclamation-triangle" />
        <span>{error}</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Price hero ─────────────────────────────────────────────────────── */}
      <div className="surface-overlay border-bottom-1 surface-border px-3 py-3 mb-3">
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
                  {fmtChange(overview.regularMarketChange)}
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
                {fmtDateTime(overview.regularMarketTime)}
              </div>
            </div>

            <div style={{ width: 1, alignSelf: "stretch", background: "var(--sv-border)", margin: "0 4px" }} />

            {/* Quick stats grid */}
            <div className="grid flex-1" style={{ margin: 0, minWidth: 0 }}>
              {[
                { label: "Open",        value: fmtPrice(overview.regularMarketOpen) },
                { label: "Prev Close",  value: fmtPrice(overview.regularMarketPreviousClose) },
                { label: "Volume",      value: fmtLarge(overview.regularMarketVolume) },
                { label: "Avg Vol 3M",  value: fmtLarge(overview.averageDailyVolume3Month) },
                { label: "Mkt Cap",     value: `$${fmtLarge(overview.marketCap)}` },
                { label: "Beta",        value: fmtNum(overview.beta) },
                { label: "Dividend",    value: overview.trailingAnnualDividendRate ? `$${fmtNum(overview.trailingAnnualDividendRate)}` : "—" },
                { label: "Div Yield",   value: fmtPctDecimal(overview.trailingAnnualDividendYield) },
              ].map(s => (
                <div key={s.label} className="col-6 md:col-3 lg:col p-2">
                  <div className="sv-info-label text-xs mb-1">{s.label}</div>
                  <div className="text-sm font-bold">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Total returns tiles ─────────────────────────────────────────────── */}
      <div className="surface-ground border-bottom-1 surface-border px-3 py-2 mb-3">
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

      {/* ── Performance chart ───────────────────────────────────────────────── */}
      <Card className="mb-3">
        <div className="flex align-items-center gap-2 mb-2">
          <i className="pi pi-chart-line sv-text-accent" />
          <span className="font-bold text-sm">Price Performance</span>
        </div>
        {loading ? (
          <Skeleton height="270px" />
        ) : (
          <AssetLineChart symbols={[symbol]} height={270} filled defaultPeriod="1year" />
        )}
      </Card>

      {/* ── Range bars + KPI cards ──────────────────────────────────────────── */}
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
                    {overview?.fiftyTwoWeekLow && overview?.fiftyTwoWeekHigh
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
          { icon: "pi pi-chart-bar", label: "Avg Volume (3M)",     value: fmtLarge(overview?.averageDailyVolume3Month), sub: `Today: ${fmtLarge(overview?.regularMarketVolume)}` },
          { icon: "pi pi-wallet",    label: "Dividend (TTM)",       value: overview?.trailingAnnualDividendRate ? `$${fmtNum(overview.trailingAnnualDividendRate)}` : "—", sub: `Yield: ${fmtPctDecimal(overview?.trailingAnnualDividendYield)}` },
          { icon: "pi pi-users",     label: "Shares Outstanding",   value: fmtLarge(overview?.sharesOutstanding), sub: `Float: ${fmtLarge(overview?.floatShares)}` },
          { icon: "pi pi-globe",     label: "Market Cap",           value: `$${fmtLarge(overview?.marketCap)}`, sub: `Beta: ${fmtNum(overview?.beta)}` },
        ].map(s => (
          <div key={s.label} className="col-12 md:col-6 lg:col-4 p-1">
            {loading
              ? <Skeleton height="70px" borderRadius="10px" />
              : <KpiCard icon={s.icon} label={s.label} value={s.value} sub={s.sub} />
            }
          </div>
        ))}
      </div>

      {/* ── Revenue & EPS charts ────────────────────────────────────────────── */}
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

      {/* ── Fundamentals tabs ───────────────────────────────────────────────── */}
      {isStock && (
        <div className="mb-3">
          <Card>
            <TabView pt={{ root: { className: "sv-tabs" } }}>

              <TabPanel header="Business Health" leftIcon="pi pi-heart mr-2">
                {loading ? <Skeleton height="130px" /> : (
                  <div className="grid" style={{ margin: 0 }}>
                    <div className="col-12 md:col-6 pr-3">
                      {[
                        { label: "Gross Margin",         value: fmtPctDecimal(overview?.grossMargins),   color: parseFloat(String(overview?.grossMargins)) > 0.3 ? "var(--sv-gain)" : undefined },
                        { label: "Profit Margin",        value: fmtPctDecimal(overview?.profitMargins),  color: parseFloat(String(overview?.profitMargins)) > 0 ? "var(--sv-gain)" : "var(--sv-loss)" },
                        { label: "Return on Equity (ROE)", value: fmtPctDecimal(overview?.returnOnEquity), color: parseFloat(String(overview?.returnOnEquity)) > 0 ? "var(--sv-gain)" : "var(--sv-loss)" },
                        { label: "Return on Assets (ROA)", value: fmtPctDecimal(overview?.returnOnAssets), color: parseFloat(String(overview?.returnOnAssets)) > 0 ? "var(--sv-gain)" : "var(--sv-loss)" },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} valueColor={m.color} />)}
                    </div>
                    <div className="col-12 md:col-6 pl-3">
                      {[
                        { label: "Total Debt",   value: `$${fmtLarge(overview?.totalDebt)}` },
                        { label: "Debt / Equity", value: fmtNum(overview?.debtToEquity) },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                  </div>
                )}
              </TabPanel>

              <TabPanel header="Stock Stats" leftIcon="pi pi-chart-pie mr-2">
                {loading ? <Skeleton height="180px" /> : (
                  <div className="grid" style={{ margin: 0 }}>
                    <div className="col-12 md:col-6 pr-3">
                      {[
                        { label: "Shares Outstanding",    value: fmtLarge(overview?.sharesOutstanding) },
                        { label: "Float Shares",          value: fmtLarge(overview?.floatShares) },
                        { label: "Insider Holdings",      value: fmtPctDecimal(overview?.heldPercentInsiders) },
                        { label: "Institutional Holdings", value: fmtPctDecimal(overview?.heldPercentInstitutions) },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                    <div className="col-12 md:col-6 pl-3">
                      {[
                        { label: overview?.sharesShortDate ? `Shares Short (${fmtDate(overview.sharesShortDate)})` : "Shares Short", value: fmtLarge(overview?.sharesShort) },
                        { label: overview?.sharesShortPriorMonthDate ? `Shares Short Prior Month (${fmtDate(overview.sharesShortPriorMonthDate)})` : "Shares Short Prior Month", value: fmtLarge(overview?.sharesShortPriorMonth) },
                        { label: overview?.insiderSharesLast6MonthBoughtCount ? `Insider Bought (${overview.insiderSharesLast6MonthBoughtCount} txn, 6M)` : "Insider Bought (6M)", value: fmtLarge(overview?.insiderSharesLast6MonthBought), color: "var(--sv-gain)" },
                        { label: overview?.insiderSharesLast6MonthSoldCount ? `Insider Sold (${overview.insiderSharesLast6MonthSoldCount} txn, 6M)` : "Insider Sold (6M)", value: fmtLarge(overview?.insiderSharesLast6MonthSold), color: "var(--sv-loss)" },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} valueColor={(m as any).color} />)}
                    </div>
                  </div>
                )}
              </TabPanel>

              <TabPanel header="Earnings" leftIcon="pi pi-dollar mr-2">
                {loading ? <Skeleton height="200px" /> : (
                  <div className="grid" style={{ margin: 0 }}>
                    <div className="col-12 md:col-6 pr-3">
                      <div className="sv-info-label text-xs font-bold mb-2 flex align-items-center gap-1">
                        <i className="pi pi-check-circle" style={{ fontSize: 11 }} /> Actual
                      </div>
                      {[
                        { label: "EPS — Last Quarter",  value: fmtPrice(overview?.epsLastQuarter) },
                        { label: "EPS — Prior Quarter", value: fmtPrice(overview?.epsLastToLastQuarter) },
                        { label: "EPS — Last Year",     value: fmtPrice(overview?.epsLastYearActual) },
                        { label: "Revenue — Last Quarter",  value: `$${fmtLarge(overview?.revenueLastQuarter)}` },
                        { label: "Revenue — Prior Quarter", value: `$${fmtLarge(overview?.revenueLastToLastQuarter)}` },
                        { label: "Revenue — Last Year",     value: `$${fmtLarge(overview?.revenueLastYear)}` },
                        { label: "Revenue — Prior Year",    value: `$${fmtLarge(overview?.revenueLastToLastYear)}` },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                    <div className="col-12 md:col-6 pl-3">
                      <div className="sv-info-label text-xs font-bold mb-2 flex align-items-center gap-1">
                        <i className="pi pi-calendar" style={{ fontSize: 11 }} /> Estimates
                      </div>
                      {[
                        { label: "EPS — Current Quarter",     value: fmtPrice(overview?.epsCurrentQuarterEstimate) },
                        { label: "EPS — Next Quarter",        value: fmtPrice(overview?.epsNextQuarterEstimate) },
                        { label: "EPS — Current Year",        value: fmtPrice(overview?.epsCurrentYearEstimate) },
                        { label: "Revenue — Current Quarter", value: `$${fmtLarge(overview?.revenueCurrentQuarterEstimate)}` },
                        { label: "Revenue — Next Quarter",    value: `$${fmtLarge(overview?.revenueNextQuarterEstimate)}` },
                        { label: "Revenue — Current Year",    value: `$${fmtLarge(overview?.revenueCurrentYearEstimate)}` },
                        { label: "Revenue — Next Year",       value: `$${fmtLarge(overview?.revenueNextYearEstimate)}` },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                  </div>
                )}
              </TabPanel>

              <TabPanel header="Valuation" leftIcon="pi pi-tag mr-2">
                {loading ? <Skeleton height="100px" /> : (
                  <div className="grid" style={{ margin: 0 }}>
                    <div className="col-12 md:col-6 pr-3">
                      {[
                        { label: "Forward P/E",  value: fmtNum(overview?.forwardPE) },
                        { label: "Trailing P/E", value: fmtNum(overview?.trailingPE) },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                    <div className="col-12 md:col-6 pl-3">
                      {[
                        { label: "PEG Ratio",   value: fmtNum(overview?.pegRatio) },
                        { label: "Price / Book", value: fmtNum(overview?.priceToBook) },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                  </div>
                )}
              </TabPanel>

              <TabPanel header="Dividends & Splits" leftIcon="pi pi-percentage mr-2">
                {loading ? <Skeleton height="160px" /> : (
                  <div className="grid" style={{ margin: 0 }}>
                    <div className="col-12 md:col-6 pr-3">
                      {[
                        { label: "Dividend (TTM)",       value: `$${fmtNum(overview?.trailingAnnualDividendRate)}` },
                        { label: "Dividend Yield (TTM)", value: fmtPctDecimal(overview?.trailingAnnualDividendYield) },
                        { label: "Last Dividend",        value: `$${fmtNum(overview?.lastDividendValue)}` },
                        { label: "Last Dividend Date",   value: fmtDate(overview?.lastDividendDate) },
                        { label: "5Y Avg Dividend Yield", value: fmtPctDirect(overview?.fiveYearAvgDividendYield) },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                    <div className="col-12 md:col-6 pl-3">
                      {[
                        { label: "Forward Dividend", value: `$${fmtNum(overview?.dividendRateForward)}` },
                        { label: "Forward Yield",    value: fmtPctDecimal(overview?.dividendYieldForward) },
                        { label: "Last Split Factor", value: overview?.lastSplitFactor ?? "—" },
                        { label: "Last Split Date",   value: fmtDate(overview?.lastSplitDate) },
                      ].map(m => <MetricRow key={m.label} label={m.label} value={m.value} />)}
                    </div>
                  </div>
                )}
              </TabPanel>

            </TabView>
          </Card>
        </div>
      )}

      {/* ── About ───────────────────────────────────────────────────────────── */}
      {!loading && overview?.longBusinessSummary && (
        <Card>
          <div className="flex align-items-center justify-content-between mb-3">
            <div className="flex align-items-center gap-2">
              <i className="pi pi-building sv-text-accent" style={{ fontSize: 14 }} />
              <span className="font-bold text-sm">About {companyName ?? symbol}</span>
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

    </div>
  );
};

export default StockOverviewTab;
