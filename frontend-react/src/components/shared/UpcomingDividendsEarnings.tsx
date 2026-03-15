import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { fmtUSDFull } from "@/components/portfolio/PortfolioDetailPanel";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpcomingDividend {
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

export interface UpcomingEarning {
  id: number;
  symbol: string;
  date: string;
  estimate: string | null;
  reported: string | null;
  surprise: string | null;
  time: string | null;
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

const timeSeverity = (time: string | null): "success" | "info" | "warning" | "secondary" => {
  switch (time?.toLowerCase()) {
    case "pre-market": return "info";
    case "post-market": return "warning";
    case "during-market": return "success";
    default: return "secondary";
  }
};

const fmtTimeLabel = (time: string | null) => {
  if (!time) return "TBD";
  return time.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
};

// ─── Upcoming Dividends ───────────────────────────────────────────────────────

interface UpcomingDividendsTableProps {
  symbols: string[];
}

export const UpcomingDividendsTable: React.FC<UpcomingDividendsTableProps> = ({ symbols }) => {
  const [upcoming, setUpcoming] = useState<UpcomingDividend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;
    setLoading(true);
    setError("");
    api
      .get(`/dividend/history?symbols=${symbolsKey}&upcoming=true`)
      .then((res) => setUpcoming(res.data ?? []))
      .catch(() => setError("Failed to load upcoming dividends."))
      .finally(() => setLoading(false));
  }, [symbolsKey]);

  return (
    <>
      <div
        className="px-3 pt-4 pb-1 mt-2"
        style={{ borderTop: "1px solid var(--sv-border)" }}
      >
        <div className="flex align-items-center justify-content-between mb-2">
          <div className="sv-info-label font-bold text-sm">
            <i className="pi pi-calendar mr-2" />
            Upcoming Dividends
          </div>
          {!loading && upcoming.length > 0 && (
            <span className="sv-text-muted text-sm">
              {upcoming.length} scheduled payment{upcoming.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-3 pb-3 flex flex-column gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="2.4rem" borderRadius="6px" />
          ))}
        </div>
      ) : error ? (
        <div className="flex align-items-center gap-2 px-3 pb-3 sv-text-muted text-sm">
          <i className="pi pi-exclamation-circle" style={{ color: "var(--sv-loss)" }} />
          {error}
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
    </>
  );
};

// ─── Upcoming Earnings ────────────────────────────────────────────────────────

interface UpcomingEarningsTableProps {
  symbols: string[];
}

export const UpcomingEarningsTable: React.FC<UpcomingEarningsTableProps> = ({ symbols }) => {
  const [earnings, setEarnings] = useState<UpcomingEarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;
    setLoading(true);
    setError("");
    api
      .get(`/earning/history?symbols=${symbolsKey}&upcoming=true`)
      .then((res) => setEarnings(res.data ?? []))
      .catch(() => setError("Failed to load upcoming earnings."))
      .finally(() => setLoading(false));
  }, [symbolsKey]);

  return (
    <>
      <div
        className="px-3 pt-4 pb-1 mt-2"
        style={{ borderTop: "1px solid var(--sv-border)" }}
      >
        <div className="flex align-items-center justify-content-between mb-2">
          <div className="sv-info-label font-bold text-sm">
            <i className="pi pi-chart-bar mr-2" />
            Upcoming Earnings
          </div>
          {!loading && earnings.length > 0 && (
            <span className="sv-text-muted text-sm">
              {earnings.length} scheduled report{earnings.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-3 pb-3 flex flex-column gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="2.4rem" borderRadius="6px" />
          ))}
        </div>
      ) : error ? (
        <div className="flex align-items-center gap-2 px-3 pb-3 sv-text-muted text-sm">
          <i className="pi pi-exclamation-circle" style={{ color: "var(--sv-loss)" }} />
          {error}
        </div>
      ) : earnings.length === 0 ? (
        <div className="flex align-items-center gap-2 px-3 pb-4 sv-text-muted text-sm">
          <i className="pi pi-info-circle" />
          No upcoming earnings found for current holdings
        </div>
      ) : (
        <DataTable
          value={earnings}
          size="small"
          stripedRows
          rowHover
          dataKey="id"
          scrollable
          scrollHeight="320px"
          sortField="date"
          sortOrder={1}
          emptyMessage="No upcoming earnings"
        >
          <Column
            field="symbol"
            header="Symbol"
            body={(r: UpcomingEarning) => (
              <div className="sv-text-accent font-bold text-sm">{r.symbol}</div>
            )}
            sortable
            style={{ minWidth: "90px" }}
          />
          <Column
            field="date"
            header="Report Date"
            body={(r: UpcomingEarning) => (
              <div className="text-sm white-space-nowrap font-semibold" style={{ color: "var(--sv-text-secondary)" }}>
                {fmtDate(r.date)}
              </div>
            )}
            sortable
            style={{ minWidth: "130px" }}
          />
          <Column
            field="time"
            header="Session"
            body={(r: UpcomingEarning) => (
              <Tag
                value={fmtTimeLabel(r.time)}
                severity={timeSeverity(r.time)}
                style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}
              />
            )}
            style={{ minWidth: "120px" }}
          />
          <Column
            field="estimate"
            header="EPS Estimate"
            body={(r: UpcomingEarning) => (
              <div className="text-right text-sm font-semibold sv-text-muted">
                {r.estimate != null ? `$${r.estimate}` : "—"}
              </div>
            )}
            headerStyle={{ textAlign: "right" }}
            sortable
            style={{ minWidth: "110px" }}
          />
        </DataTable>
      )}
    </>
  );
};
