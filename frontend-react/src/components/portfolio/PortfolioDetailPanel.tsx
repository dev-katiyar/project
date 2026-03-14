import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";
import { TabView, TabPanel } from "primereact/tabview";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Badge } from "primereact/badge";
import { Toast } from "primereact/toast";
import { type Portfolio } from "@/components/portfolio/PortfolioSummaryTable";
import SummaryTab from "@/components/portfolio/tabs/SummaryTab";
import HoldingsTab from "@/components/portfolio/tabs/HoldingsTab";
import TransactionsTab from "@/components/portfolio/tabs/TransactionsTab";
import PerformanceTab from "@/components/portfolio/tabs/PerformanceTab";
import ClosedPositionsTab from "@/components/portfolio/tabs/ClosedPositionsTab";
import DividendsTab from "@/components/portfolio/tabs/DividendsTab";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompositionItem {
  name: string;
  percentage: number;
}

export interface PortfolioDetails {
  portfolioid: number;
  name: string;
  portfolio_type: string;
  portfolioValue: number;
  startingCash: number;
  currentCash: number;
  pnl: number;
  pnlPercent: number;
  dailyPnl: number;
  dailyPnlPercentage: number;
  dividend: number;
  interest: number;
  composition_by_asset: CompositionItem[];
  composition_by_sector: CompositionItem[];
}

export interface BasicDetail {
  name: string;
  sector: string;
  industry: string;
  currentPrice: number;
  priceChange: number;
  changePct: number;
}

export interface Position {
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  qty: number;
  side: string;
  type?: string;
  avgCost: number;
  currentPrice?: number;
  priceChange?: number;
  changePct?: number;
  currentValue: number;
  pnl: number;
  pnlPercent?: number;
  percentageShare?: number;
  dividendYield?: number;
}

export interface Transaction {
  id: number;
  symbol: string;
  name?: string;
  qty: number;
  side: string;
  price: number;
  date: string | Date;
  fees?: number;
  sector?: string;
  industry?: string;
  currentPrice?: number;
}

export interface CashTransaction {
  symbol: string;
  qty: number;
  next_payout: number;
  amount: number;
  pay_date: string;
  ex_dividend_date: string;
}

export interface ClosedPosition {
  symbol: string;
  name?: string;
  qty: number;
  side?: string;
  buyPrice?: number;
  sellPrice?: number;
  pnl: number;
  pnlPercent?: number;
  openDate?: string;
  closeDate?: string;
}

export interface PortfolioDetailData {
  portfolioDetails: PortfolioDetails;
  openPositions: Position[];
  transactions: Transaction[];
  cash_transactions: CashTransaction[];
  closedPositions: ClosedPosition[];
  basicDetails: Record<string, BasicDetail>;
  techAlerts: Record<string, unknown>;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmtUSD = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v ?? 0);

export const fmtUSDFull = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v ?? 0);

export const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${(v ?? 0).toFixed(2)}%`;

export const gainColor = (v: number) =>
  v > 0
    ? "var(--sv-gain)"
    : v < 0
      ? "var(--sv-loss)"
      : "var(--sv-text-secondary)";

// ─── Header metric card ───────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: string;
}> = ({ label, value, sub, color, icon }) => (
  <div
    className="border-round-xl flex-1"
    style={{
      background: "var(--sv-bg-surface)",
      border: "1px solid var(--sv-border)",
      padding: "0.75rem 1rem",
      minWidth: "130px",
      flex: "1 1 130px",
    }}
  >
    <div
      className="flex align-items-center gap-1 mb-1 sv-info-label"
      style={{ fontSize: "0.68rem" }}
    >
      {icon && <i className={`pi ${icon}`} style={{ fontSize: "0.65rem" }} />}
      {label}
    </div>
    <div
      className="font-bold"
      style={{
        fontSize: "1rem",
        color: color ?? "var(--sv-text-primary)",
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        className="text-sm mt-1"
        style={{ color: color ?? "var(--sv-text-muted)" }}
      >
        {sub}
      </div>
    )}
  </div>
);

// ─── Loading skeleton ──────────────────────────────────────────────────────────

const DetailSkeleton: React.FC = () => (
  <div className="p-4">
    <div className="flex gap-2 mb-4 flex-wrap">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} height="5rem" width="140px" borderRadius="10px" />
      ))}
    </div>
    <Skeleton height="2.5rem" className="mb-3" borderRadius="8px" />
    <Skeleton height="300px" borderRadius="8px" />
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  portfolio: Portfolio;
  onClose: () => void;
}

const PortfolioDetailPanel: React.FC<Props> = ({ portfolio, onClose }) => {
  const toast = useRef<Toast>(null);
  const [data, setData] = useState<PortfolioDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [perfLoaded, setPerfLoaded] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/modelportfolio/read/${portfolio.portfolioid}`,
      );
      const d: PortfolioDetailData = res.data;
      // Enrich positions with basicDetails
      const basic = d.basicDetails ?? {};
      d.openPositions = (d.openPositions ?? []).map((pos) => {
        const b = basic[pos.symbol];
        return {
          ...pos,
          name: b?.name ?? pos.name,
          sector: b?.sector ?? pos.sector,
          industry: b?.industry ?? pos.industry,
          currentPrice: b?.currentPrice ?? pos.currentPrice,
          priceChange: b?.priceChange,
          changePct: b?.changePct,
          type: pos.side === "Buy" ? "Long" : "Short",
          percentageShare:
            d.portfolioDetails.portfolioValue > 0
              ? (100 * pos.currentValue) / d.portfolioDetails.portfolioValue
              : 0,
        };
      });
      // Sort: FixedIncome last, then by share desc
      d.openPositions.sort((a, b) => {
        if (a.sector === "FixedIncome") return 1;
        if (b.sector === "FixedIncome") return -1;
        return (b.percentageShare ?? 0) - (a.percentageShare ?? 0);
      });
      d.closedPositions = (d.closedPositions ?? []).map((pos) => {
        const b = basic[pos.symbol];
        return { ...pos, name: b?.name ?? pos.name };
      });
      setData(d);
    } catch {
      setError("Failed to load portfolio details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [portfolio.portfolioid]);

  useEffect(() => {
    loadDetail();
    setActiveTabIndex(0);
    setPerfLoaded(false);
  }, [loadDetail]);

  const handleTabChange = (e: { index: number }) => {
    setActiveTabIndex(e.index);
    if (e.index === 4 && !perfLoaded) {
      setPerfLoaded(true);
    }
  };

  const details = data?.portfolioDetails;

  return (
    <div
      className="border-round-xl overflow-hidden mb-4"
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        borderTop: "3px solid var(--sv-accent)",
        boxShadow: "var(--sv-shadow-md)",
      }}
    >
      <Toast ref={toast} />

      {/* ── Panel Header ── */}
      <div
        className="px-3 py-3"
        style={{
          borderBottom: "1px solid var(--sv-border)",
          background: "var(--sv-bg-surface)",
        }}
      >
        <div className="flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
          <div className="flex align-items-center gap-2 flex-wrap">
            {/* Icon badge */}
            <div className="sv-icon-badge flex align-items-center justify-content-center border-round-xl flex-shrink-0">
              <i className="pi pi-briefcase" style={{ fontSize: "1rem" }} />
            </div>

            <div>
              <div
                className="font-bold"
                style={{
                  fontSize: "1.1rem",
                  color: "var(--sv-text-primary)",
                  lineHeight: 1.1,
                }}
              >
                {portfolio.name}
              </div>
              <div
                className="sv-text-muted mt-1"
                style={{ fontSize: "0.72rem" }}
              >
                Portfolio Details
              </div>
            </div>

            {/* Portfolio type pill */}
            <span
              className="sv-info-label font-bold"
              style={{
                fontSize: "0.7rem",
                color: "var(--sv-accent)",
                background: "var(--sv-accent-bg)",
                padding: "0.2rem 0.6rem",
                borderRadius: "999px",
              }}
            >
              {portfolio.portfolio_type ?? "portfolio"}
            </span>
          </div>

          <Button
            icon="pi pi-times"
            text
            rounded
            size="small"
            onClick={onClose}
            tooltip="Close detail view"
            tooltipOptions={{ position: "left" }}
            className="sv-text-muted"
          />
        </div>

        {/* ── Metric cards ── */}
        {loading ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                height="4.5rem"
                width="140px"
                borderRadius="10px"
              />
            ))}
          </div>
        ) : details ? (
          <div className="flex gap-2 flex-wrap">
            <MetricCard
              label="Portfolio Value"
              value={fmtUSD(details.portfolioValue)}
              icon="pi-chart-line"
            />
            <MetricCard
              label="Overall P&L"
              value={fmtUSD(details.pnl)}
              sub={fmtPct(details.pnlPercent)}
              color={gainColor(details.pnl)}
              icon="pi-arrow-up-right"
            />
            <MetricCard
              label="Today's P&L"
              value={fmtUSD(details.dailyPnl)}
              sub={fmtPct(details.dailyPnlPercentage)}
              color={gainColor(details.dailyPnl)}
              icon="pi-calendar"
            />
            <MetricCard
              label="Dividends"
              value={fmtUSD(details.dividend)}
              icon="pi-dollar"
            />
            <MetricCard
              label="Starting Cash"
              value={fmtUSD(details.startingCash)}
              icon="pi-wallet"
            />
            <MetricCard
              label="Available Cash"
              value={fmtUSD(details.currentCash)}
              icon="pi-credit-card"
            />
          </div>
        ) : null}
      </div>

      {/* ── Error state ── */}
      {error && !loading && (
        <div className="flex flex-column align-items-center justify-content-center gap-2 p-5 text-center sv-text-loss">
          <i
            className="pi pi-exclamation-triangle"
            style={{ fontSize: "2rem" }}
          />
          <p className="m-0">{error}</p>
          <Button
            label="Retry"
            icon="pi pi-refresh"
            size="small"
            onClick={loadDetail}
          />
        </div>
      )}

      {/* ── Tab content ── */}
      {loading ? (
        <DetailSkeleton />
      ) : !error && data ? (
        <TabView
          activeIndex={activeTabIndex}
          onTabChange={handleTabChange}
          pt={{ root: { className: "sv-tabs" } }}
        >
          <TabPanel header="Summary">
            <SummaryTab details={data.portfolioDetails} />
          </TabPanel>

          <TabPanel header="Holdings">
            <HoldingsTab
              positions={data.openPositions}
              portfolioId={portfolio.portfolioid}
              currentCash={data.portfolioDetails.currentCash}
              startingCash={data.portfolioDetails.startingCash}
              onRefresh={loadDetail}
            />
          </TabPanel>

          <TabPanel header="Transactions">
            <TransactionsTab
              transactions={data.transactions}
              portfolioId={portfolio.portfolioid}
              onRefresh={loadDetail}
            />
          </TabPanel>

          <TabPanel header="Performance">
            <PerformanceTab
              portfolioId={portfolio.portfolioid}
              active={activeTabIndex === 3}
            />
          </TabPanel>

          <TabPanel
            header={
              <span>
                Closed Positions
                {data.closedPositions.length > 0 && (
                  <Badge
                    value={data.closedPositions.length}
                    style={{ marginLeft: "0.5rem", fontSize: "0.65rem" }}
                  />
                )}
              </span>
            }
          >
            <ClosedPositionsTab positions={data.closedPositions} />
          </TabPanel>

          <TabPanel header="Dividends">
            <DividendsTab
              cashTransactions={data.cash_transactions}
              allSymbols={data.openPositions.map((p) => p.symbol)}
            />
          </TabPanel>
        </TabView>
      ) : null}
    </div>
  );
};

export default PortfolioDetailPanel;
