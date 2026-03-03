import React, { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import api from "@/services/api";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tooltip } from "primereact/tooltip";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SymbolMeta {
  symbol: string;
  name: string;
  category: string;
  subCategory: string;
  sortOrder: number;
}

interface RiskRow {
  symbol: string;
  name: string;
  subCategory: string;
  sortOrder: number;
  last: number;
  rel_1w_chg: number;
  rel_4w_chg: number;
  rel_12w_chg: number;
  rel_24w_chg: number;
  rel_52w_chg: number;
  short_avg: number;
  dev_short_avg: number;
  long_avg: number;
  dev_long_avg: number;
  avg_cross_signal: string;
  month_end_price: number;
  beta: number;
  rr_low: number;
  rr_high: number;
  range: number;
  risk: string;
}

interface RowGroupMeta {
  index: number;
  size: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// ETF symbols where holdings drill-down is not supported
const NO_HOLDINGS_SYMBOLS = ["EEM", "EFA", "GDX", "VEA"];

function scaleToRange(x: number): number {
  const scaled = Math.floor(Math.abs((x / 5) * 100));
  return Math.min(scaled, 5);
}

function getPerfStyle(value: number | null | undefined, isRefRow: boolean): CSSProperties {
  if (isRefRow || value == null || value === 0) return {};
  const intensity = scaleToRange(value);
  const opacities = [0, 0.1, 0.22, 0.38, 0.55, 0.72];
  const op = opacities[intensity];
  if (value > 0) {
    return {
      background: `rgba(34, 197, 94, ${op})`,
      color: intensity >= 4 ? "#fff" : undefined,
      fontWeight: 600,
    };
  }
  return {
    background: `rgba(239, 68, 68, ${op})`,
    color: intensity >= 4 ? "#fff" : undefined,
    fontWeight: 600,
  };
}

function getDevStyle(value: number | null | undefined): CSSProperties {
  if (value == null) return {};
  return {
    color: value >= 0 ? "var(--sv-gain)" : "var(--sv-loss)",
    fontWeight: 600,
  };
}

function buildRowGroupMeta(data: RiskRow[]): Record<string, RowGroupMeta> {
  const meta: Record<string, RowGroupMeta> = {};
  for (let i = 0; i < data.length; i++) {
    const cat = data[i].subCategory;
    if (i === 0) {
      meta[cat] = { index: 0, size: 1 };
    } else {
      const prev = data[i - 1].subCategory;
      if (cat === prev) {
        meta[cat].size++;
      } else {
        meta[cat] = { index: i, size: 1 };
      }
    }
  }
  return meta;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return sign + (v * 100).toFixed(2) + "%";
}

function fmtNum(v: number | null | undefined, d = 2): string {
  if (v == null) return "—";
  return v.toFixed(d);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: string }) {
  if (!risk) return <span style={{ color: "var(--sv-text-muted)" }}>—</span>;
  const r = risk.toLowerCase();
  const cfg =
    r === "high"
      ? { bg: "var(--sv-danger-bg)", color: "var(--sv-danger)", label: "HIGH", icon: "pi pi-arrow-up-right" }
      : r === "low"
        ? { bg: "var(--sv-success-bg)", color: "var(--sv-success)", label: "LOW", icon: "pi pi-arrow-down-left" }
        : { bg: "var(--sv-warning-bg)", color: "var(--sv-warning)", label: "NORMAL", icon: "pi pi-minus" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        fontSize: "0.7rem",
        letterSpacing: "0.06em",
        border: `1px solid ${cfg.color}`,
        whiteSpace: "nowrap",
      }}
    >
      <i className={cfg.icon} style={{ fontSize: "0.65rem" }} />
      {cfg.label}
    </span>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  if (!signal) return <span style={{ color: "var(--sv-text-muted)" }}>—</span>;
  const isBull = signal.toLowerCase() === "bullish";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 20,
        background: isBull ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: isBull ? "var(--sv-gain)" : "var(--sv-loss)",
        fontWeight: 700,
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
        border: `1px solid ${isBull ? "var(--sv-gain)" : "var(--sv-loss)"}`,
        whiteSpace: "nowrap",
      }}
    >
      <i className={isBull ? "pi pi-arrow-up" : "pi pi-arrow-down"} style={{ fontSize: "0.65rem" }} />
      {isBull ? "BULLISH" : "BEARISH"}
    </span>
  );
}

// ── Stats Summary Bar ──────────────────────────────────────────────────────────

function StatsSummary({ data }: { data: RiskRow[] }) {
  const rows = data.slice(1); // exclude reference index row
  const high = rows.filter((r) => r.risk?.toLowerCase() === "high").length;
  const low = rows.filter((r) => r.risk?.toLowerCase() === "low").length;
  const normal = rows.filter((r) => r.risk?.toLowerCase() === "normal").length;
  const total = rows.length;

  const cards = [
    { label: "Total Symbols", value: total, icon: "pi pi-chart-bar", color: "var(--sv-accent)", bg: "var(--sv-accent-bg)" },
    { label: "Low Risk", value: low, icon: "pi pi-arrow-down-left", color: "var(--sv-gain)", bg: "var(--sv-success-bg)" },
    { label: "Normal Risk", value: normal, icon: "pi pi-minus-circle", color: "var(--sv-warning)", bg: "var(--sv-warning-bg)" },
    { label: "High Risk", value: high, icon: "pi pi-arrow-up-right", color: "var(--sv-loss)", bg: "var(--sv-danger-bg)" },
  ];

  return (
    <div className="flex gap-3 mb-4" style={{ flexWrap: "wrap" }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: c.bg,
            border: `1px solid ${c.color}`,
            borderRadius: 10,
            padding: "12px 20px",
            minWidth: 140,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: "0 0 auto",
          }}
        >
          <i className={c.icon} style={{ color: c.color, fontSize: "1.5rem" }} />
          <div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--sv-text-muted)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {c.label}
            </div>
          </div>
        </div>
      ))}

      {/* Risk distribution bar */}
      {total > 0 && (
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <div style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Risk Distribution
          </div>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
            {low > 0 && (
              <div
                title={`Low: ${low}`}
                style={{ flex: low, background: "var(--sv-gain)", borderRadius: "4px 0 0 4px", transition: "flex 0.4s" }}
              />
            )}
            {normal > 0 && (
              <div title={`Normal: ${normal}`} style={{ flex: normal, background: "var(--sv-warning)", transition: "flex 0.4s" }} />
            )}
            {high > 0 && (
              <div
                title={`High: ${high}`}
                style={{ flex: high, background: "var(--sv-loss)", borderRadius: "0 4px 4px 0", transition: "flex 0.4s" }}
              />
            )}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: `${low} Low`, color: "var(--sv-gain)" },
              { label: `${normal} Normal`, color: "var(--sv-warning)" },
              { label: `${high} High`, color: "var(--sv-loss)" },
            ].map((item) => (
              <span key={item.label} style={{ fontSize: "0.7rem", color: item.color, fontWeight: 600 }}>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Risk Table ─────────────────────────────────────────────────────────────────

interface RiskTableProps {
  tableData: RiskRow[];
  rowGroupMeta: Record<string, RowGroupMeta>;
  isEtfView: boolean;
  onHoldingsClick?: (row: RiskRow) => void;
  loading?: boolean;
}

function RiskTable({ tableData, rowGroupMeta, isEtfView, onHoldingsClick, loading }: RiskTableProps) {
  const SECTION_BORDER = "2px solid var(--sv-border)";

  const thBase: CSSProperties = {
    padding: "8px 10px",
    textAlign: "center",
    fontWeight: 600,
    fontSize: "0.73rem",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    background: "var(--sv-bg-surface)",
    color: "var(--sv-text-muted)",
    letterSpacing: "0.04em",
    position: "sticky",
    top: 0,
    zIndex: 10,
    borderBottom: "1px solid var(--sv-border)",
  };

  const thGroup: CSSProperties = {
    ...thBase,
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    color: "var(--sv-text-secondary)",
    borderBottom: "1px solid var(--sv-border)",
    paddingBottom: 5,
    top: 0,
  };

  // Second header row sits below group row — push it down
  const thCol: CSSProperties = {
    ...thBase,
    top: 33, // approximate height of group header row
    zIndex: 9,
    borderBottom: "2px solid var(--sv-border)",
  };

  const td: CSSProperties = {
    padding: "7px 10px",
    textAlign: "center",
    fontSize: "0.81rem",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--sv-border)",
    verticalAlign: "middle",
  };

  if (loading) {
    return (
      <div
        className="flex justify-content-center align-items-center flex-column gap-3"
        style={{ minHeight: 220, padding: "2rem" }}
      >
        <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="3" />
        <span style={{ color: "var(--sv-text-muted)", fontSize: "0.83rem" }}>Preparing risk range analysis…</span>
      </div>
    );
  }

  if (!tableData.length) return null;

  const totalCols = isEtfView ? 19 : 20;

  return (
    <>
      <Tooltip target=".ma-info-icon" position="top" />
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: isEtfView ? 1340 : 1420,
          }}
        >
          <thead>
            {/* ── Group header row ── */}
            <tr>
              <th colSpan={isEtfView ? 2 : 3} style={{ ...thGroup, textAlign: "left", paddingLeft: 16, borderRight: SECTION_BORDER }}>
                Sector / Symbol
              </th>
              <th colSpan={6} style={{ ...thGroup, borderRight: SECTION_BORDER }}>
                Relative Performance vs S&amp;P 500
              </th>
              <th colSpan={5} style={{ ...thGroup, borderRight: SECTION_BORDER }}>
                Moving Averages
              </th>
              <th colSpan={2} style={{ ...thGroup, borderRight: SECTION_BORDER }}>
                Month End &amp; Beta
              </th>
              <th colSpan={4} style={{ ...thGroup }}>
                Risk Range
              </th>
            </tr>

            {/* ── Column header row ── */}
            <tr>
              <th style={{ ...thCol, textAlign: "left", paddingLeft: 16, minWidth: 86 }}>Symbol</th>
              {isEtfView ? (
                <th style={{ ...thCol, textAlign: "left", minWidth: 170, borderRight: SECTION_BORDER }}>Name</th>
              ) : (
                <>
                  <th style={{ ...thCol, textAlign: "left", minWidth: 170 }}>Name</th>
                  <th style={{ ...thCol, minWidth: 80, borderRight: SECTION_BORDER }}>Holdings</th>
                </>
              )}
              <th style={{ ...thCol, minWidth: 90 }}>Last Px</th>
              <th style={{ ...thCol, minWidth: 78 }}>1 Wk</th>
              <th style={{ ...thCol, minWidth: 78 }}>4 Wk</th>
              <th style={{ ...thCol, minWidth: 78 }}>12 Wk</th>
              <th style={{ ...thCol, minWidth: 78 }}>24 Wk</th>
              <th style={{ ...thCol, minWidth: 78, borderRight: SECTION_BORDER }}>52 Wk</th>
              <th style={{ ...thCol, minWidth: 88 }}>
                Short MA
                <i
                  className="pi pi-info-circle ma-info-icon ml-1"
                  data-pr-tooltip="14-Week Simple Moving Average on Weekly price data"
                  style={{ color: "var(--sv-info)", fontSize: "0.7rem", cursor: "default" }}
                />
              </th>
              <th style={{ ...thCol, minWidth: 88 }}>Short Px Dev</th>
              <th style={{ ...thCol, minWidth: 88 }}>
                Long MA
                <i
                  className="pi pi-info-circle ma-info-icon ml-1"
                  data-pr-tooltip="35-Week Simple Moving Average on Weekly price data"
                  style={{ color: "var(--sv-info)", fontSize: "0.7rem", cursor: "default" }}
                />
              </th>
              <th style={{ ...thCol, minWidth: 88 }}>Long Px Dev</th>
              <th style={{ ...thCol, minWidth: 100, borderRight: SECTION_BORDER }}>Signal</th>
              <th style={{ ...thCol, minWidth: 105 }}>Month End Px</th>
              <th style={{ ...thCol, minWidth: 88, borderRight: SECTION_BORDER }}>Beta 5Y</th>
              <th style={{ ...thCol, minWidth: 78 }}>RR Low</th>
              <th style={{ ...thCol, minWidth: 78 }}>RR High</th>
              <th style={{ ...thCol, minWidth: 88 }}>Range Width</th>
              <th style={{ ...thCol, minWidth: 96 }}>Risk Level</th>
            </tr>
          </thead>

          <tbody>
            {tableData.map((row, i) => {
              const isRef = i === 0;
              const isGroupHeader = !isRef && rowGroupMeta[row.subCategory]?.index === i;
              const rowBg = isRef
                ? "var(--sv-accent-bg)"
                : i % 2 === 0
                  ? "var(--sv-bg-surface)"
                  : "var(--sv-bg-body)";

              return (
                <React.Fragment key={`${row.symbol}-${i}`}>
                  {/* ── Group label row ── */}
                  {isGroupHeader && (
                    <tr>
                      <td
                        colSpan={totalCols}
                        style={{
                          ...td,
                          textAlign: "left",
                          paddingLeft: 16,
                          fontWeight: 700,
                          fontSize: "0.72rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--sv-accent)",
                          background: "var(--sv-bg-card)",
                          borderTop: "2px solid var(--sv-border)",
                          borderBottom: "1px solid var(--sv-border)",
                        }}
                      >
                        <i className="pi pi-tag mr-2" style={{ fontSize: "0.72rem" }} />
                        {row.subCategory}
                      </td>
                    </tr>
                  )}

                  {/* ── Data row ── */}
                  <tr
                    style={{ background: rowBg, transition: "background 0.12s" }}
                    onMouseEnter={(e) => {
                      if (!isRef) (e.currentTarget as HTMLElement).style.background = "var(--sv-bg-card-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isRef) (e.currentTarget as HTMLElement).style.background = rowBg;
                    }}
                  >
                    {/* Symbol */}
                    <td style={{ ...td, textAlign: "left", paddingLeft: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: isRef ? "var(--sv-accent)" : "var(--sv-text-primary)",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {isRef && (
                            <i className="pi pi-star-fill mr-1" style={{ fontSize: "0.6rem", color: "var(--sv-accent)" }} />
                          )}
                          {row.symbol}
                        </span>
                        {isRef && (
                          <span
                            style={{
                              fontSize: "0.58rem",
                              color: "var(--sv-accent)",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              fontWeight: 600,
                            }}
                          >
                            Reference
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Name + optional Holdings column */}
                    {isEtfView ? (
                      <td style={{ ...td, textAlign: "left", color: "var(--sv-text-secondary)", borderRight: SECTION_BORDER }}>
                        {row.name}
                      </td>
                    ) : (
                      <>
                        <td style={{ ...td, textAlign: "left", color: "var(--sv-text-secondary)" }}>{row.name}</td>
                        <td style={{ ...td, borderRight: SECTION_BORDER }}>
                          {!isRef && !NO_HOLDINGS_SYMBOLS.includes(row.symbol) && (
                            <button
                              onClick={() => onHoldingsClick?.(row)}
                              title={`View ${row.symbol} top holdings`}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 6,
                                color: "var(--sv-accent)",
                                transition: "background 0.12s, color 0.12s",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "var(--sv-accent-bg)";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "none";
                              }}
                            >
                              <i className="pi pi-sitemap" style={{ fontSize: "1rem" }} />
                            </button>
                          )}
                        </td>
                      </>
                    )}

                    {/* Last Price */}
                    <td
                      style={{
                        ...td,
                        fontWeight: 700,
                        color: isRef ? "var(--sv-accent)" : "var(--sv-text-primary)",
                      }}
                    >
                      {fmtNum(row.last)}
                    </td>

                    {/* Relative performance columns */}
                    <td style={{ ...td, ...getPerfStyle(row.rel_1w_chg, isRef) }}>{fmtPct(row.rel_1w_chg)}</td>
                    <td style={{ ...td, ...getPerfStyle(row.rel_4w_chg, isRef) }}>{fmtPct(row.rel_4w_chg)}</td>
                    <td style={{ ...td, ...getPerfStyle(row.rel_12w_chg, isRef) }}>{fmtPct(row.rel_12w_chg)}</td>
                    <td style={{ ...td, ...getPerfStyle(row.rel_24w_chg, isRef) }}>{fmtPct(row.rel_24w_chg)}</td>
                    <td style={{ ...td, ...getPerfStyle(row.rel_52w_chg, isRef), borderRight: SECTION_BORDER }}>
                      {fmtPct(row.rel_52w_chg)}
                    </td>

                    {/* Moving averages */}
                    <td style={{ ...td, color: "var(--sv-text-secondary)" }}>{fmtNum(row.short_avg)}</td>
                    <td style={{ ...td, ...getDevStyle(row.dev_short_avg) }}>{fmtPct(row.dev_short_avg)}</td>
                    <td style={{ ...td, color: "var(--sv-text-secondary)" }}>{fmtNum(row.long_avg)}</td>
                    <td style={{ ...td, ...getDevStyle(row.dev_long_avg) }}>{fmtPct(row.dev_long_avg)}</td>
                    <td style={{ ...td, borderRight: SECTION_BORDER }}>
                      <SignalBadge signal={row.avg_cross_signal} />
                    </td>

                    {/* Month end & Beta */}
                    <td style={{ ...td, color: "var(--sv-text-secondary)" }}>{fmtNum(row.month_end_price)}</td>
                    <td style={{ ...td, borderRight: SECTION_BORDER, color: "var(--sv-text-secondary)" }}>
                      {fmtNum(row.beta)}
                    </td>

                    {/* Risk Range columns */}
                    <td style={{ ...td, color: "var(--sv-text-secondary)" }}>{fmtNum(row.rr_low)}</td>
                    <td style={{ ...td, color: "var(--sv-text-secondary)" }}>{fmtNum(row.rr_high)}</td>
                    <td style={{ ...td, fontWeight: 600, color: "var(--sv-text-primary)" }}>{fmtNum(row.range)}</td>
                    <td style={{ ...td }}>
                      <RiskBadge risk={row.risk} />
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RiskRangeReportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tableData, setTableData] = useState<RiskRow[]>([]);
  const [updateDate, setUpdateDate] = useState("");
  const [rowGroupMeta, setRowGroupMeta] = useState<Record<string, RowGroupMeta>>({});

  // ETF Holdings state
  const [selectedETF, setSelectedETF] = useState<RiskRow | null>(null);
  const [etfTableData, setEtfTableData] = useState<RiskRow[]>([]);
  const [etfLoading, setEtfLoading] = useState(false);
  const [etfRowGroupMeta, setEtfRowGroupMeta] = useState<Record<string, RowGroupMeta>>({});

  const symbolsDictRef = useRef<Record<string, SymbolMeta>>({});

  // ── Data processing ──────────────────────────────────────────────────────────

  const processRiskData = useCallback((rawData: any[], dict: Record<string, SymbolMeta>): RiskRow[] => {
    const rows: RiskRow[] = [];
    for (const row of rawData) {
      const meta = dict[row.symbol];
      if (!meta) continue;
      rows.push({ ...row, name: meta.name, subCategory: meta.subCategory, sortOrder: meta.sortOrder });
    }
    rows.sort((a, b) => a.sortOrder - b.sortOrder);
    return rows;
  }, []);

  // ── Load main risk range data ────────────────────────────────────────────────

  const loadMainData = useCallback(
    async (reloadLive = false) => {
      setLoading(true);
      setError("");
      try {
        const symRes = await api.post("/get-symbols2", { categories: ["RiskRange"] });
        if (symRes.data?.status !== "ok") {
          setError("Could not load symbols. Please contact support: contact@simplevisor.com");
          return;
        }

        const symArr: SymbolMeta[] = symRes.data.data.RiskRange;
        const dict: Record<string, SymbolMeta> = {};
        const tickers: string[] = [];
        for (const s of symArr) {
          dict[s.symbol] = s;
          tickers.push(s.symbol);
        }
        symbolsDictRef.current = dict;

        const analysisRes = await api.post("/riskrange-analysis", { tickers, reloadLiveData: reloadLive });
        if (analysisRes.data?.status !== "ok") {
          setError("Could not load risk range analysis. Please try again.");
          return;
        }

        const processed = processRiskData(Object.values(analysisRes.data.data), dict);
        setTableData(processed);
        setRowGroupMeta(buildRowGroupMeta(processed));
        setUpdateDate(analysisRes.data.update_date ?? "");
      } catch {
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    },
    [processRiskData],
  );

  useEffect(() => {
    loadMainData();
  }, [loadMainData]);

  // ── ETF Holdings drill-down ──────────────────────────────────────────────────

  const handleHoldingsClick = useCallback(
    async (row: RiskRow) => {
      setSelectedETF(row);
      setEtfTableData([]);
      setEtfLoading(true);
      try {
        const holdingsRes = await api.get(`/etf/holdings/${row.symbol}`);
        if (!holdingsRes.data) return;

        const holdings: any[] = holdingsRes.data as any[];

        // Build ETF symbol dict with IVV as reference (sortOrder 0)
        const etfDict: Record<string, SymbolMeta> = {
          IVV: { symbol: "IVV", name: "iShares S&P 500 ETF", category: "RiskRange", subCategory: "Reference Index", sortOrder: 0 },
        };
        const etfTickers = ["IVV"];

        holdings.forEach((h, idx) => {
          etfDict[h.symbol] = {
            symbol: h.symbol,
            name: h.name ?? h.symbol,
            category: "Holdings",
            subCategory: "Holdings",
            sortOrder: idx + 1,
          };
          etfTickers.push(h.symbol);
        });

        const etfRes = await api.post("/riskrange-analysis-etf", { tickers: etfTickers, reloadLiveData: true });
        if (etfRes.data?.status !== "ok") return;

        const processed = processRiskData(Object.values(etfRes.data.data), etfDict);
        setEtfTableData(processed);
        setEtfRowGroupMeta(buildRowGroupMeta(processed));
      } catch (e) {
        console.error("Failed to load ETF holdings:", e);
      } finally {
        setEtfLoading(false);
      }
    },
    [processRiskData],
  );

  const handleCloseETF = useCallback(() => {
    setSelectedETF(null);
    setEtfTableData([]);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  const cardStyle: CSSProperties = {
    background: "var(--sv-bg-surface)",
    borderRadius: 12,
    boxShadow: "var(--sv-shadow-md)",
    overflow: "hidden",
    border: "1px solid var(--sv-border)",
  };

  return (
    <div className="sv-content-wrap" style={{ padding: "1.5rem 1.5rem 2.5rem" }}>
      {/* ── Page header ── */}
      <div className="flex align-items-start justify-content-between mb-4" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.45rem",
              fontWeight: 700,
              color: "var(--sv-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 9,
                background: "var(--sv-accent-bg)",
                border: "1px solid var(--sv-accent)",
              }}
            >
              <i className="pi pi-shield" style={{ color: "var(--sv-accent)", fontSize: "1rem" }} />
            </span>
            Risk Range Report
          </h1>
          {updateDate && (
            <p style={{ margin: "6px 0 0 46px", fontSize: "0.77rem", color: "var(--sv-text-muted)" }}>
              Price data as of{" "}
              <span style={{ color: "var(--sv-danger)", fontWeight: 600 }}>{updateDate} EST</span>
            </p>
          )}
        </div>
        <Button
          icon="pi pi-refresh"
          label="Refresh Live"
          size="small"
          outlined
          loading={loading}
          onClick={() => loadMainData(true)}
          style={{ fontSize: "0.82rem", alignSelf: "flex-start" }}
        />
      </div>

      {/* ── Error state ── */}
      {error && (
        <div
          style={{
            padding: "0.9rem 1.2rem",
            borderRadius: 8,
            background: "var(--sv-danger-bg)",
            border: "1px solid var(--sv-danger)",
            color: "var(--sv-danger)",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.85rem",
          }}
        >
          <i className="pi pi-exclamation-triangle" style={{ fontSize: "1rem" }} />
          {error}
        </div>
      )}

      {/* ── Initial loading ── */}
      {loading && tableData.length === 0 && (
        <div
          className="flex justify-content-center align-items-center flex-column gap-3"
          style={{ minHeight: 340 }}
        >
          <ProgressSpinner style={{ width: 52, height: 52 }} strokeWidth="3" />
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.85rem" }}>
            Preparing risk range analysis…
          </span>
        </div>
      )}

      {/* ── Stats summary ── */}
      {!loading && tableData.length > 0 && <StatsSummary data={tableData} />}

      {/* ── Main table ── */}
      {tableData.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
          <RiskTable
            tableData={tableData}
            rowGroupMeta={rowGroupMeta}
            isEtfView={false}
            onHoldingsClick={handleHoldingsClick}
            loading={loading && tableData.length > 0}
          />
        </div>
      )}

      {/* ── ETF Holdings panel ── */}
      {selectedETF && (
        <div
          style={{
            ...cardStyle,
            border: "1px solid var(--sv-accent)",
            boxShadow: "var(--sv-shadow-glow)",
          }}
        >
          {/* Panel header */}
          <div
            className="flex align-items-center justify-content-between"
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--sv-border)",
              background: "var(--sv-accent-bg)",
            }}
          >
            <div className="flex align-items-center gap-2" style={{ flexWrap: "wrap" }}>
              <i className="pi pi-sitemap" style={{ color: "var(--sv-accent)", fontSize: "1rem" }} />
              <span style={{ fontWeight: 700, color: "var(--sv-text-primary)", fontSize: "0.95rem" }}>
                {selectedETF.symbol}
              </span>
              <span style={{ color: "var(--sv-text-secondary)", fontSize: "0.85rem" }}>{selectedETF.name}</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  padding: "2px 9px",
                  borderRadius: 20,
                  background: "var(--sv-accent)",
                  color: "var(--sv-bg-body)",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                ETF Holdings
              </span>
            </div>
            <button
              onClick={handleCloseETF}
              aria-label="Close ETF panel"
              style={{
                background: "none",
                border: "1px solid var(--sv-border)",
                cursor: "pointer",
                color: "var(--sv-text-muted)",
                borderRadius: 6,
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.78rem",
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--sv-bg-card)";
                (e.currentTarget as HTMLElement).style.color = "var(--sv-text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "none";
                (e.currentTarget as HTMLElement).style.color = "var(--sv-text-muted)";
              }}
            >
              <i className="pi pi-times" style={{ fontSize: "0.75rem" }} />
              Close
            </button>
          </div>

          {/* ETF table */}
          <RiskTable
            tableData={etfTableData}
            rowGroupMeta={etfRowGroupMeta}
            isEtfView={true}
            loading={etfLoading}
          />
        </div>
      )}
    </div>
  );
}
