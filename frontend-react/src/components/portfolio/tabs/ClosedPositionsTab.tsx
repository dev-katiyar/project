import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
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
    <div style={{ fontWeight: 700, color: "var(--sv-text-primary)", fontSize: "0.88rem" }}>
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
  </div>
);

const PnlCell: React.FC<{ row: ClosedPosition }> = ({ row }) => (
  <div className="text-right">
    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: gainColor(row.pnl) }}>
      {fmtUSD(row.pnl)}
    </div>
    {row.pnlPercent !== undefined && (
      <div style={{ fontSize: "0.72rem", color: gainColor(row.pnlPercent) }}>
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
      className="flex gap-4 flex-wrap"
      style={{
        padding: "0.6rem 1rem",
        background: "var(--sv-bg-surface)",
        borderBottom: "1px solid var(--sv-border)",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "var(--sv-text-muted)" }}>
        Closed Trades:{" "}
        <strong style={{ color: "var(--sv-text-primary)" }}>{positions.length}</strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Realized P&L:{" "}
        <strong style={{ color: gainColor(totalPnl) }}>{fmtUSD(totalPnl)}</strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Win Rate:{" "}
        <strong style={{ color: Number(winRate) >= 50 ? "var(--sv-gain)" : "var(--sv-loss)" }}>
          {winRate}%
        </strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Winners: <strong style={{ color: "var(--sv-gain)" }}>{winners}</strong>
        {" / "}
        Losers: <strong style={{ color: "var(--sv-loss)" }}>{positions.length - winners}</strong>
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ClosedPositionsTab: React.FC<Props> = ({ positions }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  if (!positions || positions.length === 0) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center gap-3"
        style={{ padding: "4rem 1rem", color: "var(--sv-text-muted)" }}
      >
        <i className="pi pi-check-circle" style={{ fontSize: "2.5rem" }} />
        <div style={{ fontSize: "0.9rem" }}>No closed positions</div>
      </div>
    );
  }

  return (
    <div>
      <ClosedSummary positions={positions} />

      {/* Search */}
      <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--sv-border)" }}>
        <span className="p-input-icon-left">
          <i className="pi pi-search" style={{ color: "var(--sv-text-muted)" }} />
          <input
            className="p-inputtext p-component"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search symbol…"
            style={{
              paddingLeft: "2.2rem",
              width: "240px",
              background: "var(--sv-bg-surface)",
              border: "1px solid var(--sv-border)",
              borderRadius: "8px",
              color: "var(--sv-text-primary)",
              fontSize: "0.82rem",
              padding: "0.4rem 0.75rem 0.4rem 2.2rem",
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
                  style={{ fontSize: "0.7rem" }}
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
            <div className="text-right" style={{ fontSize: "0.85rem" }}>
              {(r.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "80px" }}
        />
        {positions.some((p) => p.buyPrice) && (
          <Column
            field="buyPrice"
            header="Buy Price"
            body={(r: ClosedPosition) => (
              <div className="text-right" style={{ fontSize: "0.82rem", color: "var(--sv-text-secondary)" }}>
                {r.buyPrice ? fmtUSDFull(r.buyPrice) : "—"}
              </div>
            )}
            headerStyle={{ textAlign: "right" }}
            sortable
            style={{ minWidth: "100px" }}
          />
        )}
        {positions.some((p) => p.sellPrice) && (
          <Column
            field="sellPrice"
            header="Sell Price"
            body={(r: ClosedPosition) => (
              <div className="text-right" style={{ fontSize: "0.82rem", color: "var(--sv-text-secondary)" }}>
                {r.sellPrice ? fmtUSDFull(r.sellPrice) : "—"}
              </div>
            )}
            headerStyle={{ textAlign: "right" }}
            sortable
            style={{ minWidth: "100px" }}
          />
        )}
        <Column
          field="pnl"
          header="Realized P&L"
          body={(r: ClosedPosition) => <PnlCell row={r} />}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "130px" }}
        />
        {positions.some((p) => p.openDate) && (
          <Column
            field="openDate"
            header="Open Date"
            body={(r: ClosedPosition) => (
              <div style={{ fontSize: "0.8rem", color: "var(--sv-text-muted)", whiteSpace: "nowrap" }}>
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
              <div style={{ fontSize: "0.8rem", color: "var(--sv-text-muted)", whiteSpace: "nowrap" }}>
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
