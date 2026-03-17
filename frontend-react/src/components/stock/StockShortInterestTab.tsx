import React, { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShortRecord {
  rep_date: string;
  short_os_ratio: number;
  [key: string]: string | number;
}

interface PriceRecord {
  date: string;
  adjusted_close: number;
  [key: string]: string | number;
}

interface StockShortInterestTabProps {
  symbol: string;
}

type Period = "1year" | "2year" | "3year";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStartDate(period: Period): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - (period === "1year" ? 1 : period === "2year" ? 2 : 3));
  return d.toISOString().split("T")[0];
}

function getSentiment(ratio: number): { label: string; color: string; icon: string; blurb: string } {
  if (ratio >= 20)
    return {
      label: "Very High",
      color: "#ef5350",
      icon: "pi-arrow-circle-up",
      blurb: "A large portion of shares are bet against. This signals strong bearish conviction but also potential for a sharp short squeeze if news turns positive.",
    };
  if (ratio >= 10)
    return {
      label: "High",
      color: "#ff7043",
      icon: "pi-angle-double-up",
      blurb: "Significant short interest. Bears are watching this closely. Consider it a caution flag — but also a source of upside fuel if sentiment shifts.",
    };
  if (ratio >= 5)
    return {
      label: "Moderate",
      color: "#ffa726",
      icon: "pi-minus",
      blurb: "Normal range for most stocks. Some skepticism exists, but not enough to signal an imminent squeeze or extreme bearish consensus.",
    };
  return {
    label: "Low",
    color: "var(--sv-positive, #4caf50)",
    icon: "pi-angle-double-down",
    blurb: "Few traders are betting against this stock. Low short interest generally reflects broader confidence in the company's near-term outlook.",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ToggleBtn: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 12px",
      fontSize: "0.75rem",
      fontWeight: active ? 700 : 500,
      border: active ? "1.5px solid var(--sv-accent)" : "1.5px solid var(--sv-border)",
      borderRadius: 6,
      background: active ? "var(--sv-accent)" : "transparent",
      color: active ? "#000" : "var(--text-color)",
      cursor: "pointer",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon?: string;
}> = ({ label, value, sub, subColor, icon }) => (
  <div className="sv-data-card p-3 flex flex-column gap-1" style={{ minWidth: 140, flex: 1 }}>
    <div
      style={{
        fontSize: "0.68rem",
        color: "var(--sv-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {icon && <i className={`pi ${icon}`} style={{ fontSize: 11 }} />}
      {label}
    </div>
    <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-color)", lineHeight: 1.2 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: "0.75rem", color: subColor ?? "var(--sv-text-muted)", fontWeight: 500 }}>
        {sub}
      </div>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const StockShortInterestTab: React.FC<StockShortInterestTabProps> = ({ symbol }) => {
  const [shortData, setShortData] = useState<ShortRecord[]>([]);
  const [priceData, setPriceData] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("1year");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    setShortData([]);
    setPriceData([]);

    Promise.all([
      api.get(`/symbol/short-interest/${symbol}`),
      api.get(`/symbol/price/${symbol}/${period}`),
    ])
      .then(([shortRes, priceRes]) => {
        const sd = shortRes.data;
        if (sd?.error || !Array.isArray(sd)) {
          setError(`No short interest data available for ${symbol}.`);
          return;
        }
        setShortData(sd as ShortRecord[]);
        setPriceData(Array.isArray(priceRes.data) ? (priceRes.data as PriceRecord[]) : []);
      })
      .catch(() => setError(`Failed to load short interest data for ${symbol}.`))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const startDate = getStartDate(period);

  const filteredShort = useMemo(
    () =>
      shortData
        .filter((d) => d.rep_date >= startDate)
        .sort((a, b) => a.rep_date.localeCompare(b.rep_date)),
    [shortData, startDate],
  );

  const filteredPrice = useMemo(
    () =>
      priceData
        .filter((d) => d.date >= startDate)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [priceData, startDate],
  );

  const latest = filteredShort.length ? filteredShort[filteredShort.length - 1] : null;
  const prev = filteredShort.length > 1 ? filteredShort[filteredShort.length - 2] : null;
  const latestRatio = latest ? parseFloat(String(latest.short_os_ratio)) : null;
  const prevRatio = prev ? parseFloat(String(prev.short_os_ratio)) : null;
  const ratioChange =
    latestRatio !== null && prevRatio !== null && prevRatio !== 0
      ? ((latestRatio - prevRatio) / Math.abs(prevRatio)) * 100
      : null;

  const peakRatio = filteredShort.length
    ? Math.max(...filteredShort.map((d) => parseFloat(String(d.short_os_ratio))))
    : null;
  const avgRatio =
    filteredShort.length
      ? filteredShort.reduce((s, d) => s + parseFloat(String(d.short_os_ratio)), 0) /
        filteredShort.length
      : null;

  const sentiment = latestRatio !== null ? getSentiment(latestRatio) : null;

  // ── Chart options ──────────────────────────────────────────────────────────

  const chartOptions = useMemo((): Highcharts.Options => {
    const shortSeries = filteredShort.map((d) => [
      new Date(d.rep_date).getTime(),
      parseFloat(String(d.short_os_ratio)),
    ]);

    const priceSeries = filteredPrice.map((d) => [
      new Date(d.date).getTime(),
      parseFloat(String(d.adjusted_close)),
    ]);

    return {
      chart: {
        backgroundColor: "transparent",
        height: 360,
        style: { fontFamily: "Inter, sans-serif" },
        animation: { duration: 300 },
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "bottom",
        itemStyle: { color: "var(--text-color)", fontSize: "11px", fontWeight: "500" },
        itemHoverStyle: { color: "var(--sv-accent)" },
      },
      tooltip: {
        shared: true,
        backgroundColor: "var(--surface-overlay)",
        borderColor: "var(--sv-border)",
        style: { color: "var(--text-color)", fontSize: "12px" },
        xDateFormat: "%b %d, %Y",
      },
      xAxis: {
        type: "datetime",
        lineColor: "var(--sv-border)",
        tickColor: "var(--sv-border)",
        labels: { style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
      },
      yAxis: [
        {
          title: { text: "Short Interest (%)", style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
          labels: {
            format: "{value:.1f}%",
            style: { color: "var(--sv-text-muted)", fontSize: "11px" },
          },
          gridLineColor: "var(--sv-border-light)",
          opposite: false,
        },
        {
          title: { text: "Price ($)", style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
          labels: {
            format: "${value}",
            style: { color: "var(--sv-text-muted)", fontSize: "11px" },
          },
          gridLineWidth: 0,
          opposite: true,
        },
      ],
      plotOptions: {
        line: {
          marker: { enabled: false, symbol: "circle", radius: 3 },
          lineWidth: 2,
        },
      },
      series: [
        {
          type: "line",
          name: "Short Interest Ratio",
          data: shortSeries,
          yAxis: 0,
          color: "#ef5350",
          tooltip: { valueSuffix: "%" },
          zIndex: 2,
        },
        {
          type: "line",
          name: "Price ($)",
          data: priceSeries,
          yAxis: 1,
          color: "var(--sv-accent)",
          dashStyle: "ShortDash",
          lineWidth: 1.5,
          opacity: 0.7,
          tooltip: { valuePrefix: "$", valueDecimals: 2 },
          zIndex: 1,
        },
      ],
    };
  }, [filteredShort, filteredPrice]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-column gap-3">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <div className="font-bold" style={{ fontSize: "1.05rem", color: "var(--text-color)" }}>
            Short Interest
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--sv-text-muted)", marginTop: 2 }}>
            Shares sold short as a percentage of total shares outstanding
          </div>
        </div>
        <div className="flex align-items-center gap-1">
          <span style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)", marginRight: 4 }}>
            Period
          </span>
          {(["1year", "2year", "3year"] as Period[]).map((p) => (
            <ToggleBtn
              key={p}
              active={period === p}
              label={p === "1year" ? "1Y" : p === "2year" ? "2Y" : "3Y"}
              onClick={() => setPeriod(p)}
            />
          ))}
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="80px" className="flex-1 border-round-xl" />
          ))}
        </div>
      ) : !error && latestRatio !== null ? (
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="Current Short Interest"
            value={`${latestRatio.toFixed(2)}%`}
            sub={latest?.rep_date ? `As of ${latest.rep_date}` : undefined}
            icon="pi-percentage"
          />
          <StatCard
            label="Change (vs prev)"
            value={ratioChange !== null ? `${ratioChange >= 0 ? "+" : ""}${ratioChange.toFixed(1)}%` : "—"}
            subColor={
              ratioChange !== null
                ? ratioChange > 0
                  ? "#ef5350"
                  : "var(--sv-positive, #4caf50)"
                : undefined
            }
            sub={
              ratioChange !== null
                ? ratioChange > 0
                  ? "Short interest rising"
                  : "Short interest falling"
                : undefined
            }
            icon={ratioChange !== null && ratioChange > 0 ? "pi-arrow-up" : "pi-arrow-down"}
          />
          <StatCard
            label={`Period Average (${period === "1year" ? "1Y" : period === "2year" ? "2Y" : "3Y"})`}
            value={avgRatio !== null ? `${avgRatio.toFixed(2)}%` : "—"}
            sub="Mean short interest ratio"
            icon="pi-chart-line"
          />
          <StatCard
            label={`Period Peak (${period === "1year" ? "1Y" : period === "2year" ? "2Y" : "3Y"})`}
            value={peakRatio !== null ? `${peakRatio.toFixed(2)}%` : "—"}
            sub="Highest recorded level"
            icon="pi-arrow-up-right"
          />
        </div>
      ) : null}

      {/* ── Sentiment banner ───────────────────────────────────────────────── */}
      {!loading && !error && sentiment && (
        <div
          className="sv-data-card p-3 flex align-items-start gap-3"
          style={{ borderLeft: `4px solid ${sentiment.color}` }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: `${sentiment.color}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className={`pi ${sentiment.icon}`} style={{ fontSize: 18, color: sentiment.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex align-items-center gap-2 mb-1">
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--sv-text-muted)",
                }}
              >
                Short Interest Level
              </span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: sentiment.color,
                  background: `${sentiment.color}18`,
                  padding: "1px 8px",
                  borderRadius: 20,
                }}
              >
                {sentiment.label}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-color-secondary)", lineHeight: 1.55 }}>
              {sentiment.blurb}
            </div>
          </div>
        </div>
      )}

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <div className="sv-data-card p-3">
        {loading ? (
          <Skeleton height="360px" className="border-round-xl" />
        ) : error ? (
          <div
            className="flex align-items-center justify-content-center"
            style={{ height: 300 }}
          >
            <div className="text-center">
              <i
                className="pi pi-exclamation-circle"
                style={{ fontSize: 32, color: "var(--sv-text-muted)", marginBottom: 12 }}
              />
              <div style={{ color: "var(--sv-text-muted)", fontSize: "0.88rem" }}>{error}</div>
            </div>
          </div>
        ) : filteredShort.length === 0 ? (
          <div
            className="flex align-items-center justify-content-center"
            style={{ height: 300 }}
          >
            <div className="text-center">
              <i
                className="pi pi-info-circle"
                style={{ fontSize: 32, color: "var(--sv-text-muted)", marginBottom: 12 }}
              />
              <div style={{ color: "var(--sv-text-muted)", fontSize: "0.88rem" }}>
                No short interest data for {symbol} in this period.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--sv-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>Short Interest Ratio vs Price</span>
              <span className="flex align-items-center gap-2">
                <span className="flex align-items-center gap-1">
                  <span
                    style={{ width: 12, height: 2, background: "#ef5350", display: "inline-block", borderRadius: 2 }}
                  />
                  <span>Short Interest</span>
                </span>
                <span className="flex align-items-center gap-1">
                  <span
                    style={{
                      width: 12,
                      height: 2,
                      background: "var(--sv-accent)",
                      display: "inline-block",
                      borderRadius: 2,
                      opacity: 0.7,
                    }}
                  />
                  <span>Price</span>
                </span>
              </span>
            </div>
            <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={chartRef} />
          </>
        )}
      </div>

      {/* ── Education cards ────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="grid" style={{ margin: 0 }}>
          {[
            {
              icon: "pi-question-circle",
              title: "What is Short Interest?",
              body: 'Short interest is the total number of shares currently sold short divided by total shares outstanding -- expressed as a percentage. Traders who "short" a stock borrow shares and sell them, hoping to buy them back cheaper later.',
            },
            {
              icon: "pi-bolt",
              title: "What is a Short Squeeze?",
              body: 'When a heavily shorted stock rises instead of falls, short sellers rush to buy back shares to limit losses. This buying pressure can send prices sharply higher -- a "short squeeze." High short interest is a key ingredient.',
            },
            {
              icon: "pi-chart-bar",
              title: "What Levels Should I Watch?",
              body: "Below 5% is generally low risk from shorts. 5-10% warrants monitoring. Above 10% is elevated, and above 20% is often considered very high -- typical of highly controversial or struggling companies.",
            },
          ].map((card) => (
            <div key={card.title} className="col-12 md:col-4" style={{ padding: "0.4rem" }}>
              <div className="sv-data-card p-3 h-full flex flex-column gap-2">
                <div className="flex align-items-center gap-2">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--sv-accent-subtle, rgba(245,166,35,0.12))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i className={`pi ${card.icon}`} style={{ fontSize: 15, color: "var(--sv-accent)" }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-color)" }}>
                    {card.title}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-color-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {card.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockShortInterestTab;
