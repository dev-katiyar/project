import React, { useState, useEffect, useCallback } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";
import api from "@/services/api";
import { type Position, fmtUSD } from "@/components/portfolio/PortfolioDetailPanel";
import SymbolSearch from "@/components/common/SymbolSearch";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDES = [
  { label: "Buy", value: "Buy" },
  { label: "Sell", value: "Sell" },
  { label: "Sell Short", value: "Sell Short" },
  { label: "Buy To Cover", value: "Buy To Cover" },
];

const SIDE_SEVERITY: Record<string, "success" | "danger" | "warning" | "info"> = {
  Buy: "success",
  Sell: "danger",
  "Sell Short": "warning",
  "Buy To Cover": "info",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionRow {
  symbol: string;
  companyname: string;
  side: string;
  qty: number | null;
  price: number | null;
  date: Date;
  commission: number | null;
  holdings: number;
  avgCost: number;
}

interface Props {
  visible: boolean;
  onHide: () => void;
  portfolioId: number | string;
  portfolioName: string;
  currentCash: number;
  startingCash: number;
  openPositions: Position[];
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHoldings(symbol: string, side: string, positions: Position[]): number {
  const pos = positions.find((p) => p.symbol === symbol);
  if (!pos) return 0;
  if (side === "Buy" || side === "Sell") return pos.qty ?? 0;
  if (side === "Sell Short" || side === "Buy To Cover") return pos.qty ?? 0;
  return 0;
}

function getAvgCost(symbol: string, positions: Position[]): number {
  return positions.find((p) => p.symbol === symbol)?.avgCost ?? 0;
}

function fmtDate(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${dy}`;
}

function cashFlow(row: TransactionRow): number {
  const qty = row.qty ?? 0;
  const price = row.price ?? 0;
  const commission = row.commission ?? 0;
  if (row.side === "Buy" || row.side === "Buy To Cover") return -(qty * price) - commission;
  return qty * price - commission;
}

function emptyRow(): TransactionRow {
  return {
    symbol: "",
    companyname: "",
    side: "Buy",
    qty: null,
    price: null,
    date: new Date(),
    commission: null,
    holdings: 0,
    avgCost: 0,
  };
}

// ─── Row Component ─────────────────────────────────────────────────────────────

const RowCard: React.FC<{
  row: TransactionRow;
  index: number;
  total: number;
  onChange: (index: number, field: keyof TransactionRow, value: unknown) => void;
  onRemove: (index: number) => void;
  onSymbolSelect: (index: number, symbol: string, name?: string) => void;
  onSideChange: (index: number) => void;
  onDateChange: (index: number) => void;
}> = ({
  row,
  index,
  total,
  onChange,
  onRemove,
  onSymbolSelect,
  onSideChange,
  onDateChange,
}) => {
  const cf = cashFlow(row);
  const pnl =
    (row.side === "Sell" || row.side === "Buy To Cover") && row.avgCost
      ? row.side === "Sell"
        ? (row.qty ?? 0) * ((row.price ?? 0) - row.avgCost)
        : (row.qty ?? 0) * (row.avgCost - (row.price ?? 0))
      : null;

  return (
    <div
      className="border-round-xl p-3 mb-2"
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        position: "relative",
      }}
    >
      {/* Row header */}
      <div className="flex align-items-center justify-content-between mb-3">
        <div className="flex align-items-center gap-2">
          <div
            className="flex align-items-center justify-content-center border-round-xl"
            style={{
              width: "24px",
              height: "24px",
              background: "var(--sv-accent-bg)",
              color: "var(--sv-accent)",
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            {index + 1}
          </div>
          <Tag
            value={row.side}
            severity={SIDE_SEVERITY[row.side] ?? "info"}
            className="text-xs"
          />
          {row.symbol && (
            <span className="font-bold sv-text-accent text-sm">{row.symbol}</span>
          )}
          {row.companyname && (
            <span className="sv-text-muted text-xs">{row.companyname}</span>
          )}
        </div>
        {total > 1 && (
          <Button
            icon="pi pi-times"
            text
            rounded
            size="small"
            severity="danger"
            onClick={() => onRemove(index)}
            tooltip="Remove row"
            tooltipOptions={{ position: "left" }}
          />
        )}
      </div>

      {/* Fields grid */}
      <div className="grid">
        {/* Symbol */}
        <div className="col-12 md:col-3">
          <label className="sv-info-label block mb-1" style={{ fontSize: "0.68rem" }}>
            Symbol *
          </label>
          <SymbolSearch
            value={row.symbol}
            onChange={(val) => onChange(index, "symbol", val)}
            onSelect={(symbol, name) => onSymbolSelect(index, symbol, name)}
            placeholder="e.g. AAPL"
            className="w-full"
            inputClassName="w-full"
          />
          {row.holdings > 0 && (
            <div className="sv-text-muted mt-1" style={{ fontSize: "0.65rem" }}>
              Holdings: <strong>{row.holdings}</strong> @ {fmtUSD(row.avgCost)}
            </div>
          )}
        </div>

        {/* Side */}
        <div className="col-6 md:col-2">
          <label className="sv-info-label block mb-1" style={{ fontSize: "0.68rem" }}>
            Action *
          </label>
          <Dropdown
            value={row.side}
            options={SIDES}
            onChange={(e) => {
              onChange(index, "side", e.value);
              onSideChange(index);
            }}
            className="w-full"
            appendTo={document.body}
          />
        </div>

        {/* Qty */}
        <div className="col-6 md:col-2">
          <label className="sv-info-label block mb-1" style={{ fontSize: "0.68rem" }}>
            Quantity *
          </label>
          <InputNumber
            value={row.qty}
            onValueChange={(e) => onChange(index, "qty", e.value)}
            minFractionDigits={0}
            maxFractionDigits={6}
            min={0}
            placeholder="0"
            className="w-full"
            inputClassName="w-full"
          />
        </div>

        {/* Price */}
        <div className="col-6 md:col-2">
          <label className="sv-info-label block mb-1" style={{ fontSize: "0.68rem" }}>
            Price *
          </label>
          <InputNumber
            value={row.price}
            onValueChange={(e) => onChange(index, "price", e.value)}
            mode="currency"
            currency="USD"
            locale="en-US"
            minFractionDigits={2}
            maxFractionDigits={6}
            min={0}
            placeholder="$0.00"
            className="w-full"
            inputClassName="w-full"
          />
        </div>

        {/* Date */}
        <div className="col-6 md:col-2">
          <label className="sv-info-label block mb-1" style={{ fontSize: "0.68rem" }}>
            Date *
          </label>
          <Calendar
            value={row.date}
            onChange={(e) => {
              onChange(index, "date", e.value as Date);
              onDateChange(index);
            }}
            dateFormat="mm/dd/yy"
            showIcon
            appendTo={document.body}
            className="w-full"
            inputClassName="w-full"
            maxDate={new Date()}
          />
        </div>

        {/* Commission */}
        <div className="col-6 md:col-1">
          <label className="sv-info-label block mb-1" style={{ fontSize: "0.68rem" }}>
            Fees
          </label>
          <InputNumber
            value={row.commission}
            onValueChange={(e) => onChange(index, "commission", e.value)}
            mode="currency"
            currency="USD"
            locale="en-US"
            minFractionDigits={2}
            min={0}
            placeholder="$0"
            className="w-full"
            inputClassName="w-full"
          />
        </div>
      </div>

      {/* Cash flow + P&L preview */}
      {row.qty && row.price && (
        <div
          className="flex gap-3 mt-2 pt-2 flex-wrap"
          style={{ borderTop: "1px solid var(--sv-border)" }}
        >
          <div style={{ fontSize: "0.7rem" }}>
            <span className="sv-text-muted">Cash Flow: </span>
            <strong style={{ color: cf >= 0 ? "var(--sv-gain)" : "var(--sv-loss)" }}>
              {fmtUSD(cf)}
            </strong>
          </div>
          <div style={{ fontSize: "0.7rem" }}>
            <span className="sv-text-muted">Trade Value: </span>
            <strong>{fmtUSD((row.qty ?? 0) * (row.price ?? 0))}</strong>
          </div>
          {pnl !== null && (
            <div style={{ fontSize: "0.7rem" }}>
              <span className="sv-text-muted">Est. P&amp;L: </span>
              <strong style={{ color: pnl >= 0 ? "var(--sv-gain)" : "var(--sv-loss)" }}>
                {fmtUSD(pnl)}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Dialog ───────────────────────────────────────────────────────────────

const AddTransactionDialog: React.FC<Props> = ({
  visible,
  onHide,
  portfolioId,
  portfolioName,
  currentCash,
  startingCash,
  openPositions,
  onSaved,
}) => {
  const [rows, setRows] = useState<TransactionRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setRows([emptyRow()]);
      setError("");
      setSaving(false);
    }
  }, [visible]);

  // Fetch symbol price for a row
  const fetchPrice = useCallback(async (index: number, symbol: string, date: Date) => {
    if (!symbol) return;
    try {
      const dateStr = fmtDate(date);
      const { data } = await api.get(`/symbol/prices?symbol=${symbol}&date=${dateStr}`);
      if (data && symbol in data) {
        const pd = data[symbol];
        setRows((prev) =>
          prev.map((r, i) =>
            i === index
              ? {
                  ...r,
                  price: pd.price ?? r.price,
                  companyname: pd.companyname ?? r.companyname,
                  holdings: getHoldings(symbol, r.side, openPositions),
                  avgCost: getAvgCost(symbol, openPositions),
                }
              : r
          )
        );
      }
    } catch {
      // silently fail — user can enter price manually
    }
  }, [openPositions]);

  const handleSymbolSelect = useCallback((index: number, symbol: string, name?: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              symbol,
              companyname: name ?? r.companyname,
              holdings: getHoldings(symbol, r.side, openPositions),
              avgCost: getAvgCost(symbol, openPositions),
            }
          : r
      )
    );
    const row = rows[index];
    fetchPrice(index, symbol, row.date);
  }, [rows, openPositions, fetchPrice]);

  const handleChange = useCallback((index: number, field: keyof TransactionRow, value: unknown) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }, []);

  const handleSideChange = useCallback((index: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, holdings: getHoldings(r.symbol, r.side, openPositions) }
          : r
      )
    );
  }, [openPositions]);

  const handleDateChange = useCallback((index: number) => {
    const row = rows[index];
    if (row.symbol) fetchPrice(index, row.symbol, row.date);
  }, [rows, fetchPrice]);

  const handleRemove = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  // Computed totals
  const totalCashFlow = rows.reduce((s, r) => s + cashFlow(r), 0);
  const projectedCash = currentCash + totalCashFlow;

  // Validation + save
  const handleSave = async () => {
    setError("");

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const label = `Row ${i + 1}`;
      if (!r.symbol) return setError(`${label}: Symbol is required.`);
      if (!r.date || isNaN(r.date.getTime())) return setError(`${label}: Date is required.`);
      if (!r.qty || r.qty <= 0) return setError(`${label}: Quantity must be > 0.`);
      if (!r.price || r.price <= 0) return setError(`${label}: Price must be > 0.`);
      if (r.side === "Sell" && r.holdings > 0 && (r.qty ?? 0) > r.holdings) {
        return setError(`${label}: Cannot sell ${r.qty} shares — only ${r.holdings} held.`);
      }
      if (r.side === "Buy To Cover" && r.holdings > 0 && (r.qty ?? 0) > r.holdings) {
        return setError(`${label}: Cannot cover ${r.qty} shares — only ${r.holdings} shorted.`);
      }
    }

    if (projectedCash < 0) {
      return setError(`Insufficient cash. Projected balance: ${fmtUSD(projectedCash)}`);
    }

    setSaving(true);
    try {
      // Validate symbols
      const symbols = [...new Set(rows.map((r) => r.symbol))];
      const validRes = await api.post("/symbol/arevalid", { symbols });
      if (validRes.data?.isvalid !== "valid") {
        const bad = validRes.data?.invalidsymbol?.invalidsymbol ?? "unknown";
        setError(`'${bad}' is not a valid symbol.`);
        setSaving(false);
        return;
      }

      const newTransactions = rows.map((r) => ({
        id: 0,
        symbol: r.symbol,
        side: r.side,
        qty: r.qty,
        price: r.price,
        date: fmtDate(r.date),
        commission: r.commission ?? 0,
      }));

      await api.post("/modelportfolio", {
        id: portfolioId,
        name: portfolioName,
        startingCash,
        newTransactions,
        updatedTransactions: [],
        deletedTransactions: [],
        action: "add",
        portfolio_type: "user",
      });

      onSaved();
      onHide();
    } catch {
      setError("Failed to save transactions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Dialog header ────────────────────────────────────────────────────────────

  const header = (
    <div className="flex align-items-center gap-2">
      <div
        className="flex align-items-center justify-content-center border-round-xl"
        style={{
          width: "32px",
          height: "32px",
          background: "var(--sv-accent-bg)",
          color: "var(--sv-accent)",
        }}
      >
        <i className="pi pi-plus" style={{ fontSize: "0.9rem" }} />
      </div>
      <div>
        <div className="font-bold" style={{ fontSize: "1rem", lineHeight: 1.1 }}>
          Add Transactions
        </div>
        <div className="sv-text-muted" style={{ fontSize: "0.7rem" }}>
          {portfolioName}
        </div>
      </div>
    </div>
  );

  // ── Footer ───────────────────────────────────────────────────────────────────

  const footer = (
    <div className="flex align-items-center justify-content-between flex-wrap gap-2 pt-2">
      {/* Cash preview */}
      <div className="flex gap-3 flex-wrap text-sm">
        <div>
          <span className="sv-text-muted" style={{ fontSize: "0.7rem" }}>Available Cash </span>
          <strong style={{ color: "var(--sv-text-primary)" }}>{fmtUSD(currentCash)}</strong>
        </div>
        <div>
          <span className="sv-text-muted" style={{ fontSize: "0.7rem" }}>After Trades </span>
          <strong style={{ color: projectedCash >= 0 ? "var(--sv-gain)" : "var(--sv-loss)" }}>
            {fmtUSD(projectedCash)}
          </strong>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          label="Cancel"
          icon="pi pi-times"
          outlined
          size="small"
          onClick={onHide}
          disabled={saving}
        />
        <Button
          label={saving ? "Saving…" : `Save ${rows.length > 1 ? `${rows.length} Transactions` : "Transaction"}`}
          icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
          size="small"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "var(--sv-accent-gradient)",
            border: "none",
          }}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={header}
      footer={footer}
      style={{ width: "min(96vw, 860px)" }}
      modal
      draggable={false}
      resizable={false}
      pt={{
        root: { style: { border: "1px solid var(--sv-border)" } },
        header: {
          style: {
            background: "var(--sv-bg-surface)",
            borderBottom: "1px solid var(--sv-border)",
            padding: "1rem 1.25rem 0.75rem",
          },
        },
        content: {
          style: {
            background: "var(--sv-bg-card)",
            padding: "1rem 1.25rem",
          },
        },
        footer: {
          style: {
            background: "var(--sv-bg-surface)",
            borderTop: "1px solid var(--sv-border)",
            padding: "0.75rem 1.25rem",
          },
        },
      }}
    >
      {/* Error banner */}
      {error && (
        <Message severity="error" text={error} className="w-full mb-3" />
      )}

      {/* Transaction rows */}
      <div>
        {rows.map((row, i) => (
          <RowCard
            key={i}
            row={row}
            index={i}
            total={rows.length}
            onChange={handleChange}
            onRemove={handleRemove}
            onSymbolSelect={handleSymbolSelect}
            onSideChange={handleSideChange}
            onDateChange={handleDateChange}
          />
        ))}
      </div>

      <Divider />

      {/* Add row button */}
      <Button
        label="Add Another Transaction"
        icon="pi pi-plus"
        text
        size="small"
        onClick={addRow}
        className="w-full"
        style={{ color: "var(--sv-accent)" }}
      />
    </Dialog>
  );
};

export default AddTransactionDialog;
