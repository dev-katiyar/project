import React from "react";
import { Card } from "primereact/card";

/**
 * Authenticated dashboard / overview page.
 * Placeholder — will be built out with real API data, Highcharts, and DataTables.
 */
const DashboardPage: React.FC = () => {
  return (
    <>
      {/* Page header */}
      <div className="mb-4">
        <h1
          className="text-2xl font-bold mt-0 mb-1"
          style={{ letterSpacing: "-0.02em" }}
        >
          Dashboard
        </h1>
        <p
          className="mt-0 text-sm"
          style={{ color: "var(--sv-text-secondary)" }}
        >
          Market overview and portfolio summary
        </p>
      </div>

      {/* Row 1: Market summary cards */}
      <div className="grid mb-4">
        <div className="col-12 md:col-6 lg:col-3">
          <MarketCard
            label="S&P 500"
            value="5,234.18"
            change="+1.23%"
            positive
          />
        </div>
        <div className="col-12 md:col-6 lg:col-3">
          <MarketCard
            label="NASDAQ"
            value="16,428.82"
            change="+1.87%"
            positive
          />
        </div>
        <div className="col-12 md:col-6 lg:col-3">
          <MarketCard label="DOW" value="39,127.80" change="+0.54%" positive />
        </div>
        <div className="col-12 md:col-6 lg:col-3">
          <MarketCard
            label="10Y Treasury"
            value="4.28%"
            change="-0.03%"
            positive={false}
          />
        </div>
      </div>

      {/* Row 2: Placeholder panels */}
      <div className="grid mb-4">
        <div className="col-12 md:col-6">
          <Card>
            <div className="font-semibold mb-3">AI Sentiment</div>
            <p
              className="text-sm"
              style={{ color: "var(--sv-text-muted)", minHeight: 200 }}
            >
              Chart will be added here (Highcharts gauge)
            </p>
          </Card>
        </div>
        <div className="col-12 md:col-6">
          <Card>
            <div className="font-semibold mb-3">Portfolio Performance</div>
            <p
              className="text-sm"
              style={{ color: "var(--sv-text-muted)", minHeight: 200 }}
            >
              Chart will be added here (Highcharts line chart)
            </p>
          </Card>
        </div>
      </div>

      {/* Row 3: Placeholder table */}
      <Card>
        <div className="font-semibold mb-3">Watchlist</div>
        <p className="text-sm" style={{ color: "var(--sv-text-muted)" }}>
          DataTable will be added here (PrimeReact DataTable)
        </p>
      </Card>
    </>
  );
};

/* --- Helpers --- */
const MarketCard: React.FC<{
  label: string;
  value: string;
  change: string;
  positive: boolean;
}> = ({ label, value, change, positive }) => (
  <Card>
    <div className="flex flex-column gap-1">
      <span
        className="text-sm font-medium"
        style={{ color: "var(--sv-text-secondary)" }}
      >
        {label}
      </span>
      <span className="text-xl font-bold">{value}</span>
      <span
        className="text-sm font-semibold"
        style={{ color: positive ? "var(--sv-gain)" : "var(--sv-loss)" }}
      >
        {change}
      </span>
    </div>
  </Card>
);

export default DashboardPage;
