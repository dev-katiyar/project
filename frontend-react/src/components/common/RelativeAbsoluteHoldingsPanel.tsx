import React, { useState, useEffect, useMemo, useCallback } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Checkbox } from "primereact/checkbox";
import { Slider } from "primereact/slider";
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
} from "./RelativeAbsoluteShared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HoldingInfo {
  symbol: string;
  name: string;
  holdingPercent: number;
}

interface HoldingRow extends DataPoint {
  name: string;
  holdingPercent: number;
  isInChart: boolean;
}

interface Props {
  sectorSymbol: string;
  sectorName: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const RelativeAbsoluteHoldingsPanel: React.FC<Props> = ({
  sectorSymbol,
  sectorName,
}) => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];

  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [relAbsOutput, setRelAbsOutput] = useState<RelAbsOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTail, setShowTail] = useState(true);
  const [tailLen, setTailLen] = useState(3);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRelAbsOutput(null);
    setRows([]);

    api
      .get(`/etf/holdings/${sectorSymbol}`)
      .then((res) => {
        if (cancelled) return;
        const holdingsArr: HoldingInfo[] = Array.isArray(res.data)
          ? res.data
          : [];
        if (!holdingsArr.length) {
          setError(`No holdings found for ${sectorSymbol}`);
          setLoading(false);
          return;
        }

        const holdingsDict: Record<string, HoldingInfo> = {};
        for (const item of holdingsArr) {
          holdingsDict[item.symbol] = item;
        }
        const tickers = Object.keys(holdingsDict);

        api
          .post("/relative-absolute-analysis-sectors", {
            tickers,
            tail_len: 95,
          })
          .then((res2) => {
            if (cancelled) return;
            const output: RelAbsOutput = res2.data;
            setRelAbsOutput(output);

            const newRows: HoldingRow[] = Object.entries(output)
              .filter(([sym]) => sym in holdingsDict)
              .map(([sym, pts], idx) => ({
                ...pts[0],
                symbol: sym,
                name: holdingsDict[sym]?.name ?? sym,
                holdingPercent: holdingsDict[sym]?.holdingPercent ?? 0,
                isInChart: idx < 2,
              }));
            setRows(newRows);
          })
          .catch(() => {
            if (!cancelled) setError("Failed to load analysis data.");
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      })
      .catch(() => {
        if (!cancelled) {
          setError(`Failed to load holdings for ${sectorSymbol}`);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sectorSymbol]);

  const scatterOptions = useMemo((): Highcharts.Options => {
    if (!relAbsOutput || !rows.length) return {};
    return buildScatterChartOptions(relAbsOutput, rows, showTail, tailLen, cc);
  }, [relAbsOutput, rows, showTail, tailLen, cc]);

  const handleToggle = useCallback((symbol: string, checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.symbol === symbol ? { ...r, isInChart: checked } : r)),
    );
  }, []);

  const handleShowAll = useCallback((checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, isInChart: checked })));
  }, []);

  const allVisible = rows.length > 0 && rows.every((r) => r.isInChart);

  // ── Column renderers ────────────────────────────────────────────────────────

  const colSymbol = (row: HoldingRow) => (
    <span
      className="sv-text-accent font-bold"
      style={{ fontSize: "0.82rem", letterSpacing: "0.02em" }}
    >
      {row.symbol}
    </span>
  );

  const colName = (row: HoldingRow) => (
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

  const colHolding = (row: HoldingRow) => (
    <span className="sv-text-muted font-semibold" style={{ fontSize: "0.75rem" }}>
      {(row.holdingPercent * 100).toFixed(2)}%
    </span>
  );

  const colAbs = useCallback(
    (row: HoldingRow) => <ScoreBadge value={row.absolute_score} />,
    [],
  );

  const colRel = useCallback(
    (row: HoldingRow) => (
      <ScoreBadge value={row.relative_score} icon="pi-chart-bar" />
    ),
    [],
  );

  const colChart = useCallback(
    (row: HoldingRow) => (
      <Checkbox
        checked={row.isInChart}
        onChange={(e) => handleToggle(row.symbol, !!e.checked)}
        style={{ transform: "scale(0.9)" }}
      />
    ),
    [handleToggle],
  );

  const tableHeader = (
    <div
      className="flex align-items-center justify-content-between px-2 py-2"
      style={{ borderBottom: "1px solid var(--sv-border)" }}
    >
      <span className="sv-info-label" style={{ fontSize: "0.72rem" }}>
        Top {rows.length} Holdings · {sectorName}
      </span>
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

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="2.4rem" className="mb-2" borderRadius="0.4rem" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted"
        style={{ height: "200px" }}
      >
        <i className="pi pi-info-circle" style={{ fontSize: "1.5rem" }} />
        <span>{error}</span>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="grid">
      {/* ── Table side ── */}
      <div className="col-12 lg:col-6">
        <Card pt={{ body: { className: "p-0" }, content: { className: "p-0" } }}>
          <DataTable
            value={rows}
            size="small"
            scrollable
            scrollHeight="480px"
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
            <Column field="name" body={colName} style={{ minWidth: "7rem" }} />
            <Column
              field="holdingPercent"
              body={colHolding}
              style={{ width: "4.5rem", textAlign: "right" }}
              sortable
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
        </Card>

        {/* Column label strip */}
        {rows.length > 0 && (
          <div
            className="flex gap-1 mt-1 px-1 sv-info-label"
            style={{ fontSize: "0.62rem" }}
          >
            <span style={{ width: "4.5rem", paddingLeft: "0.35rem" }}>
              Symbol
            </span>
            <span style={{ flex: 1 }}>Name</span>
            <span style={{ width: "4.5rem", textAlign: "right" }}>
              Holding
            </span>
            <span style={{ width: "6.5rem" }}>Absolute</span>
            <span style={{ width: "6.5rem" }}>Relative</span>
            <span style={{ width: "3.5rem", textAlign: "center" }}>Chart</span>
          </div>
        )}

        {/* Score legend */}
        <Card
          className="mt-3"
          pt={{ body: { className: "p-3" }, content: { className: "p-0" } }}
        >
          <p className="sv-info-label m-0 mb-2" style={{ fontSize: "0.65rem" }}>
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
        </Card>
      </div>

      {/* ── Chart side ── */}
      <div className="col-12 lg:col-6">
        <Card
          pt={{
            body: { className: "p-3 pb-2" },
            content: { className: "p-0" },
          }}
        >
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
                · drag to zoom
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

          <div
            style={{ position: "relative", aspectRatio: "1 / 1", width: "100%" }}
          >
            {relAbsOutput ? (
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
                  highcharts={Highcharts}
                  options={scatterOptions}
                />
              </>
            ) : null}
          </div>

          {/* Tail control */}
          <div
            className="flex align-items-center gap-3 mt-3 px-3 py-2 border-round"
            style={{
              background: "var(--sv-bg-surface)",
              border: "1px solid var(--sv-border-light)",
            }}
          >
            <Checkbox
              inputId="holdingsTail"
              checked={showTail}
              onChange={(e) => setShowTail(!!e.checked)}
            />
            <label
              htmlFor="holdingsTail"
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
        </Card>

        {/* Visible series chips */}
        {rows.some((r) => r.isInChart) && (
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
                      (e.currentTarget as HTMLSpanElement).style.opacity = "1";
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
  );
};

export default RelativeAbsoluteHoldingsPanel;
