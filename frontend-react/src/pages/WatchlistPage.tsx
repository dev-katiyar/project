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
import { Skeleton } from "primereact/skeleton";
import { TabView, TabPanel } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";
import WatchlistTickerTable, {
  type SymbolData,
  getRawPct,
} from "@/components/watchlist/WatchlistTickerTable";
import WatchlistPerformanceChart from "@/components/watchlist/WatchlistPerformanceChart";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Watchlist {
  id: number;
  name: string;
}


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
    try {
      const res = await api.get(`/userwatchlist/${id}`);
      const symbols = (res.data as string[]) ?? [];
      if (symbols.length > 0) {
        const dataRes = await api.post("/symbol/model/NA", symbols.join(","));
        const data = dataRes.data;
        const arr: SymbolData[] = Array.isArray(data) ? data : [data];
        setSymbolData(arr);
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

  // ─── Derived state ────────────────────────────────────────────────────────────

  const symbols = symbolData.map((d) => d.symbol);
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
              <div style={{ background: "var(--sv-bg-card)", border: "1px solid var(--sv-border)", borderRadius: "6px", overflow: "hidden", padding: "0.75rem", boxShadow: "var(--sv-shadow-md)" }}>
                <TabView
                  activeIndex={activeTab}
                  onTabChange={(e) => setActiveTab(e.index)}
                  pt={{ root: { className: "sv-tabs" } }}
                >
                  {/* ─ Tab 1: My Tickers ─ */}
                  <TabPanel header="My Tickers" leftIcon="pi pi-table mr-2">
                    <WatchlistTickerTable
                      symbolsLoading={symbolsLoading}
                      symbolData={symbolData}
                      tickerFilter={tickerFilter}
                      onFilterChange={setTickerFilter}
                      onDeleteSymbol={handleDeleteSymbol}
                    />
                  </TabPanel>


                  {/* ─ Tab 2: Performance ─ */}
                  <TabPanel
                    header="Performance"
                    leftIcon="pi pi-chart-line mr-2"
                  >
                    <WatchlistPerformanceChart
                      symbols={symbols}
                      symbolData={symbolData}
                    />
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
