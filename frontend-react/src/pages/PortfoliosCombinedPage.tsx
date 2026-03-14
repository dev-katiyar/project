import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "@/services/api";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Message } from "primereact/message";
import PortfolioSummaryTable, {
  type Portfolio,
} from "@/components/portfolio/PortfolioSummaryTable";
import PortfolioDetailPanel from "@/components/portfolio/PortfolioDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionState {
  portfolios: Portfolio[];
  updatedAt: string | number | null;
  loading: boolean;
  error: string;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v ?? 0);

const fmtTimestamp = (ts: string | number | null): string => {
  if (!ts) return "";
  const d =
    typeof ts === "number" ? new Date(ts * 1000) : new Date(ts as string);
  if (isNaN(d.getTime())) return "";
  return (
    d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    }) + " ET"
  );
};

const gainColor = (v: number) =>
  v > 0
    ? "var(--sv-gain)"
    : v < 0
      ? "var(--sv-loss)"
      : "var(--sv-text-secondary)";

const defaultSection = (): SectionState => ({
  portfolios: [],
  updatedAt: null,
  loading: true,
  error: "",
});

// ─── Section aggregate metrics ────────────────────────────────────────────────

const sumSection = (portfolios: Portfolio[]) =>
  portfolios.reduce(
    (acc, p) => ({
      totalValue: acc.totalValue + (p.portfolioValue ?? 0),
      totalPnl: acc.totalPnl + (p.pnl ?? 0),
      totalDailyPnl: acc.totalDailyPnl + (p.dailyPnl ?? 0),
    }),
    { totalValue: 0, totalPnl: 0, totalDailyPnl: 0 },
  );

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: string;
  accentColor: string;
  section: SectionState;
  selected: Portfolio | null;
  onSelect: (p: Portfolio) => void;
  showCreate?: boolean;
  onNewPortfolio?: () => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  accentColor,
  section,
  selected,
  onSelect,
  showCreate = false,
  onNewPortfolio,
}) => {
  const { portfolios, loading, error, updatedAt } = section;
  const metrics = sumSection(portfolios);

  return (
    <div
      className="p-card mb-4 overflow-hidden"
      style={{
        boxShadow: "var(--sv-shadow-md)",
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {/* ── Section header ── */}
      <div
        className="px-3 py-2 border-bottom-1"
        style={{
          borderBottomColor: "var(--sv-border)",
          background: "var(--sv-bg-surface)",
        }}
      >
        <div className="flex align-items-start justify-content-between gap-2 flex-wrap">
          {/* Left: title + count badge */}
          <div className="flex align-items-center gap-2">
            <div
              className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
              style={{
                width: "2rem",
                height: "2rem",
                background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              }}
            >
              <i
                className={`pi ${icon} text-sm`}
                style={{ color: accentColor }}
              />
            </div>
            <h3 className="m-0 text-sm font-bold" style={{ letterSpacing: "-0.01em" }}>
              {title}
            </h3>
            {!loading && (
              <span
                className="text-xs font-bold border-round-3xl"
                style={{
                  background: accentColor,
                  color: "#fff",
                  padding: "0.15rem 0.5rem",
                  lineHeight: 1.5,
                }}
              >
                {portfolios.length}
              </span>
            )}
          </div>

          {/* Right: aggregate metrics + create button */}
          <div className="flex align-items-center gap-3 flex-wrap">
            {!loading && portfolios.length > 0 && (
              <div className="flex gap-3 flex-wrap text-sm">
                <span className="sv-text-muted">
                  Value: <strong>{fmtCompact(metrics.totalValue)}</strong>
                </span>
                <span className="sv-text-muted">
                  P&amp;L:{" "}
                  <strong style={{ color: gainColor(metrics.totalPnl) }}>
                    {fmtCompact(metrics.totalPnl)}
                  </strong>
                </span>
                <span className="sv-text-muted">
                  Today:{" "}
                  <strong style={{ color: gainColor(metrics.totalDailyPnl) }}>
                    {fmtCompact(metrics.totalDailyPnl)}
                  </strong>
                </span>
              </div>
            )}
            {showCreate && (
              <Button
                icon="pi pi-plus"
                label="New"
                size="small"
                text
                onClick={onNewPortfolio}
                style={{ color: accentColor }}
              />
            )}
          </div>
        </div>

        {/* Timestamp hint */}
        {!loading && updatedAt && (
          <div className="sv-text-muted mt-1 text-xs">
            <i className="pi pi-clock mr-1 text-xs" />
            As of {fmtTimestamp(updatedAt)} — click a row to view portfolio
            details
          </div>
        )}
      </div>

      {/* ── Table area ── */}
      <div className="overflow-x-auto">
        {error ? (
          <div className="p-3">
            <Message severity="error" text={error} />
          </div>
        ) : (
          <PortfolioSummaryTable
            portfolios={portfolios}
            loading={loading}
            selected={selected}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PortfoliosCombinedPage: React.FC = () => {
  const toast = useRef<Toast>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const [svSection, setSvSection] = useState<SectionState>(defaultSection());
  const [svRoboSection, setSvRoboSection] =
    useState<SectionState>(defaultSection());
  const [userSection, setUserSection] =
    useState<SectionState>(defaultSection());

  const [selected, setSelected] = useState<Portfolio | null>(null);

  useEffect(() => {
    if (selected) {
      setTimeout(
        () =>
          detailRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    }
  }, [selected]);

  // Create portfolio dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCash, setCreateCash] = useState<number | null>(null);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const loadSection = useCallback(
    async (
      endpoint: string,
      setter: React.Dispatch<React.SetStateAction<SectionState>>,
    ) => {
      try {
        const res = await api.get(endpoint);
        setter({
          portfolios: res.data.port_summ ?? [],
          updatedAt: res.data.updated_at ?? null,
          loading: false,
          error: "",
        });
      } catch {
        setter((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load portfolios. Please refresh to try again.",
        }));
      }
    },
    [],
  );

  useEffect(() => {
    loadSection("/modelportfolio/read/summary/riapro", setSvSection);
    loadSection("/modelportfolio/read/summary/riapro_robo", setSvRoboSection);
    loadSection("/modelportfolio/read/summary/user", setUserSection);
  }, [loadSection]);

  // ─── Row selection ──────────────────────────────────────────────────────────

  const handleSelect = (p: Portfolio) => {
    setSelected((prev) => (prev?.portfolioid === p.portfolioid ? null : p));
  };

  // ─── Create portfolio ───────────────────────────────────────────────────────

  const validateCreate = (): string => {
    if (!createName.trim()) return "Portfolio name is required.";
    if (userSection.portfolios.some((p) => p.name === createName.trim()))
      return "A portfolio with this name already exists.";
    if (!createCash || createCash <= 0 || isNaN(createCash))
      return "Starting cash must be a positive number.";
    return "";
  };

  const handleCreate = async () => {
    const err = validateCreate();
    if (err) {
      setCreateError(err);
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const res = await api.post("/modelportfolio/create", {
        name: createName.trim(),
        startingCash: createCash,
        type: "user",
      });

      if (res.data?.error) {
        setCreateError(res.data.error);
      } else {
        toast.current?.show({
          severity: "success",
          summary: "Portfolio Created",
          detail: `"${createName.trim()}" has been created successfully.`,
          life: 4000,
        });
        handleCloseCreate();
        setUserSection((prev) => ({ ...prev, loading: true }));
        loadSection("/modelportfolio/read/summary/user", setUserSection);
      }
    } catch {
      setCreateError("Failed to create portfolio. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setCreateName("");
    setCreateCash(null);
    setCreateError("");
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <Toast ref={toast} />

      {/* ── Selected portfolio detail panel ── */}
      {selected && (
        <div ref={detailRef}>
          <PortfolioDetailPanel
            portfolio={selected}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* ── SV Core Portfolios ── */}
      <SectionCard
        title="SV Core Portfolios"
        icon="pi-chart-bar"
        accentColor="var(--sv-accent)"
        section={svSection}
        selected={selected}
        onSelect={handleSelect}
      />

      {/* ── SV Thematic Portfolios ── */}
      <SectionCard
        title="SV Thematic Portfolios"
        icon="pi-th-large"
        accentColor="var(--sv-info)"
        section={svRoboSection}
        selected={selected}
        onSelect={handleSelect}
      />

      {/* ── My Portfolios ── */}
      <SectionCard
        title="My Portfolios"
        icon="pi-wallet"
        accentColor="var(--sv-success)"
        section={userSection}
        selected={selected}
        onSelect={handleSelect}
        showCreate
        onNewPortfolio={() => setShowCreate(true)}
      />

      {/* ── Create Portfolio Dialog ── */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-plus-circle text-lg sv-text-gain" />
            <span>Create New Portfolio</span>
          </div>
        }
        visible={showCreate}
        onHide={handleCloseCreate}
        style={{ width: "min(480px, 95vw)" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label htmlFor="portfolio-name" className="text-sm sv-text-muted">
              Portfolio Name
            </label>
            <InputText
              id="portfolio-name"
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value);
                setCreateError("");
              }}
              placeholder="e.g. My Growth Portfolio"
              maxLength={49}
              autoFocus
            />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="starting-cash" className="text-sm sv-text-muted">
              Starting Cash (USD)
            </label>
            <InputNumber
              id="starting-cash"
              value={createCash}
              onValueChange={(e) => {
                setCreateCash(e.value ?? null);
                setCreateError("");
              }}
              placeholder="100,000"
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={0}
              maxFractionDigits={2}
              min={1}
              className="w-full"
              inputStyle={{ width: "100%" }}
            />
          </div>

          {createError && (
            <Message severity="error" text={createError} className="w-full" />
          )}

          <div className="flex justify-content-end gap-2 mt-2">
            <Button
              label="Cancel"
              outlined
              onClick={handleCloseCreate}
              disabled={creating}
            />
            <Button
              label="Create Portfolio"
              icon="pi pi-check"
              onClick={handleCreate}
              loading={creating}
              style={{
                background: "var(--sv-success)",
                borderColor: "var(--sv-success)",
              }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default PortfoliosCombinedPage;
