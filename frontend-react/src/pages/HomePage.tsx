import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";

/**
 * Public landing page — matches the SimpleVisor AI hero layout from the design.
 * Uses PrimeReact components + PrimeFlex utility classes exclusively.
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-6 px-2">
      {/* Hero Section */}
      <section className="mb-6 mx-auto" style={{ maxWidth: 800 }}>
        <h1
          className="text-5xl font-bold line-height-1 mb-3"
          style={{ letterSpacing: "-0.02em", color: "var(--sv-text-primary)" }}
        >
          Access the same AI-enhanced tools that RIA&apos;s Professional
          Advisors use daily.
        </h1>
        <p
          className="text-lg mx-auto mb-5"
          style={{ maxWidth: 620, color: "var(--sv-text-secondary)" }}
        >
          Decades of portfolio management expertise, accelerated by cutting-edge
          artificial intelligence — now available to DIY investors.
        </p>

        <div className="flex gap-3 justify-content-center flex-wrap">
          <Button
            label="Start Your Free 30-Day Trial"
            icon="pi pi-arrow-right"
            iconPos="right"
            className="p-button-primary p-button-lg"
            onClick={() => navigate("/signup")}
          />
          <Button
            label="Watch Demo"
            icon="pi pi-play"
            className="p-button-outlined p-button-lg"
            onClick={() => navigate("/login")}
          />
        </div>
      </section>

      {/* Trust Badges */}
      <section className="flex gap-4 justify-content-center flex-wrap mb-6">
        <TrustBadge icon="pi pi-shield" text="Custodied at Fidelity" />
        <TrustBadge icon="pi pi-bolt" text="Human Expertise + AI Power" />
        <TrustBadge icon="pi pi-chart-line" text="Advisor-Developed Tools" />
      </section>

      {/* Dashboard Preview Card */}
      <section className="mx-auto" style={{ maxWidth: 1000 }}>
        <Card>
          <div className="flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <span className="font-semibold">SimpleVisor AI Dashboard</span>
            <span>
              Market Status:{" "}
              <span style={{ color: "var(--sv-gain)" }}>● Open</span>
            </span>
          </div>

          <div className="grid text-left">
            {/* Column 1: Market Data */}
            <div className="col-12 md:col-4">
              <div
                className="font-semibold text-sm mb-3"
                style={{ color: "var(--sv-text-secondary)" }}
              >
                Advisor-Enhanced Analysis
              </div>
              <MarketRow label="S&P 500" value="5,234.18" change="+1.23%" />
              <MarketRow label="NASDAQ" value="16,428.82" change="+1.87%" />
              <MarketRow label="DOW" value="39,127.80" change="+0.54%" />
            </div>

            {/* Column 2: AI Sentiment */}
            <div className="col-12 md:col-4 text-center">
              <div
                className="font-semibold text-sm mb-3"
                style={{ color: "var(--sv-text-secondary)" }}
              >
                AI Sentiment Score
              </div>
              <div
                className="border-circle flex flex-column align-items-center justify-content-center mx-auto mb-2"
                style={{
                  width: 120,
                  height: 120,
                  border: "4px solid var(--sv-accent)",
                }}
              >
                <span
                  className="text-3xl font-bold"
                  style={{ color: "var(--sv-accent)" }}
                >
                  72
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--sv-text-secondary)" }}
                >
                  Bullish
                </span>
              </div>
              <span
                className="text-xs"
                style={{ color: "var(--sv-text-muted)" }}
              >
                AI confidence: High
              </span>
            </div>

            {/* Column 3: Insights */}
            <div className="col-12 md:col-4">
              <div
                className="font-semibold text-sm mb-3"
                style={{ color: "var(--sv-text-secondary)" }}
              >
                Professional Insights
              </div>
              <InsightRow
                icon="pi pi-circle-fill text-red-400"
                text="3 stocks match your criteria"
              />
              <InsightRow
                icon="pi pi-bolt text-yellow-400"
                text="Unusual options activity in NVDA"
              />
              <InsightRow
                icon="pi pi-chart-bar text-blue-400"
                text="Sector rotation detected"
              />
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

/* --- Helper components (page-local) --- */

const TrustBadge: React.FC<{ icon: string; text: string }> = ({
  icon,
  text,
}) => (
  <span
    className="flex align-items-center gap-2"
    style={{ color: "var(--sv-text-secondary)", fontSize: "0.9rem" }}
  >
    <i className={icon} /> {text}
  </span>
);

const MarketRow: React.FC<{ label: string; value: string; change: string }> = ({
  label,
  value,
  change,
}) => (
  <div
    className="flex justify-content-between py-2"
    style={{ borderBottom: "1px solid var(--sv-border-light)" }}
  >
    <span>{label}</span>
    <div className="text-right">
      <div className="font-semibold">{value}</div>
      <div className="text-sm" style={{ color: "var(--sv-gain)" }}>
        {change}
      </div>
    </div>
  </div>
);

const InsightRow: React.FC<{ icon: string; text: string }> = ({
  icon,
  text,
}) => (
  <div className="flex align-items-center gap-2 py-2">
    <i className={icon} />
    <span className="text-sm">{text}</span>
  </div>
);

export default HomePage;
