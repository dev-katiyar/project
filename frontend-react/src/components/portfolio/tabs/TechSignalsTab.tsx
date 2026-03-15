import React, { useState, useEffect, useCallback } from "react";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertItem {
  symbol: string;
  event: string;
  date: string;
}

interface TechAlertsResponse {
  up: number;
  down: number;
  upsymbols: AlertItem[];
  downsymbols: AlertItem[];
}

type FilterMode = "all" | "bullish" | "bearish";

interface Props {
  symbols: string[];
  active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAlertDate(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return raw;
  }
}

// Plain-language prefix mappings for common technical events
const EVENT_GLOSSARY: [RegExp, string][] = [
  [/golden cross/i,     "Momentum Boost — "],
  [/death cross/i,      "Caution Signal — "],
  [/breakout/i,         "Price Breakout — "],
  [/breakdown/i,        "Price Breakdown — "],
  [/oversold/i,         "Potential Bounce — "],
  [/overbought/i,       "Stretched High — "],
  [/support/i,          "Support Zone Hit — "],
  [/resistance/i,       "Resistance Zone Hit — "],
  [/volume spike/i,     "Heavy Trading — "],
  [/52.week high/i,     "New 52-Week High — "],
  [/52.week low/i,      "New 52-Week Low — "],
  [/macd/i,             "Trend Signal — "],
  [/rsi/i,              "Momentum Signal — "],
  [/bullish/i,          "Bullish Signal — "],
  [/bearish/i,          "Bearish Signal — "],
];

function humaniseEvent(event: string): { prefix: string; body: string } {
  for (const [re, prefix] of EVENT_GLOSSARY) {
    if (re.test(event)) return { prefix, body: event };
  }
  return { prefix: "", body: event };
}

// ─── AlertCard ───────────────────────────────────────────────────────────────

const AlertCard: React.FC<{ item: AlertItem; direction: "up" | "down"; index: number }> = ({
  item, direction, index,
}) => {
  const isUp = direction === "up";
  const accentColor = isUp ? "var(--sv-gain)" : "var(--sv-loss)";
  const bgColor     = isUp ? "var(--sv-success-bg)" : "var(--sv-danger-bg)";
  const icon        = isUp ? "pi-arrow-circle-up" : "pi-arrow-circle-down";
  const { prefix, body } = humaniseEvent(item.event);

  return (
    <div
      className="border-round-xl p-3 flex gap-3 align-items-start"
      style={{
        background: "var(--sv-bg-surface)",
        border: `1px solid var(--sv-border)`,
        borderLeft: `3px solid ${accentColor}`,
        transition: "box-shadow 0.15s",
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Direction icon */}
      <div
        className="flex-shrink-0 flex align-items-center justify-content-center border-round-xl"
        style={{
          width: 36, height: 36,
          background: bgColor,
          color: accentColor,
          fontSize: "1rem",
        }}
      >
        <i className={`pi ${icon}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex align-items-center gap-2 flex-wrap mb-1">
          {/* Symbol badge */}
          <span
            className="font-bold"
            style={{
              background: "var(--sv-accent-bg)", color: "var(--sv-accent)",
              fontSize: "0.8rem", letterSpacing: "0.06em",
              padding: "0.15rem 0.55rem", borderRadius: 6,
            }}
          >
            {item.symbol}
          </span>
          {/* Direction tag */}
          <Tag
            value={isUp ? "Bullish" : "Bearish"}
            severity={isUp ? "success" : "danger"}
            style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem" }}
          />
        </div>

        {/* Event description */}
        <div className="text-sm leading-relaxed" style={{ color: "var(--sv-text-primary)" }}>
          {prefix && (
            <span className="font-semibold" style={{ color: accentColor }}>
              {prefix}
            </span>
          )}
          {body}
        </div>

        {/* Date */}
        <div className="text-xs mt-1 sv-text-muted flex align-items-center gap-1">
          <i className="pi pi-calendar" style={{ fontSize: "0.65rem" }} />
          {formatAlertDate(item.date)}
        </div>
      </div>
    </div>
  );
};

// ─── Summary Stat ─────────────────────────────────────────────────────────────

const SummaryPill: React.FC<{
  count: number; label: string; icon: string; color: string; bg: string;
  active: boolean; onClick: () => void;
}> = ({ count, label, icon, color, bg, active, onClick }) => (
  <button
    onClick={onClick}
    className="border-round-xl flex align-items-center gap-2 cursor-pointer"
    style={{
      background: active ? bg : "var(--sv-bg-surface)",
      border: `2px solid ${active ? color : "var(--sv-border)"}`,
      padding: "0.5rem 1rem",
      color: active ? color : "var(--sv-text-secondary)",
      transition: "all 0.15s",
      fontFamily: "inherit",
      cursor: "pointer",
    }}
  >
    <i className={`pi ${icon}`} style={{ fontSize: "1rem", color }} />
    <div className="text-left">
      <div className="font-bold" style={{ fontSize: "1.1rem", color, lineHeight: 1 }}>
        {count}
      </div>
      <div className="text-xs" style={{ letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
        {label}
      </div>
    </div>
  </button>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ mode: FilterMode }> = ({ mode }) => (
  <div className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted p-6 text-center">
    <i
      className={`pi ${mode === "bullish" ? "pi-arrow-circle-up" : mode === "bearish" ? "pi-arrow-circle-down" : "pi-bell"}`}
      style={{ fontSize: "2.5rem", opacity: 0.35 }}
    />
    <div>
      <div className="font-semibold mb-1" style={{ color: "var(--sv-text-secondary)" }}>
        {mode === "bullish"
          ? "No bullish signals found"
          : mode === "bearish"
          ? "No bearish signals found"
          : "No technical signals at this time"}
      </div>
      <div className="text-xs sv-text-muted" style={{ maxWidth: 320 }}>
        Technical signals appear when stocks in your portfolio show meaningful price or momentum patterns.
      </div>
    </div>
  </div>
);

// ─── Loading Skeletons ────────────────────────────────────────────────────────

const AlertSkeletons: React.FC = () => (
  <div className="flex flex-column gap-2 p-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex gap-3 align-items-start p-3 border-round-xl"
        style={{ background: "var(--sv-bg-surface)", border: "1px solid var(--sv-border)" }}>
        <Skeleton width="36px" height="36px" borderRadius="10px" className="flex-shrink-0" />
        <div className="flex-1">
          <Skeleton width="120px" height="20px" className="mb-2" borderRadius="6px" />
          <Skeleton width="80%" height="14px" className="mb-1" borderRadius="4px" />
          <Skeleton width="100px" height="12px" borderRadius="4px" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const TechSignalsTab: React.FC<Props> = ({ symbols, active }) => {
  const [alerts, setAlerts]       = useState<TechAlertsResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [filter, setFilter]       = useState<FilterMode>("all");
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!symbols.length) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post<TechAlertsResponse>("/techAlertsNew", {
        symbols: symbols.join(","),
      });
      setAlerts(res.data);
    } catch {
      setError("Unable to load signals right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  // Lazy load — only fetch when tab becomes active for the first time
  useEffect(() => {
    if (active && !hasLoaded) {
      setHasLoaded(true);
      fetchAlerts();
    }
  }, [active, hasLoaded, fetchAlerts]);

  // Derive visible list
  const visibleAlerts: (AlertItem & { direction: "up" | "down" })[] = (() => {
    if (!alerts) return [];
    const up   = (alerts.upsymbols   ?? []).map((a) => ({ ...a, direction: "up"   as const }));
    const down = (alerts.downsymbols ?? []).map((a) => ({ ...a, direction: "down" as const }));
    if (filter === "bullish") return up;
    if (filter === "bearish") return down;
    // interleave for "all": up first, then down
    return [...up, ...down];
  })();

  const upCount   = alerts?.up   ?? 0;
  const downCount = alerts?.down ?? 0;
  const total     = upCount + downCount;

  if (!symbols.length) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted p-6 text-center">
        <i className="pi pi-chart-line" style={{ fontSize: "2.5rem", opacity: 0.35 }} />
        <div className="text-sm">Add holdings to your portfolio to see technical signals.</div>
      </div>
    );
  }

  return (
    <div>
      <Tooltip target=".ts-tip" />

      {/* ── Header toolbar ── */}
      <div
        className="py-3 px-3 flex align-items-center justify-content-between gap-2 flex-wrap"
        style={{ borderBottom: "1px solid var(--sv-border)", background: "var(--sv-bg-surface)" }}
      >
        <div className="flex align-items-center gap-2">
          <i className="pi pi-bolt" style={{ color: "var(--sv-accent)", fontSize: "1rem" }} />
          <div>
            <span
              className="font-bold"
              style={{ color: "var(--sv-text-primary)", fontSize: "0.9rem" }}
            >
              Technical Signals
            </span>
            <span className="text-xs sv-text-muted ml-2">
              AI-detected patterns in your holdings
            </span>
          </div>
          <i
            className="pi pi-question-circle ts-tip sv-text-muted"
            style={{ fontSize: "0.75rem", cursor: "help" }}
            data-pr-tooltip="Technical signals are generated when your stock holdings show meaningful price or momentum patterns — like breakouts, trend shifts, or unusual volume. These are informational, not buy/sell recommendations."
            data-pr-position="bottom"
          />
        </div>

        <Button
          icon="pi pi-refresh"
          text
          rounded
          size="small"
          className="sv-text-muted"
          loading={loading}
          onClick={() => { setHasLoaded(true); fetchAlerts(); }}
          tooltip="Refresh signals"
          tooltipOptions={{ position: "left" }}
        />
      </div>

      {/* ── Summary pills ── */}
      {!loading && !error && (
        <div
          className="px-3 py-3 flex align-items-center gap-2 flex-wrap"
          style={{ borderBottom: "1px solid var(--sv-border)" }}
        >
          {/* All */}
          <button
            onClick={() => setFilter("all")}
            className="border-round-xl flex align-items-center gap-2 cursor-pointer"
            style={{
              background: filter === "all" ? "var(--sv-accent-bg)" : "var(--sv-bg-surface)",
              border: `2px solid ${filter === "all" ? "var(--sv-accent)" : "var(--sv-border)"}`,
              padding: "0.45rem 1rem",
              color: filter === "all" ? "var(--sv-accent)" : "var(--sv-text-secondary)",
              transition: "all 0.15s",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            <i className="pi pi-list" style={{ fontSize: "0.85rem" }} />
            <span className="text-sm font-semibold">All ({total})</span>
          </button>

          <SummaryPill
            count={upCount}
            label="Bullish Signals"
            icon="pi-arrow-circle-up"
            color="var(--sv-gain)"
            bg="var(--sv-success-bg)"
            active={filter === "bullish"}
            onClick={() => setFilter("bullish")}
          />
          <SummaryPill
            count={downCount}
            label="Bearish Signals"
            icon="pi-arrow-circle-down"
            color="var(--sv-loss)"
            bg="var(--sv-danger-bg)"
            active={filter === "bearish"}
            onClick={() => setFilter("bearish")}
          />

          {/* Sentiment bar */}
          {total > 0 && (
            <div className="flex align-items-center gap-2 ml-auto">
              <span className="text-xs sv-text-muted sv-info-label">Sentiment</span>
              <div
                className="border-round-xl overflow-hidden"
                style={{ width: 100, height: 8, background: "var(--sv-danger-bg)" }}
              >
                <div
                  className="border-round-xl"
                  style={{
                    width: `${total ? (upCount / total) * 100 : 50}%`,
                    height: "100%",
                    background: "var(--sv-gain)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <span
                className="text-xs font-bold"
                style={{
                  color: upCount >= downCount ? "var(--sv-gain)" : "var(--sv-loss)",
                }}
              >
                {total ? Math.round((upCount / total) * 100) : 50}% Bullish
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <AlertSkeletons />
      ) : error ? (
        <div className="flex flex-column align-items-center justify-content-center gap-3 p-6 text-center">
          <i className="pi pi-exclamation-triangle sv-text-loss" style={{ fontSize: "2rem" }} />
          <p className="m-0 text-sm sv-text-muted">{error}</p>
          <Button
            label="Try Again"
            icon="pi pi-refresh"
            size="small"
            onClick={fetchAlerts}
          />
        </div>
      ) : (
        <>
          {/* Educational disclaimer */}
          {alerts && total > 0 && (
            <div
              className="mx-3 mt-3 mb-2 border-round-lg px-3 py-2 flex align-items-start gap-2 text-xs sv-text-muted"
              style={{
                background: "var(--sv-accent-bg)",
                border: "1px solid var(--sv-border)",
                borderLeft: "3px solid var(--sv-accent)",
              }}
            >
              <i className="pi pi-info-circle mt-1 flex-shrink-0" style={{ color: "var(--sv-accent)", fontSize: "0.8rem" }} />
              <span>
                These signals are for <strong>informational purposes only</strong> and are not buy or sell
                recommendations. Technical patterns help identify potential trends, but always consider your
                own financial situation before making investment decisions.
              </span>
            </div>
          )}

          {/* Alert cards grid */}
          {visibleAlerts.length > 0 ? (
            <div
              className="grid p-3"
              style={{ gap: "0.6rem", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
            >
              {visibleAlerts.map((item, i) => (
                <AlertCard
                  key={`${item.direction}-${item.symbol}-${i}`}
                  item={item}
                  direction={item.direction}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <EmptyState mode={filter} />
          )}
        </>
      )}
    </div>
  );
};

export default TechSignalsTab;
