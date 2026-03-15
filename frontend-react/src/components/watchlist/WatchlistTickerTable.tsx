import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Skeleton } from "primereact/skeleton";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SymbolData {
  symbol: string;
  name?: string;
  shortName?: string;
  companyName?: string;
  price?: number;
  currentPrice?: number;
  regularMarketPrice?: number;
  change?: number;
  regularMarketChange?: number;
  priceChange?: number | string;
  changepct?: number;
  regularMarketChangePercent?: number;
  priceChangePct?: number;
  volume?: number;
  regularMarketVolume?: number;
  marketcap?: number;
  marketCap?: number;
  pe?: number;
  trailingPE?: number;
  week52high?: number;
  fiftyTwoWeekHigh?: number;
  high52?: number;
  week_high_52?: number;
  week52low?: number;
  fiftyTwoWeekLow?: number;
  low52?: number;
  week_low_52?: number;
  sector?: string;
  // Performance
  mtd?: number;
  ytd?: number;
  priceChangeYearly?: number;
  priceChange2Year?: number;
  priceChange3Year?: number;
  // SMAs
  sma20?: number;
  sma50?: number;
  sma100?: number;
  sma150?: number;
  sma200?: number;
  // Fundamental scores
  mohanramScore?: number;
  MohanramScore?: number;
  piotroskiScore?: number;
  PiotroskiFScore?: number;
  svRank?: number;
  ZacksRank?: number;
  // Technical indicators
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  // Yield
  dividendYield?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getPrice = (d: SymbolData) =>
  d.price ?? d.currentPrice ?? d.regularMarketPrice ?? null;

export const getChange = (d: SymbolData) => {
  const v = d.change ?? d.regularMarketChange ?? d.priceChange ?? null;
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
};

export const getRawPct = (d: SymbolData): number | null => {
  const v =
    d.changepct ?? d.regularMarketChangePercent ?? d.priceChangePct ?? null;
  if (v == null) return null;
  return Math.abs(v) < 1 ? v * 100 : v;
};

export const getMarketCap = (d: SymbolData) => d.marketcap ?? d.marketCap ?? null;
export const getPE = (d: SymbolData) => d.pe ?? d.trailingPE ?? null;
export const get52High = (d: SymbolData) =>
  d.week52high ?? d.fiftyTwoWeekHigh ?? d.high52 ?? d.week_high_52 ?? null;
export const get52Low = (d: SymbolData) =>
  d.week52low ?? d.fiftyTwoWeekLow ?? d.low52 ?? d.week_low_52 ?? null;
export const getName = (d: SymbolData) =>
  d.name ?? d.shortName ?? d.companyName ?? d.symbol;

export const fmtPrice = (v: number | null) =>
  v == null ? "—" : `$${v.toFixed(2)}`;

export const fmtChange = (v: number | null) =>
  v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2);

export const fmtPct = (v: number | null) =>
  v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";

export const fmtCap = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  return "$" + v.toFixed(0);
};

export const fmtNum = (v: number | null, dp = 2) =>
  v == null ? "—" : v.toFixed(dp);

export const gainColor = (v: number | null) =>
  v == null
    ? "var(--sv-text-secondary)"
    : v > 0
      ? "var(--sv-gain)"
      : v < 0
        ? "var(--sv-loss)"
        : "var(--sv-text-secondary)";

// ─── Score helpers ────────────────────────────────────────────────────────────

type ScoreVariant = "mohanram" | "piotroski" | "svrank";

const scoreColor = (value: number, variant: ScoreVariant) => {
  if (variant === "svrank") {
    if (value <= 2)
      return { bg: "var(--sv-success-bg)", text: "var(--sv-gain)", border: "var(--sv-gain)" };
    if (value === 3)
      return { bg: "var(--sv-bg-surface)", text: "var(--sv-text-secondary)", border: "var(--sv-border)" };
    return { bg: "var(--sv-danger-bg)", text: "var(--sv-loss)", border: "var(--sv-loss)" };
  }
  if (value <= 3)
    return { bg: "var(--sv-danger-bg)", text: "var(--sv-loss)", border: "var(--sv-loss)" };
  if (value <= 6)
    return { bg: "var(--sv-bg-surface)", text: "var(--sv-text-secondary)", border: "var(--sv-border)" };
  return { bg: "var(--sv-success-bg)", text: "var(--sv-gain)", border: "var(--sv-gain)" };
};

const ScoreBadge = ({
  value,
  variant,
  max,
}: {
  value: number | undefined;
  variant: ScoreVariant;
  max: number;
}) => {
  if (value == null) return <span className="sv-text-muted text-xs">—</span>;
  const { bg, text, border } = scoreColor(value, variant);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        background: bg,
        border: `2px solid ${border}`,
        borderRadius: 12,
        padding: "2px 8px",
        color: text,
        fontWeight: 800,
        fontSize: "0.8rem",
        flexShrink: 0,
      }}
    >
      {value}
      <span style={{ fontWeight: 400, opacity: 0.7, fontSize: "0.7rem" }}>
        /{max}
      </span>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface WatchlistTickerTableProps {
  symbolsLoading: boolean;
  symbolData: SymbolData[];
  tickerFilter: string;
  onFilterChange: (value: string) => void;
  onDeleteSymbol: (row: SymbolData) => void;
}

const WatchlistTickerTable: React.FC<WatchlistTickerTableProps> = ({
  symbolsLoading,
  symbolData,
  tickerFilter,
  onFilterChange,
  onDeleteSymbol,
}) => {
  // ── Column body templates ──────────────────────────────────────────────────

  const symbolBodyTemplate = (row: SymbolData) => (
    <div>
      <div
        style={{
          display: "inline-block",
          background: "var(--sv-accent-bg)",
          color: "var(--sv-accent)",
          fontWeight: 800,
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
          padding: "0.2rem 0.5rem",
          borderRadius: 6,
          marginBottom: 2,
        }}
      >
        {row.symbol}
      </div>
      {getName(row) !== row.symbol && (
        <div
          className="sv-text-muted overflow-hidden white-space-nowrap"
          style={{ fontSize: "0.68rem", maxWidth: 160, textOverflow: "ellipsis" }}
        >
          {getName(row)}
        </div>
      )}
    </div>
  );

  const priceBodyTemplate = (row: SymbolData) => {
    const pct = getRawPct(row);
    const chg = getChange(row);
    return (
      <div className="text-right">
        <div className="font-bold" style={{ fontSize: "0.88rem" }}>
          {fmtPrice(getPrice(row))}
        </div>
        {(chg != null || pct != null) && (
          <div
            className="font-semibold mt-1"
            style={{ fontSize: "0.75rem", color: gainColor(pct ?? chg) }}
          >
            {chg != null ? fmtChange(chg) : ""}
            {chg != null && pct != null ? " " : ""}
            {pct != null ? `(${fmtPct(pct)})` : ""}
          </div>
        )}
      </div>
    );
  };

  const capBodyTemplate = (row: SymbolData) => (
    <div className="text-right">
      <span className="text-color-secondary" style={{ fontSize: "0.82rem" }}>
        {fmtCap(getMarketCap(row))}
      </span>
    </div>
  );

  const peBodyTemplate = (row: SymbolData) => (
    <div className="text-right">
      <span style={{ fontSize: "0.85rem" }}>{fmtNum(getPE(row))}</span>
    </div>
  );

  const week52BodyTemplate = (row: SymbolData) => {
    const hi = get52High(row);
    const lo = get52Low(row);
    const price = getPrice(row);
    const range = hi != null && lo != null ? hi - lo : null;
    const pos =
      range && price != null && range > 0
        ? Math.max(0, Math.min(1, (price - lo!) / range))
        : null;
    return (
      <div style={{ minWidth: "130px" }}>
        <div
          className="flex justify-content-between sv-text-muted"
          style={{ fontSize: "0.68rem", marginBottom: "4px" }}
        >
          <span>{fmtPrice(lo)}</span>
          <span>{fmtPrice(hi)}</span>
        </div>
        <div
          style={{
            height: "5px",
            background: "var(--sv-border)",
            borderRadius: "3px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: pos != null ? `${pos * 100}%` : "0%",
              height: "100%",
              background:
                "linear-gradient(90deg, var(--sv-danger) 0%, var(--sv-warning) 50%, var(--sv-gain) 100%)",
              borderRadius: "3px",
            }}
          />
          {pos != null && (
            <div
              style={{
                position: "absolute",
                left: `${pos * 100}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--sv-accent)",
                border: "2px solid var(--sv-bg-card)",
                boxShadow: "0 0 4px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </div>
      </div>
    );
  };

  const sectorBodyTemplate = (row: SymbolData) => {
    const sector = row.sector && row.sector !== "N/A" ? row.sector : null;
    return sector ? (
      <Tag
        value={sector}
        style={{
          background: "var(--sv-bg-surface)",
          color: "var(--sv-text-muted)",
          fontSize: "0.72rem",
          border: "1px solid var(--sv-border)",
        }}
      />
    ) : (
      <span className="sv-text-muted" style={{ fontSize: "0.82rem" }}>
        —
      </span>
    );
  };

  const pctChangeTag = (val: number | null | undefined) => {
    const v = val ?? null;
    return (
      <div className="text-right">
        <Tag
          value={v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
          style={{
            background:
              v == null
                ? "transparent"
                : v > 0
                  ? "var(--sv-success-bg)"
                  : v < 0
                    ? "var(--sv-danger-bg)"
                    : "var(--sv-bg-surface)",
            color:
              v == null
                ? "var(--sv-text-muted)"
                : v > 0
                  ? "var(--sv-gain)"
                  : v < 0
                    ? "var(--sv-loss)"
                    : "var(--sv-text-muted)",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
          }}
        />
      </div>
    );
  };

  const mtdBodyTemplate = (row: SymbolData) => pctChangeTag(row.mtd);
  const ytdBodyTemplate = (row: SymbolData) => pctChangeTag(row.ytd);
  const change1yBodyTemplate = (row: SymbolData) =>
    pctChangeTag(row.priceChangeYearly);
  const change2yBodyTemplate = (row: SymbolData) =>
    pctChangeTag(row.priceChange2Year);
  const change3yBodyTemplate = (row: SymbolData) =>
    pctChangeTag(row.priceChange3Year);

  const smaBodyTemplate = (val: number | undefined, row: SymbolData) => {
    const price = getPrice(row);
    const v = val ?? null;
    const diff = price != null && v != null ? price - v : null;
    const pct = diff != null && v != null && v !== 0 ? (diff / v) * 100 : null;
    const color =
      diff == null
        ? "var(--sv-text-muted)"
        : diff > 0
          ? "var(--sv-gain)"
          : diff < 0
            ? "var(--sv-loss)"
            : "var(--sv-text-muted)";
    return (
      <div className="flex align-items-center justify-content-end gap-2 flex-wrap">
        <span style={{ fontSize: "0.82rem", color: "var(--sv-text-secondary)" }}>
          {v != null ? fmtPrice(v) : "—"}
        </span>
        {diff != null && (
          <span
            style={{ fontSize: "0.73rem", fontWeight: 600, color, whiteSpace: "nowrap" }}
          >
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(2)}{" "}
            <span style={{ opacity: 0.85 }}>
              ({pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"})
            </span>
          </span>
        )}
      </div>
    );
  };

  const sma20BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma20, row);
  const sma50BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma50, row);
  const sma100BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma100, row);
  const sma150BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma150, row);
  const sma200BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma200, row);

  const mohanramBodyTemplate = (row: SymbolData) => (
    <div className="flex justify-content-center">
      <ScoreBadge
        value={row.MohanramScore ?? row.mohanramScore}
        variant="mohanram"
        max={8}
      />
    </div>
  );
  const piotroskiBodyTemplate = (row: SymbolData) => (
    <div className="flex justify-content-center">
      <ScoreBadge
        value={row.PiotroskiFScore ?? row.piotroskiScore}
        variant="piotroski"
        max={9}
      />
    </div>
  );
  const svRankBodyTemplate = (row: SymbolData) => (
    <div className="flex justify-content-center">
      <ScoreBadge value={row.ZacksRank ?? row.svRank} variant="svrank" max={5} />
    </div>
  );

  const rsiBodyTemplate = (row: SymbolData) => {
    const v = row.rsi ?? null;
    const color =
      v == null
        ? "var(--sv-text-muted)"
        : v >= 70
          ? "var(--sv-loss)"
          : v <= 30
            ? "var(--sv-gain)"
            : "var(--sv-text-secondary)";
    const label = v == null ? "" : v >= 70 ? " OB" : v <= 30 ? " OS" : "";
    return (
      <div className="text-right">
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>
          {v != null ? `${v.toFixed(1)}${label}` : "—"}
        </span>
      </div>
    );
  };

  const macdBodyTemplate = (row: SymbolData) => {
    const macd = row.macd ?? null;
    const sig = row.macdSignal ?? null;
    const hist = row.macdHist ?? null;
    if (macd == null && hist == null) {
      return (
        <span className="sv-text-muted" style={{ fontSize: "0.82rem" }}>
          —
        </span>
      );
    }
    const bullish =
      hist != null
        ? hist > 0
        : sig != null && macd != null
          ? macd > sig
          : macd != null
            ? macd > 0
            : null;
    return (
      <div className="flex align-items-center gap-1">
        <Tag
          value={bullish == null ? "—" : bullish ? "Bull" : "Bear"}
          style={{
            background:
              bullish == null
                ? "var(--sv-bg-surface)"
                : bullish
                  ? "var(--sv-success-bg)"
                  : "var(--sv-danger-bg)",
            color:
              bullish == null
                ? "var(--sv-text-muted)"
                : bullish
                  ? "var(--sv-gain)"
                  : "var(--sv-loss)",
            fontSize: "0.72rem",
            fontWeight: 700,
            border: "none",
          }}
        />
        <span
          style={{
            fontSize: "0.75rem",
            color:
              (hist ?? macd ?? 0) > 0 ? "var(--sv-gain)" : "var(--sv-loss)",
          }}
        >
          {(hist ?? macd)! > 0 ? "+" : ""}
          {(hist ?? macd)!.toFixed(2)}
        </span>
      </div>
    );
  };

  const yieldBodyTemplate = (row: SymbolData) => {
    const v = row.dividendYield ?? null;
    return (
      <div className="text-right">
        <span
          style={{
            fontSize: "0.85rem",
            color: v != null && v > 0 ? "var(--sv-gain)" : "var(--sv-text-muted)",
          }}
        >
          {v != null ? `${v.toFixed(2)}%` : "—"}
        </span>
      </div>
    );
  };

  const actionsBodyTemplate = (row: SymbolData) => (
    <Button
      icon="pi pi-times"
      text
      size="small"
      severity="danger"
      onClick={() => onDeleteSymbol(row)}
      style={{ padding: "0.2rem 0.4rem" }}
      tooltip="Remove"
      tooltipOptions={{ position: "left" }}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (symbolsLoading) {
    return (
      <div className="p-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} height="44px" className="mb-2" borderRadius="6px" />
        ))}
      </div>
    );
  }

  if (symbolData.length === 0) {
    return (
      <div
        className="flex flex-column align-items-center justify-content-center p-6"
        style={{ textAlign: "center" }}
      >
        <i
          className="pi pi-inbox sv-text-muted mb-3"
          style={{ fontSize: "3rem" }}
        />
        <h3 className="text-color-secondary m-0 mb-2">Watchlist is empty</h3>
        <p className="sv-text-muted m-0">
          Use the toolbar above to add ticker symbols.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── Table toolbar ── */}
      <div
        className="py-2 px-3 flex align-items-center justify-content-between gap-2 flex-wrap"
        style={{ borderBottom: "1px solid var(--sv-border)" }}
      >
        <div className="flex align-items-center gap-2">
          <i
            className="pi pi-table"
            style={{ color: "var(--sv-accent)", fontSize: "0.9rem" }}
          />
          <span
            className="text-xs font-semibold sv-text-muted"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {symbolData.length} symbol{symbolData.length !== 1 ? "s" : ""}
          </span>
        </div>
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={tickerFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter symbols…"
            className="sv-search-input"
          />
        </IconField>
      </div>

      <DataTable
        value={symbolData}
        sortMode="single"
        removableSort
        stripedRows
        rowHover
        size="small"
        globalFilter={tickerFilter}
        globalFilterFields={["symbol"]}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        emptyMessage="No symbols match your filter"
        pt={{ wrapper: { style: { borderRadius: 0 } } }}
      >
        <Column
          field="symbol"
          header="Symbol"
          body={symbolBodyTemplate}
          sortable
          frozen
          style={{ minWidth: "160px" }}
        />
        <Column
          header="Sector"
          body={sectorBodyTemplate}
          style={{ minWidth: "130px" }}
        />
        <Column
          header="Price"
          body={priceBodyTemplate}
          sortable
          sortField="price"
          style={{ minWidth: "115px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="Mkt Cap"
          body={capBodyTemplate}
          style={{ minWidth: "105px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="52W Range"
          body={week52BodyTemplate}
          style={{ minWidth: "155px" }}
        />
        <Column
          header="P/E"
          body={peBodyTemplate}
          style={{ minWidth: "70px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="MTD"
          body={mtdBodyTemplate}
          sortable
          sortField="mtd"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="YTD"
          body={ytdBodyTemplate}
          sortable
          sortField="ytd"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="1Y Chg"
          body={change1yBodyTemplate}
          sortable
          sortField="priceChangeYearly"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="2Y Chg"
          body={change2yBodyTemplate}
          sortable
          sortField="priceChange2Year"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="3Y Chg"
          body={change3yBodyTemplate}
          sortable
          sortField="priceChange3Year"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="SMA 20"
          body={sma20BodyTemplate}
          sortable
          sortField="sma20"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="SMA 50"
          body={sma50BodyTemplate}
          sortable
          sortField="sma50"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="SMA 100"
          body={sma100BodyTemplate}
          sortable
          sortField="sma100"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="SMA 150"
          body={sma150BodyTemplate}
          sortable
          sortField="sma150"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="SMA 200"
          body={sma200BodyTemplate}
          sortable
          sortField="sma200"
          style={{ minWidth: "90px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="Mohanram"
          body={mohanramBodyTemplate}
          sortable
          sortField="MohanramScore"
          style={{ minWidth: "110px", textAlign: "center" }}
          pt={{ headerContent: { className: "justify-content-center" } }}
        />
        <Column
          header="Piotroski"
          body={piotroskiBodyTemplate}
          sortable
          sortField="PiotroskiFScore"
          style={{ minWidth: "105px", textAlign: "center" }}
          pt={{ headerContent: { className: "justify-content-center" } }}
        />
        <Column
          header="SV Rank"
          body={svRankBodyTemplate}
          sortable
          sortField="ZacksRank"
          style={{ minWidth: "85px", textAlign: "center" }}
          pt={{ headerContent: { className: "justify-content-center" } }}
        />
        <Column
          header="RSI"
          body={rsiBodyTemplate}
          sortable
          sortField="rsi"
          style={{ minWidth: "80px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header="MACD"
          body={macdBodyTemplate}
          style={{ minWidth: "110px" }}
        />
        <Column
          header="Yield"
          body={yieldBodyTemplate}
          sortable
          sortField="dividendYield"
          style={{ minWidth: "80px" }}
          pt={{ headerContent: { className: "justify-content-end" } }}
        />
        <Column
          header=""
          body={actionsBodyTemplate}
          frozen
          alignFrozen="right"
          style={{ minWidth: "56px", textAlign: "center" }}
        />
      </DataTable>
    </>
  );
};

export default WatchlistTickerTable;
