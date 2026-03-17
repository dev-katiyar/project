import React, { useEffect, useState } from "react";
import { Skeleton } from "primereact/skeleton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import api from "@/services/api";
import TechnicalRatingGaugeChart from "@/components/common/TechnicalRatingGaugeChart";

// ── Types ────────────────────────────────────────────────────────────────────

interface TechnicalRow {
  name: string;
  value: string | number;
  trend: string;
  action: string;
}

interface PivotRow {
  name: string;
  s3: number;
  s2: number;
  s1: number;
  p: number;
  r1: number;
  r2: number;
  r3: number;
}

interface Score {
  rating_text: string;
  rating_value?: number;
}

interface TechnicalsData {
  movingAverage: TechnicalRow[];
  pivotPoints: PivotRow[];
  technicals: TechnicalRow[];
  score: Score;
}

interface StockTechnicalsTabProps {
  symbol: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countActions(rows: TechnicalRow[], action: string): number {
  return rows.filter((r) => r.action === action).length;
}

function fmtVal(v: string | number): string {
  const n = parseFloat(String(v));
  return isNaN(n) ? String(v || "—") : n.toFixed(2);
}

function ratingTextToValue(text: string): number {
  const t = (text ?? "").toLowerCase();
  if (t.includes("strong buy")) return 9;
  if (t.includes("buy")) return 7;
  if (t.includes("strong sell")) return 1;
  if (t.includes("sell")) return 3;
  return 5;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const SectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="sv-data-card p-3" style={{ height: "100%" }}>
    <div
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "var(--sv-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "0.75rem",
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const SignalPill: React.FC<{
  label: string;
  count: number;
  color: string;
  bg: string;
}> = ({ label, count, color, bg }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0.5rem 1rem",
      borderRadius: 10,
      background: bg,
      minWidth: 62,
      border: `1px solid ${color}33`,
    }}
  >
    <span
      style={{ fontSize: "1.5rem", fontWeight: 800, color, lineHeight: 1.1 }}
    >
      {count}
    </span>
    <span
      style={{
        fontSize: "0.65rem",
        color: "var(--sv-text-secondary)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: 2,
      }}
    >
      {label}
    </span>
  </div>
);

const SignalBar: React.FC<{
  buys: number;
  sells: number;
  holds: number;
}> = ({ buys, sells, holds }) => {
  const total = buys + sells + holds || 1;
  const bars = [
    { label: "Buy", count: buys, color: "var(--sv-gain)" },
    { label: "Hold", count: holds, color: "var(--sv-text-muted)" },
    { label: "Sell", count: sells, color: "var(--sv-loss)" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      {bars.map(({ label, count, color }) => (
        <div
          key={label}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color,
              width: 28,
              flexShrink: 0,
            }}
          >
            {label}
          </span>
          <div
            style={{
              flex: 1,
              height: 7,
              borderRadius: 4,
              background: "var(--sv-border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(count / total) * 100}%`,
                background: color,
                borderRadius: 4,
                transition: "width 0.5s ease",
                boxShadow: count > 0 ? `0 0 6px ${color}55` : "none",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              color,
              minWidth: 18,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Column body templates ────────────────────────────────────────────────────

function actionBody(row: TechnicalRow) {
  const sev =
    row.action === "Buy"
      ? "success"
      : row.action === "Sell"
        ? "danger"
        : "secondary";
  return (
    <Tag
      value={row.action}
      severity={sev}
      style={{ fontSize: "0.68rem", minWidth: 42, textAlign: "center" }}
    />
  );
}

function trendBody(row: TechnicalRow) {
  const bullish = ["Bullish", "VeryBullish", "Oversold"].includes(row.trend);
  const bearish = ["Bearish", "VeryBearish", "Overbought"].includes(row.trend);
  const color = bullish
    ? "var(--sv-gain)"
    : bearish
      ? "var(--sv-loss)"
      : "var(--sv-text-muted)";
  return (
    <span style={{ color, fontSize: "0.75rem", fontWeight: 600 }}>
      {row.trend || "—"}
    </span>
  );
}

function valueBody(row: TechnicalRow) {
  return <span style={{ fontSize: "0.78rem" }}>{fmtVal(row.value)}</span>;
}

function pivotBody(field: keyof PivotRow, color?: string) {
  return (row: PivotRow) => {
    const val = row[field] as number;
    return (
      <span
        style={{
          fontSize: "0.75rem",
          color: color ?? "inherit",
        }}
      >
        {val ? val.toFixed(2) : "—"}
      </span>
    );
  };
}

// ── Skeleton layout ──────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div className="grid">
    {[1, 2, 3].map((i) => (
      <div key={i} className="col-12 md:col-4">
        <Skeleton height="210px" borderRadius="12px" />
      </div>
    ))}
    <div className="col-12 md:col-6 mt-2">
      <Skeleton height="340px" borderRadius="12px" />
    </div>
    <div className="col-12 md:col-6 mt-2">
      <Skeleton height="340px" borderRadius="12px" />
    </div>
    <div className="col-12 mt-2">
      <Skeleton height="200px" borderRadius="12px" />
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────

const StockTechnicalsTab: React.FC<StockTechnicalsTabProps> = ({ symbol }) => {
  const [data, setData] = useState<TechnicalsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    api
      .get<TechnicalsData>(`/investing/technicals/${symbol}`)
      .then(({ data: res }) => {
        if (cancelled) return;
        res.technicals = res.technicals.map((t) => ({
          ...t,
          value: typeof t.value === "number" ? t.value.toFixed(2) : t.value,
        }));
        setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) return <LoadingSkeleton />;

  if (!data) {
    return (
      <p className="sv-text-muted text-center p-5">
        No technical data available for {symbol}.
      </p>
    );
  }

  // ── Derived counts ─────────────────────────────────────────────────────────
  const techBuys = countActions(data.technicals, "Buy");
  const techSells = countActions(data.technicals, "Sell");
  const techHolds = countActions(data.technicals, "Hold");
  const maBuys = countActions(data.movingAverage, "Buy");
  const maSells = countActions(data.movingAverage, "Sell");
  const maHolds = countActions(data.movingAverage, "Hold");
  const totalBuys = techBuys + maBuys;
  const totalSells = techSells + maSells;
  const totalHolds = techHolds + maHolds;

  const ratingValue =
    data.score?.rating_value ?? ratingTextToValue(data.score?.rating_text);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid">
      {/* ── Row 1: Summary cards ──────────────────────────────────────────── */}

      {/* Overall rating gauge */}
      <div className="col-12 md:col-4">
        <SectionCard title="Overall Technical Rating">
          <TechnicalRatingGaugeChart
            value={ratingValue}
            rating={data.score?.rating_text}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.6rem",
              marginTop: "0.85rem",
            }}
          >
            <SignalPill
              label="Buy"
              count={totalBuys}
              color="var(--sv-gain)"
              bg="var(--sv-success-bg)"
            />
            <SignalPill
              label="Hold"
              count={totalHolds}
              color="var(--sv-text-secondary)"
              bg="var(--sv-bg-surface)"
            />
            <SignalPill
              label="Sell"
              count={totalSells}
              color="var(--sv-loss)"
              bg="var(--sv-danger-bg)"
            />
          </div>
        </SectionCard>
      </div>

      {/* Oscillators summary */}
      <div className="col-12 md:col-4">
        <SectionCard title="Oscillators">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.6rem",
              marginBottom: "1rem",
            }}
          >
            <SignalPill
              label="Buy"
              count={techBuys}
              color="var(--sv-gain)"
              bg="var(--sv-success-bg)"
            />
            <SignalPill
              label="Hold"
              count={techHolds}
              color="var(--sv-text-secondary)"
              bg="var(--sv-bg-surface)"
            />
            <SignalPill
              label="Sell"
              count={techSells}
              color="var(--sv-loss)"
              bg="var(--sv-danger-bg)"
            />
          </div>
          <SignalBar buys={techBuys} sells={techSells} holds={techHolds} />
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--sv-text-muted)",
              marginTop: "0.85rem",
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            Momentum oscillators (RSI, MACD, Stochastic, etc.) measure
            short-term price momentum and overbought/oversold conditions.
          </p>
        </SectionCard>
      </div>

      {/* Moving Averages summary */}
      <div className="col-12 md:col-4">
        <SectionCard title="Moving Averages">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.6rem",
              marginBottom: "1rem",
            }}
          >
            <SignalPill
              label="Buy"
              count={maBuys}
              color="var(--sv-gain)"
              bg="var(--sv-success-bg)"
            />
            <SignalPill
              label="Hold"
              count={maHolds}
              color="var(--sv-text-secondary)"
              bg="var(--sv-bg-surface)"
            />
            <SignalPill
              label="Sell"
              count={maSells}
              color="var(--sv-loss)"
              bg="var(--sv-danger-bg)"
            />
          </div>
          <SignalBar buys={maBuys} sells={maSells} holds={maHolds} />
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--sv-text-muted)",
              marginTop: "0.85rem",
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            Moving averages (SMA, EMA, WMA) smooth price data to identify trend
            direction across different time horizons.
          </p>
        </SectionCard>
      </div>

      {/* ── Row 2: Detail tables ───────────────────────────────────────────── */}

      {/* Technical Indicators table */}
      <div className="col-12 md:col-6">
        <SectionCard
          title={`Technical Indicators — ${techBuys}B · ${techSells}S · ${techHolds}H`}
        >
          <DataTable
            value={data.technicals}
            size="small"
            scrollable
            scrollHeight="300px"
            emptyMessage="No data"
            pt={{
              root: { style: { fontSize: "0.78rem" } },
              header: {
                style: {
                  background: "var(--sv-bg-surface)",
                  padding: "0.4rem 0.6rem",
                },
              },
            }}
          >
            <Column field="name" header="Indicator" style={{ minWidth: 120 }} />
            <Column
              field="value"
              header="Value"
              body={valueBody}
              style={{ textAlign: "right", minWidth: 80 }}
            />
            <Column
              field="trend"
              header="Trend"
              body={trendBody}
              style={{ textAlign: "center", minWidth: 90 }}
            />
            <Column
              field="action"
              header="Signal"
              body={actionBody}
              style={{ textAlign: "center", minWidth: 70 }}
            />
          </DataTable>
        </SectionCard>
      </div>

      {/* Moving Average detail table */}
      <div className="col-12 md:col-6">
        <SectionCard
          title={`Moving Average Detail — ${maBuys}B · ${maSells}S · ${maHolds}H`}
        >
          <DataTable
            value={data.movingAverage}
            size="small"
            scrollable
            scrollHeight="300px"
            emptyMessage="No data"
            pt={{
              root: { style: { fontSize: "0.78rem" } },
              header: {
                style: {
                  background: "var(--sv-bg-surface)",
                  padding: "0.4rem 0.6rem",
                },
              },
            }}
          >
            <Column field="name" header="MA" style={{ minWidth: 100 }} />
            <Column
              field="value"
              header="Value"
              body={valueBody}
              style={{ textAlign: "right", minWidth: 80 }}
            />
            <Column
              field="trend"
              header="Trend"
              body={trendBody}
              style={{ textAlign: "center", minWidth: 90 }}
            />
            <Column
              field="action"
              header="Signal"
              body={actionBody}
              style={{ textAlign: "center", minWidth: 70 }}
            />
          </DataTable>
        </SectionCard>
      </div>

      {/* ── Row 3: Pivot Points ────────────────────────────────────────────── */}

      <div className="col-12">
        <SectionCard title="Pivot Points — Support & Resistance Levels">
          <div style={{ overflowX: "auto" }}>
            <DataTable
              value={data.pivotPoints}
              size="small"
              emptyMessage="No data"
              pt={{
                root: { style: { fontSize: "0.78rem", minWidth: 640 } },
                header: {
                  style: {
                    background: "var(--sv-bg-surface)",
                    padding: "0.4rem 0.6rem",
                  },
                },
              }}
            >
              <Column
                field="name"
                header={<span style={{ display: "block", textAlign: "center" }}>Method</span>}
                style={{ minWidth: 120, fontWeight: 600 }}
              />
              <Column
                field="s3"
                header="S3"
                body={pivotBody("s3", "var(--sv-loss)")}
                headerStyle={{ color: "var(--sv-loss)", textAlign: "right" }}
                style={{ textAlign: "right" }}
              />
              <Column
                field="s2"
                header="S2"
                body={pivotBody("s2", "var(--sv-loss)")}
                headerStyle={{ color: "var(--sv-loss)", textAlign: "right" }}
                style={{ textAlign: "right" }}
              />
              <Column
                field="s1"
                header="S1"
                body={pivotBody("s1", "var(--sv-loss)")}
                headerStyle={{ color: "var(--sv-loss)", textAlign: "right" }}
                style={{ textAlign: "right" }}
              />
              <Column
                field="p"
                header="Pivot"
                body={pivotBody("p")}
                headerStyle={{ textAlign: "center", fontWeight: 800 }}
                style={{ textAlign: "center", fontWeight: 700 }}
              />
              <Column
                field="r1"
                header="R1"
                body={pivotBody("r1", "var(--sv-gain)")}
                headerStyle={{ color: "var(--sv-gain)", textAlign: "right" }}
                style={{ textAlign: "right" }}
              />
              <Column
                field="r2"
                header="R2"
                body={pivotBody("r2", "var(--sv-gain)")}
                headerStyle={{ color: "var(--sv-gain)", textAlign: "right" }}
                style={{ textAlign: "right" }}
              />
              <Column
                field="r3"
                header="R3"
                body={pivotBody("r3", "var(--sv-gain)")}
                headerStyle={{ color: "var(--sv-gain)", textAlign: "right" }}
                style={{ textAlign: "right" }}
              />
            </DataTable>
          </div>
          <p
            style={{
              fontSize: "0.67rem",
              color: "var(--sv-text-muted)",
              marginTop: "0.6rem",
              marginBottom: 0,
            }}
          >
            S = Support levels (price may bounce up) &nbsp;·&nbsp; R =
            Resistance levels (price may face selling pressure) &nbsp;·&nbsp;
            Pivot = key reference price
          </p>
        </SectionCard>
      </div>
    </div>
  );
};

export default StockTechnicalsTab;
