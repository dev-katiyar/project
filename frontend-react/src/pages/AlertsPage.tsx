import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { AutoComplete } from "primereact/autocomplete";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserAlert {
  symbol: string;
  high_target: string | number;
  low_target: string | number;
  daily_high: string | number;
  daily_low: string | number;
  price?: number;
  priceChange?: number;
  priceChangePct?: number;
  deleted?: boolean | number;
  _isNew?: boolean;
  _tempId?: string;
}

interface LivePriceData {
  price: number;
  priceChange: number;
  priceChangePct: number;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtMoney = (v: string | number | undefined): string => {
  if (v === "" || v === undefined || v === null) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
};

const fmtPct = (v: number | undefined): string => {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
};

const gainClass = (v: number | undefined): string =>
  (v ?? 0) > 0
    ? "sv-text-gain"
    : (v ?? 0) < 0
      ? "sv-text-loss"
      : "sv-text-muted";

// ─── Alert Status ─────────────────────────────────────────────────────────────

type AlertStatus =
  | "TRIGGERED_HIGH"
  | "TRIGGERED_LOW"
  | "NEAR_HIGH"
  | "NEAR_LOW"
  | "ACTIVE"
  | "PENDING";

function getAlertStatus(alert: UserAlert): AlertStatus {
  const { price, high_target, low_target } = alert;
  if (!price) return "PENDING";
  const hi = Number(high_target);
  const lo = Number(low_target);
  if (hi && price >= hi) return "TRIGGERED_HIGH";
  if (lo && price <= lo) return "TRIGGERED_LOW";
  if (hi && price >= hi * 0.97) return "NEAR_HIGH";
  if (lo && price <= lo * 1.03) return "NEAR_LOW";
  return "ACTIVE";
}

const STATUS_CFG: Record<
  AlertStatus,
  {
    label: string;
    severity: "success" | "warning" | "danger" | "info" | "secondary";
    icon: string;
  }
> = {
  TRIGGERED_HIGH: {
    label: "↑ High Hit",
    severity: "danger",
    icon: "pi-arrow-up",
  },
  TRIGGERED_LOW: {
    label: "↓ Low Hit",
    severity: "warning",
    icon: "pi-arrow-down",
  },
  NEAR_HIGH: {
    label: "↗ Near High",
    severity: "warning",
    icon: "pi-arrow-up-right",
  },
  NEAR_LOW: {
    label: "↙ Near Low",
    severity: "info",
    icon: "pi-arrow-down-left",
  },
  ACTIVE: {
    label: "● Monitoring",
    severity: "success",
    icon: "pi-check-circle",
  },
  PENDING: { label: "○ Pending", severity: "secondary", icon: "pi-clock" },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  value: number | React.ReactNode;
  label: string;
  loading: boolean;
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  loading,
  accentColor = "var(--sv-accent)",
  bgColor = "var(--sv-accent-bg)",
  borderColor = "var(--sv-border)",
}) => (
  <div
    className="flex align-items-center gap-3 p-3 border-round-xl"
    style={{
      background: "var(--sv-bg-card)",
      border: `1px solid ${borderColor}`,
    }}
  >
    <div
      className="flex align-items-center justify-content-center border-circle flex-shrink-0"
      style={{ width: 48, height: 48, background: bgColor }}
    >
      <i
        className={`pi ${icon}`}
        style={{ color: accentColor, fontSize: "1.25rem" }}
      />
    </div>
    <div>
      <div
        className="font-bold line-height-1"
        style={{ fontSize: "2rem", color: accentColor }}
      >
        {loading ? <Skeleton width="48px" height="32px" /> : value}
      </div>
      <div className="sv-info-label text-xs mt-1">{label}</div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AlertsPage: React.FC = () => {
  const toast = useRef<Toast>(null);

  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [editedAlerts, setEditedAlerts] = useState<UserAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserAlert | null>(null);
  const [validationError, setValidationError] = useState("");
  const [symSuggestions, setSymSuggestions] = useState<string[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    loadAlerts();
  }, []);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<UserAlert[]>("/users_symbol_alerts");
      const active = data.filter((a) => !a.deleted && a.symbol);
      setAlerts(active);
      if (active.length) loadLivePrices(active, setAlerts);
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load alerts",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLivePrices = async (
    alertList: UserAlert[],
    setter: React.Dispatch<React.SetStateAction<UserAlert[]>>,
  ) => {
    const syms = alertList.map((a) => a.symbol).join(",");
    if (!syms) return;
    try {
      const { data } = await api.get<Record<string, LivePriceData>>(
        `/symbol/live/${syms}`,
      );
      setter((prev) =>
        prev.map((a) => {
          const d = data[a.symbol];
          return d
            ? {
                ...a,
                price: d.price,
                priceChange: d.priceChange,
                priceChangePct: d.priceChangePct,
              }
            : a;
        }),
      );
    } catch {
      /* non-critical */
    }
  };

  const searchSymbols = async (query: string) => {
    if (!query) return;
    try {
      const { data } = await api.get(`/symbol/search/${query.toUpperCase()}`);
      const arr = Array.isArray(data) ? data : [];
      setSymSuggestions(
        arr.map((d: unknown) =>
          typeof d === "string" ? d : (d as { symbol: string }).symbol,
        ),
      );
    } catch {
      setSymSuggestions([]);
    }
  };

  const fetchLivePriceForRow = async (symbol: string, rowIdx: number) => {
    if (!symbol) return;
    try {
      const { data } = await api.get<Record<string, LivePriceData>>(
        `/symbol/live/${symbol}`,
      );
      const d = data[symbol];
      if (d) {
        setEditedAlerts((prev) => {
          const next = [...prev];
          next[rowIdx] = {
            ...next[rowIdx],
            price: d.price,
            priceChange: d.priceChange,
            priceChangePct: d.priceChangePct,
          };
          return next;
        });
      }
    } catch {
      /* non-critical */
    }
  };

  // ─── Edit mode helpers ─────────────────────────────────────────────────────

  const enterEditMode = () => {
    setEditedAlerts(alerts.map((a) => ({ ...a })));
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditedAlerts([]);
  };

  const addRow = () => {
    setEditedAlerts((prev) => [
      {
        symbol: "",
        high_target: "",
        low_target: "",
        daily_high: "",
        daily_low: "",
        _isNew: true,
        _tempId: `new_${Date.now()}`,
      },
      ...prev,
    ]);
  };

  const updateEdited = (
    rowIdx: number,
    field: keyof UserAlert,
    value: string | number,
  ) => {
    setEditedAlerts((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
  };

  // ─── Validation & save ─────────────────────────────────────────────────────

  const validateAll = (): string => {
    for (const a of editedAlerts) {
      if (!a.symbol.trim()) return "A ticker symbol is required for all rows.";
      for (const f of [
        "high_target",
        "low_target",
        "daily_high",
        "daily_low",
      ] as const) {
        const v = a[f];
        if (v !== "" && isNaN(Number(v)))
          return `Invalid number for "${f.replace(/_/g, " ")}" on ${a.symbol}.`;
      }
      if (a.price) {
        if (Number(a.high_target) && a.price >= Number(a.high_target))
          return `High target for ${a.symbol} already exceeded (price: ${fmtMoney(a.price)}).`;
        if (Number(a.low_target) && a.price <= Number(a.low_target))
          return `Low target for ${a.symbol} already hit (price: ${fmtMoney(a.price)}).`;
      }
    }
    return "";
  };

  const saveAlerts = async () => {
    const err = validateAll();
    if (err) {
      setValidationError(err);
      return;
    }
    try {
      await Promise.all(
        editedAlerts.map((a) =>
          api.post("/users_symbol_alerts", { ...a, deleted: false }),
        ),
      );
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Alerts updated successfully",
      });
      setIsEditMode(false);
      setEditedAlerts([]);
      await loadAlerts();
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to save alerts",
      });
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const doDelete = async (confirmed: boolean) => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!confirmed || !target) return;

    if (target._isNew) {
      setEditedAlerts((prev) =>
        prev.filter((a) => a._tempId !== target._tempId),
      );
      return;
    }

    try {
      await api.post("/users_symbol_alerts", { ...target, deleted: true });
      setAlerts((prev) => prev.filter((a) => a.symbol !== target.symbol));
      if (isEditMode)
        setEditedAlerts((prev) =>
          prev.filter((a) => a.symbol !== target.symbol),
        );
      toast.current?.show({
        severity: "success",
        summary: "Removed",
        detail: `Alert for ${target.symbol} deleted`,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to delete alert",
      });
    }
  };

  // ─── Computed stats ────────────────────────────────────────────────────────

  const displayAlerts = isEditMode ? editedAlerts : alerts;
  const triggered = alerts.filter((a) =>
    getAlertStatus(a).startsWith("TRIGGERED"),
  ).length;
  const nearTarget = alerts.filter((a) =>
    getAlertStatus(a).startsWith("NEAR"),
  ).length;

  // ─── Column body renderers ─────────────────────────────────────────────────

  const symbolBody = (alert: UserAlert, opts: { rowIndex: number }) => {
    const idx = opts.rowIndex;
    if (isEditMode) {
      return (
        <AutoComplete
          value={editedAlerts[idx]?.symbol ?? ""}
          suggestions={symSuggestions}
          completeMethod={(e: { query: string }) => searchSymbols(e.query)}
          onChange={(e) => updateEdited(idx, "symbol", e.value)}
          onSelect={(e) => fetchLivePriceForRow(e.value, idx)}
          placeholder="TICKER"
          style={{ width: "100%" }}
          inputStyle={{ textTransform: "uppercase", width: "100%" }}
          pt={{ input: { className: "p-inputtext-sm" } as any }}
        />
      );
    }
    return (
      <span
        className="sv-text-accent font-bold"
        style={{ letterSpacing: "0.04em", fontSize: "0.95rem" }}
      >
        {alert.symbol}
      </span>
    );
  };

  const priceBody = (alert: UserAlert) => {
    if (!alert.price && !alert._isNew)
      return <Skeleton width="70px" height="16px" />;
    if (!alert.price) return <span className="sv-text-muted">—</span>;
    return <span className="font-bold">{fmtMoney(alert.price)}</span>;
  };

  const changeBody = (alert: UserAlert) => {
    if (!alert.price && !alert._isNew)
      return <Skeleton width="90px" height="16px" />;
    if (alert.priceChange == null)
      return <span className="sv-text-muted">—</span>;
    const sign = alert.priceChange >= 0 ? "+" : "";
    return (
      <div>
        <span
          className={`font-semibold ${gainClass(alert.priceChange)}`}
          style={{ fontSize: "0.9rem" }}
        >
          {sign}
          {fmtMoney(alert.priceChange)}
        </span>
        <span
          className={gainClass(alert.priceChange)}
          style={{ marginLeft: "0.35rem", fontSize: "0.78rem", opacity: 0.85 }}
        >
          ({fmtPct(alert.priceChangePct)})
        </span>
      </div>
    );
  };

  const highTargetBody = (alert: UserAlert, opts: { rowIndex: number }) => {
    const idx = opts.rowIndex;
    if (isEditMode) {
      return (
        <InputText
          value={String(editedAlerts[idx]?.high_target ?? "")}
          onChange={(e) => updateEdited(idx, "high_target", e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="0.00"
          className="p-inputtext-sm"
          style={{ width: "90px", textAlign: "right" }}
        />
      );
    }
    const hi = Number(alert.high_target);
    if (!hi) return <span className="sv-text-muted">—</span>;
    const pctAway = alert.price
      ? ((hi - alert.price) / alert.price) * 100
      : null;
    const isHit = pctAway !== null && pctAway <= 0;
    return (
      <div>
        <div
          className="font-semibold"
          style={{
            color: isHit ? "var(--sv-danger)" : "var(--sv-text-primary)",
          }}
        >
          {fmtMoney(hi)}
        </div>
        {pctAway != null && (
          <div
            className={isHit ? "font-bold" : ""}
            style={{
              fontSize: "0.72rem",
              color: isHit ? "var(--sv-danger)" : "var(--sv-text-muted)",
            }}
          >
            {pctAway >= 0 ? `+${pctAway.toFixed(1)}% away` : "▲ TRIGGERED"}
          </div>
        )}
      </div>
    );
  };

  const lowTargetBody = (alert: UserAlert, opts: { rowIndex: number }) => {
    const idx = opts.rowIndex;
    if (isEditMode) {
      return (
        <InputText
          value={String(editedAlerts[idx]?.low_target ?? "")}
          onChange={(e) => updateEdited(idx, "low_target", e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="0.00"
          className="p-inputtext-sm"
          style={{ width: "90px", textAlign: "right" }}
        />
      );
    }
    const lo = Number(alert.low_target);
    if (!lo) return <span className="sv-text-muted">—</span>;
    const pctBuffer = alert.price
      ? ((alert.price - lo) / alert.price) * 100
      : null;
    const isHit = pctBuffer !== null && pctBuffer <= 0;
    return (
      <div>
        <div
          className="font-semibold"
          style={{
            color: isHit ? "var(--sv-warning)" : "var(--sv-text-primary)",
          }}
        >
          {fmtMoney(lo)}
        </div>
        {pctBuffer != null && (
          <div
            className={isHit ? "font-bold" : ""}
            style={{
              fontSize: "0.72rem",
              color: isHit ? "var(--sv-warning)" : "var(--sv-text-muted)",
            }}
          >
            {pctBuffer >= 0
              ? `+${pctBuffer.toFixed(1)}% buffer`
              : "▼ TRIGGERED"}
          </div>
        )}
      </div>
    );
  };

  const dailyHighBody = (alert: UserAlert, opts: { rowIndex: number }) => {
    const idx = opts.rowIndex;
    if (isEditMode) {
      return (
        <InputText
          value={String(editedAlerts[idx]?.daily_high ?? "")}
          onChange={(e) => updateEdited(idx, "daily_high", e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="%"
          className="p-inputtext-sm"
          style={{ width: "70px", textAlign: "right" }}
        />
      );
    }
    const v = Number(alert.daily_high);
    if (!v) return <span className="sv-text-muted">—</span>;
    return <span className="sv-text-gain font-semibold">+{v}%</span>;
  };

  const dailyLowBody = (alert: UserAlert, opts: { rowIndex: number }) => {
    const idx = opts.rowIndex;
    if (isEditMode) {
      return (
        <InputText
          value={String(editedAlerts[idx]?.daily_low ?? "")}
          onChange={(e) => updateEdited(idx, "daily_low", e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="%"
          className="p-inputtext-sm"
          style={{ width: "70px", textAlign: "right" }}
        />
      );
    }
    const v = Number(alert.daily_low);
    if (!v) return <span className="sv-text-muted">—</span>;
    return <span className="sv-text-loss font-semibold">-{v}%</span>;
  };

  const statusBody = (alert: UserAlert) => {
    if (alert._isNew) return null;
    const status = getAlertStatus(alert);
    const cfg = STATUS_CFG[status];
    return (
      <Tag
        value={cfg.label}
        severity={cfg.severity}
        style={{
          fontSize: "0.72rem",
          padding: "0.25rem 0.6rem",
          whiteSpace: "nowrap",
        }}
      />
    );
  };

  const actionsBody = (alert: UserAlert, opts: { rowIndex: number }) => {
    const idx = opts.rowIndex;
    return (
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        size="small"
        onClick={() => setDeleteTarget(editedAlerts[idx] ?? alert)}
        tooltip="Remove alert"
        tooltipOptions={{ position: "left" }}
      />
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-3">
      <Toast ref={toast} />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="flex align-items-center gap-2">
          <div
            className="flex align-items-center justify-content-center border-round-xl flex-shrink-0 sv-icon-badge"
            style={{ width: 40, height: 40 }}
          >
            <i
              className="pi pi-bell sv-text-accent"
              style={{ fontSize: "1.2rem" }}
            />
          </div>
          <div>
            <h2
              className="m-0 font-bold sv-page-title"
              style={{ fontSize: "1.4rem", lineHeight: 1.2 }}
            >
              Price Alerts
            </h2>
            <p className="m-0 sv-text-muted" style={{ fontSize: "0.82rem" }}>
              Monitor price targets and daily move thresholds
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isEditMode ? (
            <Button
              label="Edit Alerts"
              icon="pi pi-pencil"
              outlined
              size="small"
              onClick={enterEditMode}
            />
          ) : (
            <>
              <Button
                label="+ Add Ticker"
                icon="pi pi-plus"
                outlined
                size="small"
                onClick={addRow}
              />
              <Button
                label="Save"
                icon="pi pi-check"
                size="small"
                severity="success"
                onClick={saveAlerts}
              />
              <Button
                label="Cancel"
                icon="pi pi-times"
                outlined
                size="small"
                severity="secondary"
                onClick={cancelEditMode}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid mb-4">
        <div className="col-12 md:col-4">
          <StatCard
            icon="pi-list"
            value={alerts.length}
            label="Active Alerts"
            loading={loading}
            accentColor="var(--sv-accent)"
            bgColor="var(--sv-accent-bg)"
          />
        </div>
        <div className="col-12 md:col-4">
          <StatCard
            icon="pi-exclamation-triangle"
            value={triggered}
            label="Targets Triggered"
            loading={loading}
            accentColor={
              triggered > 0 ? "var(--sv-danger)" : "var(--sv-text-secondary)"
            }
            bgColor={
              triggered > 0 ? "var(--sv-danger-bg)" : "var(--sv-bg-surface)"
            }
            borderColor={
              triggered > 0 ? "var(--sv-danger)" : "var(--sv-border)"
            }
          />
        </div>
        <div className="col-12 md:col-4">
          <StatCard
            icon="pi-chart-line"
            value={nearTarget}
            label="Near Target"
            loading={loading}
            accentColor={
              nearTarget > 0 ? "var(--sv-warning)" : "var(--sv-text-secondary)"
            }
            bgColor={
              nearTarget > 0 ? "var(--sv-warning-bg)" : "var(--sv-bg-surface)"
            }
            borderColor={
              nearTarget > 0 ? "var(--sv-warning)" : "var(--sv-border)"
            }
          />
        </div>
      </div>

      {/* ── Alerts Table ─────────────────────────────────────────────────────── */}
      <div
        className="border-round-xl overflow-hidden"
        style={{
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
        }}
      >
        {/* Table toolbar */}
        <div
          className="flex align-items-center justify-content-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--sv-border)" }}
        >
          <span
            className="font-semibold text-sm"
            style={{ color: "var(--sv-text-secondary)" }}
          >
            <i className="pi pi-shield mr-2 sv-text-accent" />
            Alert Configuration
          </span>
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter symbols…"
              className="p-inputtext-sm"
            />
          </IconField>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="44px" className="mb-2" />
            ))}
          </div>
        ) : !displayAlerts.length ? (
          /* Empty state */
          <div className="flex flex-column align-items-center justify-content-center p-6 gap-2">
            <div
              className="flex align-items-center justify-content-center border-circle mb-2"
              style={{
                width: 72,
                height: 72,
                background: "var(--sv-bg-surface)",
              }}
            >
              <i
                className="pi pi-bell-slash sv-text-muted"
                style={{ fontSize: "2rem" }}
              />
            </div>
            <div
              className="font-bold text-xl"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              No alerts configured
            </div>
            <div className="sv-text-muted text-sm">
              Click "Edit Alerts" to add price targets for your stocks
            </div>
            <Button
              label="Edit Alerts"
              icon="pi pi-pencil"
              outlined
              size="small"
              className="mt-2"
              onClick={enterEditMode}
            />
          </div>
        ) : (
          <DataTable
            key={isEditMode ? "edit" : "view"}
            value={displayAlerts}
            globalFilter={globalFilter}
            globalFilterFields={["symbol"]}
            paginator={displayAlerts.length > 10}
            rows={10}
            rowsPerPageOptions={[5, 10, 20]}
            sortMode={isEditMode ? undefined : "single"}
            removableSort
            stripedRows
            size="small"
            emptyMessage="No matching alerts"
            rowClassName={(alert: UserAlert) => {
              const status = getAlertStatus(alert);
              if (status === "TRIGGERED_HIGH" || status === "TRIGGERED_LOW")
                return "sv-alert-triggered";
              if (status === "NEAR_HIGH" || status === "NEAR_LOW")
                return "sv-alert-near";
              return "";
            }}
          >
            <Column
              field="symbol"
              header="Symbol"
              sortable={!isEditMode}
              body={symbolBody}
              style={{ minWidth: "140px" }}
            />
            <Column
              field="price"
              header="Last Price"
              sortable={!isEditMode}
              body={priceBody}
              style={{ minWidth: "100px" }}
            />
            <Column
              field="priceChangePct"
              header="Today's Change"
              sortable={!isEditMode}
              body={changeBody}
              style={{ minWidth: "150px" }}
            />
            <Column
              field="high_target"
              header="High Target"
              sortable={!isEditMode}
              body={highTargetBody}
              style={{ minWidth: "115px" }}
            />
            <Column
              field="low_target"
              header="Low Target"
              sortable={!isEditMode}
              body={lowTargetBody}
              style={{ minWidth: "115px" }}
            />
            <Column
              field="daily_high"
              header="Daily High %"
              sortable={!isEditMode}
              body={dailyHighBody}
              style={{ minWidth: "100px" }}
            />
            <Column
              field="daily_low"
              header="Daily Low %"
              sortable={!isEditMode}
              body={dailyLowBody}
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Status"
              body={statusBody}
              style={{ minWidth: "135px" }}
            />
            {isEditMode && (
              <Column header="" body={actionsBody} style={{ width: "52px" }} />
            )}
          </DataTable>
        )}
      </div>

      {/* ── Validation Error Dialog ─────────────────────────────────────────── */}
      <Dialog
        header={
          <span>
            <i className="pi pi-exclamation-circle mr-2 sv-error-text" />
            Validation Error
          </span>
        }
        visible={!!validationError}
        onHide={() => setValidationError("")}
        modal
        style={{ width: "min(90vw, 420px)" }}
      >
        <p className="m-0 sv-error-text" style={{ lineHeight: 1.5 }}>
          {validationError}
        </p>
        <div className="flex justify-content-end mt-3">
          <Button
            label="OK"
            size="small"
            onClick={() => setValidationError("")}
          />
        </div>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog
        header={
          <span>
            <i className="pi pi-trash mr-2 sv-error-text" />
            Remove Alert
          </span>
        }
        visible={!!deleteTarget}
        onHide={() => doDelete(false)}
        modal
        style={{ width: "min(90vw, 380px)" }}
      >
        <p className="m-0">
          Remove price alert for{" "}
          <strong className="sv-text-accent">{deleteTarget?.symbol}</strong>?
          {!deleteTarget?._isNew && (
            <span
              className="sv-text-muted"
              style={{
                display: "block",
                fontSize: "0.82rem",
                marginTop: "0.35rem",
              }}
            >
              This action cannot be undone.
            </span>
          )}
        </p>
        <div className="flex justify-content-end gap-2 mt-3">
          <Button
            label="Cancel"
            outlined
            severity="secondary"
            size="small"
            onClick={() => doDelete(false)}
          />
          <Button
            label="Remove"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            onClick={() => doDelete(true)}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AlertsPage;
