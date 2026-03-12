import React from "react";
import { Skeleton } from "primereact/skeleton";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface RsiCardData {
  rsi?: number;
  rsi_14?: number;
  macd?: number;
  stoch_k?: number;
  cci?: number;
}

interface RsiCardProps {
  data: RsiCardData | null;
  loading: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const rsiMeta = (v: number): { label: string; color: string } => {
  if (v >= 70) return { label: "Overbought", color: "#ef4444" };
  if (v >= 60) return { label: "Bullish", color: "#f5a623" };
  if (v >= 40) return { label: "Neutral", color: "#94a3b8" };
  if (v >= 30) return { label: "Bearish", color: "#f97316" };
  return { label: "Oversold", color: "#22c55e" };
};

/* ── Component ────────────────────────────────────────────────────────────── */

const RsiCard: React.FC<RsiCardProps> = ({ data, loading }) => {
  if (loading)
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="1.5rem" className="mb-2" />
        ))}
      </>
    );

  if (!data)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No data available
      </p>
    );

  const rsi = data.rsi ?? data.rsi_14;

  if (rsi == null)
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No RSI data
      </p>
    );

  const { label, color } = rsiMeta(rsi);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.625rem",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{ fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1 }}
        >
          {rsi.toFixed(1)}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "0.2rem 0.6rem",
            borderRadius: 6,
            color,
            background: `${color}20`,
          }}
        >
          {label}
        </span>
      </div>

      {/* Gradient bar */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background:
              "linear-gradient(to right, #22c55e 0%, #f97316 30%, #94a3b8 50%, #f97316 70%, #ef4444 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `calc(${rsi}% - 7px)`,
              top: -3,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: color,
              border: "2px solid var(--sv-bg-card)",
              boxShadow: `0 0 8px ${color}80`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.7rem",
          }}
        >
          <span style={{ fontSize: "0.6rem", color: "#22c55e" }}>
            0 Oversold
          </span>
          <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>50</span>
          <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>
            100 Overbought
          </span>
        </div>
      </div>

      {/* Extra oscillators */}
      {[
        { label: "MACD", value: data.macd, isChange: true },
        { label: "Stochastic K", value: data.stoch_k, isChange: false },
        { label: "CCI", value: data.cci, isChange: true },
      ]
        .filter((r) => r.value != null)
        .map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.3rem",
            }}
          >
            <span
              style={{ fontSize: "0.72rem", color: "var(--sv-text-secondary)" }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: row.isChange
                  ? (row.value as number) >= 0
                    ? "var(--sv-gain)"
                    : "var(--sv-loss)"
                  : "var(--sv-text-primary)",
              }}
            >
              {(row.value as number).toFixed(2)}
            </span>
          </div>
        ))}
    </div>
  );
};

export default RsiCard;
