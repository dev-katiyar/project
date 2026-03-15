import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { type CashTransaction, fmtUSDFull } from "@/components/portfolio/PortfolioDetailPanel";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  cashTransactions: CashTransaction[];
  allSymbols: string[];
}

interface UpcomingDividend {
  id: number;
  symbol: string;
  next_payout: number;
  payout_freq: string;
  declaration_date: string | null;
  ex_dividend_date: string;
  record_date: string;
  pay_date: string;
  time: string;
  adr: string | null;
  index: string | null;
  industry: string | null;
  sector: string | null;
  yield: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | undefined | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const freqSeverity = (freq: string): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" => {
  switch (freq?.toLowerCase()) {
    case "monthly": return "success";
    case "quarterly": return "info";
    case "semi-annual": return "warning";
    case "annual": return "secondary";
    default: return "secondary";
  }
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
  const [upcoming, setUpcoming] = useState<UpcomingDividend[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState("");

  useEffect(() => {
    if (!allSymbols || allSymbols.length === 0) return;
    setUpcomingLoading(true);
    setUpcomingError("");
    api
      .get(`/dividend/history?symbols=${allSymbols.join(",")}&upcoming=true`)
      .then((res) => setUpcoming(res.data ?? []))
      .catch(() => setUpcomingError("Failed to load upcoming dividends."))
      .finally(() => setUpcomingLoading(false));
  }, [allSymbols.join(",")]);

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
      <div
        className="px-3 pt-4 pb-1 mt-2"
        style={{ borderTop: "1px solid var(--sv-border)" }}
      >
        <div className="flex align-items-center justify-content-between mb-2">
          <div className="sv-info-label font-bold text-sm">
            <i className="pi pi-calendar mr-2" />
            Upcoming Dividends
          </div>
          {!upcomingLoading && upcoming.length > 0 && (
            <span className="sv-text-muted text-sm">
              {upcoming.length} scheduled payment{upcoming.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {upcomingLoading ? (
        <div className="px-3 pb-3 flex flex-column gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="2.4rem" borderRadius="6px" />
          ))}
        </div>
      ) : upcomingError ? (
        <div className="flex align-items-center gap-2 px-3 pb-3 sv-text-muted text-sm">
          <i className="pi pi-exclamation-circle" style={{ color: "var(--sv-loss)" }} />
          {upcomingError}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex align-items-center gap-2 px-3 pb-4 sv-text-muted text-sm">
          <i className="pi pi-info-circle" />
          No upcoming dividends found for current holdings
        </div>
      ) : (
        <DataTable
          value={upcoming}
          size="small"
          stripedRows
          rowHover
          dataKey="id"
          scrollable
          scrollHeight="320px"
          sortField="pay_date"
          sortOrder={1}
          emptyMessage="No upcoming dividends"
        >
          <Column
            field="symbol"
            header="Symbol"
            body={(r: UpcomingDividend) => (
              <div className="sv-text-accent font-bold text-sm">{r.symbol}</div>
            )}
            sortable
            style={{ minWidth: "90px" }}
          />
          <Column
            field="payout_freq"
            header="Frequency"
            body={(r: UpcomingDividend) =>
              r.payout_freq ? (
                <Tag
                  value={r.payout_freq}
                  severity={freqSeverity(r.payout_freq)}
                  style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}
                />
              ) : (
                <span className="sv-text-muted text-sm">—</span>
              )
            }
            style={{ minWidth: "110px" }}
          />
          <Column
            field="next_payout"
            header="Per Share"
            body={(r: UpcomingDividend) => (
              <div className="text-right text-sm font-semibold sv-text-gain">
                {r.next_payout != null ? fmtUSDFull(r.next_payout) : "—"}
              </div>
            )}
            headerStyle={{ textAlign: "right" }}
            sortable
            style={{ minWidth: "100px" }}
          />
          <Column
            field="ex_dividend_date"
            header="Ex-Div Date"
            body={(r: UpcomingDividend) => (
              <div className="text-sm white-space-nowrap sv-text-muted">
                {fmtDate(r.ex_dividend_date)}
              </div>
            )}
            sortable
            style={{ minWidth: "120px" }}
          />
          <Column
            field="record_date"
            header="Record Date"
            body={(r: UpcomingDividend) => (
              <div className="text-sm white-space-nowrap sv-text-muted">
                {fmtDate(r.record_date)}
              </div>
            )}
            sortable
            style={{ minWidth: "120px" }}
          />
          <Column
            field="pay_date"
            header="Pay Date"
            body={(r: UpcomingDividend) => (
              <div className="text-sm white-space-nowrap font-semibold" style={{ color: "var(--sv-text-secondary)" }}>
                {fmtDate(r.pay_date)}
              </div>
            )}
            sortable
            style={{ minWidth: "120px" }}
          />
          <Column
            field="declaration_date"
            header="Declared"
            body={(r: UpcomingDividend) => (
              <div className="text-sm white-space-nowrap sv-text-muted">
                {fmtDate(r.declaration_date)}
              </div>
            )}
            sortable
            style={{ minWidth: "120px" }}
          />
        </DataTable>
      )}
    </div>
  );
};

export default DividendsTab;
