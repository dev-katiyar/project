import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { SelectButton } from "primereact/selectbutton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Checkbox } from "primereact/checkbox";
import { Slider } from "primereact/slider";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Constants ─────────────────────────────────────────────────────────────────

const SERIES_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  "#6366f1", "#a855f7", "#0ea5e9", "#d946ef", "#fb923c",
];

const HOLDINGS_EXCLUDED = ["EEM", "EFA", "GDX", "VEA"];

const SCORE_ZONES = [
  { label: "Very\nOversold",  from: -1,    to: -0.75, bg: "#052e16", border: "#14532d", textColor: "#4ade80" },
  { label: "Mod.\nOversold",  from: -0.75, to: -0.25, bg: "#14532d", border: "#166534", textColor: "#86efac" },
  { label: "Neutral",         from: -0.25, to:  0.25, bg: "#1e293b", border: "#334155", textColor: "#94a3b8" },
  { label: "Mod.\nOverbought",from:  0.25, to:  0.75, bg: "#7f1d1d", border: "#991b1b", textColor: "#fca5a5" },
  { label: "Very\nOverbought",from:  0.75, to:  1,    bg: "#450a0a", border: "#7f1d1d", textColor: "#f87171" },
];

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SymbolDict {
  code: string;
  name: string;
  dict: Record<string, string>;
}

interface DataPoint {
  date: string;
  absolute_score: number;
  relative_score: number;
  symbol: string;
}

interface RelAbsRow extends DataPoint {
  name: string;
  isInChart: boolean;
}

type RelAbsOutput = Record<string, DataPoint[]>;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getScoreBg(value: number): string {
  if (value <= 0) {
    const intensity = Math.min(Math.abs(value), 1);
    const g = Math.round(100 + intensity * 120);
    return `rgb(0,${g},60)`;
  }
  const intensity = Math.min(value, 1);
  const r = Math.round(150 + intensity * 105);
  return `rgb(${r},25,25)`;
}

function getScoreZoneLabel(score: number): string {
  if (score <= -0.75) return "Very Oversold";
  if (score <= -0.25) return "Mod. Oversold";
  if (Math.abs(score) < 0.25) return "Neutral";
  if (score < 0.75) return "Mod. Overbought";
  return "Very Overbought";
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

const ScoreBadge: React.FC<{ value: number; onClick: () => void; icon?: string }> = ({
  value, onClick, icon = "pi-chart-line",
}) => (
  <button
    onClick={onClick}
    title={getScoreZoneLabel(value)}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      padding: "0.22rem 0.55rem",
      borderRadius: "0.35rem",
      background: getScoreBg(value),
      color: "#fff",
      fontWeight: 700,
      fontSize: "0.78rem",
      cursor: "pointer",
      border: "none",
      minWidth: "5.2rem",
      justifyContent: "space-between",
      letterSpacing: "0.02em",
      transition: "opacity 0.15s, transform 0.1s",
      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
  >
    <span>{value.toFixed(3)}</span>
    <i className={`pi ${icon}`} style={{ fontSize: "0.65rem", opacity: 0.75 }} />
  </button>
);

const QuadrantTag: React.FC<{ label: string; color: string; position: "tl" | "tr" | "bl" | "br" }> = ({
  label, color, position,
}) => {
  const isTop = position.startsWith("t");
  const isLeft = position.endsWith("l");
  return (
    <div
      style={{
        position: "absolute",
        top: isTop ? "0.5rem" : undefined,
        bottom: isTop ? undefined : "0.5rem",
        left: isLeft ? "1rem" : undefined,
        right: isLeft ? undefined : "1rem",
        fontSize: "0.65rem",
        fontWeight: 700,
        color,
        opacity: 0.55,
        pointerEvents: "none",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        lineHeight: 1.3,
        textAlign: isLeft ? "left" : "right",
      }}
    >
      {label}
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────────

const RelativeAbsoluteSectorsPage: React.FC = () => {
  const { theme } = useTheme();

  // Data state
  const [dictTypes, setDictTypes] = useState<SymbolDict[]>([]);
  const [selectedDict, setSelectedDict] = useState<SymbolDict | null>(null);
  const [relAbsOutput, setRelAbsOutput] = useState<RelAbsOutput | null>(null);
  const [rows, setRows] = useState<RelAbsRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Chart controls
  const [showTail, setShowTail] = useState(true);
  const [tailLen, setTailLen] = useState(3);

  // Detail dialogs
  const [absDialog, setAbsDialog] = useState<{ symbol: string; data: any[] | null } | null>(null);
  const [relDialog, setRelDialog] = useState<{ symbol: string; data: any[] | null } | null>(null);
  const [absLoading, setAbsLoading] = useState(false);
  const [relLoading, setRelLoading] = useState(false);

  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const latestDate = rows[0]?.date ?? null;

  // ── Chart CSS-var colors (theme-reactive) ───────────────────────────────────
  const cc = useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const get = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
    return {
      bg:       get("--sv-chart-bg",        "#121a2e"),
      grid:     get("--sv-chart-grid",      "#1c2840"),
      text:     get("--sv-chart-text",      "#7a8da8"),
      accent:   get("--sv-accent",          "#2e5be6"),
      border:   get("--sv-border",          "#1c2840"),
    };
  }, [theme]);

  // ── Fetch symbol dictionaries on mount ──────────────────────────────────────
  useEffect(() => {
    api
      .post("/get-symbols", { categories: ["Sector", "Factor"] })
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? {};
        const types: SymbolDict[] = [
          { code: "sectors", name: "Sectors", dict: raw["Sector"] ?? {} },
          { code: "factors", name: "Factors", dict: raw["Factor"] ?? {} },
        ];
        setDictTypes(types);
        setSelectedDict(types[0]);
      })
      .catch(() => {});
  }, []);

  // ── Fetch rel/abs analysis when dict type changes ───────────────────────────
  useEffect(() => {
    if (!selectedDict) return;
    const tickers = Object.keys(selectedDict.dict);
    if (!tickers.length) return;

    setLoading(true);
    setRelAbsOutput(null);
    setRows([]);

    let cancelled = false;
    api
      .post("/relative-absolute-analysis-sectors", { tickers, tail_len: 95 })
      .then((res) => {
        if (cancelled) return;
        const output: RelAbsOutput = res.data;
        setRelAbsOutput(output);

        const newRows: RelAbsRow[] = Object.entries(output).map(
          ([symbol, pts], idx) => ({
            ...pts[0],
            symbol,
            name: selectedDict.dict[symbol] ?? symbol,
            isInChart: idx < 2,
          })
        );
        setRows(newRows);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedDict]);

  // ── Scatter chart options ────────────────────────────────────────────────────
  const scatterOptions = useMemo((): Highcharts.Options => {
    if (!relAbsOutput || !rows.length) return {};

    const visible = new Set(rows.filter((r) => r.isInChart).map((r) => r.symbol));
    const pts = showTail ? tailLen * 5 : 1;

    const series: Highcharts.SeriesLineOptions[] = Object.keys(relAbsOutput).map(
      (sym, idx) => {
        const dps = relAbsOutput[sym].slice(0, pts);
        return {
          type: "line",
          name: sym,
          visible: visible.has(sym),
          color: SERIES_COLORS[idx % SERIES_COLORS.length],
          lineWidth: 1.75,
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
          data: dps.map((dp, i) => ({
            x: dp.absolute_score,
            y: dp.relative_score,
            name: dp.date,
            ...(i === 0 && {
              marker: {
                enabled: true,
                radius: 6,
                fillColor: SERIES_COLORS[idx % SERIES_COLORS.length],
                lineColor: "#fff",
                lineWidth: 1.5,
                symbol: "circle",
              },
              dataLabels: {
                enabled: true,
                formatter(this: any) { return `<b>${sym}</b>`; },
                style: {
                  fontSize: "10px",
                  fontWeight: "700",
                  color: SERIES_COLORS[idx % SERIES_COLORS.length],
                  textOutline: `2px ${cc.bg}`,
                },
              },
            }),
          })),
        };
      }
    );

    return {
      chart: {
        type: "line",
        backgroundColor: cc.bg,
        plotBorderWidth: 1,
        plotBorderColor: cc.grid,
        zoomType: "xy",
        height: 500,
        style: { fontFamily: "Inter, sans-serif" },
        animation: { duration: 300 },
      },
      title: { text: "" },
      credits: { enabled: false },
      legend: { enabled: false },
      accessibility: { enabled: false },
      xAxis: {
        min: -1, max: 1,
        gridLineWidth: 1,
        gridLineColor: cc.grid,
        lineColor: cc.border,
        tickColor: cc.border,
        labels: { format: "{value:.1f}", style: { color: cc.text, fontSize: "11px" } },
        title: {
          text: "← Oversold  |  Absolute Score  |  Overbought →",
          style: { color: cc.text, fontWeight: "600", fontSize: "12px" },
        },
        plotBands: [
          {
            from: -1, to: 0,
            color: "rgba(34,197,94,0.055)",
            label: {
              text: "OVERSOLD",
              style: { color: "rgba(74,222,128,0.5)", fontSize: "10px", fontWeight: "700" },
              align: "left", x: 10, y: 18,
            },
          },
          {
            from: 0, to: 1,
            color: "rgba(239,68,68,0.055)",
            label: {
              text: "OVERBOUGHT",
              style: { color: "rgba(248,113,113,0.5)", fontSize: "10px", fontWeight: "700" },
              align: "right", x: -10, y: 18,
            },
          },
        ],
        plotLines: [
          { color: cc.text, dashStyle: "Dot", width: 1.5, value: 0, zIndex: 3 },
        ],
      },
      yAxis: {
        min: -1, max: 1,
        startOnTick: false,
        endOnTick: false,
        gridLineWidth: 1,
        gridLineColor: cc.grid,
        lineColor: cc.border,
        labels: { format: "{value:.1f}", style: { color: cc.text, fontSize: "11px" } },
        title: {
          text: "← Underperforming  |  Relative Score (vs SPY)  |  Outperforming →",
          style: { color: cc.text, fontWeight: "600", fontSize: "12px" },
        },
        plotBands: [
          { from: 0,  to:  1, color: "rgba(34,197,94,0.03)" },
          { from: -1, to:  0, color: "rgba(239,68,68,0.03)" },
        ],
        plotLines: [
          { color: cc.text, dashStyle: "Dot", width: 1.5, value: 0, zIndex: 3 },
        ],
      },
      tooltip: {
        backgroundColor: cc.bg,
        borderColor: cc.border,
        borderRadius: 8,
        style: { color: cc.text, fontSize: "12px" },
        useHTML: true,
        formatter(this: any) {
          const color = this.series.color;
          return `
            <div style="padding:0.5rem 0.6rem;min-width:180px">
              <div style="font-weight:700;margin-bottom:0.3rem;color:${color}">
                ${this.series.name}
              </div>
              <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:0.4rem">${this.point.name}</div>
              <div style="display:flex;justify-content:space-between;gap:1rem">
                <span>Absolute:</span>
                <b style="color:${getScoreBg(this.point.x) }">&nbsp;${this.point.x.toFixed(3)}</b>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1rem">
                <span>Relative:</span>
                <b>&nbsp;${this.point.y.toFixed(3)}</b>
              </div>
            </div>`;
        },
      },
      plotOptions: {
        series: {
          turboThreshold: 1000,
          states: { inactive: { opacity: 0.25 } },
          animation: { duration: 250 },
        },
      },
      series,
    };
  }, [relAbsOutput, rows, showTail, tailLen, cc]);

  // ── Detail chart builder ─────────────────────────────────────────────────────
  const buildDetailOptions = useCallback(
    (data: any[], yKey: string, yKey2?: string): Highcharts.Options => ({
      chart: {
        type: "line",
        backgroundColor: cc.bg,
        height: 340,
        style: { fontFamily: "Inter, sans-serif" },
        animation: false,
      },
      title: { text: "" },
      credits: { enabled: false },
      accessibility: { enabled: false },
      xAxis: {
        categories: data.map((d) => d.date),
        tickInterval: Math.ceil(data.length / 8),
        labels: {
          rotation: -35,
          style: { color: cc.text, fontSize: "10px" },
        },
        lineColor: cc.border,
        tickColor: cc.border,
      },
      yAxis: {
        gridLineColor: cc.grid,
        labels: { format: "{value:.2f}", style: { color: cc.text, fontSize: "11px" } },
        title: { text: "" },
        plotLines: [{ color: cc.text, dashStyle: "Dot", width: 1, value: 0 }],
      },
      legend: {
        enabled: !!yKey2,
        itemStyle: { color: cc.text, fontSize: "12px" },
        itemHoverStyle: { color: "#fff" },
      },
      tooltip: {
        backgroundColor: cc.bg,
        borderColor: cc.border,
        style: { color: cc.text },
      },
      plotOptions: {
        line: {
          marker: { enabled: false },
        },
      },
      series: [
        {
          type: "line",
          name: yKey,
          data: data.map((d) => d[yKey] ?? null),
          color: "#3b82f6",
          lineWidth: 2,
        },
        ...(yKey2
          ? [{
              type: "line" as const,
              name: yKey2,
              data: data.map((d) => d[yKey2] ?? null),
              color: "#ef4444",
              lineWidth: 2,
            }]
          : []),
      ],
    }),
    [cc]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDictChange = useCallback((e: any) => {
    if (e.value) setSelectedDict(e.value);
  }, []);

  const handleToggle = useCallback((symbol: string, checked: boolean) => {
    setRows((prev) => prev.map((r) => r.symbol === symbol ? { ...r, isInChart: checked } : r));
  }, []);

  const handleShowAll = useCallback((checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, isInChart: checked })));
  }, []);

  const handleAbsClick = useCallback((row: RelAbsRow) => {
    setAbsDialog({ symbol: row.symbol, data: null });
    setAbsLoading(true);
    api
      .post("/absolute-analysis", { symbol1: row.symbol })
      .then((res) => setAbsDialog({ symbol: row.symbol, data: Array.isArray(res.data) ? res.data : [] }))
      .catch(() => setAbsDialog({ symbol: row.symbol, data: [] }))
      .finally(() => setAbsLoading(false));
  }, []);

  const handleRelClick = useCallback((row: RelAbsRow) => {
    setRelDialog({ symbol: row.symbol, data: null });
    setRelLoading(true);
    api
      .post("/relative-analysis", { symbol1: row.symbol, symbol2: "SPY" })
      .then((res) => setRelDialog({ symbol: row.symbol, data: Array.isArray(res.data) ? res.data : [] }))
      .catch(() => setRelDialog({ symbol: row.symbol, data: [] }))
      .finally(() => setRelLoading(false));
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const allVisible = rows.length > 0 && rows.every((r) => r.isInChart);

  // ── Column renderers ─────────────────────────────────────────────────────────
  const colSymbol = (row: RelAbsRow) => (
    <span style={{ color: "var(--sv-accent)", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.02em" }}>
      {row.symbol}
    </span>
  );

  const colName = (row: RelAbsRow) => (
    <span
      style={{
        color: "var(--sv-text-secondary)",
        fontSize: "0.78rem",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
        maxWidth: "9rem",
      }}
      title={row.name}
    >
      {row.name}
    </span>
  );

  const colHoldings = (row: RelAbsRow) => {
    if (HOLDINGS_EXCLUDED.includes(row.symbol)) return null;
    return (
      <i
        className="pi pi-sitemap"
        style={{ fontSize: "1rem", color: "var(--sv-accent)", opacity: 0.7, cursor: "pointer" }}
        title="View Top 10 Holdings"
      />
    );
  };

  const colAbs = useCallback(
    (row: RelAbsRow) => (
      <ScoreBadge value={row.absolute_score} onClick={() => handleAbsClick(row)} />
    ),
    [handleAbsClick]
  );

  const colRel = useCallback(
    (row: RelAbsRow) => (
      <ScoreBadge value={row.relative_score} onClick={() => handleRelClick(row)} icon="pi-chart-bar" />
    ),
    [handleRelClick]
  );

  const colChart = useCallback(
    (row: RelAbsRow) => (
      <Checkbox
        checked={row.isInChart}
        onChange={(e) => handleToggle(row.symbol, !!e.checked)}
        style={{ transform: "scale(0.9)" }}
      />
    ),
    [handleToggle]
  );

  // ── Table header ─────────────────────────────────────────────────────────────
  const tableHeader = (
    <div
      className="flex align-items-center justify-content-between px-1 py-1"
      style={{ borderBottom: "1px solid var(--sv-border)" }}
    >
      <div className="flex align-items-center gap-2">
        <span style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {rows.length} {selectedDict?.name}
        </span>
        {latestDate && (
          <span style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", background: "var(--sv-bg-surface)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid var(--sv-border-light)" }}>
            {latestDate}
          </span>
        )}
      </div>
      <div className="flex align-items-center gap-2">
        <span style={{ fontSize: "0.72rem", color: "var(--sv-text-secondary)" }}>All</span>
        <Checkbox
          checked={allVisible}
          onChange={(e) => handleShowAll(!!e.checked)}
          style={{ transform: "scale(0.9)" }}
        />
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sv-page-min-h">

      {/* ── PAGE HEADER ── */}
      <div className="flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "var(--sv-text-primary)", letterSpacing: "-0.02em" }}>
            Performance Analysis
          </h2>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--sv-text-secondary)" }}>
            Relative vs Absolute Scores &nbsp;·&nbsp; Benchmark: SPY &nbsp;·&nbsp; Click a score to drill down
          </p>
        </div>

        <div className="flex align-items-center gap-3">
          {/* Category toggle */}
          <SelectButton
            value={selectedDict}
            options={dictTypes}
            optionLabel="name"
            onChange={handleDictChange}
            disabled={loading}
            pt={{
              button: { style: { fontSize: "0.82rem", padding: "0.4rem 1rem" } },
            }}
          />
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid">

        {/* ──── LEFT: Symbol Table ──── */}
        <div className="col-12 lg:col-5 xl:col-4">

          {/* Table card */}
          <div style={{
            background: "var(--sv-bg-card)",
            border: "1px solid var(--sv-border)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            boxShadow: "var(--sv-shadow-md)",
          }}>
            {loading ? (
              <div style={{ padding: "1rem" }}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} height="2.4rem" className="mb-2" borderRadius="0.4rem" />
                ))}
              </div>
            ) : (
              <DataTable
                value={rows}
                size="small"
                scrollable
                scrollHeight="420px"
                header={tableHeader}
                showGridlines={false}
                stripedRows
                emptyMessage="No data"
                style={{ fontSize: "0.82rem" }}
                pt={{
                  bodyRow: { style: { borderBottom: "1px solid var(--sv-border-light)" } },
                  header: { style: { background: "var(--sv-bg-card)", border: "none", padding: 0 } },
                  thead: { style: { display: "none" } }, // hide default thead, use header slot
                }}
              >
                {/* Custom column headers rendered inline since we hid thead */}
                <Column field="symbol"         body={colSymbol}   style={{ width: "4.5rem", paddingLeft: "0.75rem" }} />
                <Column field="name"           body={colName}     style={{ minWidth: "7rem" }} />
                <Column header=""              body={colHoldings} style={{ width: "2.5rem", textAlign: "center" }} />
                <Column field="absolute_score" body={colAbs}      style={{ width: "6.5rem" }} sortable />
                <Column field="relative_score" body={colRel}      style={{ width: "6.5rem" }} sortable />
                <Column header=""              body={colChart}    style={{ width: "3.5rem", textAlign: "center", paddingRight: "0.75rem" }} />
              </DataTable>
            )}
          </div>

          {/* Column labels strip */}
          {!loading && rows.length > 0 && (
            <div
              className="flex gap-1 mt-1 px-1"
              style={{ fontSize: "0.62rem", color: "var(--sv-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              <span style={{ width: "4.5rem", paddingLeft: "0.35rem" }}>Symbol</span>
              <span style={{ flex: 1 }}>Name</span>
              <span style={{ width: "2.5rem" }}></span>
              <span style={{ width: "6.5rem" }}>Absolute</span>
              <span style={{ width: "6.5rem" }}>Relative</span>
              <span style={{ width: "3.5rem", textAlign: "center" }}>Chart</span>
            </div>
          )}

          {/* Score legend */}
          <div
            className="mt-3 p-3"
            style={{
              background: "var(--sv-bg-card)",
              border: "1px solid var(--sv-border)",
              borderRadius: "0.75rem",
              boxShadow: "var(--sv-shadow-sm)",
            }}
          >
            <p style={{
              color: "var(--sv-text-muted)",
              fontSize: "0.65rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 0 0.5rem",
            }}>
              Score Scale
            </p>
            <div style={{ display: "flex", gap: "2px" }}>
              {SCORE_ZONES.map((zone) => (
                <div
                  key={zone.label}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.2rem",
                    background: zone.bg,
                    border: `1px solid ${zone.border}`,
                    borderRadius: "0.3rem",
                    textAlign: "center",
                    fontSize: "0.6rem",
                    color: zone.textColor,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    whiteSpace: "pre-line",
                  }}
                >
                  {zone.label}
                </div>
              ))}
            </div>
            <div className="flex justify-content-between mt-2">
              <span style={{ fontSize: "0.63rem", color: "#4ade80", fontWeight: 600 }}>← Buy Signal</span>
              <span style={{ fontSize: "0.63rem", color: "#f87171", fontWeight: 600 }}>Sell Signal →</span>
            </div>
            <div
              className="mt-2 pt-2"
              style={{ borderTop: "1px solid var(--sv-border-light)", fontSize: "0.65rem", color: "var(--sv-text-muted)", lineHeight: 1.5 }}
            >
              <span style={{ color: "var(--sv-text-secondary)" }}>Abs:</span> Measures absolute overbought/oversold level
              <br />
              <span style={{ color: "var(--sv-text-secondary)" }}>Rel:</span> Performance vs SPY (benchmark)
            </div>
          </div>
        </div>

        {/* ──── RIGHT: Chart ──── */}
        <div className="col-12 lg:col-7 xl:col-8">
          <div style={{
            background: "var(--sv-bg-card)",
            border: "1px solid var(--sv-border)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            boxShadow: "var(--sv-shadow-md)",
            padding: "1rem 1rem 0.75rem",
          }}>

            {/* Chart sub-header */}
            <div className="flex align-items-center justify-content-between mb-2">
              <div>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--sv-text-primary)" }}>
                  Scatter Plot
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--sv-text-muted)", marginLeft: "0.5rem" }}>
                  · drag to zoom · click score badges to drill down
                </span>
              </div>
              <div className="flex gap-2" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
                <span style={{ color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", padding: "0.15rem 0.5rem", borderRadius: "0.25rem" }}>
                  ↑ Outperforming
                </span>
                <span style={{ color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", padding: "0.15rem 0.5rem", borderRadius: "0.25rem" }}>
                  ↓ Underperforming
                </span>
              </div>
            </div>

            {/* Chart */}
            <div style={{ position: "relative" }}>
              {loading ? (
                <Skeleton height="500px" borderRadius="0.5rem" />
              ) : relAbsOutput ? (
                <>
                  <QuadrantTag label={"Oversold &\nOutperforming"} color="#4ade80" position="tl" />
                  <QuadrantTag label={"Overbought &\nOutperforming"} color="#fbbf24" position="tr" />
                  <QuadrantTag label={"Oversold &\nUnderperforming"} color="#94a3b8" position="bl" />
                  <QuadrantTag label={"Overbought &\nUnderperforming"} color="#f87171" position="br" />
                  <HighchartsReact
                    ref={chartRef}
                    highcharts={Highcharts}
                    options={scatterOptions}
                  />
                </>
              ) : (
                <div
                  className="flex flex-column align-items-center justify-content-center gap-3"
                  style={{ height: "500px", color: "var(--sv-text-muted)" }}
                >
                  <i className="pi pi-chart-scatter" style={{ fontSize: "3rem", opacity: 0.3 }} />
                  <span style={{ fontSize: "0.9rem" }}>Select a category to load the chart</span>
                </div>
              )}
            </div>

            {/* Tail length control */}
            {relAbsOutput && !loading && (
              <div
                className="flex align-items-center gap-3 mt-3 px-3 py-2"
                style={{
                  background: "var(--sv-bg-surface)",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--sv-border-light)",
                }}
              >
                <Checkbox
                  inputId="showTail"
                  checked={showTail}
                  onChange={(e) => setShowTail(!!e.checked)}
                />
                <label
                  htmlFor="showTail"
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--sv-text-secondary)",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  Trail Length
                </label>
                <Slider
                  value={tailLen}
                  onChange={(e) => setTailLen(e.value as number)}
                  min={1}
                  max={12}
                  step={1}
                  disabled={!showTail}
                  style={{ flex: 1 }}
                />
                <div
                  style={{
                    background: "var(--sv-bg-card)",
                    border: "1px solid var(--sv-border)",
                    borderRadius: "0.375rem",
                    padding: "0.2rem 0.65rem",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "var(--sv-accent)",
                    minWidth: "2.2rem",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {tailLen}
                </div>
                <span style={{ fontSize: "0.78rem", color: "var(--sv-text-muted)", whiteSpace: "nowrap" }}>
                  {tailLen === 1 ? "week" : "weeks"}
                  &nbsp;
                  <span style={{ color: "var(--sv-text-muted)", fontWeight: 400 }}>
                    ({tailLen * 5} pts)
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Visible series chips */}
          {!loading && rows.some((r) => r.isInChart) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {rows.filter((r) => r.isInChart).map((r, idx) => {
                const symbolIdx = rows.indexOf(r);
                const color = SERIES_COLORS[symbolIdx % SERIES_COLORS.length];
                return (
                  <span
                    key={r.symbol}
                    onClick={() => handleToggle(r.symbol, false)}
                    title={`${r.name} · click to remove`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.18rem 0.55rem",
                      borderRadius: "999px",
                      background: `${color}22`,
                      border: `1px solid ${color}55`,
                      color,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.opacity = "0.6"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.opacity = "1"; }}
                  >
                    <span
                      style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: color, display: "inline-block",
                      }}
                    />
                    {r.symbol}
                    <i className="pi pi-times" style={{ fontSize: "0.5rem", opacity: 0.7 }} />
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ABSOLUTE ANALYSIS DIALOG ── */}
      <Dialog
        visible={!!absDialog}
        onHide={() => setAbsDialog(null)}
        header={
          absDialog ? (
            <div className="flex align-items-center gap-2">
              <i className="pi pi-chart-line" style={{ color: "#3b82f6" }} />
              <span style={{ fontSize: "1rem", fontWeight: 700 }}>{absDialog.symbol}</span>
              <span style={{ color: "var(--sv-text-secondary)", fontWeight: 400, fontSize: "0.9rem" }}>— Absolute Analysis</span>
            </div>
          ) : ""
        }
        style={{ width: "min(92vw, 820px)" }}
        contentStyle={{ padding: "0.75rem 1rem 1rem" }}
        draggable={false}
      >
        {absLoading && <Skeleton height="340px" borderRadius="0.5rem" />}
        {!absLoading && absDialog?.data && absDialog.data.length > 0 && (
          <>
            <p style={{ fontSize: "0.78rem", color: "var(--sv-text-muted)", margin: "0 0 0.75rem" }}>
              Historical absolute score — negative = oversold (buy opportunity), positive = overbought
            </p>
            <HighchartsReact
              highcharts={Highcharts}
              options={buildDetailOptions(absDialog.data, absDialog.symbol)}
            />
          </>
        )}
        {!absLoading && absDialog?.data?.length === 0 && (
          <div className="flex flex-column align-items-center justify-content-center gap-2" style={{ height: "200px", color: "var(--sv-text-muted)" }}>
            <i className="pi pi-info-circle" style={{ fontSize: "1.5rem" }} />
            <span>No data available for {absDialog?.symbol}</span>
          </div>
        )}
      </Dialog>

      {/* ── RELATIVE ANALYSIS DIALOG ── */}
      <Dialog
        visible={!!relDialog}
        onHide={() => setRelDialog(null)}
        header={
          relDialog ? (
            <div className="flex align-items-center gap-2">
              <i className="pi pi-chart-bar" style={{ color: "#ef4444" }} />
              <span style={{ fontSize: "1rem", fontWeight: 700 }}>{relDialog.symbol}</span>
              <span style={{ color: "var(--sv-text-secondary)", fontWeight: 400, fontSize: "0.9rem" }}>vs SPY — Relative Analysis</span>
            </div>
          ) : ""
        }
        style={{ width: "min(92vw, 820px)" }}
        contentStyle={{ padding: "0.75rem 1rem 1rem" }}
        draggable={false}
      >
        {relLoading && <Skeleton height="340px" borderRadius="0.5rem" />}
        {!relLoading && relDialog?.data && relDialog.data.length > 0 && (
          <>
            <p style={{ fontSize: "0.78rem", color: "var(--sv-text-muted)", margin: "0 0 0.75rem" }}>
              Relative performance vs SPY — above zero = outperforming, below zero = underperforming
            </p>
            <HighchartsReact
              highcharts={Highcharts}
              options={buildDetailOptions(relDialog.data, relDialog.symbol, "SPY")}
            />
          </>
        )}
        {!relLoading && relDialog?.data?.length === 0 && (
          <div className="flex flex-column align-items-center justify-content-center gap-2" style={{ height: "200px", color: "var(--sv-text-muted)" }}>
            <i className="pi pi-info-circle" style={{ fontSize: "1.5rem" }} />
            <span>No data available for {relDialog?.symbol} / SPY</span>
          </div>
        )}
      </Dialog>

    </div>
  );
};

export default RelativeAbsoluteSectorsPage;
