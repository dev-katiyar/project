import React, { useState, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { type Transaction, fmtUSDFull, gainColor } from "@/components/portfolio/PortfolioDetailPanel";

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
    <div style={{ fontWeight: 700, color: "var(--sv-accent)", fontSize: "0.88rem" }}>
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

const SideCell: React.FC<{ row: Transaction }> = ({ row }) => (
  <Tag
    value={row.side}
    severity={row.side?.toLowerCase() === "buy" ? "success" : "danger"}
    style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
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
      className="flex gap-4 flex-wrap"
      style={{
        padding: "0.6rem 1rem",
        background: "var(--sv-bg-surface)",
        borderBottom: "1px solid var(--sv-border)",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "var(--sv-text-muted)" }}>
        Total:{" "}
        <strong style={{ color: "var(--sv-text-primary)" }}>{transactions.length}</strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Buys:{" "}
        <strong style={{ color: "var(--sv-gain)" }}>{buys.length}</strong>
        {totalBuyValue > 0 && (
          <span style={{ color: "var(--sv-text-muted)", marginLeft: "0.25rem" }}>
            ({fmtUSDFull(totalBuyValue)})
          </span>
        )}
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Sells:{" "}
        <strong style={{ color: "var(--sv-loss)" }}>{sells.length}</strong>
        {totalSellValue > 0 && (
          <span style={{ color: "var(--sv-text-muted)", marginLeft: "0.25rem" }}>
            ({fmtUSDFull(totalSellValue)})
          </span>
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
      <div
        className="flex flex-column align-items-center justify-content-center gap-3"
        style={{ padding: "4rem 1rem", color: "var(--sv-text-muted)" }}
      >
        <i className="pi pi-list" style={{ fontSize: "2.5rem" }} />
        <div style={{ fontSize: "0.9rem" }}>No transactions found</div>
      </div>
    );
  }

  return (
    <div>
      <TransactionStats transactions={sorted} />

      {/* Search */}
      <div
        style={{
          padding: "0.6rem 1rem",
          borderBottom: "1px solid var(--sv-border)",
        }}
      >
        <span className="p-input-icon-left">
          <i className="pi pi-search" style={{ color: "var(--sv-text-muted)" }} />
          <input
            className="p-inputtext p-component"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search symbol…"
            style={{
              paddingLeft: "2.2rem",
              width: "250px",
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
            <div style={{ fontSize: "0.82rem", color: "var(--sv-text-secondary)", whiteSpace: "nowrap" }}>
              {fmtDate(r.date)}
            </div>
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
            <div className="text-right" style={{ fontSize: "0.85rem" }}>
              {(r.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "80px" }}
        />
        <Column
          field="price"
          header="Price"
          body={(r: Transaction) => (
            <div className="text-right" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              {fmtUSDFull(r.price ?? 0)}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          header="Total Value"
          body={(r: Transaction) => (
            <div
              className="text-right"
              style={{
                fontWeight: 600,
                fontSize: "0.85rem",
                color:
                  r.side?.toLowerCase() === "buy"
                    ? "var(--sv-gain)"
                    : "var(--sv-loss)",
              }}
            >
              {fmtUSDFull((r.qty ?? 0) * (r.price ?? 0))}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          style={{ minWidth: "120px" }}
        />
        {sorted.some((t) => t.fees) && (
          <Column
            field="fees"
            header="Fees"
            body={(r: Transaction) => (
              <div className="text-right" style={{ fontSize: "0.82rem", color: "var(--sv-text-muted)" }}>
                {r.fees ? fmtUSDFull(r.fees) : "—"}
              </div>
            )}
            headerStyle={{ textAlign: "right" }}
            style={{ minWidth: "80px" }}
          />
        )}
        {sorted.some((t) => t.sector) && (
          <Column
            field="sector"
            header="Sector"
            body={(r: Transaction) => (
              <div style={{ fontSize: "0.75rem", color: "var(--sv-text-muted)" }}>
                {r.sector ?? "—"}
              </div>
            )}
            style={{ minWidth: "120px" }}
          />
        )}
      </DataTable>
    </div>
  );
};

export default TransactionsTab;
