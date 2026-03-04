import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { type CashTransaction, fmtUSDFull } from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  cashTransactions: CashTransaction[];
  allSymbols: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── Summary ─────────────────────────────────────────────────────────────────

const DivSummary: React.FC<{ transactions: CashTransaction[] }> = ({ transactions }) => {
  const totalDividends = transactions.reduce((s, t) => s + (t.amount ?? 0), 0);

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
        Total Events:{" "}
        <strong style={{ color: "var(--sv-text-primary)" }}>{transactions.length}</strong>
      </span>
      <span style={{ color: "var(--sv-text-muted)" }}>
        Total Received:{" "}
        <strong style={{ color: "var(--sv-gain)" }}>{fmtUSDFull(totalDividends)}</strong>
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const DividendsTab: React.FC<Props> = ({ cashTransactions }) => {
  if (!cashTransactions || cashTransactions.length === 0) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center gap-3"
        style={{ padding: "4rem 1rem", color: "var(--sv-text-muted)" }}
      >
        <i className="pi pi-dollar" style={{ fontSize: "2.5rem" }} />
        <div style={{ fontSize: "0.9rem" }}>No dividend history</div>
        <div style={{ fontSize: "0.8rem", textAlign: "center", maxWidth: "340px" }}>
          Dividend payments will appear here once your holdings pay out
        </div>
      </div>
    );
  }

  return (
    <div>
      <DivSummary transactions={cashTransactions} />

      <div style={{ padding: "0.75rem 1rem 0.25rem" }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "var(--sv-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}
        >
          <i className="pi pi-history mr-2" />
          Dividend History
        </div>
      </div>

      <DataTable
        value={cashTransactions}
        size="small"
        stripedRows
        rowHover
        dataKey="symbol"
        scrollable
        scrollHeight="420px"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 20]}
        sortField="pay_date"
        sortOrder={-1}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        emptyMessage="No dividend history"
      >
        <Column
          field="symbol"
          header="Symbol"
          body={(r: CashTransaction) => (
            <div style={{ fontWeight: 700, color: "var(--sv-accent)", fontSize: "0.88rem" }}>
              {r.symbol}
            </div>
          )}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="qty"
          header="# Shares"
          body={(r: CashTransaction) => (
            <div className="text-right" style={{ fontSize: "0.85rem" }}>
              {(r.qty ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="next_payout"
          header="Per Share"
          body={(r: CashTransaction) => (
            <div
              className="text-right"
              style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--sv-text-primary)" }}
            >
              {fmtUSDFull(r.next_payout ?? 0)}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="amount"
          header="Total Dividend"
          body={(r: CashTransaction) => (
            <div
              className="text-right"
              style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--sv-gain)" }}
            >
              {fmtUSDFull(r.amount ?? 0)}
            </div>
          )}
          headerStyle={{ textAlign: "right" }}
          sortable
          style={{ minWidth: "130px" }}
        />
        <Column
          field="pay_date"
          header="Pay Date"
          body={(r: CashTransaction) => (
            <div style={{ fontSize: "0.82rem", color: "var(--sv-text-secondary)", whiteSpace: "nowrap" }}>
              {fmtDate(r.pay_date)}
            </div>
          )}
          sortable
          style={{ minWidth: "120px" }}
        />
        <Column
          field="ex_dividend_date"
          header="Ex-Div Date"
          body={(r: CashTransaction) => (
            <div style={{ fontSize: "0.82rem", color: "var(--sv-text-muted)", whiteSpace: "nowrap" }}>
              {fmtDate(r.ex_dividend_date)}
            </div>
          )}
          sortable
          style={{ minWidth: "120px" }}
        />
      </DataTable>
    </div>
  );
};

export default DividendsTab;
