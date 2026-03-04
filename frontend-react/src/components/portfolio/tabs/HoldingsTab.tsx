import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { type Position, fmtUSD, fmtUSDFull, fmtPct, gainColor } from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  positions: Position[];
  portfolioId: number | string;
  currentCash: number;
  startingCash: number;
  onRefresh: () => void;
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

const SymbolCell: React.FC<{ row: Position }> = ({ row }) => (
  <div>
    <div style={{ fontWeight: 700, color: "var(--sv-accent)", fontSize: "0.9rem" }}>
      {row.symbol}
    </div>
    {row.name && (
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--sv-text-muted)",
          maxWidth: "180px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.name}
      </div>
    )}
    {row.sector && (
      <div style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", marginTop: "0.1rem" }}>
        {row.sector}
      </div>
    )}
  </div>
);

const TypeCell: React.FC<{ row: Position }> = ({ row }) => (
  <Tag
    value={row.type ?? row.side}
    severity={row.type === "Long" ? "success" : "danger"}
    style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
  />
);

const PriceCell: React.FC<{ row: Position }> = ({ row }) => (
  <div className="text-right">
    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--sv-text-primary)" }}>
      {fmtUSDFull(row.currentPrice ?? 0)}
    </div>
    {row.changePct !== undefined && (
      <div style={{ fontSize: "0.72rem", color: gainColor(row.changePct) }}>
        {fmtPct(row.changePct)}
      </div>
    )}
  </div>
);

const ValueCell: React.FC<{ row: Position }> = ({ row }) => (
  <div className="text-right">
    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--sv-text-primary)" }}>
      {fmtUSD(row.currentValue)}
    </div>
    {(row.percentageShare ?? 0) > 0 && (
      <div style={{ marginTop: "0.2rem" }}>
        <ProgressBar
          value={Math.min(100, row.percentageShare ?? 0)}
          showValue={false}
          style={{ height: "4px", borderRadius: "2px" }}
          color="var(--sv-accent)"
        />
        <div style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", textAlign: "right" }}>
          {(row.percentageShare ?? 0).toFixed(1)}%
        </div>
      </div>
    )}
  </div>
);

const PnlCell: React.FC<{ row: Position }> = ({ row }) => (
  <div className="text-right">
    <div
      style={{
        fontWeight: 700,
        fontSize: "0.85rem",
        color: gainColor(row.pnl),
      }}
    >
      {fmtUSD(row.pnl)}
    </div>
    {row.pnlPercent !== undefined && (
      <div style={{ fontSize: "0.72rem", color: gainColor(row.pnlPercent) }}>
        {fmtPct(row.pnlPercent)}
      </div>
    )}
  </div>
);

// ─── Summary footer row ───────────────────────────────────────────────────────

const SummaryBar: React.FC<{ positions: Position[]; currentCash: number }> = ({
  positions,
  currentCash,
}) => {
  const totalValue = positions.reduce((s, p) => s + (p.currentValue ?? 0), 0);
  const totalPnl = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);

  return (
    <div
      className="flex gap-3 flex-wrap"
      style={{
        padding: "0.6rem 1rem",
        background: "var(--sv-bg-surface)",
        borderTop: "1px solid var(--sv-border)",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "var(--sv-text-muted)" }}>
        {positions.length} position{positions.length !== 1 ? "s" : ""}
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Invested:{" "}
        <strong style={{ color: "var(--sv-text-primary)" }}>{fmtUSD(totalValue)}</strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Total P&L:{" "}
        <strong style={{ color: gainColor(totalPnl) }}>{fmtUSD(totalPnl)}</strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Cash:{" "}
        <strong style={{ color: "var(--sv-text-primary)" }}>{fmtUSD(currentCash)}</strong>
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const HoldingsTab: React.FC<Props> = ({ positions, currentCash }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  if (!positions || positions.length === 0) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center gap-3"
        style={{ padding: "4rem 1rem", color: "var(--sv-text-muted)" }}
      >
        <i className="pi pi-inbox" style={{ fontSize: "2.5rem" }} />
        <div style={{ fontSize: "0.9rem" }}>No open positions</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--sv-border)",
        }}
      >
        <span className="p-input-icon-left" style={{ width: "280px" }}>
          <i className="pi pi-search" style={{ color: "var(--sv-text-muted)" }} />
          <input
            className="p-inputtext p-component"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search symbol, name, sector…"
            style={{
              paddingLeft: "2.2rem",
              width: "100%",
              background: "var(--sv-bg-surface)",
              border: "1px solid var(--sv-border)",
              borderRadius: "8px",
              color: "var(--sv-text-primary)",
              fontSize: "0.82rem",
              padding: "0.45rem 0.75rem 0.45rem 2.2rem",
            }}
          />
        </span>
      </div>

      <DataTable
        value={positions}
        size="small"
        stripedRows
        rowHover
        dataKey="symbol"
        globalFilter={globalFilter}
        globalFilterFields={["symbol", "name", "sector", "industry"]}
        scrollable
        scrollHeight="450px"
        sortField="percentageShare"
        sortOrder={-1}
        emptyMessage="No positions match your search"
      >
        <Column
          field="symbol"
          header="Symbol / Name"
          body={(r: Position) => <SymbolCell row={r} />}
          sortable
          style={{ minWidth: "180px" }}
        />
        <Column
          field="type"
          header="Type"
          body={(r: Position) => <TypeCell row={r} />}
          style={{ minWidth: "80px" }}
        />
        <Column
          field="qty"
          header="Qty"
          body={(r: Position) => (
            <div className="text-right" style={{ fontSize: "0.85rem", color: "var(--sv-text-primary)" }}>
              {(r.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "80px" }}
        />
        <Column
          field="avgCost"
          header="Avg Cost"
          body={(r: Position) => (
            <div className="text-right" style={{ fontSize: "0.85rem", color: "var(--sv-text-secondary)" }}>
              {fmtUSDFull(r.avgCost ?? 0)}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="currentPrice"
          header="Current Price"
          body={(r: Position) => <PriceCell row={r} />}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "120px" }}
        />
        <Column
          field="currentValue"
          header="Market Value"
          body={(r: Position) => <ValueCell row={r} />}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "150px" }}
        />
        <Column
          field="pnl"
          header="P&L"
          body={(r: Position) => <PnlCell row={r} />}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "110px" }}
        />
        {positions.some((p) => p.dividendYield) && (
          <Column
            field="dividendYield"
            header="Div Yield"
            body={(r: Position) =>
              r.dividendYield ? (
                <div className="text-right" style={{ fontSize: "0.82rem", color: "var(--sv-success)" }}>
                  {(r.dividendYield * 100).toFixed(2)}%
                </div>
              ) : (
                <div className="text-right" style={{ color: "var(--sv-text-muted)", fontSize: "0.82rem" }}>
                  —
                </div>
              )
            }
            headerStyle={{ textAlign: "right" }}
            sortable
            style={{ minWidth: "100px" }}
          />
        )}
      </DataTable>

      <SummaryBar positions={positions} currentCash={currentCash} />
    </div>
  );
};

export default HoldingsTab;
