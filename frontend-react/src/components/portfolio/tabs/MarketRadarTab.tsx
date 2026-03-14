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

export interface TechAlertItem {
  symbol: string;
  currentPrice?: number;
  priceChange?: number;
  changePct?: number;
  MohanramScore?: number;
  PiotroskiFScore?: number;
  ZacksRank?: number;
  sma50?: number;
  sma150?: number;
  sma200?: number;
  stop_loss?: number;
  distance_to_stop?: number;
  buy_signal?: string;
  sell_signal?: string;
  stop_loss_alert?: string;
}

interface Props {
  /** Can be a Record<symbol, data> object or an array */
  techAndFundamentals: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(raw: Record<string, unknown>): TechAlertItem[] {
  if (Array.isArray(raw)) return raw as TechAlertItem[];
  return Object.entries(raw).map(([symbol, val]) => ({
    symbol,
    ...(val as object),
  }));
}

const fmtSMA = (sma: number | undefined, price: number | undefined) => {
  if (!sma || !price) return null;
  return ((price - sma) / sma) * 100;
};

// ─── Score Badge ──────────────────────────────────────────────────────────────

type ScoreVariant = "mohanram" | "piotroski" | "svrank";

function scoreColor(value: number, variant: ScoreVariant) {
  if (variant === "svrank") {
    if (value <= 2)
      return {
        bg: "var(--sv-success-bg)",
        text: "var(--sv-gain)",
        border: "var(--sv-gain)",
      };
    if (value === 3)
      return {
        bg: "var(--sv-bg-surface)",
        text: "var(--sv-text-secondary)",
        border: "var(--sv-border)",
      };
    return {
      bg: "var(--sv-danger-bg)",
      text: "var(--sv-loss)",
      border: "var(--sv-loss)",
    };
  }
  // mohanram (0-8) and piotroski (0-9): ≤3 red, 4-6 grey, ≥7 green
  if (value <= 3)
    return {
      bg: "var(--sv-danger-bg)",
      text: "var(--sv-loss)",
      border: "var(--sv-loss)",
    };
  if (value <= 6)
    return {
      bg: "var(--sv-bg-surface)",
      text: "var(--sv-text-secondary)",
      border: "var(--sv-border)",
    };
  return {
    bg: "var(--sv-success-bg)",
    text: "var(--sv-gain)",
    border: "var(--sv-gain)",
  };
}

const ScoreBadge: React.FC<{
  value: number | undefined;
  variant: ScoreVariant;
  max: number;
}> = ({ value, variant, max }) => {
  if (value == null) return <span className="sv-text-muted text-xs">—</span>;
  const { bg, text, border } = scoreColor(value, variant);
  return (
    <div className="flex flex-column align-items-center gap-1">
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: bg,
          border: `2px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.85rem",
          color: text,
          flexShrink: 0,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.6rem", color: "var(--sv-text-muted)" }}>
        / {max}
      </div>
    </div>
  );
};

// ─── SMA Cell ─────────────────────────────────────────────────────────────────

const SMACell: React.FC<{
  sma: number | undefined;
  price: number | undefined;
}> = ({ sma, price }) => {
  if (!sma) return <span className="sv-text-muted text-xs">—</span>;
  const dist = fmtSMA(sma, price);
  const isAbove = (dist ?? 0) >= 0;
  return (
    <div className="text-right">
      <div
        className="text-xs font-semibold"
        style={{ color: "var(--sv-text-primary)" }}
      >
        {fmtUSD(sma)}
      </div>
      {dist != null && (
        <div
          className="text-xs mt-1 font-bold"
          style={{ color: isAbove ? "var(--sv-gain)" : "var(--sv-loss)" }}
        >
          {isAbove ? "▲" : "▼"} {Math.abs(dist).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

// ─── Signal Tag ───────────────────────────────────────────────────────────────

function signalSeverity(
  text: string | undefined,
): "success" | "danger" | "warning" | "secondary" | null {
  if (!text || text.toLowerCase() === "no signal" || text === "—") return null;
  const t = text.toLowerCase();
  if (t.includes("bull") || t.includes("buy") || t.includes("cross up"))
    return "success";
  if (t.includes("bear") || t.includes("sell") || t.includes("cross down"))
    return "danger";
  if (t.includes("alert") || t.includes("stop")) return "warning";
  return "secondary";
}

const SignalTag: React.FC<{ text: string | undefined }> = ({ text }) => {
  const sev = signalSeverity(text);
  if (!sev || !text) return <span className="sv-text-muted text-xs">—</span>;
  return (
    <Tag
      value={text}
      severity={sev}
      style={{
        fontSize: "0.68rem",
        padding: "0.2rem 0.5rem",
        whiteSpace: "nowrap",
        maxWidth: 120,
      }}
    />
  );
};

// ─── Summary Strip ────────────────────────────────────────────────────────────

const SummaryStrip: React.FC<{ items: TechAlertItem[] }> = ({ items }) => {
  if (!items.length) return null;

  const above200 = items.filter(
    (r) => r.sma200 && r.currentPrice && r.currentPrice > r.sma200,
  ).length;
  const avgPiotroski =
    items
      .filter((r) => r.PiotroskiFScore != null)
      .reduce((s, r) => s + (r.PiotroskiFScore ?? 0), 0) /
    (items.filter((r) => r.PiotroskiFScore != null).length || 1);
  const bullishCount = items.filter(
    (r) => r.buy_signal && signalSeverity(r.buy_signal) === "success",
  ).length;
  const stopAlertCount = items.filter(
    (r) => r.stop_loss_alert && signalSeverity(r.stop_loss_alert) === "warning",
  ).length;

  const pills = [
    {
      icon: "pi-chart-line",
      label: "Above 200-Day SMA",
      value: `${above200} / ${items.length}`,
      color:
        above200 / items.length > 0.5 ? "var(--sv-gain)" : "var(--sv-loss)",
    },
    {
      icon: "pi-star",
      label: "Avg Piotroski",
      value: avgPiotroski.toFixed(1),
      color:
        avgPiotroski >= 7
          ? "var(--sv-gain)"
          : avgPiotroski >= 4
            ? "var(--sv-text-secondary)"
            : "var(--sv-loss)",
    },
    {
      icon: "pi-arrow-up-right",
      label: "Bullish Crossovers",
      value: String(bullishCount),
      color: bullishCount > 0 ? "var(--sv-gain)" : "var(--sv-text-secondary)",
    },
    {
      icon: "pi-exclamation-triangle",
      label: "Stop Alerts",
      value: String(stopAlertCount),
      color:
        stopAlertCount > 0 ? "var(--sv-warning)" : "var(--sv-text-secondary)",
    },
  ];

  return (
    <div
      className="flex gap-3 flex-wrap px-3 py-2"
      style={{
        borderBottom: "1px solid var(--sv-border)",
        background: "var(--sv-bg-surface)",
      }}
    >
      {pills.map((p) => (
        <div
          key={p.label}
          className="flex align-items-center gap-2 border-round-lg"
          style={{
            background: "var(--sv-bg-card)",
            border: "1px solid var(--sv-border)",
            padding: "0.4rem 0.75rem",
          }}
        >
          <i
            className={`pi ${p.icon}`}
            style={{ color: p.color, fontSize: "0.8rem" }}
          />
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--sv-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {p.label}
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "1rem",
                color: p.color,
                lineHeight: 1.1,
              }}
            >
              {p.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Tooltip content ──────────────────────────────────────────────────────────

const TOOLTIPS = {
  mohanram:
    "Scored 0 (Worst) through 8 (Best). Uses 8 factors to determine a company's financial strength in earnings and cash flow profitability, naive extrapolation and accounting conservatism.",
  piotroski:
    "Scored 0 (Worst) through 9 (Best). Uses 9 factors to determine a company's financial strength in profitability, financial leverage and operating efficiency.",
  svrank:
    "The SV Rank rates stocks in terms of their expected price performance over the next 3–6 months. 1 = Strong Buy, 5 = Strong Sell.",
  sma: (d: number) =>
    `${d}-Day SMA. % distance = (Price − SMA) / SMA. Negative = below average (potential downtrend), Positive = above average (potential uptrend).`,
  stopLoss:
    "Stop Loss level based on technical analysis. The Distance to Stop shows how far the current price is from the stop loss level.",
  maCross:
    "Moving Average Crossover signal. Bullish when fast MA crosses above slow MA; Bearish when it crosses below.",
};

// ─── Main Component ────────────────────────────────────────────────────────────

const MarketRadarTab: React.FC<Props> = ({ techAndFundamentals }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  const items = useMemo(
    () => normalise(techAndFundamentals ?? {}),
    [techAndFundamentals],
  );

  if (!items.length) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted p-6">
        <i className="pi pi-chart-scatter" style={{ fontSize: "2.5rem" }} />
        <div className="text-sm">
          No signal data available for this portfolio
        </div>
      </div>
    );
  }

  return (
    <div>
      <Tooltip target=".mrt-tip" />

      {/* ── Summary strip ── */}
      <SummaryStrip items={items} />

      {/* ── Toolbar ── */}
      <div
        className="py-2 px-3 flex align-items-center justify-content-between gap-2 flex-wrap"
        style={{ borderBottom: "1px solid var(--sv-border)" }}
      >
        <div className="flex align-items-center gap-2">
          <i
            className="pi pi-sliders-h"
            style={{ color: "var(--sv-accent)", fontSize: "0.9rem" }}
          />
          <span
            className="text-xs font-semibold sv-text-muted"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Fundamentals &amp; Technical Signals
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

      {/* ── Table ── */}
      <DataTable
        value={items}
        size="small"
        stripedRows
        rowHover
        dataKey="symbol"
        globalFilter={globalFilter}
        globalFilterFields={["symbol"]}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        sortField="MohanramScore"
        sortOrder={-1}
        emptyMessage="No symbols match your filter"
        pt={{ wrapper: { style: { borderRadius: 0 } } }}
      >
        {/* Symbol */}
        <Column
          field="symbol"
          header="Symbol"
          sortable
          frozen
          style={{ minWidth: 110 }}
          body={(r: TechAlertItem) => (
            <div
              className="flex align-items-center justify-content-center border-round-md"
              style={{
                background: "var(--sv-accent-bg)",
                padding: "0.25rem 0.5rem",
                fontWeight: 800,
                fontSize: "0.82rem",
                color: "var(--sv-accent)",
                letterSpacing: "0.05em",
                maxWidth: 80,
              }}
            >
              {r.symbol}
            </div>
          )}
        />

        {/* Price */}
        <Column
          field="currentPrice"
          header="Price"
          sortable
          style={{ minWidth: 110 }}
          pt={{ headerContent: { className: "justify-content-end" } }}
          body={(r: TechAlertItem) => (
            <div className="text-right">
              <div className="font-bold text-sm">
                {r.currentPrice != null ? fmtUSD(r.currentPrice) : "—"}
              </div>
              {r.changePct != null && (
                <div
                  className="text-xs mt-1 font-semibold"
                  style={{ color: gainColor(r.changePct) }}
                >
                  {fmtPct(r.changePct)}
                </div>
              )}
            </div>
          )}
        />

        {/* Mohanram */}
        <Column
          field="MohanramScore"
          sortable
          style={{ minWidth: 90, textAlign: "center" }}
          header={
            <span>
              Mohanram{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.mohanram}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-center" } }}
          body={(r: TechAlertItem) => (
            <div className="flex justify-content-center">
              <ScoreBadge value={r.MohanramScore} variant="mohanram" max={8} />
            </div>
          )}
        />

        {/* Piotroski */}
        <Column
          field="PiotroskiFScore"
          sortable
          style={{ minWidth: 90, textAlign: "center" }}
          header={
            <span>
              Piotroski{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.piotroski}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-center" } }}
          body={(r: TechAlertItem) => (
            <div className="flex justify-content-center">
              <ScoreBadge
                value={r.PiotroskiFScore}
                variant="piotroski"
                max={9}
              />
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
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.svrank}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-center" } }}
          body={(r: TechAlertItem) => (
            <div className="flex justify-content-center">
              <ScoreBadge value={r.ZacksRank} variant="svrank" max={5} />
            </div>
          )}
        />

        {/* 50-Day SMA */}
        <Column
          field="sma50"
          sortable
          style={{ minWidth: 100 }}
          header={
            <span>
              50d SMA{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.sma(50)}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-end" } }}
          body={(r: TechAlertItem) => (
            <SMACell sma={r.sma50} price={r.currentPrice} />
          )}
        />

        {/* 150-Day SMA */}
        <Column
          field="sma150"
          sortable
          style={{ minWidth: 100 }}
          header={
            <span>
              150d SMA{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.sma(150)}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-end" } }}
          body={(r: TechAlertItem) => (
            <SMACell sma={r.sma150} price={r.currentPrice} />
          )}
        />

        {/* 200-Day SMA */}
        <Column
          field="sma200"
          sortable
          style={{ minWidth: 100 }}
          header={
            <span>
              200d SMA{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.sma(200)}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-end" } }}
          body={(r: TechAlertItem) => (
            <SMACell sma={r.sma200} price={r.currentPrice} />
          )}
        />

        {/* Stop Loss */}
        <Column
          field="stop_loss"
          sortable
          style={{ minWidth: 120 }}
          header={
            <span>
              Stop Loss{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.stopLoss}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          pt={{ headerContent: { className: "justify-content-end" } }}
          body={(r: TechAlertItem) => {
            if (!r.stop_loss)
              return (
                <span className="sv-text-muted text-xs text-right block">
                  —
                </span>
              );
            const isBreached =
              r.currentPrice != null && r.currentPrice <= r.stop_loss;
            return (
              <div className="text-right">
                <div
                  className="text-sm font-bold"
                  style={{
                    color: isBreached
                      ? "var(--sv-loss)"
                      : "var(--sv-text-primary)",
                  }}
                >
                  {fmtUSD(r.stop_loss)}
                </div>
                {r.distance_to_stop != null && (
                  <div
                    className="text-xs mt-1"
                    style={{
                      color: isBreached
                        ? "var(--sv-loss)"
                        : "var(--sv-text-muted)",
                    }}
                  >
                    {isBreached
                      ? "▼ BREACHED"
                      : `${fmtUSD(r.distance_to_stop)} away`}
                  </div>
                )}
              </div>
            );
          }}
        />

        {/* MA Crossover Bullish */}
        <Column
          field="buy_signal"
          style={{ minWidth: 130 }}
          header={
            <span>
              MA Cross Bullish{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.maCross}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          body={(r: TechAlertItem) => <SignalTag text={r.buy_signal} />}
        />

        {/* MA Crossover Bearish */}
        <Column
          field="sell_signal"
          style={{ minWidth: 130 }}
          header={
            <span>
              MA Cross Bearish{" "}
              <i
                className="pi pi-question-circle mrt-tip"
                data-pr-tooltip={TOOLTIPS.maCross}
                data-pr-position="top"
                style={{
                  fontSize: "0.7rem",
                  cursor: "help",
                  color: "var(--sv-text-muted)",
                }}
              />
            </span>
          }
          body={(r: TechAlertItem) => <SignalTag text={r.sell_signal} />}
        />

        {/* Stop Loss Alert */}
        <Column
          field="stop_loss_alert"
          style={{ minWidth: 130 }}
          header="Stop Alert"
          body={(r: TechAlertItem) => <SignalTag text={r.stop_loss_alert} />}
        />
      </DataTable>
    </div>
  );
};

export default MarketRadarTab;
