import React, { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InsiderTransaction {
  ownerName: string;
  ownerTitle: string;
  transactionDate: string;
  transactionAcquiredDisposed: "A" | "D";
  transactionAmount: number;
  transactionPrice: number;
}

interface InsiderData {
  insiderTransactions: InsiderTransaction[];
}

interface StockInsiderTransactionsTabProps {
  symbol: string;
}

interface MonthlyTrend {
  month: string;
  buy: number;
  sell: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildMonthlyTrend(txns: InsiderTransaction[], startYear = 2020): MonthlyTrend[] {
  const today = new Date();
  const yearToday = today.getFullYear();
  const monthToday = today.getMonth();

  const template: MonthlyTrend[] = [];
  for (let year = startYear; year <= yearToday; year++) {
    for (let month = 0; month < 12; month++) {
      if (year === yearToday && month > monthToday) break;
      template.push({ month: `${SHORT_MONTHS[month]} ${year}`, buy: 0, sell: 0 });
    }
  }

  for (const txn of txns) {
    const d = new Date(txn.transactionDate);
    const key = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const side = txn.transactionAcquiredDisposed === "A" ? "buy" : "sell";
    const entry = template.find((t) => t.month === key);
    if (entry) entry[side] += txn.transactionAmount;
  }

  return template;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type TrendPeriod = "6mo" | "1yr" | "all";

function filterMonthlyTrend(trend: MonthlyTrend[], period: TrendPeriod): MonthlyTrend[] {
  if (period === "all") return trend;
  const now = new Date();
  const months = period === "6mo" ? 6 : 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  return trend.filter((t) => {
    const parts = t.month.split(" ");
    const d = new Date(`${parts[0]} 1, ${parts[1]}`);
    return d >= cutoff;
  });
}

function getSignal(netShares: number, totalBuy: number, totalSell: number): {
  label: string; color: string; icon: string; blurb: string;
} {
  if (totalBuy === 0 && totalSell === 0) return {
    label: "No Activity",
    color: "var(--sv-text-muted)",
    icon: "pi-minus",
    blurb: "No insider transactions recorded for this symbol in the selected period.",
  };
  const pctBuy = totalBuy / (totalBuy + totalSell);
  if (pctBuy >= 0.70) return {
    label: "Strong Buying",
    color: "var(--sv-positive, #4caf50)",
    icon: "pi-arrow-circle-up",
    blurb: "Insiders are predominantly buying. This is often interpreted as a strong vote of confidence from those with the best view inside the company.",
  };
  if (pctBuy >= 0.50) return {
    label: "Modest Buying",
    color: "#66bb6a",
    icon: "pi-angle-up",
    blurb: "More shares are being acquired than disposed. Insider buying can signal management's confidence, though context always matters.",
  };
  if (pctBuy >= 0.30) return {
    label: "Mixed Activity",
    color: "#ffa726",
    icon: "pi-minus-circle",
    blurb: "Both buying and selling present. Mixed signals — consider reviewing individual transactions for context such as option exercises or scheduled plans.",
  };
  return {
    label: "Net Selling",
    color: "#ef5350",
    icon: "pi-arrow-circle-down",
    blurb: "Insiders are net sellers. While routine sales are common (diversification, taxes), sustained net selling can warrant closer attention.",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ToggleBtn: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active, label, onClick,
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
  <div className="sv-data-card p-3 flex flex-column gap-1" style={{ minWidth: 130, flex: 1 }}>
    <div style={{
      fontSize: "0.68rem", color: "var(--sv-text-muted)", textTransform: "uppercase",
      letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5,
    }}>
      {icon && <i className={`pi ${icon}`} style={{ fontSize: 11 }} />}
      {label}
    </div>
    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-color)", lineHeight: 1.2 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: "0.73rem", color: subColor ?? "var(--sv-text-muted)", fontWeight: 500 }}>
        {sub}
      </div>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const StockInsiderTransactionsTab: React.FC<StockInsiderTransactionsTabProps> = ({ symbol }) => {
  const [txns, setTxns] = useState<InsiderTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartPeriod, setChartPeriod] = useState<TrendPeriod>("1yr");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    setTxns([]);
    api.get<InsiderData>(`/eod/insider-transactions/${symbol}`)
      .then(({ data }) => {
        const list = data?.insiderTransactions ?? [];
        if (list.length === 0) {
          setError(`No insider transaction data available for ${symbol}.`);
        } else {
          setTxns(list);
        }
      })
      .catch(() => setError(`Failed to load insider transactions for ${symbol}.`))
      .finally(() => setLoading(false));
  }, [symbol]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const allMonthlyTrend = useMemo(() => buildMonthlyTrend(txns), [txns]);
  const filteredTrend = useMemo(() => filterMonthlyTrend(allMonthlyTrend, chartPeriod), [allMonthlyTrend, chartPeriod]);

  const stats = useMemo(() => {
    const buyTxns = txns.filter((t) => t.transactionAcquiredDisposed === "A");
    const sellTxns = txns.filter((t) => t.transactionAcquiredDisposed === "D");
    const totalBuyShares = buyTxns.reduce((s, t) => s + t.transactionAmount, 0);
    const totalSellShares = sellTxns.reduce((s, t) => s + t.transactionAmount, 0);
    const totalBuyValue = buyTxns.reduce((s, t) => s + t.transactionAmount * t.transactionPrice, 0);
    const totalSellValue = sellTxns.reduce((s, t) => s + t.transactionAmount * t.transactionPrice, 0);
    const uniqueInsiders = new Set(txns.map((t) => t.ownerName)).size;
    return { totalBuyShares, totalSellShares, totalBuyValue, totalSellValue, uniqueInsiders };
  }, [txns]);

  const signal = useMemo(
    () => getSignal(stats.totalBuyShares - stats.totalSellShares, stats.totalBuyShares, stats.totalSellShares),
    [stats],
  );

  // ── Chart options ──────────────────────────────────────────────────────────

  const chartOptions = useMemo((): Highcharts.Options => {
    const categories = filteredTrend.map((t) => t.month);
    const buyData = filteredTrend.map((t) => t.buy);
    const sellData = filteredTrend.map((t) => t.sell);

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 320,
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
        formatter(this: Highcharts.TooltipFormatterContextObject) {
          const pts = this.points ?? [];
          let s = `<b>${this.x}</b><br/>`;
          for (const p of pts) {
            const val = typeof p.y === "number" ? formatNumber(p.y) : "0";
            s += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${val} shares</b><br/>`;
          }
          return s;
        },
      },
      xAxis: {
        categories,
        lineColor: "var(--sv-border)",
        tickColor: "var(--sv-border)",
        labels: {
          style: { color: "var(--sv-text-muted)", fontSize: "10px" },
          rotation: -45,
          step: Math.ceil(categories.length / 18),
        },
      },
      yAxis: {
        title: { text: "Shares", style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
        labels: {
          formatter() { return formatNumber(this.value as number); },
          style: { color: "var(--sv-text-muted)", fontSize: "11px" },
        },
        gridLineColor: "var(--sv-border-light)",
      },
      plotOptions: {
        column: {
          borderRadius: 3,
          grouping: true,
          pointPadding: 0.05,
          groupPadding: 0.1,
        },
      },
      series: [
        {
          type: "column",
          name: "Bought",
          data: buyData,
          color: "var(--sv-positive, #4caf50)",
        },
        {
          type: "column",
          name: "Sold",
          data: sellData,
          color: "#ef5350",
        },
      ],
    };
  }, [filteredTrend]);

  // ── Table helpers ──────────────────────────────────────────────────────────

  const sortedTxns = useMemo(
    () => [...txns].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
    [txns],
  );

  const sideBodyTemplate = (row: InsiderTransaction) => {
    const isBuy = row.transactionAcquiredDisposed === "A";
    return (
      <span style={{
        fontSize: "0.73rem",
        fontWeight: 700,
        color: isBuy ? "var(--sv-positive, #4caf50)" : "#ef5350",
        background: isBuy ? "rgba(76,175,80,0.12)" : "rgba(239,83,80,0.12)",
        padding: "2px 8px",
        borderRadius: 12,
        letterSpacing: "0.04em",
      }}>
        {isBuy ? "BUY" : "SELL"}
      </span>
    );
  };

  const sharesBodyTemplate = (row: InsiderTransaction) =>
    row.transactionAmount.toLocaleString();

  const priceBodyTemplate = (row: InsiderTransaction) =>
    row.transactionPrice ? `$${row.transactionPrice.toFixed(2)}` : "—";

  const valueBodyTemplate = (row: InsiderTransaction) => {
    const val = row.transactionPrice * row.transactionAmount;
    return val ? formatCurrency(val) : "—";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-column gap-3">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <div className="font-bold" style={{ fontSize: "1.05rem", color: "var(--text-color)" }}>
            Insider Transactions
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--sv-text-muted)", marginTop: 2 }}>
            Shares traded by corporate officers, directors, and major shareholders (SEC Form 4)
          </div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height="80px" className="flex-1 border-round-xl" />
          ))}
        </div>
      ) : !error ? (
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="Shares Bought"
            value={formatNumber(stats.totalBuyShares)}
            sub={`Value: ${formatCurrency(stats.totalBuyValue)}`}
            subColor="var(--sv-positive, #4caf50)"
            icon="pi-arrow-up"
          />
          <StatCard
            label="Shares Sold"
            value={formatNumber(stats.totalSellShares)}
            sub={`Value: ${formatCurrency(stats.totalSellValue)}`}
            subColor="#ef5350"
            icon="pi-arrow-down"
          />
          <StatCard
            label="Net Shares"
            value={formatNumber(Math.abs(stats.totalBuyShares - stats.totalSellShares))}
            sub={stats.totalBuyShares >= stats.totalSellShares ? "Net bought" : "Net sold"}
            subColor={stats.totalBuyShares >= stats.totalSellShares ? "var(--sv-positive, #4caf50)" : "#ef5350"}
            icon="pi-arrows-v"
          />
          <StatCard
            label="Total Transactions"
            value={txns.length.toString()}
            sub="Reported filings"
            icon="pi-file"
          />
          <StatCard
            label="Unique Insiders"
            value={stats.uniqueInsiders.toString()}
            sub="Officers & directors"
            icon="pi-users"
          />
        </div>
      ) : null}

      {/* ── Signal banner ─────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div
          className="sv-data-card p-3 flex align-items-start gap-3"
          style={{ borderLeft: `4px solid ${signal.color}` }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `${signal.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <i className={`pi ${signal.icon}`} style={{ fontSize: 18, color: signal.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex align-items-center gap-2 mb-1">
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "var(--sv-text-muted)",
              }}>
                Insider Signal
              </span>
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, color: signal.color,
                background: `${signal.color}18`, padding: "1px 8px", borderRadius: 20,
              }}>
                {signal.label}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-color-secondary)", lineHeight: 1.55 }}>
              {signal.blurb}
            </div>
          </div>
        </div>
      )}

      {/* ── Buy/Sell Trend Chart ───────────────────────────────────────────── */}
      <div className="sv-data-card p-3">
        <div className="flex align-items-center justify-content-between mb-3">
          <span style={{
            fontSize: "0.68rem", fontWeight: 700, color: "var(--sv-text-muted)",
            textTransform: "uppercase", letterSpacing: "0.09em",
          }}>
            Monthly Buy / Sell Trend (# of Shares)
          </span>
          <div className="flex align-items-center gap-1">
            {(["6mo", "1yr", "all"] as TrendPeriod[]).map((p) => (
              <ToggleBtn
                key={p}
                active={chartPeriod === p}
                label={p === "6mo" ? "6M" : p === "1yr" ? "1Y" : "All"}
                onClick={() => setChartPeriod(p)}
              />
            ))}
          </div>
        </div>

        {loading ? (
          <Skeleton height="320px" className="border-round-xl" />
        ) : error ? (
          <div className="flex align-items-center justify-content-center" style={{ height: 280 }}>
            <div className="text-center">
              <i className="pi pi-exclamation-circle" style={{ fontSize: 32, color: "var(--sv-text-muted)", marginBottom: 12 }} />
              <div style={{ color: "var(--sv-text-muted)", fontSize: "0.88rem" }}>{error}</div>
            </div>
          </div>
        ) : (
          <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={chartRef} />
        )}
      </div>

      {/* ── Transactions Table ────────────────────────────────────────────── */}
      {!loading && !error && txns.length > 0 && (
        <div className="sv-data-card p-3">
          <div style={{
            fontSize: "0.68rem", fontWeight: 700, color: "var(--sv-text-muted)",
            textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.75rem",
          }}>
            All Transactions
          </div>
          <DataTable
            value={sortedTxns}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            showGridlines={false}
            stripedRows
            size="small"
            style={{ fontSize: "0.82rem" }}
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            currentPageReportTemplate="Showing {first}–{last} of {totalRecords}"
            sortField="transactionDate"
            sortOrder={-1}
          >
            <Column field="ownerName" header="Insider" sortable style={{ minWidth: 160 }} />
            <Column field="ownerTitle" header="Title" sortable style={{ minWidth: 140, color: "var(--sv-text-muted)" }} />
            <Column field="transactionDate" header="Date" sortable style={{ minWidth: 110 }} />
            <Column
              field="transactionAcquiredDisposed"
              header="Action"
              body={sideBodyTemplate}
              style={{ minWidth: 80, textAlign: "center" }}
            />
            <Column
              field="transactionAmount"
              header="Shares"
              body={sharesBodyTemplate}
              sortable
              style={{ minWidth: 100, textAlign: "right" }}
            />
            <Column
              field="transactionPrice"
              header="Price"
              body={priceBodyTemplate}
              sortable
              style={{ minWidth: 90, textAlign: "right" }}
            />
            <Column
              header="Value"
              body={valueBodyTemplate}
              style={{ minWidth: 110, textAlign: "right" }}
            />
          </DataTable>
        </div>
      )}

      {/* ── Education cards ───────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="grid" style={{ margin: 0 }}>
          {[
            {
              icon: "pi-question-circle",
              title: "What is Insider Trading Data?",
              body: "Corporate insiders — officers, directors, and 10%+ shareholders — must report stock transactions to the SEC via Form 4. This public data lets investors monitor whether those with the most company knowledge are buying or selling.",
            },
            {
              icon: "pi-star",
              title: "Why Does Insider Buying Matter?",
              body: "Insiders have many reasons to sell (taxes, diversification, personal needs), but they only buy for one reason: they expect the stock to go up. Clusters of insider buying, especially by multiple executives, are often viewed as a bullish signal.",
            },
            {
              icon: "pi-info-circle",
              title: "Caveats to Keep in Mind",
              body: "Not all transactions signal conviction. Option exercises, pre-scheduled 10b5-1 plans, and estate transfers can all appear as buys or sells. Always look at the context — amount, title of the insider, and whether the activity is isolated or part of a broader trend.",
            },
          ].map((card) => (
            <div key={card.title} className="col-12 md:col-4" style={{ padding: "0.4rem" }}>
              <div className="sv-data-card p-3 h-full flex flex-column gap-2">
                <div className="flex align-items-center gap-2">
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--sv-accent-subtle, rgba(245,166,35,0.12))",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <i className={`pi ${card.icon}`} style={{ fontSize: 15, color: "var(--sv-accent)" }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-color)" }}>
                    {card.title}
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-color-secondary)", lineHeight: 1.6 }}>
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

export default StockInsiderTransactionsTab;
