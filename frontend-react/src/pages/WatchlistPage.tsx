import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "@/services/api";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Skeleton } from "primereact/skeleton";
import { TabView, TabPanel } from "primereact/tabview";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Watchlist {
  id: number;
  name: string;
}

interface SymbolData {
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
  piotroskiScore?: number;
  svRank?: number;
  // Technical indicators
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  // Yield
  dividendYield?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPrice = (d: SymbolData) =>
  d.price ?? d.currentPrice ?? d.regularMarketPrice ?? null;

const getChange = (d: SymbolData) => {
  const v = d.change ?? d.regularMarketChange ?? d.priceChange ?? null;
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
};

const getRawPct = (d: SymbolData): number | null => {
  const v =
    d.changepct ?? d.regularMarketChangePercent ?? d.priceChangePct ?? null;
  if (v == null) return null;
  // normalise: if raw value is a tiny decimal (e.g. 0.012), multiply to get %
  return Math.abs(v) < 1 ? v * 100 : v;
};

const getMarketCap = (d: SymbolData) => d.marketcap ?? d.marketCap ?? null;
const getPE = (d: SymbolData) => d.pe ?? d.trailingPE ?? null;
const get52High = (d: SymbolData) =>
  d.week52high ?? d.fiftyTwoWeekHigh ?? d.high52 ?? d.week_high_52 ?? null;
const get52Low = (d: SymbolData) =>
  d.week52low ?? d.fiftyTwoWeekLow ?? d.low52 ?? d.week_low_52 ?? null;
const getName = (d: SymbolData) =>
  d.name ?? d.shortName ?? d.companyName ?? d.symbol;

const fmtPrice = (v: number | null) => (v == null ? "—" : `$${v.toFixed(2)}`);

const fmtChange = (v: number | null) =>
  v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2);

const fmtPct = (v: number | null) =>
  v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";

const fmtCap = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  return "$" + v.toFixed(0);
};

const fmtNum = (v: number | null, dp = 2) => (v == null ? "—" : v.toFixed(dp));

const gainColor = (v: number | null) =>
  v == null
    ? "var(--sv-text-secondary)"
    : v > 0
      ? "var(--sv-gain)"
      : v < 0
        ? "var(--sv-loss)"
        : "var(--sv-text-secondary)";

// ─── Summary strip ────────────────────────────────────────────────────────────

interface SummaryStripProps {
  data: SymbolData[];
}

const SummaryStrip: React.FC<SummaryStripProps> = ({ data }) => {
  const gainers = data.filter((d) => (getRawPct(d) ?? 0) > 0).length;
  const losers = data.filter((d) => (getRawPct(d) ?? 0) < 0).length;
  const unchanged = data.length - gainers - losers;

  const pill = (
    bg: string,
    border: string,
    icon: string,
    color: string,
    label: string,
  ) => (
    <div
      className="flex align-items-center gap-1"
      style={{
        padding: "0.35rem 0.875rem",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 700,
      }}
    >
      <i className={`pi ${icon}`} style={{ color, fontSize: "0.72rem" }} />
      <span style={{ color }}>{label}</span>
    </div>
  );

  return (
    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
      <div
        className="surface-card border-round-3xl text-sm font-semibold sv-text-muted"
        style={{
          padding: "0.35rem 0.875rem",
          border: "1px solid var(--sv-border)",
        }}
      >
        <i className="pi pi-list mr-1" style={{ fontSize: "0.72rem" }} />
        {data.length} symbols
      </div>
      {gainers > 0 &&
        pill(
          "var(--sv-success-bg)",
          "var(--sv-success)",
          "pi-arrow-up",
          "var(--sv-gain)",
          `${gainers} gainers`,
        )}
      {losers > 0 &&
        pill(
          "var(--sv-danger-bg)",
          "var(--sv-danger)",
          "pi-arrow-down",
          "var(--sv-loss)",
          `${losers} losers`,
        )}
      {unchanged > 0 &&
        pill(
          "var(--sv-bg-surface)",
          "var(--sv-border)",
          "pi-minus",
          "var(--sv-text-muted)",
          `${unchanged} flat`,
        )}
    </div>
  );
};

// ─── Watchlist sidebar item ───────────────────────────────────────────────────

interface WatchlistItemProps {
  wl: Watchlist;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const WatchlistItem: React.FC<WatchlistItemProps> = ({
  wl,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}) => (
  <div
    className="flex align-items-center justify-content-between border-round-lg mb-2 cursor-pointer"
    style={{
      padding: "0.75rem 1rem",
      background: isActive ? "var(--sv-accent-bg)" : "var(--sv-bg-surface)",
      border: `1px solid ${isActive ? "var(--sv-accent)" : "var(--sv-border)"}`,
      transition: "all 0.18s",
    }}
    onClick={onSelect}
  >
    <div className="flex align-items-center gap-2 min-w-0">
      <i
        className={`pi pi-list flex-shrink-0 ${isActive ? "sv-text-accent" : "sv-text-muted"}`}
        style={{ fontSize: "0.8rem" }}
      />
      <span
        className="font-semibold text-color overflow-hidden white-space-nowrap text-overflow-ellipsis"
        style={{ fontSize: "0.875rem" }}
        title={wl.name}
      >
        {wl.name}
      </span>
      {isActive && (
        <Tag
          value="Active"
          className="flex-shrink-0"
          style={{
            background: "var(--sv-accent)",
            color: "#fff",
            fontSize: "0.65rem",
            padding: "0.1rem 0.4rem",
          }}
        />
      )}
    </div>
    <div
      className="flex gap-0 flex-shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        icon="pi pi-pencil"
        text
        size="small"
        onClick={onEdit}
        tooltip="Rename"
        tooltipOptions={{ position: "left" }}
        style={{ color: "var(--sv-text-muted)", padding: "0.2rem 0.35rem" }}
      />
      <Button
        icon="pi pi-trash"
        text
        size="small"
        severity="danger"
        onClick={onDelete}
        tooltip="Delete"
        tooltipOptions={{ position: "left" }}
        style={{ padding: "0.2rem 0.35rem" }}
      />
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const WatchlistPage: React.FC = () => {
  const toast = useRef<Toast>(null);

  // ── Watchlists ──
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(
    null,
  );
  const [watchlistsLoading, setWatchlistsLoading] = useState(true);

  // ── Symbol data ──
  const [symbolData, setSymbolData] = useState<SymbolData[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  // ── View state ──
  const [view, setView] = useState<"main" | "manage">("main");
  const [activeTab, setActiveTab] = useState(0);
  const [tickerFilter, setTickerFilter] = useState("");

  // ── Add single symbol ──
  const [addSymbolInput, setAddSymbolInput] = useState("");
  const [addingSymbol, setAddingSymbol] = useState(false);

  // ── Add multiple symbols dialog ──
  const [showAddMultiple, setShowAddMultiple] = useState(false);
  const [multipleSymbolInput, setMultipleSymbolInput] = useState("");
  const [addingMultiple, setAddingMultiple] = useState(false);

  // ── Create watchlist dialog ──
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // ── Edit watchlist dialog ──
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Performance tab ──
  const [selectedTopSymbols, setSelectedTopSymbols] = useState<string[]>([]);

  // ─── Load watchlists ─────────────────────────────────────────────────────────

  const loadWatchlists = useCallback(async () => {
    setWatchlistsLoading(true);
    try {
      const res = await api.get("/userwatchlist");
      const data = (res.data as Watchlist[]) ?? [];
      setWatchlists(data);
      if (data.length > 0) setSelectedWatchlist(data[0]);
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load watchlists",
        life: 4000,
      });
    } finally {
      setWatchlistsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);

  // ─── Load symbol data when watchlist changes ──────────────────────────────────

  const loadWatchlistSymbols = useCallback(async (id: number) => {
    setSymbolsLoading(true);
    setSymbolData([]);
    setSelectedTopSymbols([]);
    try {
      const res = await api.get(`/userwatchlist/${id}`);
      const symbols = (res.data as string[]) ?? [];
      if (symbols.length > 0) {
        const dataRes = await api.post("/symbol/model/NA", symbols.join(","));
        const data = dataRes.data;
        const arr: SymbolData[] = Array.isArray(data) ? data : [data];
        setSymbolData(arr);
        setSelectedTopSymbols(
          arr.map((d) => d.symbol).slice(0, Math.min(5, arr.length)),
        );
      }
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load watchlist data",
        life: 4000,
      });
    } finally {
      setSymbolsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWatchlist) {
      loadWatchlistSymbols(selectedWatchlist.id);
    }
  }, [selectedWatchlist, loadWatchlistSymbols]);

  // ─── Add single symbol ────────────────────────────────────────────────────────

  const handleAddSymbol = async () => {
    const sym = addSymbolInput.trim().toUpperCase();
    if (!sym || !selectedWatchlist) return;

    if (symbolData.some((d) => d.symbol === sym)) {
      toast.current?.show({
        severity: "warn",
        summary: "Duplicate",
        detail: `${sym} is already in this watchlist`,
        life: 3000,
      });
      return;
    }

    setAddingSymbol(true);
    try {
      await api.post(`/userwatchlist/${selectedWatchlist.id}`, {
        action: "add",
        symbol: sym,
      });
      const dataRes = await api.post("/symbol/model/NA", sym);
      const incoming = dataRes.data;
      const newItems: SymbolData[] = Array.isArray(incoming)
        ? incoming
        : [incoming];
      setSymbolData((prev) => [...newItems, ...prev]);
      setAddSymbolInput("");
      toast.current?.show({
        severity: "success",
        summary: "Added",
        detail: `${sym} added to watchlist`,
        life: 3000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to add symbol. Verify the ticker is valid.",
        life: 4000,
      });
    } finally {
      setAddingSymbol(false);
    }
  };

  // ─── Add multiple symbols ─────────────────────────────────────────────────────

  const handleAddMultiple = async () => {
    if (!multipleSymbolInput.trim() || !selectedWatchlist) return;

    const newSymbols = multipleSymbolInput
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .filter((s) => !symbolData.some((d) => d.symbol === s));

    if (newSymbols.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "No new symbols",
        detail: "All entered symbols already exist in the watchlist",
        life: 3000,
      });
      return;
    }

    setAddingMultiple(true);
    try {
      const joined = newSymbols.join(",");
      await api.post(`/userwatchlist/${selectedWatchlist.id}`, {
        action: "add",
        symbol: joined,
      });
      const dataRes = await api.post("/symbol/model/NA", joined);
      const incoming = dataRes.data;
      const newItems: SymbolData[] = Array.isArray(incoming)
        ? incoming
        : [incoming];
      setSymbolData((prev) => [...newItems, ...prev]);
      setShowAddMultiple(false);
      setMultipleSymbolInput("");
      toast.current?.show({
        severity: "success",
        summary: "Added",
        detail: `${newItems.length} symbol(s) added`,
        life: 3000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to add symbols. Check for invalid tickers.",
        life: 4000,
      });
    } finally {
      setAddingMultiple(false);
    }
  };

  // ─── Delete symbol ────────────────────────────────────────────────────────────

  const handleDeleteSymbol = (row: SymbolData) => {
    confirmDialog({
      message: `Remove ${row.symbol} from this watchlist?`,
      header: "Remove Symbol",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        if (!selectedWatchlist) return;
        try {
          await api.post(`/userwatchlist/${selectedWatchlist.id}`, {
            action: "delete",
            symbol: row.symbol,
          });
          setSymbolData((prev) => prev.filter((d) => d.symbol !== row.symbol));
          setSelectedTopSymbols((prev) => prev.filter((s) => s !== row.symbol));
          toast.current?.show({
            severity: "success",
            summary: "Removed",
            detail: `${row.symbol} removed from watchlist`,
            life: 3000,
          });
        } catch {
          toast.current?.show({
            severity: "error",
            summary: "Error",
            detail: "Failed to remove symbol",
            life: 4000,
          });
        }
      },
    });
  };

  // ─── Create watchlist ─────────────────────────────────────────────────────────

  const handleCreateWatchlist = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Watchlist name is required.");
      return;
    }
    if (watchlists.some((w) => w.name === name)) {
      setCreateError("A watchlist with this name already exists.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await api.post("/userwatchlist", { action: "add", name });
      const d = res.data;
      if (d.success === "1" || d.success === 1) {
        const newWl: Watchlist = { id: d.watchlist_id, name };
        setWatchlists((prev) => [...prev, newWl]);
        setSelectedWatchlist(newWl);
        setShowCreate(false);
        setCreateName("");
        setView("main");
        toast.current?.show({
          severity: "success",
          summary: "Created",
          detail: `Watchlist "${name}" created`,
          life: 3000,
        });
      } else {
        setCreateError(d.reason ?? "Failed to create watchlist.");
      }
    } catch {
      setCreateError("Failed to create watchlist. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // ─── Delete watchlist ─────────────────────────────────────────────────────────

  const handleDeleteWatchlist = (wl: Watchlist) => {
    confirmDialog({
      message: `Delete watchlist "${wl.name}"? This cannot be undone.`,
      header: "Delete Watchlist",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await api.post("/userwatchlist", {
            action: "delete",
            watchlist_id: wl.id,
          });
          const remaining = watchlists.filter((w) => w.id !== wl.id);
          setWatchlists(remaining);
          if (remaining.length > 0) {
            setSelectedWatchlist(remaining[0]);
          } else {
            setSelectedWatchlist(null);
            setSymbolData([]);
            setView("main");
          }
          toast.current?.show({
            severity: "success",
            summary: "Deleted",
            detail: `"${wl.name}" deleted`,
            life: 3000,
          });
        } catch {
          toast.current?.show({
            severity: "error",
            summary: "Error",
            detail: "Failed to delete watchlist",
            life: 4000,
          });
        }
      },
    });
  };

  // ─── Edit watchlist ───────────────────────────────────────────────────────────

  const openEdit = (wl: Watchlist) => {
    setEditingWatchlist(wl);
    setEditName(wl.name);
    setEditError("");
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    const name = editName.trim();
    if (!name) {
      setEditError("Name is required.");
      return;
    }
    if (
      watchlists.some((w) => w.name === name && w.id !== editingWatchlist?.id)
    ) {
      setEditError("A watchlist with this name already exists.");
      return;
    }
    setEditing(true);
    setEditError("");
    try {
      const res = await api.post("/userwatchlist", {
        action: "update",
        watchlist_id: editingWatchlist!.id,
        name,
      });
      const d = res.data;
      if (d.success === "1" || d.success === 1) {
        setWatchlists((prev) =>
          prev.map((w) => (w.id === editingWatchlist!.id ? { ...w, name } : w)),
        );
        if (selectedWatchlist?.id === editingWatchlist!.id) {
          setSelectedWatchlist((prev) => (prev ? { ...prev, name } : null));
        }
        setShowEdit(false);
        setEditingWatchlist(null);
        setEditName("");
        toast.current?.show({
          severity: "success",
          summary: "Renamed",
          detail: `Watchlist renamed to "${name}"`,
          life: 3000,
        });
      } else {
        setEditError(d.reason ?? "Failed to rename watchlist.");
      }
    } catch {
      setEditError("Failed to update watchlist. Please try again.");
    } finally {
      setEditing(false);
    }
  };

  // ─── Column body templates ────────────────────────────────────────────────────

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
          style={{
            fontSize: "0.68rem",
            maxWidth: 160,
            textOverflow: "ellipsis",
          }}
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

  // ── MTD / YTD / 1Y change ──────────────────────────────────────────────────
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

  // ── Individual SMA columns ─────────────────────────────────────────────────
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
      <div className="text-right">
        <div style={{ fontSize: "0.82rem", color: "var(--sv-text-secondary)" }}>
          {v != null ? fmtPrice(v) : "—"}
        </div>
        {diff != null && (
          <div style={{ fontSize: "0.73rem", fontWeight: 600, color }}>
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(2)}{" "}
            <span style={{ opacity: 0.85 }}>
              ({pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"})
            </span>
          </div>
        )}
      </div>
    );
  };

  const sma20BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma20, row);
  const sma50BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma50, row);
  const sma100BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma100, row);
  const sma150BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma150, row);
  const sma200BodyTemplate = (row: SymbolData) => smaBodyTemplate(row.sma200, row);

  // ── Scores ─────────────────────────────────────────────────────────────────
  const scoreBodyTemplate = (
    val: number | undefined,
    max: number,
    lowGood = false,
  ) => {
    const v = val ?? null;
    const ratio = v != null ? v / max : null;
    const color =
      v == null
        ? "var(--sv-text-muted)"
        : lowGood
          ? ratio! < 0.4
            ? "var(--sv-gain)"
            : ratio! > 0.7
              ? "var(--sv-loss)"
              : "var(--sv-warning)"
          : ratio! >= 0.6
            ? "var(--sv-gain)"
            : ratio! >= 0.35
              ? "var(--sv-warning)"
              : "var(--sv-loss)";
    return (
      <div className="flex align-items-center gap-2">
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color,
            minWidth: "22px",
            textAlign: "right",
          }}
        >
          {v != null ? v : "—"}
        </span>
        {v != null && (
          <div
            style={{
              flex: 1,
              height: "5px",
              background: "var(--sv-border)",
              borderRadius: "3px",
              minWidth: "36px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(v / max) * 100}%`,
                height: "100%",
                background: color,
                borderRadius: "3px",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const mohanramBodyTemplate = (row: SymbolData) =>
    scoreBodyTemplate(row.mohanramScore, 8);
  const piotroskiBodyTemplate = (row: SymbolData) =>
    scoreBodyTemplate(row.piotroskiScore, 9);

  const svRankBodyTemplate = (row: SymbolData) => {
    const v = row.svRank ?? null;
    return (
      <div className="text-right">
        {v != null ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "var(--sv-accent-bg)",
              color: "var(--sv-accent)",
              border: "1px solid var(--sv-accent)",
            }}
          >
            #{v}
          </span>
        ) : (
          <span className="sv-text-muted" style={{ fontSize: "0.82rem" }}>
            —
          </span>
        )}
      </div>
    );
  };

  // ── RSI ────────────────────────────────────────────────────────────────────
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

  // ── MACD ───────────────────────────────────────────────────────────────────
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
      hist != null ? hist > 0 : macd != null && sig != null ? macd > sig : null;
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
        {hist != null && (
          <span
            style={{
              fontSize: "0.75rem",
              color: hist > 0 ? "var(--sv-gain)" : "var(--sv-loss)",
            }}
          >
            {hist > 0 ? "+" : ""}
            {hist.toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  // ── Yield ──────────────────────────────────────────────────────────────────
  const yieldBodyTemplate = (row: SymbolData) => {
    const v = row.dividendYield ?? null;
    return (
      <div className="text-right">
        <span
          style={{
            fontSize: "0.85rem",
            color:
              v != null && v > 0 ? "var(--sv-gain)" : "var(--sv-text-muted)",
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
      onClick={() => handleDeleteSymbol(row)}
      style={{ padding: "0.2rem 0.4rem" }}
      tooltip="Remove"
      tooltipOptions={{ position: "left" }}
    />
  );

  // ─── Derived state ────────────────────────────────────────────────────────────

  const symbols = symbolData.map((d) => d.symbol);
  const symbolOptions = symbols.map((s) => ({ label: s, value: s }));
  const isEmpty = !watchlistsLoading && watchlists.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="sv-section">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* ── Loading skeleton ── */}
      {watchlistsLoading && (
        <div className="flex flex-column gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              height="52px"
              className="mb-1"
              borderRadius="8px"
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div
          className="flex flex-column align-items-center justify-content-center sv-page-min-h"
          style={{ textAlign: "center" }}
        >
          <div
            className="flex align-items-center justify-content-center border-circle mb-5"
            style={{
              width: "88px",
              height: "88px",
              background: "var(--sv-accent-bg)",
              boxShadow: "var(--sv-shadow-glow)",
            }}
          >
            <i
              className="pi pi-bookmark sv-text-accent"
              style={{ fontSize: "2.25rem" }}
            />
          </div>
          <h2 className="text-color m-0 mb-2" style={{ fontSize: "1.4rem" }}>
            No Watchlists Yet
          </h2>
          <p
            className="sv-text-muted mb-5 m-0"
            style={{ maxWidth: "380px", lineHeight: 1.6 }}
          >
            Create your first watchlist to start tracking your favourite stocks,
            ETFs, and other securities in one place.
          </p>
          <Button
            label="Create Watchlist"
            icon="pi pi-plus"
            onClick={() => setShowCreate(true)}
            className="font-bold"
          />
        </div>
      )}

      {/* ── Main content (watchlists exist) ── */}
      {!watchlistsLoading && watchlists.length > 0 && (
        <>
          {/* ════ MANAGE VIEW ════ */}
          {view === "manage" && (
            <div
              className="p-card surface-card overflow-hidden"
              style={{ borderLeft: "4px solid var(--sv-accent)" }}
            >
              {/* Manage header */}
              <div
                className="flex align-items-center justify-content-between flex-wrap gap-2 p-3 surface-overlay"
                style={{ borderBottom: "1px solid var(--sv-border)" }}
              >
                <div className="flex align-items-center gap-2">
                  <Button
                    icon="pi pi-arrow-left"
                    text
                    size="small"
                    onClick={() => setView("main")}
                    style={{ color: "var(--sv-text-muted)" }}
                  />
                  <h3
                    className="m-0 font-bold text-color"
                    style={{ fontSize: "1rem" }}
                  >
                    Manage Watchlists
                  </h3>
                  <span
                    className="font-bold"
                    style={{
                      background: "var(--sv-accent)",
                      color: "#fff",
                      fontSize: "0.7rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                    }}
                  >
                    {watchlists.length}
                  </span>
                </div>
                <Button
                  icon="pi pi-plus"
                  label="New Watchlist"
                  size="small"
                  onClick={() => setShowCreate(true)}
                />
              </div>

              {/* Watchlists list */}
              <div className="p-3">
                {watchlists.length === 0 ? (
                  <p className="sv-text-muted text-center py-5 m-0">
                    No watchlists. Create one above.
                  </p>
                ) : (
                  watchlists.map((wl) => (
                    <WatchlistItem
                      key={wl.id}
                      wl={wl}
                      isActive={selectedWatchlist?.id === wl.id}
                      onSelect={() => {
                        setSelectedWatchlist(wl);
                        setView("main");
                      }}
                      onEdit={() => openEdit(wl)}
                      onDelete={() => handleDeleteWatchlist(wl)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════ MAIN VIEW ════ */}
          {view === "main" && (
            <>
              {/* ── Toolbar card ── */}
              <div className="p-card surface-card p-3 mb-3">
                <div className="flex align-items-center gap-2 flex-wrap">
                  {/* Watchlist selector */}
                  <div className="flex align-items-center gap-2">
                    <i
                      className="pi pi-bookmark sv-text-accent"
                      style={{ fontSize: "0.9rem" }}
                    />
                    <Dropdown
                      value={selectedWatchlist}
                      options={watchlists}
                      optionLabel="name"
                      onChange={(e) => setSelectedWatchlist(e.value)}
                      style={{ minWidth: "200px" }}
                      placeholder="Select Watchlist"
                    />
                  </div>

                  <Divider
                    layout="vertical"
                    className="mx-1 my-0"
                    style={{ height: "32px" }}
                  />

                  {/* Add symbol */}
                  <div
                    className="flex align-items-center gap-1 flex-1"
                    style={{ minWidth: "220px" }}
                  >
                    <IconField iconPosition="left" style={{ flex: 1 }}>
                      <InputIcon className="pi pi-search" />
                      <InputText
                        value={addSymbolInput}
                        onChange={(e) =>
                          setAddSymbolInput(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddSymbol()
                        }
                        placeholder="Ticker symbol (e.g. AAPL)"
                        style={{ width: "100%" }}
                      />
                    </IconField>
                    <Button
                      icon="pi pi-plus"
                      label="Add"
                      onClick={handleAddSymbol}
                      loading={addingSymbol}
                      disabled={!addSymbolInput.trim()}
                      className="white-space-nowrap"
                    />
                    <Button
                      icon="pi pi-th-large"
                      label="Bulk Add"
                      outlined
                      onClick={() => setShowAddMultiple(true)}
                      className="white-space-nowrap"
                    />
                  </div>
                </div>
              </div>

              {/* ── Summary strip ── */}
              {!symbolsLoading && symbolData.length > 0 && (
                <SummaryStrip data={symbolData} />
              )}

              {/* ── Tabs card ── */}
              <div className="p-card surface-card overflow-hidden">
                <TabView
                  activeIndex={activeTab}
                  onTabChange={(e) => setActiveTab(e.index)}
                >
                  {/* ─ Tab 1: My Tickers ─ */}
                  <TabPanel header="My Tickers" leftIcon="pi pi-table mr-2">
                    {symbolsLoading ? (
                      <div className="p-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Skeleton
                            key={i}
                            height="44px"
                            className="mb-2"
                            borderRadius="6px"
                          />
                        ))}
                      </div>
                    ) : symbolData.length === 0 ? (
                      <div
                        className="flex flex-column align-items-center justify-content-center p-6"
                        style={{ textAlign: "center" }}
                      >
                        <i
                          className="pi pi-inbox sv-text-muted mb-3"
                          style={{ fontSize: "3rem" }}
                        />
                        <h3 className="text-color-secondary m-0 mb-2">
                          Watchlist is empty
                        </h3>
                        <p className="sv-text-muted m-0">
                          Use the toolbar above to add ticker symbols.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* ── Table toolbar ── */}
                        <div
                          className="py-2 px-3 flex align-items-center justify-content-between gap-2 flex-wrap"
                          style={{ borderBottom: "1px solid var(--sv-border)" }}
                        >
                          <div className="flex align-items-center gap-2">
                            <i
                              className="pi pi-table"
                              style={{
                                color: "var(--sv-accent)",
                                fontSize: "0.9rem",
                              }}
                            />
                            <span
                              className="text-xs font-semibold sv-text-muted"
                              style={{
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {symbolData.length} symbol
                              {symbolData.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <IconField iconPosition="left">
                            <InputIcon className="pi pi-search" />
                            <InputText
                              value={tickerFilter}
                              onChange={(e) => setTickerFilter(e.target.value)}
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
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />

                          <Column
                            header="Mkt Cap"
                            body={capBodyTemplate}
                            style={{ minWidth: "105px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
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
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />
                          <Column
                            header="MTD"
                            body={mtdBodyTemplate}
                            sortable
                            sortField="mtd"
                            style={{ minWidth: "90px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />
                          <Column
                            header="YTD"
                            body={ytdBodyTemplate}
                            sortable
                            sortField="ytd"
                            style={{ minWidth: "90px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />
                          <Column
                            header="1Y Chg"
                            body={change1yBodyTemplate}
                            sortable
                            sortField="priceChangeYearly"
                            style={{ minWidth: "90px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />
                          <Column
                            header="2Y Chg"
                            body={change2yBodyTemplate}
                            sortable
                            sortField="priceChange2Year"
                            style={{ minWidth: "90px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />
                          <Column
                            header="3Y Chg"
                            body={change3yBodyTemplate}
                            sortable
                            sortField="priceChange3Year"
                            style={{ minWidth: "90px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
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
                            sortField="mohanramScore"
                            style={{ minWidth: "110px" }}
                          />
                          <Column
                            header="Piotroski"
                            body={piotroskiBodyTemplate}
                            sortable
                            sortField="piotroskiScore"
                            style={{ minWidth: "105px" }}
                          />
                          <Column
                            header="SV Rank"
                            body={svRankBodyTemplate}
                            sortable
                            sortField="svRank"
                            style={{ minWidth: "85px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
                          />
                          <Column
                            header="RSI"
                            body={rsiBodyTemplate}
                            sortable
                            sortField="rsi"
                            style={{ minWidth: "80px" }}
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
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
                            pt={{
                              headerContent: {
                                className: "justify-content-end",
                              },
                            }}
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
                    )}
                  </TabPanel>

                  {/* ─ Tab 2: Performance ─ */}
                  <TabPanel
                    header="Performance"
                    leftIcon="pi pi-chart-line mr-2"
                  >
                    <div className="p-4">
                      <div className="flex align-items-center gap-3 mb-4 flex-wrap">
                        <label className="text-color-secondary text-sm font-semibold white-space-nowrap">
                          Compare symbols (max 10):
                        </label>
                        <MultiSelect
                          value={selectedTopSymbols}
                          options={symbolOptions}
                          onChange={(e) => setSelectedTopSymbols(e.value)}
                          selectionLimit={10}
                          placeholder="Select symbols to compare"
                          display="chip"
                          style={{ flex: 1, minWidth: "220px" }}
                        />
                      </div>

                      {/* Selected symbols mini dashboard */}
                      {selectedTopSymbols.length > 0 && (
                        <div className="grid mb-4 gap-3">
                          {selectedTopSymbols.map((sym) => {
                            const d = symbolData.find((s) => s.symbol === sym);
                            if (!d) return null;
                            const pct = getRawPct(d);
                            return (
                              <div
                                key={sym}
                                className="col-6 lg:col-3 xl:col-2 p-0"
                              >
                                <div
                                  className="surface-overlay border-round-lg p-3 text-center"
                                  style={{
                                    border: "1px solid var(--sv-border)",
                                    borderTop: `3px solid ${
                                      pct == null
                                        ? "var(--sv-border)"
                                        : pct > 0
                                          ? "var(--sv-gain)"
                                          : "var(--sv-loss)"
                                    }`,
                                  }}
                                >
                                  <div
                                    className="font-bold sv-text-accent mb-1"
                                    style={{
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {sym}
                                  </div>
                                  <div
                                    className="font-bold text-color"
                                    style={{
                                      fontSize: "1rem",
                                    }}
                                  >
                                    {fmtPrice(getPrice(d))}
                                  </div>
                                  <div
                                    className="font-bold"
                                    style={{
                                      fontSize: "0.78rem",
                                      color: gainColor(pct),
                                    }}
                                  >
                                    {fmtPct(pct)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Chart placeholder */}
                      <div
                        className="flex align-items-center justify-content-center flex-column surface-overlay border-round-xl gap-3"
                        style={{
                          height: "320px",
                          border: "1px dashed var(--sv-border)",
                        }}
                      >
                        <i
                          className="pi pi-chart-line sv-text-muted"
                          style={{ fontSize: "3.5rem" }}
                        />
                        {selectedTopSymbols.length > 0 ? (
                          <>
                            <p
                              className="sv-text-muted text-center m-0"
                              style={{ maxWidth: "360px" }}
                            >
                              Performance comparison chart for{" "}
                              <strong className="text-color-secondary">
                                {selectedTopSymbols.join(", ")}
                              </strong>
                            </p>
                            <span
                              className="text-sm border-round-3xl"
                              style={{
                                color: "var(--sv-warning)",
                                background: "var(--sv-warning-bg)",
                                padding: "0.25rem 0.75rem",
                                border: "1px solid var(--sv-warning)",
                              }}
                            >
                              Chart integration coming soon
                            </span>
                          </>
                        ) : (
                          <p className="sv-text-muted m-0">
                            Select symbols above to view performance comparison
                          </p>
                        )}
                      </div>
                    </div>
                  </TabPanel>

                  {/* ─ Tab 3: Alerts ─ */}
                  <TabPanel header="Alerts" leftIcon="pi pi-bell mr-2">
                    <div
                      className="flex flex-column align-items-center justify-content-center p-6"
                      style={{ textAlign: "center" }}
                    >
                      <div
                        className="flex align-items-center justify-content-center border-circle mb-4"
                        style={{
                          width: "72px",
                          height: "72px",
                          background: "var(--sv-warning-bg)",
                          border: "1px solid var(--sv-warning)",
                        }}
                      >
                        <i
                          className="pi pi-bell"
                          style={{
                            fontSize: "2rem",
                            color: "var(--sv-warning)",
                          }}
                        />
                      </div>
                      <h3 className="text-color m-0 mb-2">Technical Alerts</h3>
                      <p
                        className="sv-text-muted m-0"
                        style={{ maxWidth: "380px", lineHeight: 1.6 }}
                      >
                        Price alerts and technical analysis signals for{" "}
                        {symbols.length > 0
                          ? `${symbols.slice(0, 3).join(", ")}${symbols.length > 3 ? " and more" : ""}`
                          : "your watchlist symbols"}{" "}
                        will appear here.
                      </p>
                    </div>
                  </TabPanel>

                  {/* ─ Tab 4: Dividends & Earnings ─ */}
                  <TabPanel
                    header="Dividends & Earnings"
                    leftIcon="pi pi-calendar mr-2"
                  >
                    <div className="grid p-3 gap-3">
                      {/* Dividends card */}
                      <div className="col-12 lg:col-6 p-0">
                        <div
                          className="surface-overlay border-round-xl p-5 text-center h-full"
                          style={{
                            border: "1px solid var(--sv-border)",
                            borderTop: "3px solid var(--sv-gain)",
                          }}
                        >
                          <div
                            className="flex align-items-center justify-content-center border-circle mx-auto mb-4"
                            style={{
                              width: "52px",
                              height: "52px",
                              background: "var(--sv-success-bg)",
                              border: "1px solid var(--sv-success)",
                            }}
                          >
                            <i
                              className="pi pi-dollar sv-text-gain"
                              style={{ fontSize: "1.5rem" }}
                            />
                          </div>
                          <h4 className="text-color m-0 mb-2">
                            Upcoming Dividends
                          </h4>
                          <p
                            className="sv-text-muted text-sm m-0"
                            style={{ lineHeight: 1.6 }}
                          >
                            Dividend ex-dates, payment dates, and yield
                            information for your watchlist securities.
                          </p>
                        </div>
                      </div>

                      {/* Earnings card */}
                      <div className="col-12 lg:col-6 p-0">
                        <div
                          className="surface-overlay border-round-xl p-5 text-center h-full"
                          style={{
                            border: "1px solid var(--sv-border)",
                            borderTop: "3px solid var(--sv-accent)",
                          }}
                        >
                          <div
                            className="flex align-items-center justify-content-center border-circle mx-auto mb-4"
                            style={{
                              width: "52px",
                              height: "52px",
                              background: "var(--sv-accent-bg)",
                              border: "1px solid var(--sv-accent)",
                            }}
                          >
                            <i
                              className="pi pi-chart-bar sv-text-accent"
                              style={{ fontSize: "1.5rem" }}
                            />
                          </div>
                          <h4 className="text-color m-0 mb-2">
                            Earnings Calendar
                          </h4>
                          <p
                            className="sv-text-muted text-sm m-0"
                            style={{ lineHeight: 1.6 }}
                          >
                            Upcoming earnings report dates and EPS estimates for
                            your watchlist securities.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabPanel>
                </TabView>
              </div>
            </>
          )}
        </>
      )}

      {/* ══ Dialogs ══════════════════════════════════════════════════════════════ */}

      {/* Add Multiple Symbols */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-th-large sv-text-accent" />
            <span>Bulk Add Symbols</span>
          </div>
        }
        visible={showAddMultiple}
        onHide={() => {
          setShowAddMultiple(false);
          setMultipleSymbolInput("");
        }}
        style={{ width: "min(460px, 95vw)" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label className="text-sm text-color-secondary font-semibold">
              Symbols (comma-separated)
            </label>
            <InputTextarea
              value={multipleSymbolInput}
              onChange={(e) =>
                setMultipleSymbolInput(e.target.value.toUpperCase())
              }
              placeholder="AAPL, GOOGL, MSFT, AMZN, NVDA..."
              rows={5}
              style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
              autoFocus
            />
          </div>
          <div
            className="flex align-items-center gap-2 border-round text-sm"
            style={{
              padding: "0.5rem 0.75rem",
              background: "var(--sv-info-bg)",
              color: "var(--sv-info)",
            }}
          >
            <i className="pi pi-info-circle" />
            <span>Enter up to 25 symbols separated by commas</span>
          </div>
          <div className="flex justify-content-end gap-2 mt-1">
            <Button
              label="Cancel"
              outlined
              onClick={() => {
                setShowAddMultiple(false);
                setMultipleSymbolInput("");
              }}
              disabled={addingMultiple}
            />
            <Button
              label="Add Symbols"
              icon="pi pi-plus"
              onClick={handleAddMultiple}
              loading={addingMultiple}
              disabled={!multipleSymbolInput.trim()}
            />
          </div>
        </div>
      </Dialog>

      {/* Create Watchlist */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-plus-circle sv-text-accent" />
            <span>Create Watchlist</span>
          </div>
        }
        visible={showCreate}
        onHide={() => {
          setShowCreate(false);
          setCreateName("");
          setCreateError("");
        }}
        style={{ width: "min(420px, 95vw)" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label
              htmlFor="create-wl-name"
              className="text-sm text-color-secondary font-semibold"
            >
              Watchlist Name
            </label>
            <InputText
              id="create-wl-name"
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value);
                setCreateError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWatchlist()}
              placeholder="e.g. Tech Favourites"
              maxLength={60}
              autoFocus
            />
          </div>
          {createError && (
            <Message severity="error" text={createError} className="w-full" />
          )}
          <div className="flex justify-content-end gap-2 mt-1">
            <Button
              label="Cancel"
              outlined
              onClick={() => {
                setShowCreate(false);
                setCreateName("");
                setCreateError("");
              }}
              disabled={creating}
            />
            <Button
              label="Create"
              icon="pi pi-check"
              onClick={handleCreateWatchlist}
              loading={creating}
              disabled={!createName.trim()}
            />
          </div>
        </div>
      </Dialog>

      {/* Edit / Rename Watchlist */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-pencil sv-text-accent" />
            <span>Rename Watchlist</span>
          </div>
        }
        visible={showEdit}
        onHide={() => {
          setShowEdit(false);
          setEditName("");
          setEditError("");
          setEditingWatchlist(null);
        }}
        style={{ width: "min(420px, 95vw)" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label
              htmlFor="edit-wl-name"
              className="text-sm text-color-secondary font-semibold"
            >
              New Name
            </label>
            <InputText
              id="edit-wl-name"
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
              maxLength={60}
              autoFocus
            />
          </div>
          {editError && (
            <Message severity="error" text={editError} className="w-full" />
          )}
          <div className="flex justify-content-end gap-2 mt-1">
            <Button
              label="Cancel"
              outlined
              onClick={() => {
                setShowEdit(false);
                setEditName("");
                setEditError("");
                setEditingWatchlist(null);
              }}
              disabled={editing}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              onClick={handleSaveEdit}
              loading={editing}
              disabled={!editName.trim()}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default WatchlistPage;
