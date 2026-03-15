/**
 * Heatmap showing pairwise relative scores between a set of symbols.
 * Mirrors the Angular `relative-analysis-heatmap-symbols` component.
 *
 * Each cell [row=A][col=B] shows how overbought/oversold B is relative to A.
 *   Green (negative) → B oversold vs A  (potential buy B)
 *   Red   (positive) → B overbought vs A (potential sell B)
 *
 * Data is fetched from /relative-analysis-holdings which returns every
 * pairwise score key as `{sym1}_{sym2}_score` in the last row.
 */
import React, { useState, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import RelativeAnalysisChart from "./RelativeAnalysisChart";
import type { ChartColors } from "./RelativeAbsoluteShared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  symbols: string[];
  symbolsDict: Record<string, string>;
  cc: ChartColors;
}

interface PairEntry {
  /** The symbol that is sym1 in the API key `{sym1}_{sym2}_score` */
  sym1: string;
  sym2: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Interpolate dark→bright green (value < 0) or dark→bright red (value > 0) */
function scoreColor(value: number): string {
  const abs = Math.min(1, Math.abs(value));
  if (value <= 0) {
    const g = Math.round(10 + 245 * abs);
    return `rgb(0,${g},0)`;
  }
  const r = Math.round(10 + 245 * abs);
  return `rgb(${r},0,0)`;
}

function tooltipText(colSym: string, rowSym: string, score: number): string {
  if (score <= -0.75) return `${colSym} very oversold vs ${rowSym}`;
  if (score <= -0.25) return `${colSym} moderately oversold vs ${rowSym}`;
  if (score < 0.25) return `${colSym} neutral vs ${rowSym}`;
  if (score < 0.75) return `${colSym} moderately overbought vs ${rowSym}`;
  return `${colSym} very overbought vs ${rowSym}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RelativeAnalysisHeatmap: React.FC<Props> = ({
  symbols,
  symbolsDict,
  cc,
}) => {
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);
  /** 2-D map: heatTable[rowSym][colSym] = score to display in cell */
  const [heatTable, setHeatTable] = useState<
    Record<string, Record<string, number>>
  >({});
  /** sorted symbol order for rows/cols */
  const [orderedSyms, setOrderedSyms] = useState<string[]>([]);
  /**
   * For any lookup key `{a}_{b}`, stores which (sym1, sym2) pair was actually
   * computed by the backend, so the chart can reference the correct score key.
   */
  const [pairMap, setPairMap] = useState<Record<string, PairEntry>>({});
  const [chartDialog, setChartDialog] = useState<PairEntry | null>(null);

  // ── Fetch & process ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!symbols.length) return;
    setLoading(true);
    setRawData([]);
    setHeatTable({});
    setOrderedSyms([]);
    setPairMap({});

    api
      .post("/relative-analysis-holdings", symbols)
      .then((res) => {
        const data: any[] = Array.isArray(res.data) ? res.data : [];
        setRawData(data);
        if (!data.length) return;

        const lastRow = data[data.length - 1];
        const table: Record<string, Record<string, number>> = {};
        const pairs: Record<string, PairEntry> = {};

        for (const [key, rawVal] of Object.entries(lastRow)) {
          if (!key.endsWith("_score")) continue;
          const withoutScore = key.slice(0, -6); // strip "_score"
          // sym1 is everything before the first "_", sym2 is the rest
          const idx = withoutScore.indexOf("_");
          if (idx < 0) continue;
          const sym1 = withoutScore.slice(0, idx);
          const sym2 = withoutScore.slice(idx + 1);
          const value = rawVal as number;

          if (!table[sym1]) table[sym1] = { [sym1]: 0 };
          if (!table[sym2]) table[sym2] = { [sym2]: 0 };

          // Mirror Angular: row=sym1,col=sym2 = -score; row=sym2,col=sym1 = +score
          table[sym1][sym2] = -value;
          table[sym2][sym1] = value;

          // Both lookup directions resolve to the underlying computed pair
          const entry: PairEntry = { sym1, sym2 };
          pairs[`${sym1}_${sym2}`] = entry;
          pairs[`${sym2}_${sym1}`] = entry;
        }

        setHeatTable(table);
        setPairMap(pairs);
        // Sort ascending by number of cells (mirrors Angular sortedKeys)
        const keys = Object.keys(table).sort(
          (a, b) => Object.keys(table[a]).length - Object.keys(table[b]).length,
        );
        setOrderedSyms(keys);
      })
      .finally(() => setLoading(false));
  }, [symbols]);

  // ── Cell click ──────────────────────────────────────────────────────────────
  const handleCellClick = (rowSym: string, colSym: string) => {
    if (rowSym === colSym) return;
    // Angular: pair key = colSym + '_' + rowSym
    const pair = pairMap[`${colSym}_${rowSym}`];
    if (pair) setChartDialog(pair);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-3">
        <Skeleton height="260px" borderRadius="0.5rem" />
      </div>
    );
  }

  if (!orderedSyms.length) return null;

  return (
    <>
      {/* ── Heatmap table ── */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: "0.3rem 0.25rem",
            minWidth: "100%",
          }}
        >
          <thead>
            <tr>
              {orderedSyms.map((sym) => (
                <th
                  key={sym}
                  style={{
                    textAlign: "center",
                    fontSize: "0.68rem",
                    color: "var(--sv-text-accent)",
                    fontWeight: 700,
                    padding: "0.2rem 0.25rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sym}/
                </th>
              ))}
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {orderedSyms.map((rowSym) => (
              <tr key={rowSym}>
                {orderedSyms.map((colSym) => {
                  const isDiag = rowSym === colSym;
                  const score = isDiag
                    ? 0
                    : (heatTable[rowSym]?.[colSym] ?? undefined);
                  const displayScore = score ?? 0;
                  const bg = isDiag
                    ? "var(--sv-bg-surface)"
                    : score !== undefined
                      ? scoreColor(displayScore)
                      : "var(--sv-bg-surface)";
                  // Light text only when background is dark enough
                  const textColor =
                    isDiag || score === undefined
                      ? "var(--sv-text-muted)"
                      : Math.abs(displayScore) > 0.35
                        ? "#ffffff"
                        : "#111111";

                  return (
                    <td
                      key={colSym}
                      style={{ padding: "0.1rem 0.15rem", textAlign: "center" }}
                    >
                      {isDiag ? (
                        <span
                          style={{
                            display: "inline-block",
                            minWidth: "3.2rem",
                            padding: "0.22rem 0.35rem",
                            background: bg,
                            borderRadius: "0.3rem",
                            fontSize: "0.7rem",
                            color: "var(--sv-text-muted)",
                            fontWeight: 700,
                          }}
                        >
                          —
                        </span>
                      ) : score !== undefined ? (
                        <span
                          title={tooltipText(colSym, rowSym, displayScore)}
                          onClick={() => handleCellClick(rowSym, colSym)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            minWidth: "3.2rem",
                            padding: "0.22rem 0.35rem",
                            background: bg,
                            borderRadius: "0.3rem",
                            fontSize: "0.7rem",
                            color: textColor,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "opacity 0.12s",
                          }}
                          onMouseEnter={(e) =>
                            ((
                              e.currentTarget as HTMLSpanElement
                            ).style.opacity = "0.75")
                          }
                          onMouseLeave={(e) =>
                            ((
                              e.currentTarget as HTMLSpanElement
                            ).style.opacity = "1")
                          }
                        >
                          {displayScore.toFixed(2)}
                          <i
                            className="pi pi-chevron-circle-right"
                            style={{ fontSize: "0.55rem", opacity: 0.85 }}
                          />
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-block",
                            minWidth: "3.2rem",
                            padding: "0.22rem 0.35rem",
                            fontSize: "0.7rem",
                            color: "var(--sv-text-muted)",
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  );
                })}

                {/* Row label */}
                <td
                  style={{
                    paddingLeft: "0.6rem",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "var(--sv-text-accent)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rowSym}
                </td>
                {/* Full name */}
                <td
                  style={{
                    paddingLeft: "0.4rem",
                    fontSize: "0.7rem",
                    color: "var(--sv-text-muted)",
                    whiteSpace: "nowrap",
                    maxWidth: "10rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {symbolsDict[rowSym] ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Score key ── */}
      <div
        className="flex align-items-center gap-3 mt-3"
        style={{ fontSize: "0.65rem" }}
      >
        {(
          [
            { label: "Very Oversold", color: "rgb(0,255,0)" },
            { label: "Mod. Oversold", color: "rgb(0,140,0)" },
            { label: "Neutral", color: "var(--sv-bg-surface)" },
            { label: "Mod. Overbought", color: "rgb(140,0,0)" },
            { label: "Very Overbought", color: "rgb(255,0,0)" },
          ] as const
        ).map(({ label, color }) => (
          <div key={label} className="flex align-items-center gap-1">
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                background: color,
                border: "1px solid var(--sv-border)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span className="sv-text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Drill-down dialog ── */}
      <Dialog
        visible={!!chartDialog}
        onHide={() => setChartDialog(null)}
        header={
          chartDialog ? (
            <div className="flex align-items-center gap-2">
              <i className="pi pi-chart-bar" style={{ color: "#ef4444" }} />
              <span className="font-bold" style={{ fontSize: "1rem" }}>
                {chartDialog.sym1}
              </span>
              <span
                className="text-color-secondary"
                style={{ fontSize: "0.9rem" }}
              >
                vs {chartDialog.sym2} — Relative Analysis
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
        {chartDialog && rawData.length > 0 && (
          <RelativeAnalysisChart
            data={rawData}
            symbol1={chartDialog.sym1}
            symbol2={chartDialog.sym2}
            multiplier={1}
            cc={cc}
            height={480}
            scoreLabel="Rel. Score"
          />
        )}
      </Dialog>
    </>
  );
};

export default RelativeAnalysisHeatmap;
