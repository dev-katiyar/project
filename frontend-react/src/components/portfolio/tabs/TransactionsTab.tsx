import React, { useState, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { type Transaction, fmtUSDFull } from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[];
  portfolioId: number | string;
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | Date | undefined): string => {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d as string);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Cell renderers ───────────────────────────────────────────────────────────

const SymbolCell: React.FC<{ row: Transaction }> = ({ row }) => (
  <div>
    <div className="sv-text-accent font-bold text-sm">{row.symbol}</div>
    {row.name && (
      <div
        className="sv-text-muted text-xs white-space-nowrap overflow-hidden text-overflow-ellipsis"
        style={{ maxWidth: "180px" }}
      >
        {row.name}
      </div>
    )}
  </div>
);

const SideCell: React.FC<{ row: Transaction }> = ({ row }) => (
  <Tag
    value={row.side}
    severity={row.side?.toLowerCase() === "buy" ? "success" : "danger"}
    className="text-xs"
  />
);

// ─── Summary stats ────────────────────────────────────────────────────────────

const TransactionStats: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const buys = transactions.filter((t) => t.side?.toLowerCase() === "buy");
  const sells = transactions.filter((t) => t.side?.toLowerCase() === "sell");
  const totalBuyValue = buys.reduce((s, t) => s + (t.qty ?? 0) * (t.price ?? 0), 0);
  const totalSellValue = sells.reduce((s, t) => s + (t.qty ?? 0) * (t.price ?? 0), 0);

  return (
    <div
      className="flex gap-4 flex-wrap px-3 py-2 text-sm"
      style={{ background: "var(--sv-bg-surface)", borderBottom: "1px solid var(--sv-border)" }}
    >
      <span className="sv-text-muted">
        Total: <strong className="text-color">{transactions.length}</strong>
      </span>
      <span className="sv-text-muted">
        Buys: <strong className="sv-text-gain">{buys.length}</strong>
        {totalBuyValue > 0 && (
          <span className="sv-text-muted ml-1">({fmtUSDFull(totalBuyValue)})</span>
        )}
      </span>
      <span className="sv-text-muted">
        Sells: <strong className="sv-text-loss">{sells.length}</strong>
        {totalSellValue > 0 && (
          <span className="sv-text-muted ml-1">({fmtUSDFull(totalSellValue)})</span>
        )}
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const TransactionsTab: React.FC<Props> = ({ transactions }) => {
  const [globalFilter, setGlobalFilter] = useState("");

  const sorted = useMemo(
    () =>
      [...(transactions ?? [])].sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date as string);
        const db = b.date instanceof Date ? b.date : new Date(b.date as string);
        return db.getTime() - da.getTime();
      }),
    [transactions],
  );

  if (!sorted || sorted.length === 0) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 py-8 sv-text-muted">
        <i className="pi pi-list" style={{ fontSize: "2.5rem" }} />
        <div className="text-sm">No transactions found</div>
      </div>
    );
  }

  return (
    <div>
      <TransactionStats transactions={sorted} />

      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--sv-border)" }}>
        <div className="relative" style={{ display: "inline-block" }}>
          <i className="pi pi-search sv-input-icon-left" />
          <InputText
            className="sv-search-input"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search symbol…"
          />
        </div>
      </div>

      <DataTable
        value={sorted}
        size="small"
        stripedRows
        rowHover
        dataKey="id"
        globalFilter={globalFilter}
        globalFilterFields={["symbol", "name"]}
        scrollable
        scrollHeight="430px"
        paginator
        rows={15}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        emptyMessage="No transactions found"
      >
        <Column
          field="date"
          header="Date"
          body={(r: Transaction) => (
            <div className="text-sm text-color-secondary white-space-nowrap">{fmtDate(r.date)}</div>
          )}
          sortable
          style={{ minWidth: "120px" }}
        />
        <Column
          field="symbol"
          header="Symbol"
          body={(r: Transaction) => <SymbolCell row={r} />}
          sortable
          style={{ minWidth: "160px" }}
        />
        <Column
          field="side"
          header="Action"
          body={(r: Transaction) => <SideCell row={r} />}
          style={{ minWidth: "80px" }}
        />
        <Column
          field="qty"
          header="Qty"
          body={(r: Transaction) => (
            <div className="text-right text-sm">
              {(r.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </div>
          )}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "80px" }}
        />
        <Column
          field="price"
          header="Price"
          body={(r: Transaction) => (
            <div className="text-right font-semibold text-sm">{fmtUSDFull(r.price ?? 0)}</div>
          )}
          pt={{ headerContent: { className: "justify-content-end" } }}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          header="Total Value"
          body={(r: Transaction) => (
            <div
              className={`text-right font-semibold text-sm ${r.side?.toLowerCase() === "buy" ? "sv-text-gain" : "sv-text-loss"}`}
            >
              {fmtUSDFull((r.qty ?? 0) * (r.price ?? 0))}
            </div>
          )}
          pt={{ headerContent: { className: "justify-content-end" } }}
          style={{ minWidth: "120px" }}
        />
        {sorted.some((t) => t.fees) && (
          <Column
            field="fees"
            header="Fees"
            body={(r: Transaction) => (
              <div className="text-right text-xs sv-text-muted">
                {r.fees ? fmtUSDFull(r.fees) : "—"}
              </div>
            )}
            pt={{ headerContent: { className: "justify-content-end" } }}
            style={{ minWidth: "80px" }}
          />
        )}
        {sorted.some((t) => t.sector) && (
          <Column
            field="sector"
            header="Sector"
            body={(r: Transaction) => (
              <div className="text-xs sv-text-muted">{r.sector ?? "—"}</div>
            )}
            style={{ minWidth: "120px" }}
          />
        )}
      </DataTable>
    </div>
  );
};

export default TransactionsTab;
