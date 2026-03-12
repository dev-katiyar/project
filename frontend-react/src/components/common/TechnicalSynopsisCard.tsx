import React, { useEffect, useState } from "react";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface SymbolProfile {
  symbol: string;
  alternate_name: string;
  price?: number;
  change?: number;
  change_pct?: number;
  country?: string;
  exchange?: string;
  sector?: string;
}

interface SynopsisData {
  current_situation?: string;
  synopsis?: string;
  sign?: number;
}

interface TechnicalSynopsisCardProps {
  symbol: string | null;
  profile: SymbolProfile | null;
  loading?: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const fmtPrice = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n)
    ? "—"
    : n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

const fmtPct = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

/** Replace inline colour styles from backend HTML with semantic classes */
const sanitizeSynopsisHtml = (html: string): string =>
  html
    .replace(/style='color:green'/g, "class='sv-synopsis-up'")
    .replace(/style='color:red'/g, "class='sv-synopsis-down'");

/* ── Component ────────────────────────────────────────────────────────────── */

const TechnicalSynopsisCard: React.FC<TechnicalSynopsisCardProps> = ({
  symbol,
  profile,
  loading = false,
}) => {
  const [synopsis, setSynopsis] = useState<SynopsisData | null>(null);
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setSynopsis(null);
      return;
    }
    let cancelled = false;
    setLoadingSynopsis(true);
    api
      .get<SynopsisData[]>(`/symbol/synopsis/${symbol}`)
      .then(({ data }) => {
        if (!cancelled) setSynopsis(data?.[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setSynopsis(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSynopsis(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <Skeleton height="0.85rem" width="35%" className="mb-1" />
        <Skeleton height="1.2rem" width="65%" className="mb-2" />
        <Skeleton height="1.8rem" width="50%" className="mb-3" />
        <Skeleton height="0.85rem" className="mb-1" />
        <Skeleton height="0.85rem" width="80%" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No profile data
      </p>
    );
  }

  const chg = profile.change_pct ?? profile.change;
  const isGain = chg != null && chg >= 0;

  const currentSituationHtml = synopsis?.current_situation
    ? sanitizeSynopsisHtml(synopsis.current_situation)
    : null;

  const synopsisHtml = synopsis?.synopsis
    ? sanitizeSynopsisHtml(synopsis.synopsis)
    : null;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* ── Synopsis ── */}
      {loadingSynopsis ? (
        <div style={{ marginTop: "0.25rem" }}>
          <Skeleton height="0.75rem" className="mb-1" />
          <Skeleton height="0.75rem" width="90%" className="mb-1" />
          <Skeleton height="0.75rem" width="75%" />
        </div>
      ) : (
        <>
          {currentSituationHtml && (
            <div
              className="sv-synopsis-text"
              style={{
                fontSize: "0.72rem",
                color: "var(--sv-text-secondary)",
                lineHeight: 1.55,
                textAlign: "justify",
              }}
              dangerouslySetInnerHTML={{ __html: currentSituationHtml }}
            />
          )}
          {synopsisHtml && (
            <div
              className="sv-synopsis-text"
              style={{
                fontSize: "0.72rem",
                color: "var(--sv-text-secondary)",
                lineHeight: 1.55,
                textAlign: "justify",
              }}
              dangerouslySetInnerHTML={{ __html: synopsisHtml }}
            />
          )}
          {!currentSituationHtml && !synopsisHtml && symbol && (
            <p
              className="sv-text-muted"
              style={{ fontSize: "0.72rem", margin: 0 }}
            >
              No synopsis available
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default TechnicalSynopsisCard;
