import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { type CashTransaction, fmtUSDFull } from "@/components/portfolio/PortfolioDetailPanel";
import { UpcomingDividendsTable, UpcomingEarningsTable } from "@/components/shared/UpcomingDividendsEarnings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  cashTransactions: CashTransaction[];
  allSymbols: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | undefined | null) => {
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
      className="flex gap-4 flex-wrap px-3 py-2 text-sm"
      style={{ background: "var(--sv-bg-surface)", borderBottom: "1px solid var(--sv-border)" }}
    >
      <span className="sv-text-muted">
        Total Events:{" "}
        <strong className="text-color">{transactions.length}</strong>
      </span>
      <span className="sv-text-muted">
        Total Received:{" "}
        <strong className="sv-text-gain">{fmtUSDFull(totalDividends)}</strong>
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const DividendsTab: React.FC<Props> = ({ cashTransactions, allSymbols }) => {
  if (!cashTransactions || cashTransactions.length === 0) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-3 py-8 px-3 sv-text-muted">
        <i className="pi pi-dollar" style={{ fontSize: "2.5rem" }} />
        <div className="text-sm">No dividend history</div>
        <div className="text-sm text-center" style={{ maxWidth: "340px" }}>
          Dividend payments will appear here once your holdings pay out
        </div>
      </div>
    );
  }

  return (
    <div>
      <DivSummary transactions={cashTransactions} />

      {/* ── Dividend History ── */}
      <div className="px-3 pt-3 pb-1">
        <div className="sv-info-label font-bold text-sm mb-2">
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
            <div className="sv-text-accent font-bold text-sm">{r.symbol}</div>
          )}
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="qty"
          header="# Shares"
          body={(r: CashTransaction) => (
            <div className="text-right text-sm">
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
            <div className="text-right text-sm font-semibold">
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
            <div className="text-right text-sm font-bold sv-text-gain">
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
            <div className="text-sm white-space-nowrap" style={{ color: "var(--sv-text-secondary)" }}>
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
            <div className="text-sm white-space-nowrap sv-text-muted">
              {fmtDate(r.ex_dividend_date)}
            </div>
          )}
          sortable
          style={{ minWidth: "120px" }}
        />
      </DataTable>

      {/* ── Upcoming Dividends ── */}
      <UpcomingDividendsTable symbols={allSymbols} />

      {/* ── Upcoming Earnings ── */}
      <UpcomingEarningsTable symbols={allSymbols} />
    </div>
  );
};

export default DividendsTab;
