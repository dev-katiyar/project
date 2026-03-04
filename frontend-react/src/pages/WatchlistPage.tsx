import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "@/services/api";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
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
  changepct?: number;
  regularMarketChangePercent?: number;
  volume?: number;
  regularMarketVolume?: number;
  marketcap?: number;
  marketCap?: number;
  pe?: number;
  trailingPE?: number;
  week52high?: number;
  fiftyTwoWeekHigh?: number;
  week52low?: number;
  fiftyTwoWeekLow?: number;
  sector?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPrice = (d: SymbolData) =>
  d.price ?? d.currentPrice ?? d.regularMarketPrice ?? null;

const getChange = (d: SymbolData) =>
  d.change ?? d.regularMarketChange ?? null;

const getRawPct = (d: SymbolData): number | null => {
  const v = d.changepct ?? d.regularMarketChangePercent ?? null;
  if (v == null) return null;
  // normalise: if raw value is a tiny decimal (e.g. 0.012), multiply to get %
  return Math.abs(v) < 1 ? v * 100 : v;
};

const getVolume = (d: SymbolData) => d.volume ?? d.regularMarketVolume ?? null;
const getMarketCap = (d: SymbolData) => d.marketcap ?? d.marketCap ?? null;
const getPE = (d: SymbolData) => d.pe ?? d.trailingPE ?? null;
const get52High = (d: SymbolData) => d.week52high ?? d.fiftyTwoWeekHigh ?? null;
const get52Low = (d: SymbolData) => d.week52low ?? d.fiftyTwoWeekLow ?? null;
const getName = (d: SymbolData) =>
  d.name ?? d.shortName ?? d.companyName ?? d.symbol;

const fmtPrice = (v: number | null) => (v == null ? "—" : `$${v.toFixed(2)}`);

const fmtChange = (v: number | null) =>
  v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2);

const fmtPct = (v: number | null) =>
  v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";

const fmtVolume = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toString();
};

const fmtCap = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  return "$" + v.toFixed(0);
};

const fmtNum = (v: number | null, dp = 2) =>
  v == null ? "—" : v.toFixed(dp);

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
      style={{
        padding: "0.35rem 0.875rem",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
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
        style={{
          padding: "0.35rem 0.875rem",
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
          borderRadius: "999px",
          fontSize: "0.8rem",
          color: "var(--sv-text-muted)",
          fontWeight: 600,
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
    className="flex align-items-center justify-content-between"
    style={{
      padding: "0.75rem 1rem",
      borderRadius: "8px",
      marginBottom: "0.4rem",
      background: isActive ? "var(--sv-accent-bg)" : "var(--sv-bg-surface)",
      border: `1px solid ${isActive ? "var(--sv-accent)" : "var(--sv-border)"}`,
      cursor: "pointer",
      transition: "all 0.18s",
    }}
    onClick={onSelect}
  >
    <div className="flex align-items-center gap-2" style={{ minWidth: 0 }}>
      <i
        className="pi pi-list"
        style={{
          color: isActive ? "var(--sv-accent)" : "var(--sv-text-muted)",
          fontSize: "0.8rem",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontWeight: 600,
          color: "var(--sv-text-primary)",
          fontSize: "0.875rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={wl.name}
      >
        {wl.name}
      </span>
      {isActive && (
        <Tag
          value="Active"
          style={{
            background: "var(--sv-accent)",
            color: "#fff",
            fontSize: "0.65rem",
            padding: "0.1rem 0.4rem",
            flexShrink: 0,
          }}
        />
      )}
    </div>
    <div
      className="flex gap-0"
      onClick={(e) => e.stopPropagation()}
      style={{ flexShrink: 0 }}
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
  const [selectedWatchlist, setSelectedWatchlist] =
    useState<Watchlist | null>(null);
  const [watchlistsLoading, setWatchlistsLoading] = useState(true);

  // ── Symbol data ──
  const [symbolData, setSymbolData] = useState<SymbolData[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  // ── View state ──
  const [view, setView] = useState<"main" | "manage">("main");
  const [activeTab, setActiveTab] = useState(0);

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
          setSymbolData((prev) =>
            prev.filter((d) => d.symbol !== row.symbol),
          );
          setSelectedTopSymbols((prev) =>
            prev.filter((s) => s !== row.symbol),
          );
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
          prev.map((w) =>
            w.id === editingWatchlist!.id ? { ...w, name } : w,
          ),
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
    <span
      style={{
        background: "var(--sv-accent-bg)",
        color: "var(--sv-accent)",
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.2rem 0.5rem",
        borderRadius: "6px",
        letterSpacing: "0.05em",
        fontFamily: "monospace",
        display: "inline-block",
      }}
    >
      {row.symbol}
    </span>
  );

  const nameBodyTemplate = (row: SymbolData) => (
    <span
      style={{
        color: "var(--sv-text-secondary)",
        fontSize: "0.82rem",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "180px",
        display: "block",
      }}
      title={getName(row)}
    >
      {getName(row)}
    </span>
  );

  const priceBodyTemplate = (row: SymbolData) => (
    <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.88rem" }}>
      {fmtPrice(getPrice(row))}
    </span>
  );

  const changeBodyTemplate = (row: SymbolData) => {
    const v = getChange(row);
    return (
      <span
        style={{ color: gainColor(v), fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}
      >
        {fmtChange(v)}
      </span>
    );
  };

  const changePctBodyTemplate = (row: SymbolData) => {
    const pct = getRawPct(row);
    return (
      <Tag
        value={fmtPct(pct)}
        style={{
          background:
            pct == null
              ? "var(--sv-bg-surface)"
              : pct > 0
              ? "var(--sv-success-bg)"
              : pct < 0
              ? "var(--sv-danger-bg)"
              : "var(--sv-bg-surface)",
          color:
            pct == null
              ? "var(--sv-text-muted)"
              : pct > 0
              ? "var(--sv-gain)"
              : pct < 0
              ? "var(--sv-loss)"
              : "var(--sv-text-muted)",
          fontSize: "0.78rem",
          fontWeight: 700,
          fontFamily: "monospace",
          border: "none",
        }}
      />
    );
  };

  const volumeBodyTemplate = (row: SymbolData) => (
    <span style={{ color: "var(--sv-text-secondary)", fontFamily: "monospace", fontSize: "0.82rem" }}>
      {fmtVolume(getVolume(row))}
    </span>
  );

  const capBodyTemplate = (row: SymbolData) => (
    <span style={{ color: "var(--sv-text-secondary)", fontFamily: "monospace", fontSize: "0.82rem" }}>
      {fmtCap(getMarketCap(row))}
    </span>
  );

  const peBodyTemplate = (row: SymbolData) => (
    <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
      {fmtNum(getPE(row))}
    </span>
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
          className="flex justify-content-between"
          style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", marginBottom: "4px" }}
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
              background: "linear-gradient(90deg, var(--sv-danger) 0%, var(--sv-warning) 50%, var(--sv-gain) 100%)",
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

  const sectorBodyTemplate = (row: SymbolData) =>
    row.sector ? (
      <Tag
        value={row.sector}
        style={{
          background: "var(--sv-bg-surface)",
          color: "var(--sv-text-muted)",
          fontSize: "0.72rem",
          border: "1px solid var(--sv-border)",
        }}
      />
    ) : (
      <span style={{ color: "var(--sv-text-muted)", fontSize: "0.82rem" }}>—</span>
    );

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

      {/* ── Page header ── */}
      <div className="flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1
            className="m-0 sv-page-title"
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--sv-text-primary)",
            }}
          >
            <i
              className="pi pi-bookmark mr-2"
              style={{ color: "var(--sv-accent)", fontSize: "1.3rem" }}
            />
            Watchlists
          </h1>
          <p
            className="m-0 mt-1"
            style={{ color: "var(--sv-text-muted)", fontSize: "0.85rem" }}
          >
            Track and monitor your favorite securities in real time
          </p>
        </div>
        {!watchlistsLoading && watchlists.length > 0 && view === "main" && (
          <Button
            icon="pi pi-cog"
            label="Manage Watchlists"
            outlined
            size="small"
            onClick={() => setView("manage")}
            style={{ color: "var(--sv-text-secondary)" }}
          />
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {watchlistsLoading && (
        <div className="flex flex-column gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="52px" className="mb-1" borderRadius="8px" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div
          className="flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "55vh", textAlign: "center" }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              background: "var(--sv-accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              boxShadow: "var(--sv-shadow-glow)",
            }}
          >
            <i
              className="pi pi-bookmark"
              style={{ fontSize: "2.25rem", color: "var(--sv-accent)" }}
            />
          </div>
          <h2
            style={{
              color: "var(--sv-text-primary)",
              margin: "0 0 0.5rem",
              fontSize: "1.4rem",
            }}
          >
            No Watchlists Yet
          </h2>
          <p
            style={{
              color: "var(--sv-text-muted)",
              maxWidth: "380px",
              marginBottom: "1.75rem",
              lineHeight: 1.6,
            }}
          >
            Create your first watchlist to start tracking your favourite stocks,
            ETFs, and other securities in one place.
          </p>
          <Button
            label="Create Watchlist"
            icon="pi pi-plus"
            onClick={() => setShowCreate(true)}
            style={{
              background: "var(--sv-accent)",
              borderColor: "var(--sv-accent)",
              fontWeight: 700,
            }}
          />
        </div>
      )}

      {/* ── Main content (watchlists exist) ── */}
      {!watchlistsLoading && watchlists.length > 0 && (
        <>
          {/* ════ MANAGE VIEW ════ */}
          {view === "manage" && (
            <div
              style={{
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
                borderLeft: "4px solid var(--sv-accent)",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "var(--sv-shadow-md)",
              }}
            >
              {/* Manage header */}
              <div
                style={{
                  padding: "0.875rem 1.25rem",
                  borderBottom: "1px solid var(--sv-border)",
                  background: "var(--sv-bg-surface)",
                }}
                className="flex align-items-center justify-content-between flex-wrap gap-2"
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
                    className="m-0"
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--sv-text-primary)",
                    }}
                  >
                    Manage Watchlists
                  </h3>
                  <span
                    style={{
                      background: "var(--sv-accent)",
                      color: "#fff",
                      fontSize: "0.7rem",
                      fontWeight: 700,
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
                  style={{
                    background: "var(--sv-accent)",
                    borderColor: "var(--sv-accent)",
                  }}
                />
              </div>

              {/* Watchlists list */}
              <div style={{ padding: "1rem" }}>
                {watchlists.length === 0 ? (
                  <p
                    style={{
                      color: "var(--sv-text-muted)",
                      textAlign: "center",
                      padding: "2rem 0",
                    }}
                  >
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
              <div
                style={{
                  background: "var(--sv-bg-card)",
                  border: "1px solid var(--sv-border)",
                  borderRadius: "12px",
                  padding: "0.875rem 1.25rem",
                  marginBottom: "1rem",
                  boxShadow: "var(--sv-shadow-sm)",
                }}
              >
                <div className="flex align-items-center gap-2 flex-wrap">
                  {/* Watchlist selector */}
                  <div className="flex align-items-center gap-2">
                    <i
                      className="pi pi-bookmark"
                      style={{ color: "var(--sv-accent)", fontSize: "0.9rem" }}
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

                  {/* Divider */}
                  <div
                    style={{
                      width: "1px",
                      height: "32px",
                      background: "var(--sv-border)",
                      margin: "0 0.125rem",
                    }}
                  />

                  {/* Add symbol */}
                  <div
                    className="flex align-items-center gap-1 flex-1"
                    style={{ minWidth: "220px" }}
                  >
                    <span className="p-input-icon-left" style={{ flex: 1 }}>
                      <i className="pi pi-search" />
                      <InputText
                        value={addSymbolInput}
                        onChange={(e) =>
                          setAddSymbolInput(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddSymbol()
                        }
                        placeholder="Ticker symbol (e.g. AAPL)"
                        style={{ width: "100%", paddingLeft: "2.25rem" }}
                      />
                    </span>
                    <Button
                      icon="pi pi-plus"
                      label="Add"
                      onClick={handleAddSymbol}
                      loading={addingSymbol}
                      disabled={!addSymbolInput.trim()}
                      style={{
                        background: "var(--sv-accent)",
                        borderColor: "var(--sv-accent)",
                        whiteSpace: "nowrap",
                      }}
                    />
                    <Button
                      icon="pi pi-th-large"
                      label="Bulk Add"
                      outlined
                      onClick={() => setShowAddMultiple(true)}
                      style={{ whiteSpace: "nowrap" }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Summary strip ── */}
              {!symbolsLoading && symbolData.length > 0 && (
                <SummaryStrip data={symbolData} />
              )}

              {/* ── Tabs card ── */}
              <div
                style={{
                  background: "var(--sv-bg-card)",
                  border: "1px solid var(--sv-border)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "var(--sv-shadow-md)",
                }}
              >
                <TabView
                  activeIndex={activeTab}
                  onTabChange={(e) => setActiveTab(e.index)}
                >
                  {/* ─ Tab 1: My Tickers ─ */}
                  <TabPanel
                    header="My Tickers"
                    leftIcon="pi pi-table mr-2"
                  >
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
                        className="flex flex-column align-items-center justify-content-center"
                        style={{ padding: "3.5rem 2rem", textAlign: "center" }}
                      >
                        <i
                          className="pi pi-inbox"
                          style={{
                            fontSize: "3rem",
                            color: "var(--sv-text-muted)",
                            marginBottom: "1rem",
                          }}
                        />
                        <h3
                          style={{
                            color: "var(--sv-text-secondary)",
                            margin: "0 0 0.5rem",
                          }}
                        >
                          Watchlist is empty
                        </h3>
                        <p style={{ color: "var(--sv-text-muted)", margin: 0 }}>
                          Use the toolbar above to add ticker symbols.
                        </p>
                      </div>
                    ) : (
                      <DataTable
                        value={symbolData}
                        sortMode="single"
                        removableSort
                        scrollable
                        scrollHeight="600px"
                        stripedRows
                        size="small"
                        style={{ fontSize: "0.85rem" }}
                      >
                        <Column
                          field="symbol"
                          header="Symbol"
                          body={symbolBodyTemplate}
                          sortable
                          frozen
                          style={{ minWidth: "100px" }}
                        />
                        <Column
                          header="Name"
                          body={nameBodyTemplate}
                          style={{ minWidth: "180px" }}
                        />
                        <Column
                          header="Price"
                          body={priceBodyTemplate}
                          sortable
                          sortField="price"
                          style={{ minWidth: "95px", textAlign: "right" }}
                        />
                        <Column
                          header="Change"
                          body={changeBodyTemplate}
                          style={{ minWidth: "90px", textAlign: "right" }}
                        />
                        <Column
                          header="Change %"
                          body={changePctBodyTemplate}
                          style={{ minWidth: "100px" }}
                        />
                        <Column
                          header="Volume"
                          body={volumeBodyTemplate}
                          style={{ minWidth: "90px", textAlign: "right" }}
                        />
                        <Column
                          header="Mkt Cap"
                          body={capBodyTemplate}
                          style={{ minWidth: "105px", textAlign: "right" }}
                        />
                        <Column
                          header="P/E"
                          body={peBodyTemplate}
                          style={{ minWidth: "70px", textAlign: "right" }}
                        />
                        <Column
                          header="52W Range"
                          body={week52BodyTemplate}
                          style={{ minWidth: "155px" }}
                        />
                        <Column
                          header="Sector"
                          body={sectorBodyTemplate}
                          style={{ minWidth: "130px" }}
                        />
                        <Column
                          header=""
                          body={actionsBodyTemplate}
                          frozen
                          alignFrozen="right"
                          style={{ minWidth: "56px", textAlign: "center" }}
                        />
                      </DataTable>
                    )}
                  </TabPanel>

                  {/* ─ Tab 2: Performance ─ */}
                  <TabPanel
                    header="Performance"
                    leftIcon="pi pi-chart-line mr-2"
                  >
                    <div style={{ padding: "1.25rem" }}>
                      <div className="flex align-items-center gap-3 mb-4 flex-wrap">
                        <label
                          style={{
                            color: "var(--sv-text-secondary)",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
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
                        <div className="grid mb-4" style={{ gap: "0.75rem" }}>
                          {selectedTopSymbols.map((sym) => {
                            const d = symbolData.find(
                              (s) => s.symbol === sym,
                            );
                            if (!d) return null;
                            const pct = getRawPct(d);
                            return (
                              <div
                                key={sym}
                                className="col-6 lg:col-3 xl:col-2"
                                style={{ padding: "0" }}
                              >
                                <div
                                  style={{
                                    background: "var(--sv-bg-surface)",
                                    border: "1px solid var(--sv-border)",
                                    borderTop: `3px solid ${
                                      pct == null
                                        ? "var(--sv-border)"
                                        : pct > 0
                                        ? "var(--sv-gain)"
                                        : "var(--sv-loss)"
                                    }`,
                                    borderRadius: "8px",
                                    padding: "0.75rem",
                                    textAlign: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: "0.8rem",
                                      fontFamily: "monospace",
                                      color: "var(--sv-accent)",
                                      letterSpacing: "0.05em",
                                      marginBottom: "0.25rem",
                                    }}
                                  >
                                    {sym}
                                  </div>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: "1rem",
                                      color: "var(--sv-text-primary)",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {fmtPrice(getPrice(d))}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.78rem",
                                      fontWeight: 700,
                                      color: gainColor(pct),
                                      fontFamily: "monospace",
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
                        className="flex align-items-center justify-content-center flex-column"
                        style={{
                          height: "320px",
                          background: "var(--sv-bg-surface)",
                          border: "1px dashed var(--sv-border)",
                          borderRadius: "12px",
                          gap: "0.75rem",
                        }}
                      >
                        <i
                          className="pi pi-chart-line"
                          style={{
                            fontSize: "3.5rem",
                            color: "var(--sv-border)",
                          }}
                        />
                        {selectedTopSymbols.length > 0 ? (
                          <>
                            <p
                              style={{
                                color: "var(--sv-text-muted)",
                                textAlign: "center",
                                margin: 0,
                                maxWidth: "360px",
                              }}
                            >
                              Performance comparison chart for{" "}
                              <strong style={{ color: "var(--sv-text-secondary)" }}>
                                {selectedTopSymbols.join(", ")}
                              </strong>
                            </p>
                            <span
                              style={{
                                fontSize: "0.78rem",
                                color: "var(--sv-text-muted)",
                                background: "var(--sv-warning-bg)",
                                color: "var(--sv-warning)",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "999px",
                                border: "1px solid var(--sv-warning)",
                              }}
                            >
                              Chart integration coming soon
                            </span>
                          </>
                        ) : (
                          <p style={{ color: "var(--sv-text-muted)", margin: 0 }}>
                            Select symbols above to view performance comparison
                          </p>
                        )}
                      </div>
                    </div>
                  </TabPanel>

                  {/* ─ Tab 3: Alerts ─ */}
                  <TabPanel
                    header="Alerts"
                    leftIcon="pi pi-bell mr-2"
                  >
                    <div
                      className="flex flex-column align-items-center justify-content-center"
                      style={{ padding: "3.5rem 2rem", textAlign: "center" }}
                    >
                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "50%",
                          background: "var(--sv-warning-bg)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "1.25rem",
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
                      <h3
                        style={{
                          color: "var(--sv-text-primary)",
                          margin: "0 0 0.5rem",
                        }}
                      >
                        Technical Alerts
                      </h3>
                      <p
                        style={{
                          color: "var(--sv-text-muted)",
                          maxWidth: "380px",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
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
                    <div className="grid p-3" style={{ gap: "1rem" }}>
                      {/* Dividends card */}
                      <div className="col-12 lg:col-6" style={{ padding: 0 }}>
                        <div
                          style={{
                            background: "var(--sv-bg-surface)",
                            border: "1px solid var(--sv-border)",
                            borderTop: "3px solid var(--sv-gain)",
                            borderRadius: "10px",
                            padding: "1.5rem",
                            textAlign: "center",
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              width: "52px",
                              height: "52px",
                              borderRadius: "50%",
                              background: "var(--sv-success-bg)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 1rem",
                              border: "1px solid var(--sv-success)",
                            }}
                          >
                            <i
                              className="pi pi-dollar"
                              style={{
                                fontSize: "1.5rem",
                                color: "var(--sv-gain)",
                              }}
                            />
                          </div>
                          <h4
                            style={{
                              color: "var(--sv-text-primary)",
                              margin: "0 0 0.5rem",
                            }}
                          >
                            Upcoming Dividends
                          </h4>
                          <p
                            style={{
                              color: "var(--sv-text-muted)",
                              fontSize: "0.85rem",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            Dividend ex-dates, payment dates, and yield
                            information for your watchlist securities.
                          </p>
                        </div>
                      </div>

                      {/* Earnings card */}
                      <div className="col-12 lg:col-6" style={{ padding: 0 }}>
                        <div
                          style={{
                            background: "var(--sv-bg-surface)",
                            border: "1px solid var(--sv-border)",
                            borderTop: "3px solid var(--sv-accent)",
                            borderRadius: "10px",
                            padding: "1.5rem",
                            textAlign: "center",
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              width: "52px",
                              height: "52px",
                              borderRadius: "50%",
                              background: "var(--sv-accent-bg)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 1rem",
                              border: "1px solid var(--sv-accent)",
                            }}
                          >
                            <i
                              className="pi pi-chart-bar"
                              style={{
                                fontSize: "1.5rem",
                                color: "var(--sv-accent)",
                              }}
                            />
                          </div>
                          <h4
                            style={{
                              color: "var(--sv-text-primary)",
                              margin: "0 0 0.5rem",
                            }}
                          >
                            Earnings Calendar
                          </h4>
                          <p
                            style={{
                              color: "var(--sv-text-muted)",
                              fontSize: "0.85rem",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
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
            <i
              className="pi pi-th-large"
              style={{ color: "var(--sv-accent)" }}
            />
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
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--sv-text-secondary)",
                fontWeight: 600,
              }}
            >
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
            className="flex align-items-center gap-2"
            style={{
              padding: "0.5rem 0.75rem",
              background: "var(--sv-info-bg)",
              borderRadius: "6px",
              fontSize: "0.8rem",
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
              style={{
                background: "var(--sv-accent)",
                borderColor: "var(--sv-accent)",
              }}
            />
          </div>
        </div>
      </Dialog>

      {/* Create Watchlist */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i
              className="pi pi-plus-circle"
              style={{ color: "var(--sv-accent)" }}
            />
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
              style={{ fontSize: "0.85rem", color: "var(--sv-text-secondary)", fontWeight: 600 }}
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
              style={{
                background: "var(--sv-accent)",
                borderColor: "var(--sv-accent)",
              }}
            />
          </div>
        </div>
      </Dialog>

      {/* Edit / Rename Watchlist */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i
              className="pi pi-pencil"
              style={{ color: "var(--sv-accent)" }}
            />
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
              style={{ fontSize: "0.85rem", color: "var(--sv-text-secondary)", fontWeight: 600 }}
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
              style={{
                background: "var(--sv-accent)",
                borderColor: "var(--sv-accent)",
              }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default WatchlistPage;
