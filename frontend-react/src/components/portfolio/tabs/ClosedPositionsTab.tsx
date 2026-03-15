import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { type ClosedPosition, fmtUSD, fmtUSDFull, fmtPct, gainColor } from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  positions: ClosedPosition[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── Cell renderers ───────────────────────────────────────────────────────────

const SymbolCell: React.FC<{ row: ClosedPosition }> = ({ row }) => (
  <div>
    <div className="font-bold text-sm">{row.symbol}</div>
    {row.name && (
      <div
        className="text-xs sv-text-muted overflow-hidden white-space-nowrap text-overflow-ellipsis"
        style={{ maxWidth: "180px" }}
      >
        {row.name}
      </div>
    )}
  </div>
);

const PnlCell: React.FC<{ row: ClosedPosition }> = ({ row }) => (
  <div className="text-right">
    <div className="font-bold text-sm" style={{ color: gainColor(row.pnl) }}>
      {fmtUSD(row.pnl)}
    </div>
    {row.pnlPercent !== undefined && (
      <div className="text-xs" style={{ color: gainColor(row.pnlPercent) }}>
        {fmtPct(row.pnlPercent)}
      </div>
    )}
  </div>
);

// ─── Summary ─────────────────────────────────────────────────────────────────

const ClosedSummary: React.FC<{ positions: ClosedPosition[] }> = ({ positions }) => {
  const totalPnl = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const winners = positions.filter((p) => p.pnl > 0).length;
  const winRate = positions.length > 0 ? ((winners / positions.length) * 100).toFixed(0) : "0";

  return (
    <div
      className="flex gap-4 flex-wrap px-3 py-2 text-sm surface-overlay"
      style={{ borderBottom: "1px solid var(--sv-border)" }}
    >
      <span className="sv-text-muted">
        Closed Trades: <strong className="text-color">{positions.length}</strong>
      </span>
      <span className="sv-text-muted">
        Realized P&L:{" "}
        <strong style={{ color: gainColor(totalPnl) }}>{fmtUSD(totalPnl)}</strong>
      </span>
      <span className="sv-text-muted">
        Win Rate:{" "}
        <strong style={{ color: Number(winRate) >= 50 ? "var(--sv-gain)" : "var(--sv-loss)" }}>
          {winRate}%
        </strong>
      </span>
      <span className="sv-text-muted">
        Winners: <strong className="sv-text-gain">{winners}</strong>
        {" / "}
        Losers: <strong className="sv-text-loss">{positions.length - winners}</strong>
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ClosedPositionsTab: React.FC<Props> = ({ positions }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 py-8 sv-text-muted">
        <i className="pi pi-check-circle" style={{ fontSize: "2.5rem" }} />
        <div className="text-sm">No closed positions</div>
      </div>
    );
  }

  return (
    <div>
      <ClosedSummary positions={positions} />

      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--sv-border)" }}>
        <span className="relative">
          <i className="pi pi-search sv-input-icon-left" />
          <InputText
            className="sv-search-input sv-input-pl-icon"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search symbol…"
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
        globalFilterFields={["symbol", "name"]}
        scrollable
        scrollHeight="430px"
        paginator
        rows={15}
        rowsPerPageOptions={[10, 15, 25]}
        sortField="pnl"
        sortOrder={-1}
        emptyMessage="No closed positions match your search"
      >
        <Column
          field="symbol"
          header="Symbol"
          body={(r: ClosedPosition) => <SymbolCell row={r} />}
          sortable
          style={{ minWidth: "180px" }}
        />
        {positions.some((p) => p.side) && (
          <Column
            field="side"
            header="Side"
            body={(r: ClosedPosition) =>
              r.side ? (
                <Tag
                  value={r.side}
                  severity={r.side?.toLowerCase() === "buy" ? "success" : "danger"}
                  className="text-xs"
                />
              ) : null
            }
            style={{ minWidth: "80px" }}
          />
        )}
        <Column
          field="qty"
          header="Qty"
          body={(r: ClosedPosition) => (
            <div className="text-right text-sm">
              {(r.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </div>
          )}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "80px" }}
        />
        {positions.some((p) => p.buyPrice) && (
          <Column
            field="buyPrice"
            header="Buy Price"
            body={(r: ClosedPosition) => (
              <div className="text-right text-xs text-color-secondary">
                {r.buyPrice ? fmtUSDFull(r.buyPrice) : "—"}
              </div>
            )}
            pt={{ headerContent: { className: "justify-content-end" } }}
            sortable
            style={{ minWidth: "100px" }}
          />
        )}
        {positions.some((p) => p.sellPrice) && (
          <Column
            field="sellPrice"
            header="Sell Price"
            body={(r: ClosedPosition) => (
              <div className="text-right text-xs text-color-secondary">
                {r.sellPrice ? fmtUSDFull(r.sellPrice) : "—"}
              </div>
            )}
            pt={{ headerContent: { className: "justify-content-end" } }}
            sortable
            style={{ minWidth: "100px" }}
          />
        )}
        <Column
          field="pnl"
          header="Realized P&L"
          body={(r: ClosedPosition) => <PnlCell row={r} />}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "130px" }}
        />
        {positions.some((p) => p.openDate) && (
          <Column
            field="openDate"
            header="Open Date"
            body={(r: ClosedPosition) => (
              <div className="text-xs sv-text-muted white-space-nowrap">
                {fmtDate(r.openDate)}
              </div>
            )}
            sortable
            style={{ minWidth: "120px" }}
          />
        )}
        {positions.some((p) => p.closeDate) && (
          <Column
            field="closeDate"
            header="Close Date"
            body={(r: ClosedPosition) => (
              <div className="text-xs sv-text-muted white-space-nowrap">
                {fmtDate(r.closeDate)}
              </div>
            )}
            sortable
            style={{ minWidth: "120px" }}
          />
        )}
      </DataTable>
    </div>
  );
};

export default ClosedPositionsTab;
