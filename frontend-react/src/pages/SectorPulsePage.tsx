import React, { useState, useEffect, useCallback } from "react";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SectorGroup {
  sector: string;
  data: string[];
}

interface TickerData {
  symbol: string;
  alternate_name?: string;
  price?: number;
  priceChange?: number;
  priceChangePct?: number;
  volume?: number;
  ytd?: number;
  mtd?: number;
  rsi?: number;
}

interface SectorWithTickers {
  sector: string;
  symbols: string[];
  tickers: TickerData[];
  loading: boolean;
}

interface SelectedTicker {
  symbol: string;
  sector: string;
  data: TickerData;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HEAT_COLORS = {
  strongGain:  { bg: "#16a34a", text: "#fff", label: "Strong Gain (>+2%)" },
  gain:        { bg: "#4ade80", text: "#0d1425", label: "Gain (0% to +2%)" },
  neutral:     { bg: "#64748b", text: "#fff", label: "Neutral (±0.4%)" },
  loss:        { bg: "#f87171", text: "#0d1425", label: "Loss (-2% to 0%)" },
  strongLoss:  { bg: "#dc2626", text: "#fff", label: "Strong Loss (<-2%)" },
} as const;

const CHART_THEME: Record<ThemeName, {
  bg: string; label: string; tooltipBg: string; tooltipText: string;
  tooltipBorder: string; grid: string; gain: string; loss: string;
}> = {
  dark:  { bg: "transparent", label: "#94a3b8", tooltipBg: "#0f172a", tooltipText: "#e2e8f0", tooltipBorder: "#1e2d45", grid: "#1c2840", gain: "#22c55e", loss: "#ef4444" },
  dim:   { bg: "transparent", label: "#8eaac9", tooltipBg: "#162038", tooltipText: "#d8e0f0", tooltipBorder: "#283a5c", grid: "#283a5c", gain: "#22c55e", loss: "#ef4444" },
  light: { bg: "transparent", label: "#4a5e78", tooltipBg: "#ffffff",  tooltipText: "#0d1425",  tooltipBorder: "#e2e8f0",  grid: "#e2e8f0", gain: "#16a34a", loss: "#dc2626" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getHeatColor(pct: number | undefined) {
  const v = pct ?? 0;
  if (v > 2)    return HEAT_COLORS.strongGain;
  if (v > 0)    return HEAT_COLORS.gain;
  if (v > -0.4) return HEAT_COLORS.neutral;
  if (v > -2)   return HEAT_COLORS.loss;
  return HEAT_COLORS.strongLoss;
}

function fmtPct(v: number | undefined): string {
  if (v == null) return "—";
  return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
}

function fmtPrice(v: number | undefined): string {
  if (v == null) return "—";
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcSectorAvg(tickers: TickerData[]): number | null {
  const valid = tickers.filter(t => t.priceChangePct != null);
  if (!valid.length) return null;
  return valid.reduce((s, t) => s + (t.priceChangePct ?? 0), 0) / valid.length;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface HeatTileProps {
  ticker: TickerData;
  isSelected: boolean;
  onClick: (t: TickerData) => void;
}

const HeatTile: React.FC<HeatTileProps> = ({ ticker, isSelected, onClick }) => {
  const color = getHeatColor(ticker.priceChangePct);
  const tooltipId = `heat-tile-${ticker.symbol}`;

  return (
    <>
      <Tooltip
        target={`#${tooltipId}`}
        content={`${ticker.alternate_name || ticker.symbol} | Price: ${fmtPrice(ticker.price)} | Change: ${fmtPct(ticker.priceChangePct)}`}
        position="top"
      />
      <div
        id={tooltipId}
        className="heat-tile"
        onClick={() => onClick(ticker)}
        style={{
          background: color.bg,
          color: color.text,
          border: isSelected ? "2px solid var(--sv-accent)" : "2px solid transparent",
          borderRadius: "8px",
          padding: "6px 4px",
          cursor: "pointer",
          textAlign: "center",
          minWidth: "64px",
          flex: "1 1 64px",
          transition: "transform 0.15s, box-shadow 0.15s",
          boxShadow: isSelected ? "0 0 0 3px var(--sv-accent)" : "none",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.03em" }}>
          {ticker.symbol}
        </div>
        <div style={{ fontSize: "0.72rem", fontWeight: 600, marginTop: "2px" }}>
          {fmtPct(ticker.priceChangePct)}
        </div>
      </div>
    </>
  );
};

interface SectorCardProps {
  sector: SectorWithTickers;
  selectedSymbol: string | null;
  onTickerClick: (ticker: TickerData, sector: string) => void;
}

const SectorCard: React.FC<SectorCardProps> = ({ sector, selectedSymbol, onTickerClick }) => {
  const avgChange = calcSectorAvg(sector.tickers);
  const avgColor = getHeatColor(avgChange ?? undefined);
  const sorted = [...sector.tickers].sort(
    (a, b) => (b.priceChangePct ?? 0) - (a.priceChangePct ?? 0)
  );

  return (
    <div
      className="sv-card sector-card"
      style={{
        border: "1px solid var(--sv-border)",
        borderRadius: "12px",
        padding: "14px",
        background: "var(--sv-bg-card)",
      }}
    >
      {/* Sector header */}
      <div className="flex align-items-center justify-content-between mb-2" style={{ gap: "8px" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--sv-text-primary)" }}>
          {sector.sector}
        </span>
        {avgChange != null && (
          <span
            style={{
              background: avgColor.bg,
              color: avgColor.text,
              borderRadius: "999px",
              padding: "2px 10px",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            {fmtPct(avgChange)} avg
          </span>
        )}
      </div>

      {/* Heat tiles */}
      {sector.loading ? (
        <div className="flex flex-wrap gap-1">
          {sector.symbols.slice(0, 6).map(s => (
            <Skeleton key={s} width="64px" height="44px" borderRadius="8px" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap" style={{ gap: "4px" }}>
          {sorted.map(t => (
            <HeatTile
              key={t.symbol}
              ticker={t}
              isSelected={t.symbol === selectedSymbol}
              onClick={ticker => onTickerClick(ticker, sector.sector)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Peer bar chart ─────────────────────────────────────────────────────────────

interface PeerChartProps {
  selected: SelectedTicker;
  peers: TickerData[];
  theme: ThemeName;
}

const PeerChart: React.FC<PeerChartProps> = ({ selected, peers, theme }) => {
  const ct = CHART_THEME[theme];
  const all = [selected.data, ...peers.filter(p => p.symbol !== selected.symbol)]
    .filter(t => t.priceChangePct != null)
    .sort((a, b) => (b.priceChangePct ?? 0) - (a.priceChangePct ?? 0))
    .slice(0, 12);

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: ct.bg,
      height: Math.max(180, all.length * 32 + 60),
      margin: [10, 16, 40, 80],
    },
    title: { text: undefined },
    xAxis: {
      categories: all.map(t => t.symbol),
      labels: { style: { color: ct.label, fontSize: "11px" } },
      lineColor: ct.grid,
      tickColor: ct.grid,
    },
    yAxis: {
      title: { text: "% Change Today", style: { color: ct.label, fontSize: "11px" } },
      labels: {
        style: { color: ct.label, fontSize: "11px" },
        formatter() { return this.value + "%"; },
      },
      gridLineColor: ct.grid,
      plotLines: [{ value: 0, color: ct.grid, width: 2 }],
    },
    tooltip: {
      backgroundColor: ct.tooltipBg,
      borderColor: ct.tooltipBorder,
      style: { color: ct.tooltipText },
      formatter() {
        return `<b>${this.x}</b>: ${(this.y as number) > 0 ? "+" : ""}${(this.y as number).toFixed(2)}%`;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 4,
        colorByPoint: true,
        colors: all.map(t =>
          (t.priceChangePct ?? 0) >= 0 ? ct.gain : ct.loss
        ),
        dataLabels: {
          enabled: true,
          format: "{y:.2f}%",
          style: { color: ct.label, fontSize: "10px", fontWeight: "normal" },
        },
      },
    },
    series: [{
      type: "bar",
      name: "Change %",
      data: all.map(t => t.priceChangePct ?? 0),
    }],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const SectorPulsePage: React.FC = () => {
  const { theme } = useTheme();

  const [sectors, setSectors] = useState<SectorWithTickers[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedTicker | null>(null);
  const [peers, setPeers] = useState<TickerData[]>([]);
  const [peersLoading, setPeersLoading] = useState(false);

  // ── Load heatmap groups, then fetch all technicals in one pass ──────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setPageLoading(true);
        const { data: groups } = await api.get<SectorGroup[]>("/heatmap/1");
        if (cancelled) return;

        // Seed sectors with loading state
        const seeded: SectorWithTickers[] = groups.map(g => ({
          sector: g.sector,
          symbols: g.data,
          tickers: [],
          loading: true,
        }));
        setSectors(seeded);
        setPageLoading(false);

        // Collect all unique symbols across all sectors
        const allSymbols = [...new Set(groups.flatMap(g => g.data))];
        if (!allSymbols.length) return;

        const { data: techData } = await api.get<TickerData[]>(
          `/symbol/technical/${allSymbols.join(",")}`
        );
        if (cancelled) return;

        // Build a quick lookup
        const bySymbol = new Map<string, TickerData>(techData.map(t => [t.symbol, t]));

        setSectors(groups.map(g => ({
          sector: g.sector,
          symbols: g.data,
          tickers: g.data.map(sym => bySymbol.get(sym) ?? { symbol: sym }),
          loading: false,
        })));
      } catch {
        setPageLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Handle ticker click → load peers ───────────────────────────────────────

  const handleTickerClick = useCallback(async (ticker: TickerData, sector: string) => {
    setSelected({ symbol: ticker.symbol, sector, data: ticker });
    setPeers([]);
    setPeersLoading(true);

    try {
      const { data: peerSymbols } = await api.get<string[]>(`/peer/${ticker.symbol}`);
      if (!peerSymbols?.length) { setPeersLoading(false); return; }

      const { data: peerData } = await api.get<TickerData[]>(
        `/symbol/technical/${peerSymbols.join(",")}`
      );
      setPeers(peerData ?? []);
    } catch {
      /* silently fail */
    } finally {
      setPeersLoading(false);
    }
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const allTickers = sectors.flatMap(s => s.tickers);
  const gainers  = allTickers.filter(t => (t.priceChangePct ?? 0) > 0).length;
  const losers   = allTickers.filter(t => (t.priceChangePct ?? 0) < 0).length;
  const neutral  = allTickers.filter(t => Math.abs(t.priceChangePct ?? 0) < 0.01).length;
  const topSector = [...sectors]
    .filter(s => s.tickers.length > 0)
    .sort((a, b) => (calcSectorAvg(b.tickers) ?? -Infinity) - (calcSectorAvg(a.tickers) ?? -Infinity))[0];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-3" style={{ maxWidth: "1400px", margin: "0 auto" }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between flex-wrap mb-3" style={{ gap: "12px" }}>
        <div>
          <div className="flex align-items-center gap-2">
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--sv-text-primary)" }}>
              Sector Pulse
            </h1>
            <span
              style={{
                background: "var(--sv-gain)",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                animation: "pulse 2s infinite",
              }}
            >
              LIVE
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "var(--sv-text-secondary)" }}>
            See which sectors and stocks are leading or lagging the market today. Green = up, Red = down.
          </p>
        </div>

        {/* Legend */}
        <div
          className="flex align-items-center flex-wrap"
          style={{ gap: "8px", fontSize: "0.72rem", fontWeight: 600 }}
        >
          <span style={{ color: "var(--sv-text-muted)" }}>Today's move:</span>
          {Object.values(HEAT_COLORS).map(c => (
            <span
              key={c.label}
              style={{
                background: c.bg,
                color: c.text,
                borderRadius: "6px",
                padding: "3px 8px",
              }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {!pageLoading && allTickers.length > 0 && (
        <div
          className="flex flex-wrap mb-3"
          style={{ gap: "10px" }}
        >
          <div className="sv-stat-pill sv-stat-gain">
            <i className="pi pi-arrow-up" style={{ fontSize: "0.75rem" }} />
            <span><b>{gainers}</b> Gaining</span>
          </div>
          <div className="sv-stat-pill sv-stat-loss">
            <i className="pi pi-arrow-down" style={{ fontSize: "0.75rem" }} />
            <span><b>{losers}</b> Declining</span>
          </div>
          <div className="sv-stat-pill sv-stat-neutral">
            <i className="pi pi-minus" style={{ fontSize: "0.75rem" }} />
            <span><b>{neutral}</b> Flat</span>
          </div>
          {topSector && calcSectorAvg(topSector.tickers) != null && (
            <div className="sv-stat-pill sv-stat-info">
              <i className="pi pi-star" style={{ fontSize: "0.75rem" }} />
              <span>
                Best sector: <b>{topSector.sector}</b>{" "}
                ({fmtPct(calcSectorAvg(topSector.tickers) ?? undefined)})
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Page skeleton ─────────────────────────────────────────────────── */}
      {pageLoading && (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="col-12 md:col-6 lg:col-4">
              <Skeleton height="130px" borderRadius="12px" />
            </div>
          ))}
        </div>
      )}

      {/* ── Sector grid ──────────────────────────────────────────────────── */}
      {!pageLoading && (
        <div className="grid">
          {sectors.map(sector => (
            <div
              key={sector.sector}
              className="col-12 md:col-6 lg:col-4"
            >
              <SectorCard
                sector={sector}
                selectedSymbol={selected?.symbol ?? null}
                onTickerClick={handleTickerClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Panel ─────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="mt-3"
          style={{
            border: "1px solid var(--sv-border)",
            borderRadius: "14px",
            background: "var(--sv-bg-card)",
            padding: "20px",
          }}
        >
          {/* Detail header */}
          <div className="flex align-items-center justify-content-between flex-wrap mb-3" style={{ gap: "12px" }}>
            <div>
              <div className="flex align-items-center gap-2">
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--sv-text-primary)" }}>
                  {selected.symbol}
                </h2>
                {selected.data.alternate_name && (
                  <span style={{ color: "var(--sv-text-secondary)", fontSize: "0.9rem" }}>
                    {selected.data.alternate_name}
                  </span>
                )}
                <Tag
                  value={selected.sector}
                  style={{ background: "var(--sv-accent)", color: "#fff", fontSize: "0.7rem" }}
                />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--sv-text-muted)" }}>
                Click any bar to see that company's details. Compare {selected.symbol} vs its sector peers.
              </p>
            </div>

            {/* Key stats */}
            <div className="flex flex-wrap" style={{ gap: "16px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>PRICE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--sv-text-primary)" }}>
                  {fmtPrice(selected.data.price)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>TODAY</div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: (selected.data.priceChangePct ?? 0) >= 0
                      ? "var(--sv-gain)"
                      : "var(--sv-loss)",
                  }}
                >
                  {fmtPct(selected.data.priceChangePct)}
                </div>
              </div>
              {selected.data.mtd != null && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>MTD</div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: (selected.data.mtd ?? 0) >= 0
                        ? "var(--sv-gain)"
                        : "var(--sv-loss)",
                    }}
                  >
                    {fmtPct(selected.data.mtd)}
                  </div>
                </div>
              )}
              {selected.data.ytd != null && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>YTD</div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: (selected.data.ytd ?? 0) >= 0
                        ? "var(--sv-gain)"
                        : "var(--sv-loss)",
                    }}
                  >
                    {fmtPct(selected.data.ytd)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Peer chart */}
          {peersLoading && (
            <Skeleton height="200px" borderRadius="8px" />
          )}
          {!peersLoading && (peers.length > 0 || selected.data.priceChangePct != null) && (
            <>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--sv-text-secondary)", marginBottom: "8px" }}>
                <i className="pi pi-chart-bar mr-1" />
                Peer Comparison — Today's Performance
              </div>
              <PeerChart selected={selected} peers={peers} theme={theme} />
            </>
          )}

          {!peersLoading && peers.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "32px",
                color: "var(--sv-text-muted)",
                fontSize: "0.875rem",
              }}
            >
              <i className="pi pi-info-circle mr-2" />
              No peer data available for {selected.symbol}.
            </div>
          )}
        </div>
      )}

      {/* ── How to read this page ─────────────────────────────────────────── */}
      <div
        className="mt-3"
        style={{
          border: "1px solid var(--sv-border-light)",
          borderRadius: "10px",
          background: "var(--sv-bg-surface)",
          padding: "14px 18px",
          fontSize: "0.8rem",
          color: "var(--sv-text-secondary)",
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--sv-text-primary)" }}>
          <i className="pi pi-lightbulb mr-1" style={{ color: "var(--sv-accent)" }} />
          How to read this page:
        </span>{" "}
        Each colored tile represents a stock. <b style={{ color: HEAT_COLORS.strongGain.bg }}>Dark green</b> means the stock gained more than 2% today.{" "}
        <b style={{ color: HEAT_COLORS.strongLoss.bg }}>Dark red</b> means it fell more than 2%.{" "}
        Tiles are sorted best-to-worst within each sector. Click any tile to see how that stock compares to its peers.
      </div>

      {/* ── Inline styles ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .heat-tile:hover {
          transform: scale(1.07);
          box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important;
          z-index: 1;
          position: relative;
        }
        .sv-stat-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid var(--sv-border);
          background: var(--sv-bg-surface);
        }
        .sv-stat-gain  { color: var(--sv-gain); border-color: var(--sv-gain); }
        .sv-stat-loss  { color: var(--sv-loss); border-color: var(--sv-loss); }
        .sv-stat-neutral { color: var(--sv-text-muted); }
        .sv-stat-info  { color: var(--sv-accent); border-color: var(--sv-accent); }
        .sector-card:hover {
          box-shadow: var(--sv-shadow-md);
        }
      `}</style>
    </div>
  );
};

export default SectorPulsePage;
