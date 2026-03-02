import React, { useEffect, useState, useCallback } from "react";
import { DataTable, DataTableSortEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Slider } from "primereact/slider";
import api from "@/services/api";

/* ── Column type definitions ─────────────────────────────── */

export type ColumnType =
  | "symbol"
  | "currency"
  | "percentage"
  | "change"
  | "decimal"
  | "integer"
  | "range";

export interface ColumnConfig {
  field: string;
  header: string;
  type: ColumnType;
  /** Extra data field used by "change" type for the % value (default: "priceChangePct") */
  changePercentField?: string;
  /** For "range" type: field for the high bound */
  rangeHighField?: string;
  sortable?: boolean;
  sortField?: string;
  width?: string;
}

/* ── Column presets ──────────────────────────────────────── */

const BASE_COLUMNS: ColumnConfig[] = [
  { field: "symbol", header: "Symbol", type: "symbol" },
  { field: "price", header: "Last", type: "currency" },
  {
    field: "priceChange",
    header: "1D Change",
    type: "change",
    changePercentField: "priceChangePct",
    sortable: true,
    sortField: "priceChangePct",
  },
];

export const COLUMN_PRESETS = {
  /** Indices, commodities, crypto */
  GENERIC: BASE_COLUMNS,

  PERFORMERS: BASE_COLUMNS,

  BONDS: [
    { field: "symbol", header: "Symbol", type: "symbol" as const },
    { field: "price", header: "Yield", type: "percentage" as const },
    {
      field: "priceChange",
      header: "Yield Change",
      type: "percentage" as const,
      sortable: true,
    },
  ],

  MOST_ACTIVE: [
    ...BASE_COLUMNS,
    { field: "volume", header: "Volume", type: "integer" as const },
  ],

  SECTORS: [
    {
      field: "symbol",
      header: "Sector",
      type: "symbol" as const,
      width: "15rem",
    },
    { field: "last", header: "Last", type: "currency" as const },
    {
      field: "priceChange",
      header: "1D Change",
      type: "change" as const,
      changePercentField: "priceChangePct",
      sortable: true,
      sortField: "priceChangePct",
    },
    {
      field: "52weeklow",
      header: "52-Wk Range",
      type: "range" as const,
      rangeHighField: "52weekhigh",
    },
  ],

  RSI: [
    ...BASE_COLUMNS,
    { field: "rsi", header: "RSI", type: "decimal" as const },
  ],

  MACD: [
    ...BASE_COLUMNS,
    { field: "macdhist", header: "MACD Hist.", type: "decimal" as const },
  ],

  RELATIVE_STRENGTH: [
    ...BASE_COLUMNS,
    {
      field: "Relative_strength",
      header: "Rel. Strength",
      type: "decimal" as const,
    },
  ],
} as const;

/* ── Formatting helpers ──────────────────────────────────── */

const fmtCurrency = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtPercent = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toFixed(2)}%`;

const fmtDecimal = (v: number | null | undefined) =>
  v == null ? "—" : v.toFixed(2);

const fmtInteger = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

const changeClass = (v: number | null | undefined) =>
  v == null ? "" : v >= 0 ? "sv-text-gain" : "sv-text-loss";

/* ── Props ───────────────────────────────────────────────── */

export interface MarketDataTableProps {
  /** Column layout — use a COLUMN_PRESETS value or supply custom array */
  columns: readonly ColumnConfig[];

  /** If provided, data is fetched from this API path via GET */
  listURL?: string;
  /** If provided, used as the data directly (overrides listURL) */
  data?: Record<string, unknown>[];

  showChartIcon?: boolean;
  onSymbolClick?: (symbol: string) => void;
  onChartClick?: (symbol: string) => void;

  /** Show the name field alongside symbol (sectors use this) */
  showName?: boolean;
  scrollHeight?: string;
}

/* ── Component ───────────────────────────────────────────── */

const MarketDataTable: React.FC<MarketDataTableProps> = ({
  columns,
  listURL,
  data: externalData,
  showChartIcon = false,
  onSymbolClick,
  onChartClick,
  showName = false,
  scrollHeight,
}) => {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  /* fetch when listURL changes */
  useEffect(() => {
    if (externalData) {
      setRows(externalData);
      return;
    }
    if (!listURL) return;

    let cancelled = false;
    setLoading(true);
    api
      .get<Record<string, unknown>[]>(listURL)
      .then((res) => {
        if (!cancelled) setRows(res.data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listURL, externalData]);

  /* chart icon click */
  const handleChartClick = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      onChartClick?.(symbol);
    },
    [onChartClick],
  );

  /* ── Cell renderers ────────────────────────── */

  const renderCell = (col: ColumnConfig, row: Record<string, unknown>) => {
    const raw = row[col.field];
    const num = typeof raw === "number" ? raw : null;

    switch (col.type) {
      case "symbol": {
        const symbol = String(raw ?? "");
        const name = showName && row["name"] ? ` (${row["name"]})` : "";
        return (
          <span
            className="sv-text-accent cursor-pointer"
            onClick={() => onSymbolClick?.(symbol)}
          >
            {symbol}
            {name && (
              <span className="text-color-secondary">{name}</span>
            )}
          </span>
        );
      }

      case "currency":
        return fmtCurrency(num);

      case "percentage":
        return (
          <span className={changeClass(num)}>{fmtPercent(num)}</span>
        );

      case "change": {
        const pctField = col.changePercentField ?? "priceChangePct";
        const pct = row[pctField] as number | undefined;
        return (
          <span className={changeClass(num)}>
            {fmtCurrency(num)} ({fmtPercent(pct)})
          </span>
        );
      }

      case "decimal":
        return fmtDecimal(num);

      case "integer":
        return fmtInteger(num);

      case "range": {
        const lo = num ?? 0;
        const hi = (row[col.rangeHighField ?? ""] as number) ?? 0;
        const last = (row["last"] as number) ?? (row["price"] as number) ?? 0;
        return (
          <div className="flex align-items-center gap-2">
            <span className="text-sm">{fmtDecimal(lo)}</span>
            <Slider
              value={last}
              min={lo}
              max={hi || lo + 1}
              disabled
              className="flex-1 sv-min-w-60"
            />
            <span className="text-sm">{fmtDecimal(hi)}</span>
          </div>
        );
      }

      default:
        return String(raw ?? "");
    }
  };

  /* ── Render ────────────────────────────────── */

  return (
    <DataTable
      value={rows}
      loading={loading}
      size="small"
      scrollable
      scrollHeight={scrollHeight ?? "320px"}
      sortField="priceChangePct"
      sortOrder={-1}
      emptyMessage="No data available"
      rowHover
    >
      {showChartIcon && (
        <Column
          header=""
          style={{ width: "2.5rem" }}
          body={(row: Record<string, unknown>) => {
            const sym = String(row["symbol"] ?? "");
            return (
              <i
                className={`pi pi-chart-line cursor-pointer ${selectedSymbol === sym ? "sv-text-accent font-bold" : "sv-text-muted"}`}
                onClick={() => handleChartClick(sym)}
              />
            );
          }}
        />
      )}

      {columns.map((col) => (
        <Column
          key={col.field}
          header={col.header}
          sortable={col.sortable}
          sortField={col.sortField ?? col.field}
          style={col.width ? { width: col.width } : undefined}
          body={(row: Record<string, unknown>) => renderCell(col, row)}
        />
      ))}
    </DataTable>
  );
};

export default MarketDataTable;
