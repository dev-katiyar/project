import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { TabView, TabPanel } from "primereact/tabview";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHART_COLORS: Record<ThemeName, { bg: string; grid: string; text: string; border: string }> = {
  dark:  { bg: "#121a2e", grid: "#1c2840", text: "#7a8da8", border: "#1c2840" },
  dim:   { bg: "#1c2945", grid: "#283a5c", text: "#7a92b8", border: "#283a5c" },
  light: { bg: "#ffffff", grid: "#dfe7f5", text: "#4a5e78", border: "#c8d4ec" },
};

const PAIR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

const DEFAULT_LOOKBACK  = [5, 20, 20, 20, 60, 60, 60];
const DEFAULT_CORR      = [252, 126, 21];
const DEFAULT_SCORE     = [21, 63, 252];
const REF_PERIOD        = 252;

/** Symbols that should NOT show a holdings drill-down icon */
const HIDDEN_HOLDINGS_SYMBOLS = ["EEM", "EFA", "GDX", "VEA"];

// ── Types ──────────────────────────────────────────────────────────────────────

interface FaResponse {
  excess_period_returns: Array<Record<string, any>>;
  corr_matrices: Record<string, Record<string, Record<string, number>>>;
  scores_rank: Array<Record<string, any>> | Record<string, Record<string, Record<string, any>>>;
  update_date?: string;
}

interface PairChartData { correlation: number; scores: Array<{ date: string; [k: string]: any }> }

export interface FactorAnalysisViewProps {
  dictType: string;
  dict: Record<string, string>;
  /** Hide the holdings icon column (used when the view itself is already an ETF holdings view) */
  isEtfView?: boolean;
  /** Called when the user clicks the holdings icon for a symbol. Provide to enable the column. */
  onHoldingsClick?: (symbol: string, name: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getHeatStyle(value: any, min: number, max: number): React.CSSProperties {
  const v = parseFloat(value);
  if (value == null || isNaN(v)) return { color: "var(--sv-text-muted)" };
  if (v < 0 && min < 0) {
    const t = Math.min(Math.abs(v / min), 1);
    const r = Math.round(t * 215);
    return {
      background: `rgba(${r}, 18, 28, ${0.25 + t * 0.6})`,
      color: t > 0.25 ? "#ffcccc" : "var(--sv-text-secondary)",
    };
  }
  if (v > 0 && max > 0) {
    const t = Math.min(v / max, 1);
    const g = Math.round(88 + t * 108);
    return {
      background: `rgba(18, ${g}, 38, ${0.25 + t * 0.6})`,
      color: t > 0.25 ? "#ccffcc" : "var(--sv-text-secondary)",
    };
  }
  return { color: "var(--sv-text-muted)" };
}

function fmtPct(v: any): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}

function fmtNum(v: any, d = 2): string {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toFixed(d);
}

// ── Period toggle button ───────────────────────────────────────────────────────

const PeriodBtn: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label, active, onClick,
}) => (
  <button
    onClick={onClick}
    className="sv-option-btn"
    style={{
      padding: "0.25rem 0.8rem",
      fontSize: "0.78rem",
      borderRadius: "0.4rem",
      ...(active ? {
        borderColor: "var(--sv-accent)",
        background: "var(--sv-accent)",
        color: "#fff",
      } : {}),
    }}
  >
    {label}
  </button>
);

// ── FactorAnalysisView ─────────────────────────────────────────────────────────

const FactorAnalysisView: React.FC<FactorAnalysisViewProps> = ({
  dictType,
  dict,
  isEtfView = false,
  onHoldingsClick,
}) => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];

  const symbols  = useMemo(() => Object.keys(dict), [dict]);
  const getName  = useCallback((sym: string) => dict[sym] ?? sym, [dict]);

  // ── Analysis ──────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [faData, setFaData]     = useState<FaResponse | null>(null);
  const [updateDate, setUpdateDate] = useState("");

  // ── Periods ───────────────────────────────────────────────────────────────
  const [lookbackPeriods, setLookbackPeriods] = useState(DEFAULT_LOOKBACK);
  const [corrPeriods,     setCorrPeriods]     = useState(DEFAULT_CORR);
  const [scorePeriods,    setScorePeriods]    = useState(DEFAULT_SCORE);   // eslint-disable-line
  const [selCorrPeriod,   setSelCorrPeriod]   = useState(DEFAULT_CORR[0]);
  const [selScorePeriod,  setSelScorePeriod]  = useState(DEFAULT_SCORE[0]);
  const [scoreFieldType,  setScoreFieldType]  = useState<"z-Score" | "%tile Rank">("z-Score");

  // ── Lookback edit ─────────────────────────────────────────────────────────
  const [editLookback, setEditLookback] = useState(false);
  const [lookbackInput, setLookbackInput] = useState(DEFAULT_LOOKBACK.join(", "));
  const [lookbackError, setLookbackError] = useState("");

  // ── Corr periods edit ─────────────────────────────────────────────────────
  const [editCorrPeriods, setEditCorrPeriods] = useState(false);
  const [corrPeriodsInput, setCorrPeriodsInput] = useState(DEFAULT_CORR.join(", "));
  const [corrPeriodsError, setCorrPeriodsError] = useState("");

  // ── Filter ────────────────────────────────────────────────────────────────
  const [corrThreshold, setCorrThreshold] = useState("-0.6");
  const [corrDir, setCorrDir]             = useState<"less" | "more">("less");
  const [filteredPairs, setFilteredPairs] = useState<Array<Record<string, any>>>([]);
  const [filterApplied, setFilterApplied] = useState(false);

  // ── Pair chart dialog ─────────────────────────────────────────────────────
  const [pairDialog, setPairDialog] = useState<{
    sym1: string; sym2: string; data: PairChartData | null; loading: boolean;
  } | null>(null);

  // ── Refs for stale-closure–safe fetch ─────────────────────────────────────
  const lookbackRef = useRef(DEFAULT_LOOKBACK);
  const corrRef     = useRef(DEFAULT_CORR);
  const scoreRef    = useRef(DEFAULT_SCORE);
  useEffect(() => { lookbackRef.current = lookbackPeriods; }, [lookbackPeriods]);
  useEffect(() => { corrRef.current     = corrPeriods;     }, [corrPeriods]);
  useEffect(() => { scoreRef.current    = scorePeriods;    }, [scorePeriods]);

  // ── Fetch analysis data ───────────────────────────────────────────────────
  const fetchData = useCallback((reloadLive = false) => {
    if (!symbols.length) return;
    setLoading(true);
    setFaData(null);
    setFilterApplied(false);
    api.post("/factor-analysis/excess-returns", {
      dictType,
      tickers: symbols,
      lookBackPeriods: lookbackRef.current,
      corrPeriods:     corrRef.current,
      zScoreInputs:    { refPeriod: REF_PERIOD, scorePeriods: scoreRef.current },
      reloadLiveData:  reloadLive,
    })
      .then((res) => {
        const data: FaResponse = res.data;
        setFaData(data);
        setUpdateDate(data.update_date ?? "");
        const ck = Object.keys(data.corr_matrices ?? {}).map(Number).filter(Boolean).sort((a, b) => b - a);
        if (ck.length) { setCorrPeriods(ck); setSelCorrPeriod(ck[0]); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbols, dictType]);

  // Reset state and re-fetch whenever the dict/dictType changes
  useEffect(() => {
    setFaData(null);
    setUpdateDate("");
    setFilterApplied(false);
    setLookbackPeriods(DEFAULT_LOOKBACK);
    setCorrPeriods(DEFAULT_CORR);
    setScorePeriods(DEFAULT_SCORE);
    setSelCorrPeriod(DEFAULT_CORR[0]);
    setSelScorePeriod(DEFAULT_SCORE[0]);
    lookbackRef.current = DEFAULT_LOOKBACK;
    corrRef.current     = DEFAULT_CORR;
    scoreRef.current    = DEFAULT_SCORE;
    if (symbols.length) fetchData();
  }, [symbols, dictType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Corr periods save ─────────────────────────────────────────────────────
  const saveCorrPeriods = () => {
    const parts = corrPeriodsInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
    if (parts.length < 1 || parts.length > 6) { setCorrPeriodsError("Enter 1–6 positive numbers"); return; }
    setCorrPeriodsError("");
    const sorted = [...parts].sort((a, b) => b - a);
    corrRef.current = sorted;
    setCorrPeriods(sorted);
    setSelCorrPeriod((prev) => sorted.includes(prev) ? prev : sorted[0]);
    setEditCorrPeriods(false);
    fetchData();
  };

  // ── Lookback save ─────────────────────────────────────────────────────────
  const saveLookback = () => {
    const parts = lookbackInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (parts.length < 2 || parts.length > 10) { setLookbackError("Enter 2–10 numbers"); return; }
    if (parts.some((n) => n >= 100)) { setLookbackError("Each value must be < 100"); return; }
    setLookbackError("");
    lookbackRef.current = parts;
    setLookbackPeriods(parts);
    setEditLookback(false);
    fetchData();
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const applyFilter = () => {
    const thresh = parseFloat(corrThreshold);
    if (isNaN(thresh) || !faData) return;
    const raw = faData.scores_rank;
    const src: Record<string, any>[] = Array.isArray(raw)
      ? raw
      : Object.entries(raw as Record<string, Record<string, Record<string, any>>>).flatMap(([sym1, inner]) =>
          Object.entries(inner)
            .filter(([sym2]) => sym1 !== sym2)
            .map(([sym2, data]) => ({ sym1, sym2, correlation: data.corr ?? null, ...data }))
        );
    const pairs = src.filter((row) =>
      corrDir === "less" ? +row.correlation <= thresh : +row.correlation >= thresh
    );
    setFilteredPairs(pairs);
    setFilterApplied(true);
  };

  // ── Open pair chart ───────────────────────────────────────────────────────
  const openPairChart = useCallback((sym1: string, sym2: string) => {
    setPairDialog({ sym1, sym2, data: null, loading: true });
    api.post("/factor-analysis/pair-zscores-chart", {
      dictType,
      tickers: [sym1, sym2],
      zScoreInputs: { refPeriod: REF_PERIOD, scorePeriods: scoreRef.current },
    })
      .then((res) => setPairDialog({ sym1, sym2, data: res.data, loading: false }))
      .catch(() => setPairDialog({ sym1, sym2, data: null, loading: false }));
  }, [dictType]);

  // ── Pair chart options ────────────────────────────────────────────────────
  const pairChartOpts = useMemo((): Highcharts.Options => {
    const scores = [...(pairDialog?.data?.scores ?? [])].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    if (!scores?.length) return {};
    const fields = scoreRef.current
      .map((p) => `${p}_rank`)
      .filter((f) => f in (scores[0] ?? {}))
      .filter((f) => f.includes("21") || f.includes("63"));
    return {
      chart: { backgroundColor: cc.bg, height: 300, animation: false, style: { fontFamily: "Inter, sans-serif" } },
      title: { text: "" },
      credits: { enabled: false },
      accessibility: { enabled: false },
      xAxis: {
        categories: scores.map((s) => s.date),
        tickInterval: Math.ceil(scores.length / 8),
        labels: { rotation: -35, style: { color: cc.text, fontSize: "10px" } },
        lineColor: cc.border, tickColor: cc.border,
      },
      yAxis: {
        gridLineColor: cc.grid,
        labels: { format: "{value:.0f}", style: { color: cc.text, fontSize: "11px" } },
        title: { text: "Percentile Rank", style: { color: cc.text, fontSize: "11px" } },
        plotLines: [
          { value: 0,   color: cc.text,    dashStyle: "Dot",       width: 1 },
          { value: 80,  color: "#f59e0b",  dashStyle: "ShortDash", width: 1, label: { text: "80", style: { color: "#f59e0b", fontSize: "9px" } } },
          { value: -80, color: "#f59e0b",  dashStyle: "ShortDash", width: 1, label: { text: "-80", style: { color: "#f59e0b", fontSize: "9px" } } },
        ],
      },
      legend: { itemStyle: { color: cc.text, fontSize: "11px" }, itemHoverStyle: { color: "#fff" } },
      tooltip: { backgroundColor: cc.bg, borderColor: cc.border, style: { color: cc.text }, shared: true },
      plotOptions: { line: { marker: { enabled: false } } },
      series: fields.map((f, i) => ({
        type: "line" as const,
        name: f.replace("_rank", "d"),
        data: scores.map((s) => s[f] ?? null),
        color: PAIR_COLORS[i % PAIR_COLORS.length],
        lineWidth: 2,
      })),
    };
  }, [pairDialog, cc]);

  // ── Derived table data ────────────────────────────────────────────────────
  const exRows     = useMemo(() => Array.isArray(faData?.excess_period_returns) ? faData!.excess_period_returns : [], [faData]);
  const scoresRank = useMemo(() => {
    const raw = faData?.scores_rank;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const rows: Record<string, any>[] = [];
    for (const sym1 of Object.keys(raw)) {
      for (const sym2 of Object.keys(raw[sym1])) {
        if (sym1 === sym2) continue;
        const data = (raw as Record<string, Record<string, Record<string, any>>>)[sym1][sym2];
        if (data) rows.push({ sym1, sym2, correlation: data.corr ?? null, ...data });
      }
    }
    return rows;
  }, [faData]);

  const periodCols = useMemo(
    () => exRows.length ? Object.keys(exRows[0]).filter((k) => k !== "symbol" && k !== "name").reverse() : [],
    [exRows]
  );
  const [exMin, exMax] = useMemo(() => {
    if (!exRows.length || !periodCols.length) return [-1, 1] as const;
    const vals: number[] = [];
    for (const r of exRows) {
      for (const c of periodCols) {
        const n = parseFloat(r[c]);
        if (!isNaN(n)) vals.push(n);
      }
    }
    return vals.length ? [Math.min(...vals), Math.max(...vals)] as const : [-1, 1] as const;
  }, [exRows, periodCols]);

  const corrMatrix  = useMemo(() => {
    const m = faData?.corr_matrices?.[String(selCorrPeriod)];
    return (m && typeof m === "object" && !Array.isArray(m)) ? m as Record<string, Record<string, number>> : {} as Record<string, Record<string, number>>;
  }, [faData, selCorrPeriod]);
  const corrSymbols = useMemo(() => Object.keys(corrMatrix), [corrMatrix]);

  const scoreMatrix = useMemo(() => {
    const map: Record<string, Record<string, Record<string, any>>> = {};
    for (const row of scoresRank) {
      const { sym1, sym2 } = row;
      if (!sym1 || !sym2) continue;
      if (!map[sym1]) map[sym1] = {};
      map[sym1][sym2] = row;
    }
    return map;
  }, [scoresRank]);

  const scoreSymbols = useMemo(() => {
    const all = new Set<string>();
    for (const r of scoresRank) { if (r.sym1) all.add(r.sym1); if (r.sym2) all.add(r.sym2); }
    return [...all].sort();
  }, [scoresRank]);

  const scoreFieldKey = (p: number) => scoreFieldType === "z-Score" ? `${p}_zscore` : `${p}_rank`;
  const [scoreMin, scoreMax] = scoreFieldType === "z-Score" ? [-3, 3] : [-100, 100];

  // ── Holdings column visibility ────────────────────────────────────────────
  const showHoldingsCol  = !isEtfView && !!onHoldingsClick;
  const showHoldingsIcon = (sym: string) => !HIDDEN_HOLDINGS_SYMBOLS.includes(sym);

  // ── Shared table styles ───────────────────────────────────────────────────
  const tblStyle: React.CSSProperties = { borderCollapse: "separate", borderSpacing: "2px", width: "100%", fontSize: "0.82rem" };
  const thSt: React.CSSProperties     = { padding: "5px 8px", color: "var(--sv-text-muted)", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center", whiteSpace: "nowrap" };
  const tdSt: React.CSSProperties     = { padding: "5px 8px", textAlign: "center", borderRadius: "3px", fontWeight: 600, minWidth: "52px" };

  // ── Empty / loading helpers ───────────────────────────────────────────────
  const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
    <div className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted" style={{ height: "200px" }}>
      <i className={`pi ${icon}`} style={{ fontSize: "2.5rem", opacity: 0.2 }} />
      <span style={{ fontSize: "0.88rem" }}>{text}</span>
    </div>
  );

  const SkeletonRows = () => (
    <div className="flex flex-column gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} height="2rem" borderRadius="0.3rem" />
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Update date + refresh row */}
      {(updateDate || loading) && (
        <div className="flex align-items-center justify-content-end gap-2 mb-2">
          {updateDate && (
            <span className="sv-text-muted" style={{ fontSize: "0.75rem" }}>
              Updated {updateDate}
            </span>
          )}
          <Button
            icon="pi pi-refresh"
            rounded text severity="secondary" size="small"
            loading={loading}
            onClick={() => fetchData(true)}
            tooltip="Reload live price data"
            tooltipOptions={{ position: "left" }}
          />
        </div>
      )}

      <div className="surface-card border-1 border-round-xl overflow-hidden" style={{ borderColor: "var(--sv-border)", boxShadow: "var(--sv-shadow-md)" }}>
        <TabView
          pt={{
            root: { className: "sv-tabs" },
            panelContainer: { style: { padding: "1.25rem" } },
          }}
        >

          {/* ── TAB 1: EXCESS RETURNS ──────────────────────────────────────── */}
          <TabPanel header="Excess Returns">
            <div className="flex align-items-center gap-3 mb-3 flex-wrap">
              <span className="sv-info-label text-xs font-bold">Lookback Days:</span>
              {!editLookback ? (
                <>
                  <span
                    className="border-1 border-round px-2 py-1 text-xs"
                    style={{ color: "var(--sv-text-secondary)", background: "var(--sv-bg-surface)", borderColor: "var(--sv-border-light)" }}
                  >
                    {lookbackPeriods.join(", ")}
                  </span>
                  <Button
                    icon="pi pi-pencil" rounded text size="small" severity="secondary"
                    style={{ width: "1.7rem", height: "1.7rem", padding: 0 }}
                    onClick={() => { setLookbackInput(lookbackPeriods.join(", ")); setEditLookback(true); setLookbackError(""); }}
                  />
                </>
              ) : (
                <div className="flex align-items-center gap-2 flex-wrap">
                  <InputText
                    value={lookbackInput}
                    onChange={(e) => setLookbackInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveLookback()}
                    placeholder="e.g. 5, 20, 60"
                    style={{ width: "200px", fontSize: "0.82rem" }}
                    autoFocus
                  />
                  <Button icon="pi pi-check" rounded size="small" severity="success" style={{ width: "1.8rem", height: "1.8rem", padding: 0 }} onClick={saveLookback} />
                  <Button icon="pi pi-times" rounded text size="small" severity="secondary" style={{ width: "1.8rem", height: "1.8rem", padding: 0 }} onClick={() => { setEditLookback(false); setLookbackError(""); }} />
                  {lookbackError && <span className="sv-error-text text-xs">{lookbackError}</span>}
                </div>
              )}

              {/* Color scale legend */}
              <div className="flex align-items-center gap-2 ml-auto">
                <span className="sv-info-label" style={{ fontSize: "0.64rem" }}>Scale:</span>
                <span style={{ fontSize: "0.64rem", color: "#f87171", fontWeight: 600 }}>Under</span>
                <div style={{ width: "90px", height: "10px", borderRadius: "3px", background: "linear-gradient(to right, rgba(215,18,28,0.85) 0%, rgba(40,40,60,0.1) 50%, rgba(18,168,38,0.85) 100%)", border: "1px solid var(--sv-border-light)" }} />
                <span style={{ fontSize: "0.64rem", color: "#4ade80", fontWeight: 600 }}>Over</span>
              </div>
            </div>

            {loading ? <SkeletonRows /> : exRows.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thSt, textAlign: "left", paddingLeft: "0.5rem" }}>Symbol</th>
                      <th style={{ ...thSt, textAlign: "left" }}>Name</th>
                      {showHoldingsCol && (
                        <th style={{ ...thSt }}>Top 10 Holdings</th>
                      )}
                      {periodCols.map((c, i) => (
                        <th key={c} style={{ ...thSt, lineHeight: 1.4 }}>
                          <div>{lookbackPeriods[i] != null ? `${lookbackPeriods[i]}d` : ""}</div>
                          <div style={{ fontWeight: 400, fontSize: "0.68rem", opacity: 0.7, whiteSpace: "nowrap" }}>{
                            (() => { const p = c.split("_"); return p.length >= 2 ? `${p[0]} - ${p[1]}` : c; })()
                          }</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exRows.map((row) => (
                      <tr key={row.symbol}>
                        <td style={{ ...tdSt, textAlign: "left", paddingLeft: "0.5rem", color: "var(--sv-accent)", fontWeight: 700, letterSpacing: "0.03em" }}>
                          {row.symbol}
                        </td>
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-text-secondary)", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}
                          title={row.name}>
                          {getName(row.symbol)}
                        </td>
                        {showHoldingsCol && (
                          <td style={{ ...tdSt }}>
                            {showHoldingsIcon(row.symbol) && (
                              <i
                                className="pi pi-sitemap sv-text-accent"
                                title={`View top 10 holdings of ${row.symbol}`}
                                style={{ fontSize: "1.1rem", cursor: "pointer" }}
                                onClick={() => onHoldingsClick!(row.symbol, getName(row.symbol))}
                              />
                            )}
                          </td>
                        )}
                        {periodCols.map((c) => {
                          const val = parseFloat(row[c]);
                          return (
                            <td key={c} style={{ ...tdSt, ...getHeatStyle(val, exMin, exMax) }}>
                              {fmtPct(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon="pi-chart-bar" text="Select a category to load excess return data" />}
          </TabPanel>

          {/* ── TAB 2: CORRELATIONS ───────────────────────────────────────── */}
          <TabPanel header="Correlations">
            <div className="flex align-items-center gap-3 mb-3 flex-wrap">
              <span className="sv-info-label text-xs font-bold">Period:</span>
              {!editCorrPeriods ? (
                <>
                  <div className="flex gap-1">
                    {corrPeriods.map((p) => (
                      <PeriodBtn key={p} label={`${p}D`} active={p === selCorrPeriod} onClick={() => setSelCorrPeriod(p)} />
                    ))}
                  </div>
                  <Button
                    icon="pi pi-pencil" rounded text size="small" severity="secondary"
                    style={{ width: "1.7rem", height: "1.7rem", padding: 0 }}
                    onClick={() => { setCorrPeriodsInput(corrPeriods.join(", ")); setEditCorrPeriods(true); setCorrPeriodsError(""); }}
                  />
                </>
              ) : (
                <div className="flex align-items-center gap-2 flex-wrap">
                  <InputText
                    value={corrPeriodsInput}
                    onChange={(e) => setCorrPeriodsInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveCorrPeriods()}
                    placeholder="e.g. 21, 126, 252"
                    style={{ width: "200px", fontSize: "0.82rem" }}
                    autoFocus
                  />
                  <Button icon="pi pi-check" rounded size="small" severity="success" style={{ width: "1.8rem", height: "1.8rem", padding: 0 }} onClick={saveCorrPeriods} />
                  <Button icon="pi pi-times" rounded text size="small" severity="secondary" style={{ width: "1.8rem", height: "1.8rem", padding: 0 }} onClick={() => { setEditCorrPeriods(false); setCorrPeriodsError(""); }} />
                  {corrPeriodsError && <span className="sv-error-text text-xs">{corrPeriodsError}</span>}
                </div>
              )}
              <div className="flex align-items-center gap-2 ml-auto">
                <span style={{ fontSize: "0.64rem", color: "#f87171", fontWeight: 600 }}>-1</span>
                <div style={{ width: "72px", height: "10px", borderRadius: "3px", background: "linear-gradient(to right, rgba(215,18,28,0.85) 0%, rgba(40,40,60,0.1) 50%, rgba(18,168,38,0.85) 100%)", border: "1px solid var(--sv-border-light)" }} />
                <span style={{ fontSize: "0.64rem", color: "#4ade80", fontWeight: 600 }}>+1</span>
              </div>
            </div>

            {loading ? <SkeletonRows /> : corrSymbols.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thSt, textAlign: "left" }}>Name</th>
                      <th style={{ ...thSt, textAlign: "left" }}>Symbol</th>
                      {corrSymbols.map((s) => <th key={s} style={thSt} title={getName(s)}>{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {corrSymbols.map((s1) => (
                      <tr key={s1}>
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-text-secondary)", paddingLeft: "0.4rem", whiteSpace: "nowrap" }}>{getName(s1)}</td>
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-accent)", fontWeight: 700, paddingLeft: "0.4rem" }}>{s1}</td>
                        {corrSymbols.map((s2) => {
                          if (s1 === s2) return (
                            <td key={s2} style={{ ...tdSt, background: "rgba(100,100,120,0.18)", color: "var(--sv-text-muted)" }}>
                              1.00
                            </td>
                          );
                          const val = corrMatrix[s1]?.[s2];
                          return (
                            <td key={s2} style={{ ...tdSt, ...getHeatStyle(val, -1, 1) }}>
                              {val != null ? fmtNum(val) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon="pi-table" text="No correlation data — load analysis first" />}
          </TabPanel>

          {/* ── TAB 3: Z-SCORE & RANK ─────────────────────────────────────── */}
          <TabPanel header="Z-Score & Rank">
            <div className="flex align-items-center gap-3 mb-3 flex-wrap">
              <span className="sv-info-label text-xs font-bold">Period:</span>
              <div className="flex gap-1">
                {scorePeriods.map((p) => (
                  <PeriodBtn key={p} label={`${p}D`} active={p === selScorePeriod} onClick={() => setSelScorePeriod(p)} />
                ))}
              </div>
              <div className="flex gap-1 ml-2">
                {(["z-Score", "%tile Rank"] as const).map((ft) => (
                  <PeriodBtn key={ft} label={ft} active={ft === scoreFieldType} onClick={() => setScoreFieldType(ft)} />
                ))}
              </div>
              <span className="sv-text-muted ml-auto" style={{ fontSize: "0.68rem" }}>
                <i className="pi pi-info-circle mr-1" style={{ fontSize: "0.65rem" }} />
                Click cell to view pair trend
              </span>
            </div>

            {!loading && scoreSymbols.length > 0 && (
              <div className="flex align-items-center gap-2 mb-3 sv-text-muted" style={{ fontSize: "0.65rem" }}>
                <span className="inline-flex align-items-center gap-1">
                  <i className="pi pi-star-fill" style={{ color: "#f59e0b", fontSize: "0.6rem" }} />
                  Extreme: {scoreFieldType === "z-Score" ? "|z| ≥ 1" : "|rank| ≥ 80"}
                </span>
              </div>
            )}

            {loading ? <SkeletonRows /> : scoreSymbols.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thSt, textAlign: "left" }}>Name</th>
                      <th style={{ ...thSt, textAlign: "left" }}>Symbol</th>
                      {scoreSymbols.map((s) => <th key={s} style={thSt} title={getName(s)}>{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {scoreSymbols.map((s1) => (
                      <tr key={s1}>
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-text-secondary)", paddingLeft: "0.4rem", whiteSpace: "nowrap" }}>{getName(s1)}</td>
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-accent)", fontWeight: 700, paddingLeft: "0.4rem" }}>{s1}</td>
                        {scoreSymbols.map((s2) => {
                          if (s1 === s2) return (
                            <td key={s2} style={{ ...tdSt, background: "rgba(100,100,120,0.18)", color: "var(--sv-text-muted)", cursor: "default" }}>—</td>
                          );
                          const pairRow = scoreMatrix[s1]?.[s2];
                          const rawVal  = pairRow?.[scoreFieldKey(selScorePeriod)];
                          const val     = rawVal != null ? parseFloat(rawVal) : null;
                          const isExt   = val != null && (
                            scoreFieldType === "z-Score" ? Math.abs(val) >= 1 : Math.abs(val) >= 80
                          );
                          const hs = getHeatStyle(val, scoreMin, scoreMax);
                          return (
                            <td
                              key={s2}
                              onClick={() => pairRow && openPairChart(s1, s2)}
                              title={pairRow ? `${s1} vs ${s2} · click for trend chart` : undefined}
                              style={{
                                ...tdSt, ...hs,
                                cursor: pairRow ? "pointer" : "default",
                                outline: isExt ? "1px solid rgba(245,158,11,0.55)" : "none",
                                boxShadow: isExt ? "0 0 7px rgba(245,158,11,0.25)" : "none",
                                position: "relative",
                              }}
                              onMouseEnter={(e) => pairRow && ((e.currentTarget as HTMLElement).style.opacity = "0.8")}
                              onMouseLeave={(e) => pairRow && ((e.currentTarget as HTMLElement).style.opacity = "1")}
                            >
                              {val != null ? fmtNum(val) : "—"}
                              {isExt && <i className="pi pi-star-fill" style={{ position: "absolute", top: "2px", right: "2px", fontSize: "0.45rem", color: "#f59e0b" }} />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon="pi-chart-line" text="No z-score data — load analysis first" />}
          </TabPanel>

          {/* ── TAB 4: FILTERED PAIRS ─────────────────────────────────────── */}
          <TabPanel header="Filtered Pairs">
            <div className="flex align-items-center gap-3 mb-3 flex-wrap">
              <span className="sv-info-label text-xs font-bold">Correlation:</span>
              <div className="flex gap-1">
                {(["less", "more"] as const).map((d) => (
                  <PeriodBtn key={d} label={d === "less" ? "≤" : "≥"} active={d === corrDir} onClick={() => setCorrDir(d)} />
                ))}
              </div>
              <InputText
                value={corrThreshold}
                onChange={(e) => setCorrThreshold(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilter()}
                style={{ width: "72px", fontSize: "0.82rem", textAlign: "center" }}
              />
              <Button label="Apply" icon="pi pi-filter" size="small" onClick={applyFilter} disabled={loading || !faData} />
              {filterApplied && (
                <span
                  className="border-1 border-round px-2 py-1 text-xs"
                  style={{ color: "var(--sv-text-secondary)", background: "var(--sv-bg-surface)", borderColor: "var(--sv-border-light)" }}
                >
                  {filteredPairs.length} pair{filteredPairs.length !== 1 ? "s" : ""} matched
                </span>
              )}
              <span className="sv-text-muted ml-auto" style={{ fontSize: "0.68rem" }}>
                <i className="pi pi-info-circle mr-1" style={{ fontSize: "0.65rem" }} />
                Click row to view pair trend
              </span>
            </div>

            {!filterApplied ? (
              <EmptyState icon="pi-filter" text="Set a correlation filter above and click Apply" />
            ) : filteredPairs.length === 0 ? (
              <EmptyState icon="pi-search-minus" text="No pairs match the filter criteria" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thSt, textAlign: "left" }}>Sym 1</th>
                      <th style={{ ...thSt, textAlign: "left" }}>Sym 2</th>
                      <th style={thSt}>Correlation</th>
                      {scorePeriods.map((p) => <th key={p} style={thSt}>{p}d %tile</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPairs.map((row, i) => (
                      <tr
                        key={i}
                        onClick={() => openPairChart(row.sym1, row.sym2)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.8")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                      >
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-accent)", fontWeight: 700 }} title={getName(row.sym1)}>{row.sym1}</td>
                        <td style={{ ...tdSt, textAlign: "left", color: "var(--sv-accent)", fontWeight: 700 }} title={getName(row.sym2)}>{row.sym2}</td>
                        <td style={{ ...tdSt, ...getHeatStyle(+row.correlation, -1, 1) }}>{fmtNum(+row.correlation)}</td>
                        {scorePeriods.map((p) => {
                          const val = row[`${p}_rank`];
                          return <td key={p} style={{ ...tdSt, ...getHeatStyle(val, -100, 100) }}>{val != null ? fmtNum(+val) : "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabPanel>

        </TabView>
      </div>

      {/* ── PAIR CHART DIALOG ─────────────────────────────────────────────── */}
      <Dialog
        visible={!!pairDialog}
        onHide={() => setPairDialog(null)}
        header={
          pairDialog ? (
            <div className="flex align-items-center gap-2 flex-wrap">
              <i className="pi pi-chart-line sv-text-accent" style={{ fontSize: "1rem" }} />
              <span className="font-bold" style={{ fontSize: "1rem" }}>
                {pairDialog.sym1} <span style={{ opacity: 0.4, fontWeight: 400 }}>/</span> {pairDialog.sym2}
              </span>
              {pairDialog.data?.correlation != null && (
                <span
                  className="border-1 border-round px-2"
                  style={{
                    fontSize: "0.76rem", fontWeight: 600, padding: "0.1rem 0.5rem",
                    borderColor: "var(--sv-border)", background: "var(--sv-bg-surface)",
                    color: "var(--sv-text-secondary)",
                  }}
                >
                  Corr: {fmtNum(pairDialog.data.correlation)}
                </span>
              )}
              <span style={{ color: "var(--sv-text-secondary)", fontWeight: 400, fontSize: "0.88rem" }}>
                — Percentile Rank Trend
              </span>
            </div>
          ) : ""
        }
        style={{ width: "min(94vw, 860px)" }}
        contentStyle={{ padding: "0.75rem 1rem 1.25rem" }}
        draggable={false}
      >
        {pairDialog?.loading && <Skeleton height="300px" borderRadius="0.5rem" />}

        {!pairDialog?.loading && pairDialog?.data?.scores?.length ? (
          <>
            <p className="sv-text-muted m-0 mb-3 text-sm" style={{ lineHeight: 1.5 }}>
              Historical percentile rank of the excess return spread.&nbsp;
              <span style={{ color: "#f59e0b" }}>Dashed lines at ±80</span> signal potential mean-reversion opportunities.
            </p>
            <HighchartsReact highcharts={Highcharts} options={pairChartOpts} />
          </>
        ) : !pairDialog?.loading && (
          <div className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted" style={{ height: "200px" }}>
            <i className="pi pi-info-circle" style={{ fontSize: "2.5rem", opacity: 0.2 }} />
            <span style={{ fontSize: "0.88rem" }}>No chart data available for this pair</span>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default FactorAnalysisView;
