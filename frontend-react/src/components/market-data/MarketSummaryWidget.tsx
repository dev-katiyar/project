import React, { useState, useEffect } from "react";
import { Skeleton } from "primereact/skeleton";
import { Tooltip } from "primereact/tooltip";
import api from "@/services/api";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type CellData = { symbol?: string } & Record<string, number>;
type RowData = Record<string, CellData>;
type SummData = Record<string, RowData>;

/* ── Constants ──────────────────────────────────────────────────────────────── */

const PERIODS = [
  { label: "1D", key: "priceChangePct" },
  { label: "WTD", key: "wtd" },
  { label: "MTD", key: "mtd" },
  { label: "QTD", key: "qtd" },
  { label: "YTD", key: "ytd" },
  { label: "1Y", key: "1year" },
  { label: "2Y", key: "2year" },
] as const;

const COL_ORDER = ["VALUE", "CORE", "GROWTH"] as const;

const GRID_COLS = "0.5fr repeat(3, 1fr)";

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function computeMinMax(
  data: SummData,
  key: string,
): { min: number; max: number } {
  let min = 0,
    max = 0.5;
  for (const rowObj of Object.values(data)) {
    for (const colObj of Object.values(rowObj)) {
      const val = Math.abs((colObj as Record<string, number>)[key] ?? 0);
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  return { min, max };
}

function scaleToRange(x: number, min: number, max: number): number {
  if (x < min) return 0;
  if (x > max) return 5;
  return ((x - min) / (max - min)) * 5;
}

function getCellStyle(
  value: number,
  min: number,
  max: number,
): React.CSSProperties {
  if (value === 0) {
    return { background: "var(--sv-bg-card)", color: "var(--sv-text-muted)" };
  }
  const scale = scaleToRange(Math.abs(value), min, max);
  const alpha = 0.15 + (scale / 5) * 0.75;
  if (value > 0) {
    return {
      background: `rgba(34, 197, 94, ${alpha.toFixed(2)})`,
      color: alpha > 0.5 ? "#fff" : "var(--sv-gain)",
    };
  }
  return {
    background: `rgba(239, 68, 68, ${alpha.toFixed(2)})`,
    color: alpha > 0.5 ? "#fff" : "var(--sv-loss)",
  };
}

/* ── Component ───────────────────────────────────────────────────────────────── */

const MarketSummaryWidget: React.FC = () => {
  const [summData, setSummData] = useState<SummData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selKey, setSelKey] = useState("priceChangePct");
  const [range, setRange] = useState({ min: 0, max: 0.5 });

  useEffect(() => {
    api
      .get<SummData>("/symbol/market-summary")
      .then(({ data }) => {
        setSummData(data);
        setRange(computeMinMax(data, "priceChangePct"));
      })
      .catch(() => setSummData(null))
      .finally(() => setLoading(false));
  }, []);

  function handlePeriod(key: string) {
    setSelKey(key);
    if (summData) setRange(computeMinMax(summData, key));
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          flex: 1,
        }}
      >
        <Skeleton height="28px" borderRadius="8px" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={{ flex: 1 }} borderRadius="6px" />
        ))}
      </div>
    );
  }

  /* ── Error ── */
  if (!summData) {
    return (
      <div
        style={{
          padding: "2rem 0",
          textAlign: "center",
          color: "var(--sv-text-muted)",
        }}
      >
        <i
          className="pi pi-exclamation-circle"
          style={{
            fontSize: "1.5rem",
            display: "block",
            marginBottom: "0.5rem",
            opacity: 0.3,
          }}
        />
        <span style={{ fontSize: "0.75rem" }}>Market summary unavailable</span>
      </div>
    );
  }

  const rows = Object.entries(summData);

  /* ── Render ── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: "0.25rem",
      }}
    >
      <Tooltip target=".mkt-cell" position="top" />

      {/* Period toggle buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.2rem",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriod(p.key)}
            style={{
              padding: "0.2rem 0.45rem",
              fontSize: "0.65rem",
              fontWeight: 600,
              borderRadius: 6,
              border:
                selKey === p.key
                  ? "1px solid var(--sv-accent)"
                  : "1px solid var(--sv-border)",
              cursor: "pointer",
              background:
                selKey === p.key ? "var(--sv-accent)" : "var(--sv-bg-card)",
              color: selKey === p.key ? "#fff" : "var(--sv-text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: GRID_COLS,
          gap: "0.2rem",
          flexShrink: 0,
        }}
      >
        <div />
        {COL_ORDER.map((col) => (
          <div
            key={col}
            style={{
              fontSize: "0.55rem",
              fontWeight: 700,
              textAlign: "center",
              color: "var(--sv-text-muted)",
              letterSpacing: "0.05em",
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Data rows — flex-grow so they fill remaining height */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: "0.2rem",
        }}
      >
        {rows.map(([rowKey, rowVal]) => (
          <div
            key={rowKey}
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              gap: "0.2rem",
              flex: 1,
            }}
          >
            {/* Row label */}
            <div
              style={{
                fontSize: "0.62rem",
                fontWeight: 600,
                color: "var(--sv-text-secondary)",
                display: "flex",
                alignItems: "center",
                paddingRight: "0.25rem",
              }}
            >
              {rowKey}
            </div>

            {/* Cells */}
            {COL_ORDER.map((col) => {
              const cell = rowVal[col];
              const val = (cell as Record<string, number>)?.[selKey] ?? 0;
              const tip = cell?.symbol
                ? `${cell.symbol} · ${val >= 0 ? "+" : ""}${val.toFixed(2)}%`
                : `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
              return (
                <div
                  key={col}
                  className="mkt-cell"
                  data-pr-tooltip={tip}
                  style={{
                    ...getCellStyle(val, range.min, range.max),
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    cursor: "default",
                    lineHeight: 1.2,
                    minHeight: "2rem",
                  }}
                >
                  {val >= 0 ? "+" : ""}
                  {val.toFixed(1)}%
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketSummaryWidget;
