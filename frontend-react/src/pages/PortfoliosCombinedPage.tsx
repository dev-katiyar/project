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

const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${(v ?? 0).toFixed(2)}%`;

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
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "var(--sv-shadow-md)",
        marginBottom: "1.5rem",
      }}
    >
      {/* ── Section header ── */}
      <div
        style={{
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--sv-border)",
          background: "var(--sv-bg-surface)",
        }}
      >
        <div className="flex align-items-start justify-content-between gap-2 flex-wrap">
          {/* Left: title + count badge */}
          <div className="flex align-items-center gap-2">
            <div
              className="flex align-items-center justify-content-center"
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "8px",
                background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              }}
            >
              <i className={`pi ${icon}`} style={{ color: accentColor, fontSize: "0.9rem" }} />
            </div>
            <h3
              className="m-0"
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--sv-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h3>
            {!loading && (
              <span
                style={{
                  background: accentColor,
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
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
              <div
                className="flex gap-3 flex-wrap"
                style={{ fontSize: "0.8rem" }}
              >
                <span style={{ color: "var(--sv-text-muted)" }}>
                  Value:{" "}
                  <strong style={{ color: "var(--sv-text-primary)" }}>
                    {fmtCompact(metrics.totalValue)}
                  </strong>
                </span>
                <span style={{ color: "var(--sv-text-muted)" }}>
                  P&amp;L:{" "}
                  <strong style={{ color: gainColor(metrics.totalPnl) }}>
                    {fmtCompact(metrics.totalPnl)}
                  </strong>
                </span>
                <span style={{ color: "var(--sv-text-muted)" }}>
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
                style={{
                  color: accentColor,
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.8rem",
                }}
              />
            )}
          </div>
        </div>

        {/* Timestamp hint */}
        {!loading && updatedAt && (
          <div
            style={{
              marginTop: "0.4rem",
              fontSize: "0.72rem",
              color: "var(--sv-text-muted)",
            }}
          >
            <i
              className="pi pi-clock"
              style={{ fontSize: "0.65rem", marginRight: "0.25rem" }}
            />
            As of {fmtTimestamp(updatedAt)} — click a row to select portfolio
          </div>
        )}
      </div>

      {/* ── Table area ── */}
      <div style={{ overflowX: "auto" }}>
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

// ─── Selected portfolio summary banner ───────────────────────────────────────

const SelectedBanner: React.FC<{
  portfolio: Portfolio;
  onClose: () => void;
}> = ({ portfolio, onClose }) => {
  const fmtFull = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v ?? 0);

  const stats: { label: string; value: string; color?: string }[] = [
    { label: "Market Value", value: fmtFull(portfolio.portfolioValue) },
    {
      label: "P&L (Inception)",
      value: `${fmtFull(portfolio.pnl)} (${fmtPct(portfolio.pnlPercent)})`,
      color: gainColor(portfolio.pnl),
    },
    {
      label: "Today's P&L",
      value: `${fmtFull(portfolio.dailyPnl)} (${fmtPct(portfolio.dailyPnlPercentage)})`,
      color: gainColor(portfolio.dailyPnl),
    },
    { label: "Starting Cash", value: fmtFull(portfolio.startingCash) },
    { label: "Cash", value: fmtFull(portfolio.currentCash) },
    { label: "Dividends", value: fmtFull(portfolio.dividend) },
  ];

  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        borderTop: "3px solid var(--sv-accent)",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
        boxShadow: "var(--sv-shadow-sm)",
      }}
    >
      <div className="flex align-items-center justify-content-between mb-3">
        <div className="flex align-items-center gap-2">
          <i
            className="pi pi-wallet"
            style={{ color: "var(--sv-accent)", fontSize: "1rem" }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--sv-text-primary)",
            }}
          >
            {portfolio.name}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--sv-accent)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              background: "var(--sv-accent-bg)",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
            }}
          >
            {portfolio.portfolio_type ?? "portfolio"}
          </span>
        </div>
        <Button
          icon="pi pi-times"
          text
          rounded
          size="small"
          onClick={onClose}
          style={{ color: "var(--sv-text-muted)" }}
        />
      </div>

      <div className="grid">
        {stats.map((s) => (
          <div key={s.label} className="col-6 md:col-4 lg:col-2">
            <div
              style={{
                background: "var(--sv-bg-surface)",
                borderRadius: "8px",
                padding: "0.65rem 0.75rem",
                border: "1px solid var(--sv-border)",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--sv-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "0.2rem",
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: s.color ?? "var(--sv-text-primary)",
                }}
              >
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PortfoliosCombinedPage: React.FC = () => {
  const toast = useRef<Toast>(null);

  const [svSection, setSvSection] = useState<SectionState>(defaultSection());
  const [svRoboSection, setSvRoboSection] =
    useState<SectionState>(defaultSection());
  const [userSection, setUserSection] =
    useState<SectionState>(defaultSection());

  const [selected, setSelected] = useState<Portfolio | null>(null);

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
    setSelected((prev) =>
      prev?.portfolioid === p.portfolioid ? null : p,
    );
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
    <div className="sv-section">
      <Toast ref={toast} />

      {/* ── Page header ── */}
      <div className="flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
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
              className="pi pi-chart-line mr-2"
              style={{ color: "var(--sv-accent)", fontSize: "1.3rem" }}
            />
            Portfolio Dashboard
          </h1>
          <p
            className="m-0 mt-1"
            style={{ color: "var(--sv-text-muted)", fontSize: "0.85rem" }}
          >
            Track and manage all your investment portfolios in one place
          </p>
        </div>
      </div>

      {/* ── Selected portfolio banner ── */}
      {selected && (
        <SelectedBanner
          portfolio={selected}
          onClose={() => setSelected(null)}
        />
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
            <i
              className="pi pi-plus-circle"
              style={{ color: "var(--sv-success)", fontSize: "1.1rem" }}
            />
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
            <label
              htmlFor="portfolio-name"
              style={{ fontSize: "0.85rem", color: "var(--sv-text-secondary)" }}
            >
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
            <label
              htmlFor="starting-cash"
              style={{ fontSize: "0.85rem", color: "var(--sv-text-secondary)" }}
            >
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
              style={{ width: "100%" }}
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
