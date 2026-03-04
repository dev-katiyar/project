import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Skeleton } from "primereact/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Portfolio {
  portfolioid: number | string;
  name: string;
  startingCash: number;
  pnl: number;
  pnlPercent: number;
  dailyPnl: number;
  dailyPnlPercentage: number;
  portfolioValue: number;
  dividend: number;
  currentCash: number;
  portfolio_type?: string;
}

interface Props {
  portfolios: Portfolio[];
  loading?: boolean;
  selected?: Portfolio | null;
  onSelect?: (p: Portfolio) => void;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtUSD = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v ?? 0);

const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${(v ?? 0).toFixed(2)}%`;

const gainColor = (v: number) =>
  v > 0
    ? "var(--sv-gain)"
    : v < 0
    ? "var(--sv-loss)"
    : "var(--sv-text-secondary)";

// ─── Column body renderers ─────────────────────────────────────────────────

const NameBody: React.FC<{ row: Portfolio }> = ({ row }) => (
  <span className="font-semibold" style={{ color: "var(--sv-accent)" }}>
    {row.name}
  </span>
);

const UsdBody: React.FC<{ value: number }> = ({ value }) => (
  <div className="text-right" style={{ color: "var(--sv-text-primary)" }}>
    {fmtUSD(value)}
  </div>
);

const PnlBody: React.FC<{ pnl: number; pct: number }> = ({ pnl, pct }) => (
  <div className="text-right">
    <div className="font-semibold" style={{ color: gainColor(pnl) }}>
      {fmtUSD(pnl)}
    </div>
    <div style={{ fontSize: "0.78rem", color: gainColor(pct) }}>
      {fmtPct(pct)}
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const PortfolioSummaryTable: React.FC<Props> = ({
  portfolios,
  loading = false,
  selected,
  onSelect,
}) => {
  if (loading) {
    return (
      <div style={{ padding: "0.75rem 1rem" }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="2.8rem" className="mb-2" borderRadius="6px" />
        ))}
      </div>
    );
  }

  if (!portfolios || portfolios.length === 0) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center gap-2"
        style={{ padding: "3rem 1rem", minHeight: "10rem" }}
      >
        <i
          className="pi pi-briefcase"
          style={{ fontSize: "2.2rem", color: "var(--sv-text-muted)" }}
        />
        <span style={{ color: "var(--sv-text-muted)", fontSize: "0.875rem" }}>
          No portfolios available
        </span>
      </div>
    );
  }

  return (
    <DataTable
      value={portfolios}
      size="small"
      stripedRows
      rowHover
      dataKey="portfolioid"
      selectionMode="single"
      selection={selected ?? null}
      onSelectionChange={(e) => onSelect?.(e.value as Portfolio)}
      style={{ cursor: "pointer" }}
      scrollable
    >
      <Column
        field="name"
        header="Portfolio"
        body={(r: Portfolio) => <NameBody row={r} />}
        style={{ minWidth: "200px" }}
      />
      <Column
        field="startingCash"
        header="Starting Cash"
        body={(r: Portfolio) => <UsdBody value={r.startingCash} />}
        headerStyle={{ textAlign: "right" }}
        style={{ minWidth: "130px" }}
      />
      <Column
        header="P&L (Inception)"
        body={(r: Portfolio) => <PnlBody pnl={r.pnl} pct={r.pnlPercent} />}
        headerStyle={{ textAlign: "right" }}
        style={{ minWidth: "150px" }}
      />
      <Column
        header="Today's P&L"
        body={(r: Portfolio) => (
          <PnlBody pnl={r.dailyPnl} pct={r.dailyPnlPercentage} />
        )}
        headerStyle={{ textAlign: "right" }}
        style={{ minWidth: "140px" }}
      />
      <Column
        field="portfolioValue"
        header="Market Value"
        body={(r: Portfolio) => <UsdBody value={r.portfolioValue} />}
        headerStyle={{ textAlign: "right" }}
        style={{ minWidth: "140px" }}
      />
      <Column
        field="dividend"
        header="Dividends"
        body={(r: Portfolio) => <UsdBody value={r.dividend} />}
        headerStyle={{ textAlign: "right" }}
        style={{ minWidth: "120px" }}
      />
      <Column
        field="currentCash"
        header="Cash"
        body={(r: Portfolio) => <UsdBody value={r.currentCash} />}
        headerStyle={{ textAlign: "right" }}
        style={{ minWidth: "120px" }}
      />
    </DataTable>
  );
};

export default PortfolioSummaryTable;
