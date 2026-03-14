import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { InputText } from "primereact/inputtext";
import {
  type Position,
  fmtUSD,
  fmtUSDFull,
  fmtPct,
} from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  positions: Position[];
  portfolioId: number | string;
  currentCash: number;
  startingCash: number;
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gainClass = (val: number | undefined) =>
  (val ?? 0) >= 0 ? "sv-text-gain" : "sv-text-loss";

// ─── Cell renderers ───────────────────────────────────────────────────────────

const SymbolCell: React.FC<{ row: Position }> = ({ row }) => (
  <div>
    <div className="font-bold sv-text-accent text-sm">{row.symbol}</div>
    {row.name && (
      <div
        className="text-xs sv-text-muted overflow-hidden white-space-nowrap"
        style={{ maxWidth: "180px", textOverflow: "ellipsis" }}
      >
        {row.name}
      </div>
    )}
    {row.sector && (
      <div className="text-xs sv-text-muted mt-1">{row.sector}</div>
    )}
  </div>
);

const TypeCell: React.FC<{ row: Position }> = ({ row }) => (
  <Tag
    value={row.type ?? row.side}
    severity={row.type === "Long" ? "success" : "danger"}
    className="text-xs"
  />
);

const PriceCell: React.FC<{ row: Position }> = ({ row }) => (
  <div className="text-right">
    <div className="font-semibold text-sm">
      {fmtUSDFull(row.currentPrice ?? 0)}
    </div>
    {row.changePct !== undefined && (
      <div className={`text-xs ${gainClass(row.changePct)}`}>
        {fmtPct(row.changePct)}
      </div>
    )}
  </div>
);

const ValueCell: React.FC<{ row: Position }> = ({ row }) => (
  <div className="text-right">
    <div className="font-semibold text-sm">{fmtUSD(row.currentValue)}</div>
    {(row.percentageShare ?? 0) > 0 && (
      <div className="mt-1">
        <ProgressBar
          value={Math.min(100, row.percentageShare ?? 0)}
          showValue={false}
          style={{ height: "4px", borderRadius: "2px" }}
          color="var(--sv-accent)"
        />
        <div className="text-xs sv-text-muted text-right">
          {(row.percentageShare ?? 0).toFixed(1)}%
        </div>
      </div>
    )}
  </div>
);

const PnlCell: React.FC<{ row: Position }> = ({ row }) => (
  <div className="text-right">
    <div className={`font-bold text-sm ${gainClass(row.pnl)}`}>
      {fmtUSD(row.pnl)}
    </div>
    {row.pnlPercent !== undefined && (
      <div className={`text-xs ${gainClass(row.pnlPercent)}`}>
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
      className="flex gap-3 flex-wrap align-items-center text-sm"
      style={{
        padding: "0.6rem 1rem",
        background: "var(--sv-bg-surface)",
        borderTop: "1px solid var(--sv-border)",
      }}
    >
      <span className="sv-text-muted">
        {positions.length} position{positions.length !== 1 ? "s" : ""}
      </span>
      <span className="sv-text-muted">
        Invested: <strong>{fmtUSD(totalValue)}</strong>
      </span>
      <span className="sv-text-muted">
        Total P&L:{" "}
        <strong className={gainClass(totalPnl)}>{fmtUSD(totalPnl)}</strong>
      </span>
      <span className="sv-text-muted">
        Cash: <strong>{fmtUSD(currentCash)}</strong>
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const HoldingsTab: React.FC<Props> = ({ positions, currentCash }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 sv-text-muted p-6">
        <i className="pi pi-inbox" style={{ fontSize: "2.5rem" }} />
        <div className="text-sm">No open positions</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div
        className="py-2 px-3"
        style={{ borderBottom: "1px solid var(--sv-border)" }}
      >
        <div className="relative" style={{ display: "inline-block" }}>
          <i className="pi pi-search sv-input-icon-left" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search symbol, name, sector…"
            className="sv-search-input"
          />
        </div>
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
          style={{ minWidth: "180px", paddingLeft: "0.75rem" }}
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
            <div className="text-right text-sm">
              {(r.qty ?? 0).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}
            </div>
          )}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "80px" }}
        />
        <Column
          field="price"
          header="Avg Cost"
          body={(r: Position) => (
            <div
              className="text-right text-sm"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              {fmtUSDFull(r.price ?? 0)}
            </div>
          )}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="currentPrice"
          header="Current Price"
          body={(r: Position) => <PriceCell row={r} />}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "120px" }}
        />
        <Column
          field="currentValue"
          header="Market Value"
          body={(r: Position) => <ValueCell row={r} />}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "150px" }}
        />
        <Column
          field="pnl"
          header="P&L"
          body={(r: Position) => <PnlCell row={r} />}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "110px" }}
        />
        <Column
          field="dividendYield"
          header="Div Yield"
          body={(r: Position) =>
            r.dividendYield ? (
              <div className="text-right text-sm sv-text-gain">
                {r.dividendYield!.toFixed(2)}%
              </div>
            ) : (
              <div className="text-right text-sm sv-text-muted">—</div>
            )
          }
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "100px", paddingRight: "0.75rem" }}
        />
      </DataTable>

      <SummaryBar positions={positions} currentCash={currentCash} />
    </div>
  );
};

export default HoldingsTab;
