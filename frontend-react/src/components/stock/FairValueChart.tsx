import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";

interface FairValueData {
  symbol: string;
  fair_value: number;
  last_price: number;
}

interface Props {
  symbol: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctDiff(price: number, fair: number): number {
  return ((price - fair) / fair) * 100;
}

function valuationLabel(diff: number): { text: string; color: string; bg: string } {
  if (diff <= -20) return { text: "Significantly Undervalued", color: "#fff", bg: "#2e7d32" };
  if (diff < 0)   return { text: "Undervalued",               color: "#fff", bg: "#43a047" };
  if (diff === 0) return { text: "Fairly Valued",              color: "#000", bg: "#fdd835" };
  if (diff < 20)  return { text: "Overvalued",                 color: "#fff", bg: "#ef6c00" };
  return               { text: "Significantly Overvalued",  color: "#fff", bg: "#c62828" };
}

const FairValueChart: React.FC<Props> = ({ symbol }) => {
  const [data, setData]       = useState<FairValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setNoData(false);
    setData(null);
    api
      .get(`/symbol/fairvalue/${symbol}`)
      .then(({ data: d }) => {
        if (d?.symbol && d.fair_value != null && d.last_price != null) {
          setData(d);
        } else {
          setNoData(true);
        }
      })
      .catch(() => setNoData(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  const chartOptions = useMemo((): Highcharts.Options => {
    if (!data) return {};

    const { fair_value: fv, last_price: lp } = data;
    const underVal = fv * 0.8;
    const overVal  = fv * 1.2;
    const axisMax  = Math.max(fv, lp) * 1.6;

    const plotBands: Highcharts.YAxisPlotBandsOptions[] = [
      {
        color: "rgba(76, 175, 80, 0.18)",
        from: 0,
        to: underVal,
        zIndex: 2,
        label: {
          text: "Undervalued",
          style: { color: "var(--sv-positive, #4caf50)", fontSize: "11px", fontWeight: "600" },
          align: "left",
          x: 8,
          y: 18,
        },
      },
      {
        color: "rgba(255, 235, 59, 0.12)",
        from: underVal,
        to: overVal,
        zIndex: 2,
        label: {
          text: "Fair Zone",
          style: { color: "#fdd835", fontSize: "11px", fontWeight: "600" },
          align: "center",
          y: 18,
        },
      },
      {
        color: "rgba(239, 83, 80, 0.15)",
        from: overVal,
        to: axisMax,
        zIndex: 2,
        label: {
          text: "Overvalued",
          style: { color: "var(--sv-negative, #ef5350)", fontSize: "11px", fontWeight: "600" },
          align: "right",
          x: -8,
          y: 18,
        },
      },
    ];

    // Vertical plot line for fair value
    const plotLines: Highcharts.YAxisPlotLinesOptions[] = [
      {
        value: fv,
        color: "#fdd835",
        width: 2,
        dashStyle: "Dash",
        zIndex: 5,
      },
    ];

    return {
      chart: {
        type: "bar",
        height: 200,
        backgroundColor: "transparent",
        style: { fontFamily: "Inter, sans-serif" },
        animation: { duration: 400 },
        marginBottom: 10,
        marginTop: 10,
        marginRight: 90,
      },
      title:    { text: undefined },
      subtitle: { text: undefined },
      credits:  { enabled: false },
      legend:   { enabled: false },
      tooltip:  { enabled: false },
      xAxis: {
        categories: ["Fair Value", "Current Price"],
        lineColor: "transparent",
        tickLength: 0,
        labels: {
          style: { color: "var(--text-color-secondary)", fontSize: "12px", fontWeight: "500" },
        },
      },
      yAxis: {
        min: 0,
        max: axisMax,
        plotBands,
        plotLines,
        gridLineWidth: 0,
        title: { text: null },
        labels: { enabled: false },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            inside: false,
            align: "left",
            formatter(this: Highcharts.PointLabelObject) {
              return `<span style="font-size:13px;font-weight:700;color:var(--text-color)">$${(this.y as number).toFixed(2)}</span>`;
            },
            useHTML: true,
          },
        },
      },
      series: [
        {
          type: "bar",
          name: "Price",
          data: [
            { y: fv, color: "#43a047", pointWidth: 28 },
            { y: lp, color: lp >= fv ? "#ef5350" : "#42a5f5", pointWidth: 28 },
          ],
        },
      ],
    };
  }, [data]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <Skeleton height="200px" />;

  if (noData || !data) {
    return (
      <div className="flex align-items-center justify-content-center" style={{ height: 120, color: "var(--sv-text-muted)", fontSize: "0.83rem" }}>
        <i className="pi pi-info-circle mr-2" />
        No fair value estimate available for {symbol}
      </div>
    );
  }

  const diff   = pctDiff(data.last_price, data.fair_value);
  const badge  = valuationLabel(diff);
  const isOver = diff > 0;

  return (
    <div>
      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <div className="flex align-items-stretch gap-3 mb-3 flex-wrap">

        {/* Fair Value */}
        <div className="flex-1" style={{ minWidth: 120 }}>
          <div style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Avg Fair Value
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fdd835" }}>
            ${data.fair_value.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)" }}>
            Benjamin Dodd · Peter Lynch · DSM
          </div>
        </div>

        {/* Current Price */}
        <div className="flex-1" style={{ minWidth: 120 }}>
          <div style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Current Price
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-color)" }}>
            ${data.last_price.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: isOver ? "var(--sv-negative, #ef5350)" : "var(--sv-positive, #4caf50)" }}>
            {isOver ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}% {isOver ? "above" : "below"} fair value
          </div>
        </div>

        {/* Valuation Badge */}
        <div className="flex align-items-center">
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              background: badge.bg,
              color: badge.color,
              fontWeight: 700,
              fontSize: "0.82rem",
              textAlign: "center",
              lineHeight: 1.3,
              letterSpacing: "0.02em",
            }}
          >
            {badge.text}
          </div>
        </div>

      </div>

      {/* ── Bar Chart ─────────────────────────────────────────────── */}
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />

      {/* ── Footnote ──────────────────────────────────────────────── */}
      <div style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", marginTop: 4 }}>
        Fair zone = ±20% of estimated fair value. Estimate is an average of multiple valuation models.
      </div>
    </div>
  );
};

export default FairValueChart;
