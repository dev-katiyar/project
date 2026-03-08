import React, { useEffect, useState, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Slider } from "primereact/slider";
import api from "@/services/api";
import { ColumnConfig } from "./MarketDataTable";

/* ── Types ───────────────────────────────────────────────── */

interface SymbolEntry {
  symbol: string;
  name?: string;
}

/* ── Formatting helpers ──────────────────────────────────── */

const fmtCurrency = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtPercent = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toFixed(2)}%`;

const fmtDecimal = (v: number | null | undefined) =>
  v == null ? "—" : v.toFixed(2);

const fmtInteger = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

const changeClass = (v: number | null | undefined) =>
  v == null ? "" : v >= 0 ? "sv-text-gain" : "sv-text-loss";

/* ── Props ───────────────────────────────────────────────── */

export interface LivePricesTableProps {
  columns: readonly ColumnConfig[];
  /** API endpoint that returns [{symbol, name, ...}] — symbols dict is loaded first */
  symbolsURL: string;
  /** API endpoint prefix for live data; defaults to "/symbol/technical/" */
  technicalsURLPrefix?: string;
  showChartIcon?: boolean;
  onSymbolClick?: (symbol: string) => void;
  onChartClick?: (symbol: string) => void;
  scrollHeight?: string;
}

/* ── Component ───────────────────────────────────────────── */

const LivePricesTable: React.FC<LivePricesTableProps> = ({
  columns,
  symbolsURL,
  technicalsURLPrefix = "/symbol/technical/",
  showChartIcon = false,
  onSymbolClick,
  onChartClick,
  scrollHeight,
}) => {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [symbolNameDict, setSymbolNameDict] = useState<Record<string, string>>({});
  const [symbolOrder, setSymbolOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (!symbolsURL) return;

    let cancelled = false;
    setLoading(true);

    api
      .get<SymbolEntry[]>(symbolsURL)
      .then((res) => {
        if (cancelled) return;

        const entries = res.data ?? [];
        const dict: Record<string, string> = {};
        const symbols: string[] = [];

        entries.forEach((item) => {
          const sym = item.symbol;
          symbols.push(sym);
          dict[sym] = item.name ?? sym;
        });

        setSymbolNameDict(dict);
        setSymbolOrder(symbols);

        if (symbols.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        return api
          .get<Record<string, unknown>[]>(technicalsURLPrefix + symbols.join(","))
          .then((techRes) => {
            if (cancelled) return;
            const data = techRes.data ?? [];
            // preserve original symbol order
            data.sort(
              (a, b) =>
                symbols.indexOf(a["symbol"] as string) -
                symbols.indexOf(b["symbol"] as string),
            );
            setRows(data);
            if (data.length > 0 && !selectedSymbol) {
              const first = data[0]["symbol"] as string;
              setSelectedSymbol(first);
              onChartClick?.(first);
            }
          });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsURL, technicalsURLPrefix]);

  const handleChartClick = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      onChartClick?.(symbol);
    },
    [onChartClick],
  );

  /* ── Cell renderers ────────────────────────────────────── */

  const renderCell = (col: ColumnConfig, row: Record<string, unknown>) => {
    const raw = row[col.field];
    const num = typeof raw === "number" ? raw : null;

    switch (col.type) {
      case "symbol": {
        const symbol = String(row["symbol"] ?? "");
        const displayName = symbolNameDict[symbol] ?? symbol;
        return (
          <span
            className="sv-text-accent cursor-pointer"
            onClick={() => onSymbolClick?.(symbol)}
          >
            {displayName}
          </span>
        );
      }

      case "currency":
        return fmtCurrency(num);

      case "percentage":
        return <span className={changeClass(num)}>{fmtPercent(num)}</span>;

      case "change": {
        const pctField = col.changePercentField ?? "priceChangePct";
        const pct = row[pctField] as number | undefined;
        let change = row["priceChange"] as number | undefined;
        change = change ? parseFloat(change.toString()) : undefined;
        return (
          <span className={changeClass(change)}>
            {fmtCurrency(change)} ({fmtPercent(pct)})
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

  /* ── Render ────────────────────────────────────────────── */

  // suppress unused warning for symbolOrder (used only for sort, stored in state)
  void symbolOrder;

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
                className={`pi pi-chart-line cursor-pointer ${
                  selectedSymbol === sym ? "sv-text-accent font-bold" : "sv-text-muted"
                }`}
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

export default LivePricesTable;
