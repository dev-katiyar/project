import React, { useState, useEffect, useCallback, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Dropdown } from "primereact/dropdown";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const TICKER_CLASSES = ["Stocks", "ETFs", "Sectors"] as const;
type TickerClass = (typeof TICKER_CLASSES)[number];

const SECTOR_MOVES: Move[] = [
  { name: "Top 1 Year", url: "/sector/yearly/" },
  { name: "Bottom 1 Year", url: "/sector/yearly_bottom/" },
  { name: "Top 1 Day", url: "/sector/daily_top/" },
  { name: "Bottom 1 Day", url: "/sector/daily_bottom/" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Move {
  name: string;
  typeid?: number;
  url?: string;
}

interface Sector {
  symbol: string;
  short_name: string;
}

interface TechnicalData {
  symbol: string;
  alternate_name?: string;
  price?: number;
  priceChange?: number;
  priceChangePct?: number;
  mtd?: number;
  ytd?: number;
  change_oneyearbeforedate_pct?: number;
  low52?: number;
  high52?: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
  sma100?: number;
  sma200?: number;
  rating?: number;
  MohanramScore?: number;
  PiotroskiFScore?: number;
  ZacksRank?: number | string;
  dividendYield?: number;
  macd?: number;
}

type TableView = "performance" | "technical";

// ── Chart theme ───────────────────────────────────────────────────────────────

interface CT {
  grid: string;
  label: string;
  title: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  gain: string;
  loss: string;
  accent: string;
}

const CHART_THEME: Record<ThemeName, CT> = {
  dark: {
    grid: "#1c2840",
    label: "#7a8da8",
    title: "#e8edf5",
    tooltipBg: "#0d1220",
    tooltipBorder: "#1c2840",
    tooltipText: "#e8edf5",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#f5a623",
  },
  dim: {
    grid: "#283a5c",
    label: "#7a92b8",
    title: "#d8e0f0",
    tooltipBg: "#162038",
    tooltipBorder: "#283a5c",
    tooltipText: "#d8e0f0",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#2e5be6",
  },
  light: {
    grid: "#e2e8f0",
    label: "#4a5e78",
    title: "#0d1425",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0d1425",
    gain: "#16a34a",
    loss: "#dc2626",
    accent: "#2e5be6",
  },
};

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtPrice = (v: unknown): string => {
  const n = parseFloat(String(v));
  return isNaN(n)
    ? "—"
    : n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

const fmtPct = (v: unknown): string => {
  const n = parseFloat(String(v));
  return isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const fmtNum = (v: unknown, d = 2): string => {
  const n = parseFloat(String(v));
  return isNaN(n) ? "—" : n.toFixed(d);
};

const toNum = (v: unknown): number => parseFloat(String(v));

// ── Color helpers ─────────────────────────────────────────────────────────────

const pctColor = (v: unknown): string => {
  const n = toNum(v);
  return isNaN(n)
    ? "var(--sv-text-muted)"
    : n >= 0
      ? "var(--sv-gain)"
      : "var(--sv-loss)";
};

const rsiColor = (v: unknown): string => {
  const n = toNum(v);
  if (isNaN(n)) return "var(--sv-text-muted)";
  if (n >= 70) return "#ef4444";
  if (n >= 60) return "#f5a623";
  if (n <= 30) return "#22c55e";
  if (n <= 40) return "#f97316";
  return "var(--sv-text-secondary)";
};

const trendColor = (v: unknown): string => {
  const n = toNum(v);
  if (isNaN(n)) return "var(--sv-text-muted)";
  if (n >= 8) return "#22c55e";
  if (n >= 6) return "#4ade80";
  if (n >= 4) return "#f5a623";
  return "#ef4444";
};

const mohanramStyle = (v: unknown): { bg: string; color: string } | null => {
  const n = toNum(v);
  if (isNaN(n)) return null;
  if (n >= 7) return { bg: "rgba(34,197,94,0.18)", color: "#22c55e" };
  if (n >= 5) return { bg: "rgba(34,197,94,0.10)", color: "#4ade80" };
  if (n >= 3) return { bg: "rgba(245,166,35,0.12)", color: "#f5a623" };
  return { bg: "rgba(239,68,68,0.15)", color: "#ef4444" };
};

const piotroskiStyle = mohanramStyle; // same thresholds

const zacksStyle = (v: unknown): { bg: string; color: string } | null => {
  const n = toNum(v);
  if (isNaN(n)) return null;
  if (n <= 1) return { bg: "rgba(34,197,94,0.18)", color: "#22c55e" };
  if (n <= 2) return { bg: "rgba(34,197,94,0.10)", color: "#4ade80" };
  if (n <= 3) return { bg: "rgba(245,166,35,0.12)", color: "#f5a623" };
  if (n <= 4) return { bg: "rgba(239,68,68,0.10)", color: "#f87171" };
  return { bg: "rgba(239,68,68,0.18)", color: "#ef4444" };
};

const getMetricField = (moveName: string): keyof TechnicalData => {
  const n = moveName.toLowerCase();
  if (n.includes("1 year") || n.includes("1y"))
    return "change_oneyearbeforedate_pct";
  if (n.includes("ytd")) return "ytd";
  return "priceChangePct";
};

// ── Reusable components ───────────────────────────────────────────────────────

const Panel: React.FC<{
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title, extra, children, style }) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 12,
      padding: "1rem 1.25rem",
      boxShadow: "var(--sv-shadow-md)",
      ...style,
    }}
  >
    {title && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--sv-border)",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "var(--sv-text-primary)",
          }}
        >
          {title}
        </span>
        {extra}
      </div>
    )}
    {children}
  </div>
);

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}> = ({ icon, label, value, sub, color = "var(--sv-accent)" }) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 10,
      padding: "0.875rem 1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.875rem",
      boxShadow: "var(--sv-shadow-sm)",
      height: "100%",
      width: "100%",
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        background: `${color}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <i className={`pi ${icon}`} style={{ color, fontSize: "1rem" }} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: "0.63rem",
          color: "var(--sv-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--sv-text-primary)",
          lineHeight: 1.3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "0.62rem",
            color: "var(--sv-text-muted)",
            marginTop: "0.1rem",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  </div>
);

const Range52W: React.FC<{
  low52?: number;
  high52?: number;
  price?: number;
}> = ({ low52, high52, price }) => {
  if (!low52 || !high52 || !price || high52 === low52)
    return <span style={{ color: "var(--sv-text-muted)" }}>—</span>;
  const pct = Math.max(
    0,
    Math.min(100, ((price - low52) / (high52 - low52)) * 100),
  );
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 130 }}
    >
      <span
        style={{
          fontSize: "0.6rem",
          color: "var(--sv-text-muted)",
          width: 34,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {fmtPrice(low52)}
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--sv-bg-surface)",
          borderRadius: 2,
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--sv-accent)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--sv-accent)",
            border: "2px solid var(--sv-bg-card)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "0.6rem",
          color: "var(--sv-text-muted)",
          width: 34,
          flexShrink: 0,
        }}
      >
        {fmtPrice(high52)}
      </span>
    </div>
  );
};

const ScoreBadge: React.FC<{
  value: unknown;
  styleFn: (v: unknown) => { bg: string; color: string } | null;
  fmt?: (v: unknown) => string;
}> = ({ value, styleFn, fmt = (v) => fmtNum(v, 0) }) => {
  const s = styleFn(value);
  if (!s) return <span style={{ color: "var(--sv-text-muted)" }}>—</span>;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: "0.72rem",
      }}
    >
      {fmt(value)}
    </span>
  );
};

const TH: React.FC<{
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}> = ({ children, align = "left" }) => (
  <th
    style={{
      padding: "0.5rem 0.6rem",
      textAlign: align,
      color: "var(--sv-text-muted)",
      fontWeight: 600,
      fontSize: "0.63rem",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
      borderBottom: "2px solid var(--sv-border)",
      background: "var(--sv-bg-card)",
      position: "sticky",
      top: 0,
      zIndex: 1,
    }}
  >
    {children}
  </th>
);

const ViewToggle: React.FC<{
  view: TableView;
  onChange: (v: TableView) => void;
}> = ({ view, onChange }) => (
  <div
    style={{
      display: "flex",
      gap: 2,
      background: "var(--sv-bg-surface)",
      borderRadius: 6,
      padding: 2,
    }}
  >
    {(["performance", "technical"] as TableView[]).map((v) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        style={{
          padding: "0.2rem 0.6rem",
          borderRadius: 4,
          border: "none",
          cursor: "pointer",
          fontSize: "0.68rem",
          fontWeight: view === v ? 700 : 500,
          color:
            view === v ? "var(--sv-text-inverse)" : "var(--sv-text-secondary)",
          background: view === v ? "var(--sv-accent)" : "transparent",
          transition: "all 0.15s",
        }}
      >
        {v === "performance" ? "Performance" : "Technical"}
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main Page ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const MarketMoversPage: React.FC = () => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme] ?? CHART_THEME.dim;

  const [selectedClass, setSelectedClass] = useState<TickerClass>("Stocks");
  const [moves, setMoves] = useState<Move[]>([]);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [technicals, setTechnicals] = useState<TechnicalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableView, setTableView] = useState<TableView>("performance");

  // ── API helpers ─────────────────────────────────────────────────────────────

  const loadTechnicals = useCallback(async (symbols: string[]) => {
    if (!symbols.length) {
      setTechnicals([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<TechnicalData[]>(
        `/symbol/technical/${symbols.join(",")}`,
      );
      setTechnicals(Array.isArray(data) ? data : []);
    } catch {
      setTechnicals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStockSyms = useCallback(
    async (move: Move) => {
      if (move.typeid == null) return;
      try {
        const { data } = await api.get<string[]>(
          `/notablemoves/${move.typeid}`,
        );
        await loadTechnicals(Array.isArray(data) ? data : []);
      } catch {
        setTechnicals([]);
        setLoading(false);
      }
    },
    [loadTechnicals],
  );

  const loadETFSyms = useCallback(
    async (move: Move) => {
      if (move.typeid == null) return;
      try {
        const { data } = await api.get<string[]>(
          `/notablemoves_etf/${move.typeid}`,
        );
        await loadTechnicals(Array.isArray(data) ? data : []);
      } catch {
        setTechnicals([]);
        setLoading(false);
      }
    },
    [loadTechnicals],
  );

  const loadSectorSyms = useCallback(
    async (move: Move, sector: Sector) => {
      if (!move.url || !sector.symbol) return;
      try {
        const { data } = await api.get<string[]>(`${move.url}${sector.symbol}`);
        await loadTechnicals(Array.isArray(data) ? data : []);
      } catch {
        setTechnicals([]);
        setLoading(false);
      }
    },
    [loadTechnicals],
  );

  // ── Load category ────────────────────────────────────────────────────────────

  const loadClass = useCallback(
    async (cls: TickerClass) => {
      setTechnicals([]);
      setSelectedMoveIdx(0);
      setLoading(true);
      try {
        if (cls === "Stocks") {
          const { data } = await api.get<Move[]>("/notablemoves");
          const list = Array.isArray(data) ? data : [];
          setMoves(list);
          if (list.length) await loadStockSyms(list[0]);
          else setLoading(false);
        } else if (cls === "ETFs") {
          const { data } = await api.get<Move[]>("/notablemoves_etf");
          const list = Array.isArray(data) ? data : [];
          setMoves(list);
          if (list.length) await loadETFSyms(list[0]);
          else setLoading(false);
        } else {
          const { data } = await api.get<Sector[]>("/symbol/list_type2/4");
          const list = Array.isArray(data) ? data : [];
          setSectors(list);
          const first = list[0] ?? null;
          setSelectedSector(first);
          setMoves(SECTOR_MOVES);
          if (first) await loadSectorSyms(SECTOR_MOVES[0], first);
          else setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    },
    [loadStockSyms, loadETFSyms, loadSectorSyms],
  );

  // ── Event handlers ────────────────────────────────────────────────────────────

  const handleClassSwitch = useCallback(
    (cls: TickerClass) => {
      setSelectedClass(cls);
      loadClass(cls);
    },
    [loadClass],
  );

  const handleMoveClick = useCallback(
    async (move: Move, idx: number) => {
      setSelectedMoveIdx(idx);
      setTechnicals([]);
      setLoading(true);
      if (selectedClass === "Stocks") await loadStockSyms(move);
      else if (selectedClass === "ETFs") await loadETFSyms(move);
      else if (selectedSector) await loadSectorSyms(move, selectedSector);
      else setLoading(false);
    },
    [selectedClass, selectedSector, loadStockSyms, loadETFSyms, loadSectorSyms],
  );

  const handleSectorChange = useCallback(
    async (sector: Sector) => {
      setSelectedSector(sector);
      setTechnicals([]);
      setLoading(true);
      const move = moves[selectedMoveIdx] ?? SECTOR_MOVES[0];
      await loadSectorSyms(move, sector);
    },
    [moves, selectedMoveIdx, loadSectorSyms],
  );

  useEffect(() => {
    loadClass("Stocks");
  }, [loadClass]);

  // ── Computed values ────────────────────────────────────────────────────────────

  const selectedMove = moves[selectedMoveIdx];
  const metricField = selectedMove
    ? getMetricField(selectedMove.name)
    : "priceChangePct";
  const metricLabel =
    metricField === "change_oneyearbeforedate_pct"
      ? "1Y%"
      : metricField === "ytd"
        ? "YTD%"
        : "1D%";

  const stats = useMemo(() => {
    if (!technicals.length) return null;
    const vals = technicals
      .map((t) => toNum(t[metricField]))
      .filter((v) => !isNaN(v));
    const avg = vals.length
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : null;
    const sorted = [...technicals].sort(
      (a, b) =>
        (toNum(b[metricField]) || -Infinity) -
        (toNum(a[metricField]) || -Infinity),
    );
    const rsiVals = technicals
      .map((t) => toNum(t.rsi))
      .filter((v) => !isNaN(v));
    const avgRsi = rsiVals.length
      ? rsiVals.reduce((a, b) => a + b, 0) / rsiVals.length
      : null;
    return {
      count: technicals.length,
      avgChange: avg,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      avgRsi,
    };
  }, [technicals, metricField]);

  // ── Chart ──────────────────────────────────────────────────────────────────────

  const chartOptions = useMemo((): Highcharts.Options => {
    if (!technicals.length || !selectedMove) return {};

    const pts = [...technicals]
      .map((t) => ({
        ticker: t.symbol,
        name: t.alternate_name || t.symbol,
        y: toNum(t[metricField]),
      }))
      .filter((p) => !isNaN(p.y))
      .sort((a, b) => b.y - a.y)
      .slice(0, 25);

    const h = Math.max(240, pts.length * 24 + 60);

    return {
      chart: {
        type: "bar",
        backgroundColor: "transparent",
        height: h,
        spacing: [8, 20, 8, 4],
        style: { fontFamily: "inherit" },
        animation: { duration: 350 },
      },
      title: { text: undefined },
      xAxis: {
        categories: pts.map((p) => p.ticker),
        labels: {
          style: { color: ct.label, fontSize: "11px", fontWeight: "600" },
        },
        lineColor: ct.grid,
        gridLineColor: "transparent",
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          style: { color: ct.label, fontSize: "10px" },
          formatter() {
            return `${this.value}%`;
          },
        },
        gridLineColor: ct.grid,
        plotLines: [{ value: 0, color: ct.label, width: 1, zIndex: 5 }],
      },
      series: [
        {
          type: "bar",
          name: selectedMove.name,
          data: pts.map((p) => ({
            y: p.y,
            color: p.y >= 0 ? ct.gain : ct.loss,
            name: p.name,
            ticker: p.ticker,
          })),
          borderRadius: 3,
          borderWidth: 0,
          dataLabels: {
            enabled: pts.length <= 20,
            formatter() {
              const v = this.y ?? 0;
              return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
            },
            style: {
              color: ct.title,
              fontSize: "9px",
              fontWeight: "600",
              textOutline: "none",
            },
            align: "right",
            inside: false,
          },
        },
      ],
      tooltip: {
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        style: { color: ct.tooltipText },
        formatter() {
          const pt = this.point as Highcharts.Point & {
            name: string;
            ticker: string;
          };
          const v = this.y ?? 0;
          return `<b>${pt.ticker}</b><br/><span style="color:${ct.label};font-size:11px">${pt.name}</span><br/><b style="color:${v >= 0 ? ct.gain : ct.loss}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</b>`;
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
    };
  }, [technicals, selectedMove, metricField, ct]);

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ── */}
      {/* <div className="mb-3">
        <h1 className="text-2xl font-bold mt-0 mb-1 sv-page-title">Market Movers</h1>
        <p className="mt-0 text-sm" style={{ color: "var(--sv-text-muted)" }}>
          Discover top &amp; bottom performers across stocks, ETFs, and sectors
        </p>
      </div> */}

      {/* ── Controls bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
          padding: "0.75rem 1rem",
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
          borderRadius: 12,
          boxShadow: "var(--sv-shadow-sm)",
        }}
      >
        {/* Category segmented control */}
        <div
          style={{
            display: "flex",
            background: "var(--sv-bg-surface)",
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {TICKER_CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => handleClassSwitch(cls)}
              style={{
                padding: "0.3rem 0.9rem",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: selectedClass === cls ? 700 : 500,
                color:
                  selectedClass === cls
                    ? "var(--sv-text-inverse)"
                    : "var(--sv-text-secondary)",
                background:
                  selectedClass === cls ? "var(--sv-accent)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Sector dropdown */}
        {selectedClass === "Sectors" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--sv-text-secondary)",
                fontWeight: 500,
              }}
            >
              Sector:
            </span>
            <Dropdown
              value={selectedSector}
              options={sectors}
              optionLabel="short_name"
              onChange={(e) => handleSectorChange(e.value as Sector)}
              style={{ minWidth: 180, fontSize: "0.85rem" }}
              placeholder="Select sector…"
            />
          </div>
        )}

        {/* Move type tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.375rem",
            flexWrap: "wrap",
            marginLeft: "auto",
          }}
        >
          {moves.map((move, i) => {
            const isTop = move.name.toLowerCase().includes("top");
            const isSelected = selectedMoveIdx === i;
            return (
              <button
                key={i}
                onClick={() => !loading && handleMoveClick(move, i)}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.35rem 0.875rem",
                  borderRadius: 6,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.78rem",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected
                    ? isTop
                      ? "#22c55e"
                      : "#ef4444"
                    : "var(--sv-text-secondary)",
                  background: isSelected
                    ? isTop
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.12)"
                    : "var(--sv-bg-surface)",
                  border: `1px solid ${
                    isSelected
                      ? isTop
                        ? "rgba(34,197,94,0.35)"
                        : "rgba(239,68,68,0.3)"
                      : "var(--sv-border)"
                  }`,
                  transition: "all 0.15s",
                }}
              >
                <i
                  className={`pi ${isTop ? "pi-arrow-up-right" : "pi-arrow-down-right"}`}
                  style={{ fontSize: "0.65rem" }}
                />
                {move.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stats row ── */}
      {loading ? (
        <div className="grid mb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-12 sm:col-6 lg:col-3 p-1">
              <Skeleton height="72px" borderRadius="10px" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid mb-3">
          <div className="col-12 sm:col-6 lg:col-3 p-1 flex">
            <StatCard
              icon="pi-list"
              label="Symbols Loaded"
              value={String(stats.count)}
            />
          </div>
          <div className="col-12 sm:col-6 lg:col-3 p-1 flex">
            <StatCard
              icon={
                stats.avgChange != null && stats.avgChange >= 0
                  ? "pi-arrow-up"
                  : "pi-arrow-down"
              }
              label={`Avg ${metricLabel}`}
              value={stats.avgChange != null ? fmtPct(stats.avgChange) : "—"}
              color={
                stats.avgChange != null
                  ? stats.avgChange >= 0
                    ? "#22c55e"
                    : "#ef4444"
                  : undefined
              }
            />
          </div>
          <div className="col-12 sm:col-6 lg:col-3 p-1 flex">
            <StatCard
              icon="pi-star-fill"
              label="Top Performer"
              value={stats.best ? (stats.best.symbol ?? "—") : "—"}
              sub={stats.best ? fmtPct(stats.best[metricField]) : undefined}
              color="#22c55e"
            />
          </div>
          <div className="col-12 sm:col-6 lg:col-3 p-1 flex">
            <StatCard
              icon="pi-chart-line"
              label="Avg RSI"
              value={stats.avgRsi != null ? fmtNum(stats.avgRsi, 1) : "—"}
              color={stats.avgRsi != null ? rsiColor(stats.avgRsi) : undefined}
            />
          </div>
        </div>
      ) : null}

      {/* ── Main content ── */}
      {loading ? (
        <div className="grid">
          <div className="col-12 lg:col-4 p-1">
            <Skeleton height="520px" borderRadius="12px" />
          </div>
          <div className="col-12 lg:col-8 p-1">
            <Skeleton height="520px" borderRadius="12px" />
          </div>
        </div>
      ) : technicals.length === 0 ? (
        <Panel>
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1rem",
              color: "var(--sv-text-muted)",
            }}
          >
            <i
              className="pi pi-inbox"
              style={{
                fontSize: "2.5rem",
                opacity: 0.3,
                display: "block",
                marginBottom: "0.75rem",
              }}
            />
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              Select a category and move type to view movers
            </p>
          </div>
        </Panel>
      ) : (
        <div className="grid">
          {/* ── Bar chart ── */}
          <div className="col-12 lg:col-4 p-1">
            <Panel
              title={`${selectedMove?.name ?? "Performance"} · ${metricLabel}`}
              style={{
                overflow: "hidden auto",
                maxHeight: 680,
                padding: "1rem 0.75rem",
              }}
            >
              <HighchartsReact highcharts={Highcharts} options={chartOptions} />
            </Panel>
          </div>

          {/* ── Data table ── */}
          <div className="col-12 lg:col-8 p-1">
            <Panel
              title="Symbol Technicals"
              style={{
                padding: "1rem 0.75rem",
                maxHeight: 680,
                overflow: "hidden",
              }}
              extra={<ViewToggle view={tableView} onChange={setTableView} />}
            >
              <div
                style={{
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: 580,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.78rem",
                    minWidth: tableView === "performance" ? 900 : 860,
                  }}
                >
                  <thead>
                    <tr>
                      <TH align="center">#</TH>
                      <TH>Symbol</TH>
                      <TH>Price</TH>

                      {tableView === "performance" ? (
                        <>
                          <TH>1D%</TH>
                          <TH>MTD%</TH>
                          <TH>YTD%</TH>
                          <TH>1Y%</TH>
                          <TH>52W Range</TH>
                          <TH>RSI</TH>
                          <TH>Trend</TH>
                          <TH>SVPro</TH>
                          <TH>Yield</TH>
                        </>
                      ) : (
                        <>
                          <TH>SMA 20</TH>
                          <TH>SMA 50</TH>
                          <TH>SMA 100</TH>
                          <TH>SMA 200</TH>
                          <TH>RSI</TH>
                          <TH>MACD</TH>
                          <TH>Mohanram</TH>
                          <TH>Piotroski</TH>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {technicals.map((row, i) => (
                      <tr
                        key={row.symbol}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--sv-bg-surface)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        style={{
                          borderBottom: "1px solid var(--sv-border)",
                          transition: "background 0.1s",
                        }}
                      >
                        {/* Rank */}
                        <td
                          style={{
                            padding: "0.45rem 0.6rem",
                            textAlign: "center",
                            color: "var(--sv-text-muted)",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                          }}
                        >
                          {i + 1}
                        </td>

                        {/* Symbol + name */}
                        <td
                          style={{
                            padding: "0.45rem 0.6rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              color: "var(--sv-accent)",
                              fontSize: "0.82rem",
                            }}
                          >
                            {row.symbol}
                          </div>
                          <div
                            style={{
                              fontSize: "0.63rem",
                              color: "var(--sv-text-muted)",
                              maxWidth: 110,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.alternate_name}
                          </div>
                        </td>

                        {/* Price */}
                        <td
                          style={{
                            padding: "0.45rem 0.6rem",
                            fontWeight: 600,
                            color: "var(--sv-text-primary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ${fmtPrice(row.price)}
                        </td>

                        {tableView === "performance" ? (
                          <>
                            {/* 1D% */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                color: pctColor(row.priceChangePct),
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtPct(row.priceChangePct)}
                            </td>
                            {/* MTD% */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                color: pctColor(row.mtd),
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtPct(row.mtd)}
                            </td>
                            {/* YTD% */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                color: pctColor(row.ytd),
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtPct(row.ytd)}
                            </td>
                            {/* 1Y% */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                color: pctColor(
                                  row.change_oneyearbeforedate_pct,
                                ),
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtPct(row.change_oneyearbeforedate_pct)}
                            </td>
                            {/* 52W Range */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              <Range52W
                                low52={row.low52}
                                high52={row.high52}
                                price={row.price}
                              />
                            </td>
                            {/* RSI */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              {row.rsi != null ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: 4,
                                    background: `${rsiColor(row.rsi)}20`,
                                    color: rsiColor(row.rsi),
                                    fontWeight: 700,
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  {fmtNum(row.rsi, 1)}
                                </span>
                              ) : (
                                <span style={{ color: "var(--sv-text-muted)" }}>
                                  —
                                </span>
                              )}
                            </td>
                            {/* Trend */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              {row.rating != null ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: 4,
                                    background: `${trendColor(row.rating)}20`,
                                    color: trendColor(row.rating),
                                    fontWeight: 700,
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  {row.rating}/10
                                </span>
                              ) : (
                                <span style={{ color: "var(--sv-text-muted)" }}>
                                  —
                                </span>
                              )}
                            </td>
                            {/* SVPro Rank */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              <ScoreBadge
                                value={row.ZacksRank}
                                styleFn={zacksStyle}
                                fmt={(v) => String(v)}
                              />
                            </td>
                            {/* Yield */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                color: "var(--sv-text-secondary)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.dividendYield != null &&
                              toNum(row.dividendYield) > 0
                                ? `${toNum(row.dividendYield).toFixed(2)}%`
                                : "—"}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* SMA 20 */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                whiteSpace: "nowrap",
                                color:
                                  row.price != null && row.sma20 != null
                                    ? row.price > row.sma20
                                      ? "var(--sv-gain)"
                                      : "var(--sv-loss)"
                                    : "var(--sv-text-primary)",
                              }}
                            >
                              {row.sma20 != null
                                ? `$${fmtPrice(row.sma20)}`
                                : "—"}
                            </td>
                            {/* SMA 50 */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                whiteSpace: "nowrap",
                                color:
                                  row.price != null && row.sma50 != null
                                    ? row.price > row.sma50
                                      ? "var(--sv-gain)"
                                      : "var(--sv-loss)"
                                    : "var(--sv-text-primary)",
                              }}
                            >
                              {row.sma50 != null
                                ? `$${fmtPrice(row.sma50)}`
                                : "—"}
                            </td>
                            {/* SMA 100 */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                whiteSpace: "nowrap",
                                color:
                                  row.price != null && row.sma100 != null
                                    ? row.price > row.sma100
                                      ? "var(--sv-gain)"
                                      : "var(--sv-loss)"
                                    : "var(--sv-text-primary)",
                              }}
                            >
                              {row.sma100 != null
                                ? `$${fmtPrice(row.sma100)}`
                                : "—"}
                            </td>
                            {/* SMA 200 */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                whiteSpace: "nowrap",
                                color:
                                  row.price != null && row.sma200 != null
                                    ? row.price > row.sma200
                                      ? "var(--sv-gain)"
                                      : "var(--sv-loss)"
                                    : "var(--sv-text-primary)",
                              }}
                            >
                              {row.sma200 != null
                                ? `$${fmtPrice(row.sma200)}`
                                : "—"}
                            </td>
                            {/* RSI */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              {row.rsi != null ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: 4,
                                    background: `${rsiColor(row.rsi)}20`,
                                    color: rsiColor(row.rsi),
                                    fontWeight: 700,
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  {fmtNum(row.rsi, 1)}
                                </span>
                              ) : (
                                <span style={{ color: "var(--sv-text-muted)" }}>
                                  —
                                </span>
                              )}
                            </td>
                            {/* MACD */}
                            <td
                              style={{
                                padding: "0.45rem 0.6rem",
                                color: pctColor(row.macd),
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.macd != null ? fmtNum(row.macd, 2) : "—"}
                            </td>
                            {/* Mohanram */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              <ScoreBadge
                                value={row.MohanramScore}
                                styleFn={mohanramStyle}
                              />
                            </td>
                            {/* Piotroski */}
                            <td style={{ padding: "0.45rem 0.6rem" }}>
                              <ScoreBadge
                                value={row.PiotroskiFScore}
                                styleFn={piotroskiStyle}
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketMoversPage;
