import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { SelectButton } from "primereact/selectbutton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Checkbox } from "primereact/checkbox";
import { Slider } from "primereact/slider";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import { Card } from "primereact/card";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import {
  CHART_COLORS,
  SERIES_COLORS,
  SCORE_ZONES,
  DataPoint,
  RelAbsOutput,
  ScoreBadge,
  QuadrantTag,
  buildScatterChartOptions,
} from "@/components/common/RelativeAbsoluteShared";
import RelativeAbsoluteHoldingsPanel from "@/components/common/RelativeAbsoluteHoldingsPanel";
import RelativeAnalysisChart from "@/components/common/RelativeAnalysisChart";

// ─── Constants ─────────────────────────────────────────────────────────────────

const HOLDINGS_EXCLUDED = ["EEM", "EFA", "GDX", "VEA"];

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SymbolDict {
  code: string;
  name: string;
  dict: Record<string, string>;
}

interface RelAbsRow extends DataPoint {
  name: string;
  isInChart: boolean;
}

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
  const [absDialog, setAbsDialog] = useState<{
    symbol: string;
    data: any[] | null;
  } | null>(null);
  const [relDialog, setRelDialog] = useState<{
    symbol: string;
    data: any[] | null;
  } | null>(null);
  const [absLoading, setAbsLoading] = useState(false);
  const [relLoading, setRelLoading] = useState(false);
  const [holdingsDialog, setHoldingsDialog] = useState<{
    symbol: string;
    name: string;
  } | null>(null);

  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const latestDate = rows[0]?.date ?? null;

  // ── Chart colors — read directly from the static map so the memo updates
  //    in the same render cycle as the theme change (no useEffect timing lag).
  const cc = CHART_COLORS[theme];

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
          }),
        );
        setRows(newRows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDict]);

  // ── Scatter chart options ────────────────────────────────────────────────────
  const scatterOptions = useMemo((): Highcharts.Options => {
    if (!relAbsOutput || !rows.length) return {};
    return buildScatterChartOptions(relAbsOutput, rows, showTail, tailLen, cc);
  }, [relAbsOutput, rows, showTail, tailLen, cc]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDictChange = useCallback((e: any) => {
    if (e.value) setSelectedDict(e.value);
  }, []);

  const handleToggle = useCallback((symbol: string, checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.symbol === symbol ? { ...r, isInChart: checked } : r)),
    );
  }, []);

  const handleShowAll = useCallback((checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, isInChart: checked })));
  }, []);

  const handleAbsClick = useCallback((row: RelAbsRow) => {
    setAbsDialog({ symbol: row.symbol, data: null });
    setAbsLoading(true);
    api
      .post("/absolute-analysis", { symbol1: row.symbol })
      .then((res) =>
        setAbsDialog({
          symbol: row.symbol,
          data: Array.isArray(res.data) ? res.data : [],
        }),
      )
      .catch(() => setAbsDialog({ symbol: row.symbol, data: [] }))
      .finally(() => setAbsLoading(false));
  }, []);

  const handleRelClick = useCallback((row: RelAbsRow) => {
    setRelDialog({ symbol: row.symbol, data: null });
    setRelLoading(true);
    api
      .post("/relative-analysis", { symbol1: row.symbol, symbol2: "SPY" })
      .then((res) =>
        setRelDialog({
          symbol: row.symbol,
          data: Array.isArray(res.data) ? res.data : [],
        }),
      )
      .catch(() => setRelDialog({ symbol: row.symbol, data: [] }))
      .finally(() => setRelLoading(false));
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const allVisible = rows.length > 0 && rows.every((r) => r.isInChart);

  // ── Column renderers ─────────────────────────────────────────────────────────
  const colSymbol = (row: RelAbsRow) => (
    <span
      className="sv-text-accent font-bold"
      style={{ fontSize: "0.82rem", letterSpacing: "0.02em" }}
    >
      {row.symbol}
    </span>
  );

  const colName = (row: RelAbsRow) => (
    <span
      className="text-color-secondary"
      style={{
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
        className="pi pi-sitemap sv-text-accent"
        style={{ fontSize: "1rem", opacity: 0.7, cursor: "pointer" }}
        title="View Top 10 Holdings"
        onClick={() =>
          setHoldingsDialog({ symbol: row.symbol, name: row.name })
        }
      />
    );
  };

  const colAbs = useCallback(
    (row: RelAbsRow) => (
      <ScoreBadge
        value={row.absolute_score}
        onClick={() => handleAbsClick(row)}
      />
    ),
    [handleAbsClick],
  );

  const colRel = useCallback(
    (row: RelAbsRow) => (
      <ScoreBadge
        value={row.relative_score}
        onClick={() => handleRelClick(row)}
        icon="pi-chart-bar"
      />
    ),
    [handleRelClick],
  );

  const colChart = useCallback(
    (row: RelAbsRow) => (
      <Checkbox
        checked={row.isInChart}
        onChange={(e) => handleToggle(row.symbol, !!e.checked)}
        style={{ transform: "scale(0.9)" }}
      />
    ),
    [handleToggle],
  );

  // ── Table header ─────────────────────────────────────────────────────────────
  const tableHeader = (
    <div
      className="flex align-items-center justify-content-between px-2 py-2"
      style={{ borderBottom: "1px solid var(--sv-border)" }}
    >
      <div className="flex align-items-center gap-2">
        <span className="sv-info-label" style={{ fontSize: "0.72rem" }}>
          {rows.length} {selectedDict?.name}
        </span>
        {latestDate && (
          <span
            className="sv-text-muted border-round"
            style={{
              fontSize: "0.68rem",
              background: "var(--sv-bg-surface)",
              padding: "0.1rem 0.4rem",
              border: "1px solid var(--sv-border-light)",
            }}
          >
            {latestDate}
          </span>
        )}
      </div>
      <div className="flex align-items-center gap-2">
        <span className="text-color-secondary" style={{ fontSize: "0.72rem" }}>
          All
        </span>
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
          <h2
            className="sv-page-title font-bold m-0 text-color"
            style={{ fontSize: "1.45rem" }}
          >
            Performance Analysis
          </h2>
          <p
            className="text-color-secondary mt-1 mb-0"
            style={{ fontSize: "0.82rem" }}
          >
            Relative vs Absolute Scores &nbsp;·&nbsp; Benchmark: SPY
            &nbsp;·&nbsp; Click a score to drill down
          </p>
        </div>

        <div className="flex align-items-center gap-3">
          <SelectButton
            value={selectedDict}
            options={dictTypes}
            optionLabel="name"
            onChange={handleDictChange}
            disabled={loading}
            pt={{
              button: {
                style: { fontSize: "0.82rem", padding: "0.4rem 1rem" },
              },
            }}
          />
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid">
        {/* ──── LEFT: Symbol Table ──── */}
        <div className="col-12 lg:col-7 xl:col-6">
          {/* Table card */}
          <Card
            pt={{ body: { className: "p-0" }, content: { className: "p-0" } }}
          >
            {loading ? (
              <div className="p-3">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    height="2.4rem"
                    className="mb-2"
                    borderRadius="0.4rem"
                  />
                ))}
              </div>
            ) : (
              <DataTable
                value={rows}
                size="small"
                scrollable
                scrollHeight="600px"
                header={tableHeader}
                showGridlines={false}
                stripedRows
                emptyMessage="No data"
                style={{ fontSize: "0.82rem" }}
                pt={{
                  bodyRow: {
                    style: { borderBottom: "1px solid var(--sv-border-light)" },
                  },
                  header: {
                    style: {
                      background: "var(--sv-bg-card)",
                      border: "none",
                      padding: 0,
                    },
                  },
                  thead: { style: { display: "none" } },
                }}
              >
                <Column
                  field="symbol"
                  body={colSymbol}
                  style={{ width: "4.5rem", paddingLeft: "0.75rem" }}
                />
                <Column
                  field="name"
                  body={colName}
                  style={{ minWidth: "7rem" }}
                />
                <Column
                  header=""
                  body={colHoldings}
                  style={{ width: "2.5rem", textAlign: "center" }}
                />
                <Column
                  field="absolute_score"
                  body={colAbs}
                  style={{ width: "6.5rem" }}
                  sortable
                />
                <Column
                  field="relative_score"
                  body={colRel}
                  style={{ width: "6.5rem" }}
                  sortable
                />
                <Column
                  header=""
                  body={colChart}
                  style={{
                    width: "3.5rem",
                    textAlign: "center",
                    paddingRight: "0.75rem",
                  }}
                />
              </DataTable>
            )}
          </Card>

          {/* Column labels strip */}
          {!loading && rows.length > 0 && (
            <div
              className="flex gap-1 mt-1 px-1 sv-info-label"
              style={{ fontSize: "0.62rem" }}
            >
              <span style={{ width: "4.5rem", paddingLeft: "0.35rem" }}>
                Symbol
              </span>
              <span style={{ flex: 1 }}>Name</span>
              <span style={{ width: "2.5rem" }}></span>
              <span style={{ width: "6.5rem" }}>Absolute</span>
              <span style={{ width: "6.5rem" }}>Relative</span>
              <span style={{ width: "3.5rem", textAlign: "center" }}>
                Chart
              </span>
            </div>
          )}

          {/* Score legend */}
          <Card
            className="mt-3"
            pt={{ body: { className: "p-3" }, content: { className: "p-0" } }}
          >
            <p
              className="sv-info-label m-0 mb-2"
              style={{ fontSize: "0.65rem" }}
            >
              Score Scale
            </p>
            <div className="flex" style={{ gap: "2px" }}>
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
              <span
                className="font-semibold"
                style={{ fontSize: "0.63rem", color: "#4ade80" }}
              >
                ← Buy Signal
              </span>
              <span
                className="font-semibold"
                style={{ fontSize: "0.63rem", color: "#f87171" }}
              >
                Sell Signal →
              </span>
            </div>
            <div
              className="mt-2 pt-2 sv-text-muted"
              style={{
                borderTop: "1px solid var(--sv-border-light)",
                fontSize: "0.65rem",
                lineHeight: 1.5,
              }}
            >
              <span className="text-color-secondary">Abs:</span> Measures
              absolute overbought/oversold level
              <br />
              <span className="text-color-secondary">Rel:</span> Performance vs
              SPY (benchmark)
            </div>
          </Card>
        </div>

        {/* ──── RIGHT: Chart ──── */}
        <div className="col-12 lg:col-5 xl:col-6">
          <Card
            pt={{
              body: { className: "p-3 pb-2" },
              content: { className: "p-0" },
            }}
          >
            {/* Chart sub-header */}
            <div className="flex align-items-center justify-content-between mb-2">
              <div>
                <span
                  className="font-bold text-color"
                  style={{ fontSize: "0.82rem" }}
                >
                  Scatter Plot
                </span>
                <span
                  className="sv-text-muted ml-2"
                  style={{ fontSize: "0.75rem" }}
                >
                  · drag to zoom · click score badges to drill down
                </span>
              </div>
              <div
                className="flex gap-2 font-semibold"
                style={{ fontSize: "0.65rem" }}
              >
                <span
                  style={{
                    color: "#4ade80",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  ↑ Overbought
                </span>
                <span
                  style={{
                    color: "#f87171",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  ↓ Oversold
                </span>
              </div>
            </div>

            {/* Chart */}
            <div
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                width: "100%",
              }}
            >
              {loading ? (
                <Skeleton
                  height="100%"
                  borderRadius="0.5rem"
                  style={{ position: "absolute", inset: 0 }}
                />
              ) : relAbsOutput ? (
                <>
                  <QuadrantTag
                    label={"Oversold &\nOverbought"}
                    color="#4ade80"
                    position="tl"
                  />
                  <QuadrantTag
                    label={"Overbought &\nOverbought"}
                    color="#fbbf24"
                    position="tr"
                  />
                  <QuadrantTag
                    label={"Oversold &\nOversold"}
                    color="#94a3b8"
                    position="bl"
                  />
                  <QuadrantTag
                    label={"Overbought &\nOversold"}
                    color="#f87171"
                    position="br"
                  />
                  <HighchartsReact
                    key={tailLen}
                    ref={chartRef}
                    highcharts={Highcharts}
                    options={scatterOptions}
                  />
                </>
              ) : (
                <div
                  className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted"
                  style={{ height: "100%" }}
                >
                  <i
                    className="pi pi-chart-scatter"
                    style={{ fontSize: "3rem", opacity: 0.3 }}
                  />
                  <span style={{ fontSize: "0.9rem" }}>
                    Select a category to load the chart
                  </span>
                </div>
              )}
            </div>

            {/* Tail length control */}
            {relAbsOutput && !loading && (
              <div
                className="flex align-items-center gap-3 mt-3 px-3 py-2 border-round"
                style={{
                  background: "var(--sv-bg-surface)",
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
                  className="font-semibold text-color-secondary white-space-nowrap cursor-pointer"
                  style={{ fontSize: "0.8rem", userSelect: "none" }}
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
                  className="font-bold sv-text-accent text-center border-round"
                  style={{
                    background: "var(--sv-bg-card)",
                    border: "1px solid var(--sv-border)",
                    padding: "0.2rem 0.65rem",
                    fontSize: "0.85rem",
                    minWidth: "2.2rem",
                    lineHeight: 1.5,
                  }}
                >
                  {tailLen}
                </div>
                <span
                  className="sv-text-muted white-space-nowrap"
                  style={{ fontSize: "0.78rem" }}
                >
                  {tailLen === 1 ? "week" : "weeks"}
                  &nbsp;
                  <span>({tailLen * 5} pts)</span>
                </span>
              </div>
            )}
          </Card>

          {/* Visible series chips */}
          {!loading && rows.some((r) => r.isInChart) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {rows
                .filter((r) => r.isInChart)
                .map((r) => {
                  const symbolIdx = rows.indexOf(r);
                  const color = SERIES_COLORS[symbolIdx % SERIES_COLORS.length];
                  return (
                    <span
                      key={r.symbol}
                      onClick={() => handleToggle(r.symbol, false)}
                      title={`${r.name} · click to remove`}
                      className="inline-flex align-items-center gap-1 font-bold cursor-pointer border-round-3xl"
                      style={{
                        padding: "0.18rem 0.55rem",
                        background: `${color}22`,
                        border: `1px solid ${color}55`,
                        color,
                        fontSize: "0.7rem",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLSpanElement).style.opacity =
                          "0.6";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLSpanElement).style.opacity =
                          "1";
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: color,
                          display: "inline-block",
                        }}
                      />
                      {r.symbol}
                      <i
                        className="pi pi-times"
                        style={{ fontSize: "0.5rem", opacity: 0.7 }}
                      />
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
              <span className="font-bold" style={{ fontSize: "1rem" }}>
                {absDialog.symbol}
              </span>
              <span
                className="text-color-secondary"
                style={{ fontSize: "0.9rem" }}
              >
                — Absolute Analysis
              </span>
            </div>
          ) : (
            ""
          )
        }
        style={{ width: "min(92vw, 820px)" }}
        contentStyle={{ padding: "0.75rem 1rem 1rem" }}
        draggable={false}
      >
        {absLoading && <Skeleton height="500px" borderRadius="0.5rem" />}
        {!absLoading && absDialog?.data && absDialog.data.length > 0 && (
          <RelativeAnalysisChart
            data={absDialog.data}
            symbol1={absDialog.symbol}
            symbol2={absDialog.symbol}
            multiplier={1}
            cc={cc}
            height={500}
            scoreLabel="Abs. Score"
          />
        )}
        {!absLoading && absDialog?.data?.length === 0 && (
          <div
            className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted"
            style={{ height: "200px" }}
          >
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
              <span className="font-bold" style={{ fontSize: "1rem" }}>
                {relDialog.symbol}
              </span>
              <span
                className="text-color-secondary"
                style={{ fontSize: "0.9rem" }}
              >
                vs SPY — Relative Analysis
              </span>
            </div>
          ) : (
            ""
          )
        }
        style={{ width: "min(92vw, 820px)" }}
        contentStyle={{ padding: "0.75rem 1rem 1rem" }}
        draggable={false}
      >
        {relLoading && <Skeleton height="500px" borderRadius="0.5rem" />}
        {!relLoading && relDialog?.data && relDialog.data.length > 0 && (
          <RelativeAnalysisChart
            data={relDialog.data}
            symbol1={relDialog.symbol}
            symbol2="SPY"
            multiplier={1}
            cc={cc}
            height={500}
            scoreLabel="Rel. Score"
          />
        )}
        {!relLoading && relDialog?.data?.length === 0 && (
          <div
            className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted"
            style={{ height: "200px" }}
          >
            <i className="pi pi-info-circle" style={{ fontSize: "1.5rem" }} />
            <span>No data available for {relDialog?.symbol} / SPY</span>
          </div>
        )}
      </Dialog>

      {/* ── HOLDINGS ANALYSIS DIALOG ── */}
      <Dialog
        visible={!!holdingsDialog}
        onHide={() => setHoldingsDialog(null)}
        header={
          holdingsDialog ? (
            <div className="flex align-items-center gap-2">
              <i className="pi pi-sitemap" style={{ color: "#3b82f6" }} />
              <span className="font-bold" style={{ fontSize: "1rem" }}>
                {holdingsDialog.symbol}
              </span>
              <span
                className="text-color-secondary"
                style={{ fontSize: "0.9rem" }}
              >
                — Top 10 Holdings Analysis
              </span>
            </div>
          ) : (
            ""
          )
        }
        style={{ width: "min(96vw, 1100px)" }}
        contentStyle={{ padding: "0.75rem 1rem 1rem" }}
        draggable={false}
      >
        {holdingsDialog && (
          <RelativeAbsoluteHoldingsPanel
            sectorSymbol={holdingsDialog.symbol}
            sectorName={holdingsDialog.name}
          />
        )}
      </Dialog>
    </div>
  );
};

export default RelativeAbsoluteSectorsPage;
