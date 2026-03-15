import React, { useState, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Tooltip } from "primereact/tooltip";
import {
  fmtUSD,
  fmtPct,
  gainColor,
} from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FundamentalItem {
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  currentPrice?: number;
  priceChange?: number;
  changePct?: number;
  MohanramScore?: number;
  PiotroskiFScore?: number;
  ZacksRank?: number;
  dividendYield?: number;
  week_low_52?: number;
  week_high_52?: number;
  relative_strength?: number;
  net_signal?: string;
}

interface Props {
  techAndFundamentals: Record<string, unknown>;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function normalise(raw: Record<string, unknown>): FundamentalItem[] {
  if (Array.isArray(raw)) return raw as FundamentalItem[];
  return Object.entries(raw).map(([symbol, val]) => ({
    symbol,
    ...(val as object),
  }));
}

// ─── Score coloring ──────────────────────────────────────────────────────────

type ScoreVariant = "mohanram" | "piotroski" | "svrank";

function scoreColors(value: number, variant: ScoreVariant) {
  if (variant === "svrank") {
    if (value <= 2) return { bg: "var(--sv-success-bg)", text: "var(--sv-gain)", border: "var(--sv-gain)" };
    if (value === 3) return { bg: "var(--sv-bg-surface)", text: "var(--sv-text-secondary)", border: "var(--sv-border)" };
    return { bg: "var(--sv-danger-bg)", text: "var(--sv-loss)", border: "var(--sv-loss)" };
  }
  if (value <= 3) return { bg: "var(--sv-danger-bg)", text: "var(--sv-loss)", border: "var(--sv-loss)" };
  if (value <= 6) return { bg: "var(--sv-bg-surface)", text: "var(--sv-text-secondary)", border: "var(--sv-border)" };
  return { bg: "var(--sv-success-bg)", text: "var(--sv-gain)", border: "var(--sv-gain)" };
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

const ScoreBadge: React.FC<{ value: number | undefined; variant: ScoreVariant; max: number }> = ({
  value, variant, max,
}) => {
  if (value == null) return <span className="sv-text-muted text-xs">—</span>;
  const { bg, text, border } = scoreColors(value, variant);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      background: bg, border: `2px solid ${border}`, borderRadius: 12,
      padding: "2px 8px", color: text, fontWeight: 800, fontSize: "0.8rem",
    }}>
      {value}
      <span style={{ fontWeight: 400, opacity: 0.7, fontSize: "0.7rem" }}>/{max}</span>
    </div>
  );
};

// 52-Week range bar
const RangeBar: React.FC<{ low: number | undefined; high: number | undefined; current: number | undefined }> = ({
  low, high, current,
}) => {
  if (!low || !high || !current || high <= low) {
    return <span className="sv-text-muted text-xs">—</span>;
  }
  const pct = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  const isNearHigh = pct >= 75;
  const markerColor = isNearHigh ? "var(--sv-gain)" : pct <= 25 ? "var(--sv-loss)" : "var(--sv-accent)";
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ position: "relative", height: 6, background: "var(--sv-border)", borderRadius: 3, margin: "4px 0" }}>
        <div style={{
          position: "absolute", left: `${pct}%`, top: "50%",
          transform: "translate(-50%, -50%)",
          width: 10, height: 10, borderRadius: "50%",
          background: markerColor,
          border: "2px solid var(--sv-bg-card)",
          boxShadow: `0 0 4px ${markerColor}`,
        }} />
      </div>
      <div className="flex justify-content-between" style={{ fontSize: "0.62rem", color: "var(--sv-text-muted)" }}>
        <span>{fmtUSD(low)}</span>
        <span style={{ color: markerColor, fontWeight: 700 }}>{Math.round(pct)}%</span>
        <span>{fmtUSD(high)}</span>
      </div>
    </div>
  );
};

// ─── Sector colors (used for sector tags in the table) ───────────────────────

const SECTOR_COLORS: Record<string, string> = {
  Technology:      "#38bdf8",
  Healthcare:      "#34d399",
  Financials:      "#60a5fa",
  "Consumer Discretionary": "#fb923c",
  "Consumer Staples":       "#fbbf24",
  Energy:          "#f87171",
  Industrials:     "#a78bfa",
  Materials:       "#4ade80",
  "Real Estate":   "#f472b6",
  Utilities:       "#facc15",
  "Communication Services": "#2dd4bf",
  FixedIncome:     "#94a3b8",
};

// ─── Tooltip definitions ─────────────────────────────────────────────────────

const TIPS = {
  piotroski: "Piotroski F-Score (0–9): Measures financial health using 9 criteria around profitability, leverage, and operating efficiency. Score ≥ 7 = financially strong.",
  mohanram:  "Mohanram G-Score (0–8): Measures earnings quality and growth sustainability. Score ≥ 6 = high quality growth company.",
  svrank:    "SV Rank (1–5): 1 = Strong Buy → 5 = Strong Sell. Based on expected price performance over the next 3–6 months.",
  divYield:  "Dividend Yield: Annual dividends paid as a % of the current stock price. A source of passive income.",
  relStrength: "12-Week Relative Performance: How the stock performed vs. the overall market over the past 3 months. Positive = outperformed.",
  range52w:  "52-Week Range: The dot shows where the current price sits between the year's low and high. Near the top means the stock is at a strong price level.",
};

// ─── Net signal tag ───────────────────────────────────────────────────────────

const NetSignalTag: React.FC<{ signal: string | undefined }> = ({ signal }) => {
  if (!signal) return <span className="sv-text-muted text-xs">—</span>;
  const s = signal.toLowerCase();
  const severity: "success" | "danger" | "warning" | "secondary" =
    s.includes("buy")  || s.includes("bull") ? "success"   :
    s.includes("sell") || s.includes("bear") ? "danger"    :
    s.includes("hold") || s.includes("neut") ? "secondary" : "warning";
  return (
    <Tag value={signal} severity={severity}
      style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", whiteSpace: "nowrap" }} />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const FundamentalsTab: React.FC<Props> = ({ techAndFundamentals }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  const items = useMemo(
    () => normalise(techAndFundamentals ?? {}),
    [techAndFundamentals],
  );

  const hasDivData   = items.some((r) => r.dividendYield != null);
  const has52wData   = items.some((r) => r.week_low_52 != null);
  const hasRelStr    = items.some((r) => r.relative_strength != null);
  const hasNetSignal = items.some((r) => r.net_signal != null);

  if (!items.length) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted p-6">
        <i className="pi pi-chart-bar" style={{ fontSize: "2.5rem" }} />
        <div className="text-sm">No fundamental data available for this portfolio</div>
      </div>
    );
  }

  return (
    <div>
      <Tooltip target=".ft-tip" />

      {/* ── Holdings table header ── */}
      <div
        className="py-2 px-3 flex align-items-center justify-content-between gap-2 flex-wrap"
        style={{ borderTop: "1px solid var(--sv-border)", borderBottom: "1px solid var(--sv-border)" }}
      >
        <div className="flex align-items-center gap-2">
          <i className="pi pi-table" style={{ color: "var(--sv-accent)", fontSize: "0.9rem" }} />
          <span className="text-xs font-semibold sv-text-muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Holdings Fundamentals
          </span>
          <span
            className="border-round-lg"
            style={{
              background: "var(--sv-accent-bg)", color: "var(--sv-accent)",
              fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem",
            }}
          >
            {items.length} stocks
          </span>
        </div>
        <div className="relative" style={{ display: "inline-block" }}>
          <i className="pi pi-search sv-input-icon-left" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter symbols…"
            className="sv-search-input"
          />
        </div>
      </div>

      {/* ── Data table ── */}
      <DataTable
        value={items}
        size="small"
        stripedRows
        rowHover
        dataKey="symbol"
        globalFilter={globalFilter}
        globalFilterFields={["symbol", "name", "sector"]}
        paginator
        rows={15}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        sortField="PiotroskiFScore"
        sortOrder={-1}
        emptyMessage="No symbols match your filter"
        pt={{ wrapper: { style: { borderRadius: 0 } } }}
      >
        {/* Symbol + name + sector */}
        <Column
          field="symbol"
          header="Stock"
          sortable
          frozen
          style={{ minWidth: 150 }}
          body={(r: FundamentalItem) => (
            <div>
              <div style={{
                display: "inline-block",
                background: "var(--sv-accent-bg)", color: "var(--sv-accent)",
                fontWeight: 800, fontSize: "0.82rem", letterSpacing: "0.05em",
                padding: "0.2rem 0.5rem", borderRadius: 6, marginBottom: 2,
              }}>
                {r.symbol}
              </div>
              {r.name && (
                <div className="sv-text-muted overflow-hidden white-space-nowrap"
                  style={{ fontSize: "0.68rem", maxWidth: 160, textOverflow: "ellipsis" }}>
                  {r.name}
                </div>
              )}
              {r.sector && (
                <div style={{
                  fontSize: "0.62rem", marginTop: 2, display: "inline-block",
                  background: `${SECTOR_COLORS[r.sector] ?? "#6366f1"}22`,
                  color: SECTOR_COLORS[r.sector] ?? "#6366f1",
                  padding: "0.1rem 0.4rem", borderRadius: 4, fontWeight: 600,
                }}>
                  {r.sector}
                </div>
              )}
            </div>
          )}
        />

        {/* Net signal (buy/sell) — only if data present */}
        {hasNetSignal && (
          <Column
            field="net_signal"
            header="Signal"
            style={{ minWidth: 90, textAlign: "center" }}
            pt={{ headerContent: { className: "justify-content-center" } }}
            body={(r: FundamentalItem) => (
              <div className="flex justify-content-center">
                <NetSignalTag signal={r.net_signal} />
              </div>
            )}
          />
        )}

        {/* Price & today's change */}
        <Column
          field="currentPrice"
          header="Price"
          sortable
          style={{ minWidth: 110 }}
          pt={{ headerContent: { className: "justify-content-end" } }}
          body={(r: FundamentalItem) => (
            <div className="text-right">
              <div className="font-bold text-sm">
                {r.currentPrice != null ? fmtUSD(Number(r.currentPrice)) : "—"}
              </div>
              {r.changePct != null && (
                <div className="text-xs mt-1 font-semibold" style={{ color: gainColor(Number(r.changePct)) }}>
                  {fmtPct(Number(r.changePct))}
                </div>
              )}
            </div>
          )}
        />

        {/* Piotroski */}
        <Column
          field="PiotroskiFScore"
          sortable
          style={{ minWidth: 100, textAlign: "center" }}
          header={
            <span>
              Piotroski{" "}
              <i className="pi pi-question-circle ft-tip"
                data-pr-tooltip={TIPS.piotroski} data-pr-position="top"
                style={{ fontSize: "0.7rem", cursor: "help", color: "var(--sv-text-muted)" }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-center" } }}
          body={(r: FundamentalItem) => (
            <div className="flex flex-column align-items-center gap-1">
              <ScoreBadge value={r.PiotroskiFScore} variant="piotroski" max={9} />
              {r.PiotroskiFScore != null && (
                <div style={{ fontSize: "0.6rem", color: "var(--sv-text-muted)" }}>
                  {r.PiotroskiFScore >= 7 ? "Strong" : r.PiotroskiFScore >= 4 ? "Average" : "Weak"}
                </div>
              )}
            </div>
          )}
        />

        {/* Mohanram */}
        <Column
          field="MohanramScore"
          sortable
          style={{ minWidth: 100, textAlign: "center" }}
          header={
            <span>
              Mohanram{" "}
              <i className="pi pi-question-circle ft-tip"
                data-pr-tooltip={TIPS.mohanram} data-pr-position="top"
                style={{ fontSize: "0.7rem", cursor: "help", color: "var(--sv-text-muted)" }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-center" } }}
          body={(r: FundamentalItem) => (
            <div className="flex flex-column align-items-center gap-1">
              <ScoreBadge value={r.MohanramScore} variant="mohanram" max={8} />
              {r.MohanramScore != null && (
                <div style={{ fontSize: "0.6rem", color: "var(--sv-text-muted)" }}>
                  {r.MohanramScore >= 6 ? "Quality" : r.MohanramScore >= 4 ? "Average" : "Weak"}
                </div>
              )}
            </div>
          )}
        />

        {/* SV Rank */}
        <Column
          field="ZacksRank"
          sortable
          style={{ minWidth: 90, textAlign: "center" }}
          header={
            <span>
              SV Rank{" "}
              <i className="pi pi-question-circle ft-tip"
                data-pr-tooltip={TIPS.svrank} data-pr-position="top"
                style={{ fontSize: "0.7rem", cursor: "help", color: "var(--sv-text-muted)" }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-center" } }}
          body={(r: FundamentalItem) => (
            <div className="flex flex-column align-items-center gap-1">
              <ScoreBadge value={r.ZacksRank} variant="svrank" max={5} />
              {r.ZacksRank != null && (
                <div style={{ fontSize: "0.6rem", color: "var(--sv-text-muted)" }}>
                  {r.ZacksRank === 1 ? "Strong Buy" : r.ZacksRank === 2 ? "Buy" : r.ZacksRank === 3 ? "Hold" : r.ZacksRank === 4 ? "Sell" : "Strong Sell"}
                </div>
              )}
            </div>
          )}
        />

        {/* 52-Week Range — only if data present */}
        {has52wData && (
          <Column
            field="week_high_52"
            header={
              <span>
                52W Range{" "}
                <i className="pi pi-question-circle ft-tip"
                  data-pr-tooltip={TIPS.range52w} data-pr-position="top"
                  style={{ fontSize: "0.7rem", cursor: "help", color: "var(--sv-text-muted)" }}
                />
              </span>
            }
            style={{ minWidth: 145 }}
            body={(r: FundamentalItem) => (
              <RangeBar low={r.week_low_52} high={r.week_high_52} current={r.currentPrice} />
            )}
          />
        )}

        {/* Dividend Yield — only if data present */}
        {hasDivData && (
          <Column
            field="dividendYield"
            sortable
            header={
              <span>
                Div Yield{" "}
                <i className="pi pi-question-circle ft-tip"
                  data-pr-tooltip={TIPS.divYield} data-pr-position="top"
                  style={{ fontSize: "0.7rem", cursor: "help", color: "var(--sv-text-muted)" }}
                />
              </span>
            }
            style={{ minWidth: 90, textAlign: "right" }}
            pt={{ headerContent: { className: "justify-content-end" } }}
            body={(r: FundamentalItem) => {
              if (r.dividendYield == null || r.dividendYield === 0)
                return <span className="sv-text-muted text-xs block text-right">—</span>;
              return (
                <div className="text-right">
                  <div className="font-bold text-sm" style={{ color: "var(--sv-accent)" }}>
                    {r.dividendYield.toFixed(2)}%
                  </div>
                  <div className="text-xs sv-text-muted">annual</div>
                </div>
              );
            }}
          />
        )}

        {/* 12W Relative Strength — only if data present */}
        {hasRelStr && (
          <Column
            field="relative_strength"
            sortable
            header={
              <span>
                12W Perf{" "}
                <i className="pi pi-question-circle ft-tip"
                  data-pr-tooltip={TIPS.relStrength} data-pr-position="top"
                  style={{ fontSize: "0.7rem", cursor: "help", color: "var(--sv-text-muted)" }}
                />
              </span>
            }
            style={{ minWidth: 90, textAlign: "right" }}
            pt={{ headerContent: { className: "justify-content-end" } }}
            body={(r: FundamentalItem) => {
              if (r.relative_strength == null)
                return <span className="sv-text-muted text-xs block text-right">—</span>;
              return (
                <div className="text-right font-bold text-sm" style={{ color: gainColor(Number(r.relative_strength)) }}>
                  {fmtPct(Number(r.relative_strength))}
                </div>
              );
            }}
          />
        )}
      </DataTable>
    </div>
  );
};

export default FundamentalsTab;
