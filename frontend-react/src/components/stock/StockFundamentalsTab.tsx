import React, { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import FairValueChart from "@/components/stock/FairValueChart";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricItem {
  label: string;
  key: string;
  description: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  metrics: MetricItem[];
}

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface FundamentalsData {
  Financials?: {
    Income_Statement?: { quarterly?: DataPoint[]; annual?: DataPoint[] };
    Balance_Sheet?: { quarterly?: DataPoint[]; annual?: DataPoint[] };
    Cash_Flow?: { quarterly?: DataPoint[]; annual?: DataPoint[] };
  };
  Earnings?: DataPoint[];
  Dividends?: DataPoint[];
  outstandingShares?: DataPoint[];
  error?: string;
}

interface StockFundamentalsTabProps {
  symbol: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "key",
    label: "Key Stats",
    icon: "pi pi-star",
    metrics: [
      {
        label: "Earnings (EPS)",
        key: "Earnings",
        description:
          "Earnings per share — how much profit the company makes per share.",
      },
      {
        label: "Dividends",
        key: "Dividends",
        description: "Cash paid to shareholders per share each period.",
      },
      {
        label: "Shares Outstanding",
        key: "outstandingShares",
        description: "Total shares the company has issued to investors.",
      },
    ],
  },
  {
    id: "income",
    label: "Income",
    icon: "pi pi-dollar",
    metrics: [
      {
        label: "Revenue",
        key: "totalRevenue",
        description: "Total sales — the top-line figure before any costs.",
      },
      {
        label: "Cost of Revenue",
        key: "costOfRevenue",
        description: "Direct costs of producing goods or services.",
      },
      {
        label: "Gross Profit",
        key: "grossProfit",
        description:
          "Revenue minus cost of goods — profit before operating expenses.",
      },
      {
        label: "Operating Income",
        key: "operatingIncome",
        description:
          "Profit from core business operations after operating expenses.",
      },
      {
        label: "Net Income",
        key: "netIncome",
        description: "Bottom-line profit after all taxes and expenses.",
      },
      {
        label: "Income Before Tax",
        key: "incomeBeforeTax",
        description: "Profit before the tax bill is applied.",
      },
      {
        label: "EBIT",
        key: "ebit",
        description:
          "Earnings before interest & taxes — a proxy for operating profitability.",
      },
      {
        label: "EBITDA",
        key: "ebitda",
        description:
          "Earnings before interest, taxes, depreciation & amortisation — measures cash-generating ability.",
      },
    ],
  },
  {
    id: "balance",
    label: "Balance Sheet",
    icon: "pi pi-building",
    metrics: [
      {
        label: "Assets",
        key: "totalAssets",
        description:
          "Everything the company owns — cash, equipment, property, etc.",
      },
      {
        label: "Liabilities",
        key: "totalLiab",
        description: "Everything the company owes — loans, bills, bonds.",
      },
      {
        label: "Equity",
        key: "totalStockholderEquity",
        description:
          "Net worth: assets minus liabilities — what belongs to shareholders.",
      },
      {
        label: "Debt",
        key: "shortLongTermDebtTotal",
        description: "Total short & long-term borrowings.",
      },
      {
        label: "Net Debt",
        key: "netDebt",
        description:
          "Debt minus cash held — a cleaner view of the debt burden.",
      },
      {
        label: "Working Capital",
        key: "netWorkingCapital",
        description:
          "Short-term assets minus liabilities — liquidity buffer for daily operations.",
      },
      {
        label: "Invested Capital",
        key: "netInvestedCapital",
        description: "Money invested in business operations.",
      },
      {
        label: "Tangible Assets",
        key: "netTangibleAssets",
        description:
          "Physical assets like buildings and equipment, excluding intangibles.",
      },
    ],
  },
  {
    id: "cashflow",
    label: "Cash Flow",
    icon: "pi pi-arrow-right-arrow-left",
    metrics: [
      {
        label: "Operating CF",
        key: "totalCashFromOperatingActivities",
        description: "Cash generated from core business operations.",
      },
      {
        label: "Investing CF",
        key: "totalCashflowsFromInvestingActivities",
        description: "Cash spent on or received from investments and assets.",
      },
      {
        label: "Financing CF",
        key: "totalCashFromFinancingActivities",
        description: "Cash from issuing stock, paying dividends, or borrowing.",
      },
      {
        label: "Free Cash Flow",
        key: "freeCashFlow",
        description:
          "Operating cash minus capital spending — truly free money for growth or dividends.",
      },
      {
        label: "Capital Expense",
        key: "capitalExpenditures",
        description:
          "Spending on long-term assets like factories and equipment.",
      },
      {
        label: "Cash on Hand",
        key: "endPeriodCashFlow",
        description: "Actual cash balance at the end of the period.",
      },
    ],
  },
];

// Map metric key → path in FundamentalsData + y-column
const METRIC_PATH: Record<string, { path: string[]; yCol: string }> = {
  Earnings: { path: ["Earnings"], yCol: "eps" },
  Dividends: { path: ["Dividends"], yCol: "div" },
  outstandingShares: { path: ["outstandingShares"], yCol: "shares" },
  totalRevenue: {
    path: ["Financials", "Income_Statement"],
    yCol: "totalRevenue",
  },
  costOfRevenue: {
    path: ["Financials", "Income_Statement"],
    yCol: "costOfRevenue",
  },
  grossProfit: {
    path: ["Financials", "Income_Statement"],
    yCol: "grossProfit",
  },
  operatingIncome: {
    path: ["Financials", "Income_Statement"],
    yCol: "operatingIncome",
  },
  netIncome: { path: ["Financials", "Income_Statement"], yCol: "netIncome" },
  incomeBeforeTax: {
    path: ["Financials", "Income_Statement"],
    yCol: "incomeBeforeTax",
  },
  ebit: { path: ["Financials", "Income_Statement"], yCol: "ebit" },
  ebitda: { path: ["Financials", "Income_Statement"], yCol: "ebitda" },
  totalAssets: { path: ["Financials", "Balance_Sheet"], yCol: "totalAssets" },
  totalLiab: { path: ["Financials", "Balance_Sheet"], yCol: "totalLiab" },
  totalStockholderEquity: {
    path: ["Financials", "Balance_Sheet"],
    yCol: "totalStockholderEquity",
  },
  shortLongTermDebtTotal: {
    path: ["Financials", "Balance_Sheet"],
    yCol: "shortLongTermDebtTotal",
  },
  netDebt: { path: ["Financials", "Balance_Sheet"], yCol: "netDebt" },
  netWorkingCapital: {
    path: ["Financials", "Balance_Sheet"],
    yCol: "netWorkingCapital",
  },
  netInvestedCapital: {
    path: ["Financials", "Balance_Sheet"],
    yCol: "netInvestedCapital",
  },
  netTangibleAssets: {
    path: ["Financials", "Balance_Sheet"],
    yCol: "netTangibleAssets",
  },
  totalCashFromOperatingActivities: {
    path: ["Financials", "Cash_Flow"],
    yCol: "totalCashFromOperatingActivities",
  },
  totalCashflowsFromInvestingActivities: {
    path: ["Financials", "Cash_Flow"],
    yCol: "totalCashflowsFromInvestingActivities",
  },
  totalCashFromFinancingActivities: {
    path: ["Financials", "Cash_Flow"],
    yCol: "totalCashFromFinancingActivities",
  },
  freeCashFlow: { path: ["Financials", "Cash_Flow"], yCol: "freeCashFlow" },
  capitalExpenditures: {
    path: ["Financials", "Cash_Flow"],
    yCol: "capitalExpenditures",
  },
  endPeriodCashFlow: {
    path: ["Financials", "Cash_Flow"],
    yCol: "endPeriodCashFlow",
  },
};

// All metrics use frequency sub-keys (quarterly/annual) — none are flat arrays
const FLAT_METRICS = new Set<string>();

type Frequency = "quarterly" | "annual";
type Period = "3year" | "10year" | "20year";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}

function periodToYears(p: Period): number {
  return p === "3year" ? 3 : p === "10year" ? 10 : 20;
}

function getStartDate(period: Period): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - periodToYears(period));
  return d.toISOString().split("T")[0];
}

function extractSeriesData(
  fundamentals: FundamentalsData,
  metricKey: string,
  frequency: Frequency,
  startDate: string,
): DataPoint[] {
  const conf = METRIC_PATH[metricKey];
  if (!conf) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = fundamentals;
  for (const key of conf.path) {
    if (node == null) return [];
    node = node[key];
  }
  if (node == null) return [];

  // For Financials sub-sections: node is { quarterly: [...], annual: [...] }
  if (!FLAT_METRICS.has(metricKey)) {
    node = node[frequency];
  }

  if (!Array.isArray(node)) return [];

  return (node as DataPoint[])
    .filter((d) => d.date && d.date >= startDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontSize: "0.68rem",
      fontWeight: 700,
      color: "var(--sv-text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.09em",
      marginBottom: "0.5rem",
    }}
  >
    {text}
  </div>
);

const ToggleBtn: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 12px",
      fontSize: "0.75rem",
      fontWeight: active ? 700 : 500,
      border: active
        ? "1.5px solid var(--sv-accent)"
        : "1.5px solid var(--sv-border)",
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

// ── Main Component ────────────────────────────────────────────────────────────

const StockFundamentalsTab: React.FC<StockFundamentalsTabProps> = ({
  symbol,
}) => {
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCatId, setActiveCatId] = useState("income");
  const [activeMetric, setActiveMetric] = useState<MetricItem>(
    CATEGORIES[1].metrics[0],
  ); // Revenue default
  const [frequency, setFrequency] = useState<Frequency>("annual");
  const [period, setPeriod] = useState<Period>("10year");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Fetch on symbol or period change
  useEffect(() => {
    setLoading(true);
    setError("");
    setFundamentals(null);

    api
      .get(`/symbol/historical/${symbol}/${period}`)
      .then(({ data }) => {
        if (data?.error) {
          setError(`No fundamental data available for ${symbol}.`);
        } else {
          setFundamentals(data);
        }
      })
      .catch(() => setError(`Failed to load fundamental data for ${symbol}.`))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  // When category changes, auto-select first metric
  const handleCatChange = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId)!;
    setActiveCatId(catId);
    setActiveMetric(cat.metrics[0]);
  };

  // Build Highcharts options
  const chartOptions = React.useMemo((): Highcharts.Options => {
    const startDate = getStartDate(period);
    const rows = fundamentals
      ? extractSeriesData(fundamentals, activeMetric.key, frequency, startDate)
      : [];

    const conf = METRIC_PATH[activeMetric.key];
    const yCol = conf?.yCol ?? activeMetric.key;

    const positiveColor = "var(--sv-accent)";
    const negativeColor = "#ef5350";

    const pointData = rows.map((d) => {
      const raw = parseFloat(String(d[yCol]));
      const val = isNaN(raw) ? 0 : raw;
      return {
        x: new Date(d.date).getTime(),
        y: val,
        color: val >= 0 ? positiveColor : negativeColor,
      };
    });

    const latestPositive = pointData.filter((p) => p.y >= 0);
    const latestNegative = pointData.filter((p) => p.y < 0);
    const allVals = pointData.map((p) => p.y);
    const maxVal = allVals.length ? Math.max(...allVals) : 1;
    const minVal = allVals.length ? Math.min(...allVals) : 0;
    void latestPositive;
    void latestNegative;

    // growth annotation
    let growthLabel = "";
    if (pointData.length >= 2) {
      const first = pointData[0].y;
      const last = pointData[pointData.length - 1].y;
      if (first !== 0) {
        const years = periodToYears(period);
        const cagr = (Math.pow(last / first, 1 / years) - 1) * 100;
        growthLabel = `CAGR ${cagr.toFixed(1)}%/yr`;
      }
    }

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 340,
        style: { fontFamily: "Inter, sans-serif" },
        animation: { duration: 300 },
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: "var(--surface-overlay)",
        borderColor: "var(--sv-border)",
        style: { color: "var(--text-color)", fontSize: "12px" },
        formatter(this: Highcharts.TooltipFormatterContextObject) {
          const date = new Date(this.x as number).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          return `<b>${date}</b><br/>${activeMetric.label}: <b>${formatValue(this.y as number)}</b>`;
        },
      },
      xAxis: {
        type: "datetime",
        lineColor: "var(--sv-border)",
        tickColor: "var(--sv-border)",
        labels: { style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: null },
        gridLineColor: "var(--sv-border-light)",
        labels: {
          style: { color: "var(--sv-text-muted)", fontSize: "11px" },
          formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
            return formatValue(this.value as number);
          },
        },
        min: minVal < 0 ? minVal * 1.15 : undefined,
        max: maxVal > 0 ? maxVal * 1.15 : undefined,
        plotLines:
          minVal < 0 ? [{ value: 0, color: "var(--sv-border)", width: 1 }] : [],
      },
      plotOptions: {
        column: {
          borderRadius: 3,
          borderWidth: 0,
          pointPadding: 0.1,
          groupPadding: 0.05,
        },
      },
      series: [
        {
          type: "column",
          name: activeMetric.label,
          data: pointData,
          colorByPoint: true,
        },
      ],
      annotations: growthLabel
        ? [
            {
              labels: [
                {
                  point: {
                    xAxis: 0,
                    yAxis: 0,
                    x: pointData[pointData.length - 1]?.x ?? 0,
                    y: maxVal,
                  },
                  text: growthLabel,
                  style: { color: "var(--sv-text-muted)", fontSize: "10px" },
                  backgroundColor: "transparent",
                  borderWidth: 0,
                },
              ],
            },
          ]
        : [],
    };
  }, [fundamentals, activeMetric, frequency, period]);

  // Latest value summary
  const latestValue = React.useMemo(() => {
    if (!fundamentals) return null;
    const startDate = getStartDate(period);
    const rows = extractSeriesData(
      fundamentals,
      activeMetric.key,
      frequency,
      startDate,
    );
    if (!rows.length) return null;
    const conf = METRIC_PATH[activeMetric.key];
    const yCol = conf?.yCol ?? activeMetric.key;
    const last = rows[rows.length - 1];
    const prev = rows.length > 1 ? rows[rows.length - 2] : null;
    const val = parseFloat(String(last[yCol]));
    const prevVal = prev ? parseFloat(String(prev[yCol])) : null;
    const chg =
      prevVal && prevVal !== 0
        ? ((val - prevVal) / Math.abs(prevVal)) * 100
        : null;
    return { val, date: last.date, chg };
  }, [fundamentals, activeMetric, frequency, period]);

  const activeCat = CATEGORIES.find((c) => c.id === activeCatId)!;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-3">
      {/* ── Quick Stats Row ──────────────────────────────────────────────────── */}
      {!loading && !error && fundamentals && (
        <QuickStatsRow
          fundamentals={fundamentals}
          frequency={frequency}
          period={period}
        />
      )}

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between flex-wrap gap-2">
        {/* Period */}
        <div className="flex align-items-center gap-1">
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--sv-text-muted)",
              marginRight: 4,
            }}
          >
            Period
          </span>
          {(["3year", "10year", "20year"] as Period[]).map((p) => (
            <ToggleBtn
              key={p}
              active={period === p}
              label={p === "3year" ? "3Y" : p === "10year" ? "10Y" : "20Y"}
              onClick={() => setPeriod(p)}
            />
          ))}
        </div>
        {/* Frequency */}
        <div className="flex align-items-center gap-1">
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--sv-text-muted)",
              marginRight: 4,
            }}
          >
            Frequency
          </span>
          <ToggleBtn
            active={frequency === "quarterly"}
            label="Quarterly"
            onClick={() => setFrequency("quarterly")}
          />
          <ToggleBtn
            active={frequency === "annual"}
            label="Annual"
            onClick={() => setFrequency("annual")}
          />
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3 align-items-stretch">
        {/* ── Left: Category + Metric Selector ────────────────────────────── */}
        <div
          className="sv-data-card p-3 flex flex-column gap-3"
          style={{ minWidth: 180, width: 200, flexShrink: 0 }}
        >
          <SectionLabel text="Category" />
          <div className="flex flex-column gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCatChange(cat.id)}
                className="flex align-items-center gap-2 text-left"
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    activeCatId === cat.id
                      ? "var(--sv-accent-subtle, rgba(245,166,35,0.12))"
                      : "transparent",
                  color:
                    activeCatId === cat.id
                      ? "var(--sv-accent)"
                      : "var(--text-color)",
                  fontWeight: activeCatId === cat.id ? 700 : 400,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  width: "100%",
                  transition: "all 0.15s",
                }}
              >
                <i className={cat.icon} style={{ fontSize: 13 }} />
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: "var(--sv-border-light)" }} />

          <SectionLabel text="Metric" />
          <div
            className="flex flex-column gap-1"
            style={{ overflowY: "auto", maxHeight: 320 }}
          >
            {activeCat.metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m)}
                className="text-left"
                style={{
                  padding: "6px 10px",
                  borderRadius: 7,
                  border:
                    activeMetric.key === m.key
                      ? "1.5px solid var(--sv-accent)"
                      : "1.5px solid transparent",
                  background:
                    activeMetric.key === m.key
                      ? "var(--sv-accent-subtle, rgba(245,166,35,0.1))"
                      : "transparent",
                  color:
                    activeMetric.key === m.key
                      ? "var(--sv-accent)"
                      : "var(--text-color-secondary)",
                  fontWeight: activeMetric.key === m.key ? 600 : 400,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  width: "100%",
                  transition: "all 0.12s",
                  lineHeight: 1.4,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Chart + Info ──────────────────────────────────────────── */}
        <div className="flex flex-column gap-3 flex-1" style={{ minWidth: 0 }}>
          {/* Metric header + latest value */}
          <div className="sv-data-card p-3">
            <div className="flex align-items-start justify-content-between flex-wrap gap-2">
              <div>
                <div
                  className="font-bold"
                  style={{ fontSize: "1.05rem", color: "var(--text-color)" }}
                >
                  {activeMetric.label}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--sv-text-muted)",
                    marginTop: 3,
                    maxWidth: 520,
                  }}
                >
                  {activeMetric.description}
                </div>
              </div>

              {latestValue && !loading && (
                <div className="text-right">
                  <div
                    className="font-bold"
                    style={{ fontSize: "1.4rem", color: "var(--text-color)" }}
                  >
                    {formatValue(latestValue.val)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--sv-text-muted)",
                    }}
                  >
                    Latest · {latestValue.date}
                  </div>
                  {latestValue.chg !== null && (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color:
                          latestValue.chg >= 0
                            ? "var(--sv-positive)"
                            : "var(--sv-negative)",
                        marginTop: 2,
                      }}
                    >
                      {latestValue.chg >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(latestValue.chg).toFixed(1)}% vs prev period
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="sv-data-card p-3" style={{ flex: 1 }}>
            {loading ? (
              <div>
                <Skeleton height="300px" className="mb-2" />
              </div>
            ) : error ? (
              <div
                className="flex align-items-center justify-content-center"
                style={{ height: 300 }}
              >
                <div className="text-center">
                  <i
                    className="pi pi-exclamation-circle"
                    style={{
                      fontSize: 32,
                      color: "var(--sv-text-muted)",
                      marginBottom: 12,
                    }}
                  />
                  <div
                    style={{
                      color: "var(--sv-text-muted)",
                      fontSize: "0.88rem",
                    }}
                  >
                    {error}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                  <SectionLabel
                    text={`${activeMetric.label} — ${frequency === "annual" ? "Annual" : "Quarterly"} · ${period === "3year" ? "3 Years" : period === "10year" ? "10 Years" : "20 Years"}`}
                  />
                  <div
                    className="flex align-items-center gap-3"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <span className="flex align-items-center gap-1">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: "var(--sv-accent)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "var(--sv-text-muted)" }}>
                        Positive
                      </span>
                    </span>
                    <span className="flex align-items-center gap-1">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: "#ef5350",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "var(--sv-text-muted)" }}>
                        Negative
                      </span>
                    </span>
                  </div>
                </div>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={chartOptions}
                  ref={chartRef}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Fair Value ───────────────────────────────────────────────────────── */}
      <div className="sv-data-card p-3">
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "var(--sv-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            marginBottom: "0.75rem",
          }}
        >
          Fair Value Estimate
        </div>
        <FairValueChart symbol={symbol} />
      </div>
    </div>
  );
};

// ── Quick Stats Strip ─────────────────────────────────────────────────────────

interface QuickStat {
  label: string;
  metricKey: string;
  yCol: string;
  path: string[];
}

const QUICK_STATS: QuickStat[] = [
  {
    label: "Revenue",
    metricKey: "totalRevenue",
    yCol: "totalRevenue",
    path: ["Financials", "Income_Statement"],
  },
  {
    label: "Net Income",
    metricKey: "netIncome",
    yCol: "netIncome",
    path: ["Financials", "Income_Statement"],
  },
  {
    label: "Free Cash Flow",
    metricKey: "freeCashFlow",
    yCol: "freeCashFlow",
    path: ["Financials", "Cash_Flow"],
  },
  {
    label: "Total Debt",
    metricKey: "shortLongTermDebtTotal",
    yCol: "shortLongTermDebtTotal",
    path: ["Financials", "Balance_Sheet"],
  },
  {
    label: "Equity",
    metricKey: "totalStockholderEquity",
    yCol: "totalStockholderEquity",
    path: ["Financials", "Balance_Sheet"],
  },
];

function getLatest(
  fundamentals: FundamentalsData,
  stat: QuickStat,
  frequency: Frequency,
): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = fundamentals;
  for (const k of stat.path) {
    if (!node) return null;
    node = node[k];
  }
  if (!node) return null;
  const arr: DataPoint[] = node[frequency];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
  const v = parseFloat(String(sorted[0][stat.yCol]));
  return isNaN(v) ? null : v;
}

const QuickStatsRow: React.FC<{
  fundamentals: FundamentalsData;
  frequency: Frequency;
  period: Period;
}> = ({ fundamentals, frequency }) => (
  <div className="grid">
    {QUICK_STATS.map((stat) => {
      const val = getLatest(fundamentals, stat, frequency);
      const pos = val !== null && val >= 0;
      return (
        <div
          key={stat.metricKey}
          className="col-6 md:col-4 lg:col"
          style={{ padding: "0.4rem" }}
        >
          <div className="sv-data-card p-3 text-center">
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--sv-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 4,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color:
                  val === null
                    ? "var(--sv-text-muted)"
                    : pos
                      ? "var(--sv-positive, #4caf50)"
                      : "var(--sv-negative, #ef5350)",
              }}
            >
              {val !== null ? formatValue(val) : "—"}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

export default StockFundamentalsTab;
