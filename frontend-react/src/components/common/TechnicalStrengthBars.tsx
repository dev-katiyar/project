import React from "react";
import { Skeleton } from "primereact/skeleton";

/* ── Rating helpers ──────────────────────────────────────────────────────── */

/**
 * Values 0–4 matching the Angular reference:
 *   0 = Neutral, 1 = Very Bearish, 2 = Bearish, 3 = Bullish, 4 = Very Bullish
 */
const RATING_META: Record<
  number,
  { label: string; color: string; fillPct: number }
> = {
  0: { label: "Neutral", color: "#94a3b8", fillPct: 0 },
  1: { label: "Very Bearish", color: "#ef4444", fillPct: 25 },
  2: { label: "Bearish", color: "#f97316", fillPct: 50 },
  3: { label: "Bullish", color: "#4ade80", fillPct: 75 },
  4: { label: "Very Bullish", color: "#22c55e", fillPct: 100 },
};

function getMeta(value?: number) {
  if (value == null) return null;
  return RATING_META[value] ?? null;
}

/* ── Single bar row ──────────────────────────────────────────────────────── */

const StrengthBar: React.FC<{ name: string; value?: number }> = ({
  name,
  value,
}) => {
  const meta = getMeta(value);

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.35rem",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--sv-text-secondary)",
          }}
        >
          {name}
        </span>
        {meta ? (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "0.1rem 0.45rem",
              borderRadius: 4,
              color: meta.color,
              background: `${meta.color}22`,
            }}
          >
            {meta.label}
          </span>
        ) : (
          <span
            style={{ fontSize: "0.65rem", color: "var(--sv-text-muted)" }}
          >
            —
          </span>
        )}
      </div>

      {/* Track + fill bar */}
      <div
        style={{
          height: "0.45rem",
          borderRadius: 4,
          background: "var(--sv-bg-surface)",
          overflow: "hidden",
          border: "1px solid var(--sv-border)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: meta ? `${meta.fillPct}%` : "0%",
            borderRadius: 4,
            background: meta
              ? meta.fillPct === 0
                ? "transparent"
                : meta.color
              : "transparent",
            transition: "width 0.4s ease",
            boxShadow: meta && meta.fillPct > 0 ? `0 0 6px ${meta.color}60` : "none",
          }}
        />
      </div>
    </div>
  );
};

/* ── Component ───────────────────────────────────────────────────────────── */

interface TechnicalStrengthData {
  short_trend?: number;
  inter_trend?: number;
  long_trend?: number;
  macd_trend?: number;
}

interface TechnicalStrengthBarsProps {
  data: TechnicalStrengthData | null;
  loading?: boolean;
}

const BARS: { name: string; key: keyof TechnicalStrengthData }[] = [
  { name: "Short Term", key: "short_trend" },
  { name: "Medium Term", key: "inter_trend" },
  { name: "Long Term", key: "long_trend" },
  { name: "MACD", key: "macd_trend" },
];

const TechnicalStrengthBars: React.FC<TechnicalStrengthBarsProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <>
        {BARS.map((b) => (
          <div key={b.key} style={{ marginBottom: "0.75rem" }}>
            <Skeleton height="0.75rem" width="60%" className="mb-1" />
            <Skeleton height="0.45rem" borderRadius="4px" />
          </div>
        ))}
      </>
    );
  }

  if (!data) {
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No data available
      </p>
    );
  }

  const hasAny = BARS.some((b) => data[b.key] != null);
  if (!hasAny) {
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No trend data available
      </p>
    );
  }

  return (
    <div>
      {BARS.map((b) => (
        <StrengthBar key={b.key} name={b.name} value={data[b.key]} />
      ))}
    </div>
  );
};

export default TechnicalStrengthBars;
