import React, { useState, useEffect, useRef, useCallback } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsTreemapModule from "highcharts/modules/treemap";
import { Dropdown } from "primereact/dropdown";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

// Handle ESM/CJS interop for Highcharts 12 + Vite
{
  const _mod = HighchartsTreemapModule as unknown;
  const _fn =
    typeof (_mod as { default?: unknown }).default === "function"
      ? (_mod as { default: (h: typeof Highcharts) => void }).default
      : typeof _mod === "function"
        ? (_mod as (h: typeof Highcharts) => void)
        : null;
  if (_fn) _fn(Highcharts);
}

/* ── Types ──────────────────────────────────────────────────────────────── */

interface MapCategory {
  id: string;
  name: string;
  item?: string;
  children: MapSubCategory[];
}

interface MapSubCategory {
  id: string;
  name: string;
}

interface RawHoldingRow {
  symbol: string;
  priceChangePct: number;
  sectorName: string;
  marketCap?: number;
  marketValue?: number;
  [key: string]: unknown;
}

interface ChartDataConfig {
  rawData: RawHoldingRow[];
  nameColumn: string;
  valColumn: string;
  parentColumn: string;
  sizeColumn: string;
}

/* ── Chart theme ─────────────────────────────────────────────────────────── */

interface ChartTheme {
  bg: string;
  plotBg: string;
  border: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    bg: "transparent",
    plotBg: "transparent",
    border: "#1e2d45",
    label: "#94a3b8",
    tooltipBg: "#0f172a",
    tooltipBorder: "#1e2d45",
    tooltipText: "#e2e8f0",
  },
  dim: {
    bg: "transparent",
    plotBg: "transparent",
    border: "#1e3a5f",
    label: "#8eaac9",
    tooltipBg: "#0d2340",
    tooltipBorder: "#1e3a5f",
    tooltipText: "#dbe7f5",
  },
  light: {
    bg: "transparent",
    plotBg: "transparent",
    border: "#e2e8f0",
    label: "#475569",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0f172a",
  },
};

/* ── Color helpers (matches MarketMapChart approach) ─────────────────────── */

const MIN_RED = 255,
  MAX_RED = 100;
const MIN_GREEN = 230,
  MAX_GREEN = 100;

function computeColor(
  pct: number,
  minChange: number,
  maxChange: number,
): string {
  if (pct < 0) {
    const colNum = Math.round(
      MIN_RED - (pct / minChange) * (MIN_RED - MAX_RED),
    );
    return `rgb(${colNum},0,0)`;
  }
  if (pct > 0) {
    const colNum = Math.round(
      MIN_GREEN - (pct / maxChange) * (MIN_GREEN - MAX_GREEN),
    );
    return `rgb(0,${colNum},0)`;
  }
  return "rgb(80,80,80)";
}

function buildTreemapColors(
  rawData: RawHoldingRow[],
  valColumn: string,
): { minVal: number; maxVal: number } {
  let min = -0.00001;
  let max = 0.00001;
  for (const row of rawData) {
    const v = row[valColumn] as number;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { minVal: min, maxVal: max };
}

/* ── Formatters ──────────────────────────────────────────────────────────── */

function fmtMarketCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

function fmtPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

/* ── Treemap builder ─────────────────────────────────────────────────────── */

function buildHighchartsData(
  cfg: ChartDataConfig,
): Highcharts.PointOptionsObject[] {
  const { rawData, nameColumn, valColumn, parentColumn, sizeColumn } = cfg;
  const { minVal, maxVal } = buildTreemapColors(rawData, valColumn);

  const sectors = [
    ...new Set(rawData.map((r) => String(r[parentColumn] ?? "Other"))),
  ];

  // Sector parent nodes must come BEFORE their children for drill-down to work
  const sectorPoints: Highcharts.PointOptionsObject[] = sectors.map(
    (s) =>
      ({
        id: s,
        name: s,
        color: "rgb(30,30,30)",
        dataLabels: {
          enabled: true,
          borderRadius: 4,
          backgroundColor: "rgba(252,255,197,0.85)",
          borderWidth: 1,
          borderColor: "#AAA",
          style: {
            color: "#000",
            fontSize: "11px",
            fontWeight: "700",
            textOutline: "none",
          },
          y: -6,
        },
      }) as Highcharts.PointOptionsObject,
  );

  const stockPoints: Highcharts.PointOptionsObject[] = rawData.map((row) => {
    const val = parseFloat(String(row[valColumn])) || 0;
    const size = parseFloat(String(row[sizeColumn])) || 1;
    const sector = String(row[parentColumn] ?? "Other");
    const symbol = String(row[nameColumn] ?? "");
    return {
      name: symbol,
      parent: sector,
      value: size,
      color: computeColor(val, minVal, maxVal),
      custom: { changePct: val, rawSize: size, sector },
    } as Highcharts.PointOptionsObject;
  });

  return [...sectorPoints, ...stockPoints];
}

/* ── Highcharts options builder ──────────────────────────────────────────── */

function buildChartOptions(
  cfg: ChartDataConfig,
  theme: ChartTheme,
): Highcharts.Options {
  const points = buildHighchartsData(cfg);
  const { valColumn, sizeColumn } = cfg;

  return {
    chart: {
      backgroundColor: theme.bg,
      plotBackgroundColor: theme.plotBg as Highcharts.ColorString,
      margin: [0, 0, 0, 0],
      spacing: [0, 0, 0, 0],
      animation: { duration: 400 },
    },
    title: { text: "" },
    subtitle: { text: "" },
    credits: { enabled: false },
    navigation: {
      breadcrumbs: {
        showFullPath: false,
        format: "← Back",
        buttonTheme: {
          fill: "rgba(255,255,255,0.07)",
          padding: 3,
          marginBottom: 5,
          r: 5,
          stroke: "rgba(255,255,255,0.18)",
          "stroke-width": 1,
          style: {
            color: theme.tooltipText,
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
            letterSpacing: "0.02em",
          },
          states: {
            hover: {
              fill: "rgba(255,255,255,0.15)",
              style: { color: "#ffffff" },
            },
          },
        },
        separator: { text: " ", style: { display: "none" } },
      },
    },
    series: [
      {
        type: "treemap" as const,
        name: "Back",
        layoutAlgorithm: "squarified",
        allowDrillToNode: true as any,
        animationLimit: 1000,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "11px",
            fontWeight: "600",
            textOutline: "none",
            color: "rgba(255,255,255,0.92)",
          },
          formatter(this: any) {
            const pt = this.point;
            const pct = pt?.custom?.changePct;
            if (pct !== undefined) {
              const sign = pct >= 0 ? "+" : "";
              return `${pt.name}<br><span style="font-weight:400">${sign}${pct.toFixed(2)}%</span>`;
            }
            return pt.name;
          },
        },
        levels: [
          {
            level: 1,
            dataLabels: { enabled: true },
            borderWidth: 3,
          },
        ] as any,
        data: points,
      } as Highcharts.SeriesTreemapOptions,
    ],
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      borderRadius: 8,
      style: { color: theme.tooltipText, fontSize: "13px" },
      useHTML: true,
      formatter(this: Highcharts.TooltipFormatterContextObject) {
        const pt = this.point as Highcharts.Point & {
          custom?: { changePct: number; rawSize: number; sector?: string };
          parent?: string;
        };
        const custom = pt.custom;
        if (!custom) {
          return `<b style="font-size:14px">${this.point.name}</b>`;
        }
        const pctColor = custom.changePct >= 0 ? "#22c55e" : "#ef4444";
        const sizeCol = sizeColumn;
        const isMktCap = sizeCol === "marketCap";
        return `
          <div style="min-width:160px">
            <div style="font-size:15px;font-weight:700;margin-bottom:4px">${this.point.name}</div>
            <div style="font-size:12px;color:${theme.label};margin-bottom:6px">${pt.parent ?? ""}</div>
            <div style="display:flex;justify-content:space-between;gap:16px">
              <span style="color:#94a3b8;font-size:12px">Change</span>
              <span style="font-weight:700;color:${pctColor}">${fmtPct(custom.changePct)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-top:4px">
              <span style="color:#94a3b8;font-size:12px">${isMktCap ? "Mkt Cap" : "Value"}</span>
              <span style="font-weight:600">${fmtMarketCap(custom.rawSize)}</span>
            </div>
          </div>`;
      },
    },
  };
}

/* ── Stats helpers ───────────────────────────────────────────────────────── */

interface MapStats {
  gainers: number;
  losers: number;
  unchanged: number;
  bestSector: string;
  worstSector: string;
  avgChange: number;
}

function computeStats(cfg: ChartDataConfig): MapStats {
  const { rawData, valColumn, parentColumn } = cfg;
  let gainers = 0;
  let losers = 0;
  let unchanged = 0;
  let sum = 0;
  const sectorSums: Record<string, { total: number; count: number }> = {};

  for (const row of rawData) {
    const v = parseFloat(String(row[valColumn])) || 0;
    sum += v;
    if (v > 0.01) gainers++;
    else if (v < -0.01) losers++;
    else unchanged++;

    const s = String(row[parentColumn] ?? "Other");
    if (!sectorSums[s]) sectorSums[s] = { total: 0, count: 0 };
    sectorSums[s].total += v;
    sectorSums[s].count++;
  }

  const sectorAvgs = Object.entries(sectorSums).map(
    ([name, { total, count }]) => ({
      name,
      avg: total / count,
    }),
  );
  sectorAvgs.sort((a, b) => b.avg - a.avg);

  return {
    gainers,
    losers,
    unchanged,
    bestSector: sectorAvgs[0]?.name ?? "—",
    worstSector: sectorAvgs[sectorAvgs.length - 1]?.name ?? "—",
    avgChange: rawData.length > 0 ? sum / rawData.length : 0,
  };
}

/* ── Main Page Component ─────────────────────────────────────────────────── */

const HoldingsMapPage: React.FC = () => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme];

  const [categories, setCategories] = useState<MapCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<MapCategory | null>(null);
  const [selectedSub, setSelectedSub] = useState<MapSubCategory | null>(null);
  const [chartData, setChartData] = useState<ChartDataConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MapStats | null>(null);

  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Load categories on mount
  useEffect(() => {
    api
      .get<MapCategory[]>("/symbol/holding-maps-categories")
      .then((res) => {
        // removed market x-ray as it can become a stand alone page
        const cats: MapCategory[] = (res.data ?? []).filter(
          (c) => c.id !== "market_xray",
        );
        setCategories(cats);
        if (cats.length > 0) {
          const first = cats[0];
          setSelectedCat(first);
          if (first.children?.length > 0) {
            setSelectedSub(first.children[0]);
          }
        }
      })
      .catch(() => {
        // Fallback with basic market maps
        const fallback: MapCategory[] = [
          {
            id: "market_maps",
            name: "Market Maps",
            item: "Map",
            children: [
              { id: "SandP500", name: "S&P 500" },
              { id: "Nasdaq100", name: "Nasdaq 100" },
            ],
          },
        ];
        setCategories(fallback);
        setSelectedCat(fallback[0]);
        setSelectedSub(fallback[0].children[0]);
      });
  }, []);

  const fetchData = useCallback(
    async (cat: MapCategory, sub: MapSubCategory) => {
      setChartData(null);
      setStats(null);
      setError(null);
      setLoading(true);

      try {
        let endpoint = "";
        let sizeColumn = "marketCap";

        if (sub.id === "SandP500") {
          endpoint = "/symbol/spytreemap";
        } else if (sub.id === "Nasdaq100") {
          endpoint = "/symbol/nasdaqtreemap";
        } else if (
          [
            "sv_portfolios",
            "sv_portfolios_thematic",
            "user_portfolios",
          ].includes(cat.id)
        ) {
          endpoint = `/modelportfolio/holdingmap/${sub.id}`;
          sizeColumn = "marketValue";
        }

        if (!endpoint) {
          setLoading(false);
          return;
        }

        const res = await api.get<RawHoldingRow[]>(endpoint);
        const rawData: RawHoldingRow[] = Array.isArray(res.data)
          ? res.data
          : [];

        const cfg: ChartDataConfig = {
          rawData,
          nameColumn: "symbol",
          valColumn: "priceChangePct",
          parentColumn: "sectorName",
          sizeColumn,
        };

        setChartData(cfg);
        setStats(computeStats(cfg));
      } catch {
        setError("Failed to load map data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Trigger fetch when sub-category changes
  useEffect(() => {
    if (selectedCat && selectedSub) {
      fetchData(selectedCat, selectedSub);
    }
  }, [selectedCat, selectedSub, fetchData]);

  const handleCatChange = (cat: MapCategory) => {
    if (cat.id === selectedCat?.id) return;
    setSelectedCat(cat);
    const firstSub = cat.children?.[0] ?? null;
    setSelectedSub(firstSub);
  };

  const chartOptions = chartData ? buildChartOptions(chartData, ct) : null;

  const avgColor =
    stats && stats.avgChange >= 0 ? "var(--green-400)" : "var(--red-400)";

  return (
    <div className="flex flex-column" style={{ minHeight: "100%" }}>
      {/* ── Page Header ─────────────────────────────────────────────── */}
      {/* <div
        className="px-4 pt-4 pb-3"
        style={{
          borderBottom: "1px solid var(--surface-border)",
          background: "var(--surface-card)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
            marginBottom: 10,
          }}
        /> */}
      {/* <div className="flex align-items-center justify-content-between flex-wrap gap-2"> */}
      {/* <div>
            <h2
              className="m-0 text-xl font-bold"
              style={{ color: "var(--text-color)" }}
            >
              Holdings Map
            </h2>
            <p
              className="m-0 mt-1 text-sm"
              style={{ color: "var(--text-color-secondary)" }}
            >
              Visualize market exposure by sector · size = market cap · color =
              daily change
            </p>
          </div> */}
      {/* <div className="flex align-items-center gap-2">
            <span
              className="flex align-items-center gap-1 text-xs px-2 py-1 border-round"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.25)",
              }}
            >
              <i
                className="pi pi-circle-fill"
                style={{ fontSize: "0.45rem" }}
              />
              Live
            </span>
          </div> */}
      {/* </div> */}
      {/* </div> */}

      {/* ── Controls ────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex flex-wrap align-items-center gap-3"
        style={{
          background: "var(--surface-ground)",
          borderBottom: "1px solid var(--surface-border)",
        }}
      >
        {/* Category buttons */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCatChange(cat)}
              onMouseEnter={(e) => {
                if (selectedCat?.id !== cat.id) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--sv-bg-card-hover)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--sv-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCat?.id !== cat.id) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--sv-bg-surface)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--sv-text-secondary)";
                }
              }}
              style={{
                padding: "0.3rem 0.875rem",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: selectedCat?.id === cat.id ? 700 : 500,
                color:
                  selectedCat?.id === cat.id
                    ? "var(--sv-text-inverse)"
                    : "var(--sv-text-secondary)",
                background:
                  selectedCat?.id === cat.id
                    ? "var(--sv-accent)"
                    : "var(--sv-bg-surface)",
                transition: "all 0.15s ease",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sub-category dropdown */}
        {selectedCat && selectedCat.children?.length > 0 && (
          <div className="flex align-items-center gap-2">
            {selectedCat.item && (
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text-color-secondary)" }}
              >
                {selectedCat.item}:
              </span>
            )}
            <Dropdown
              value={selectedSub}
              options={selectedCat.children}
              onChange={(e) => setSelectedSub(e.value)}
              optionLabel="name"
              placeholder="Select..."
              className="sv-dropdown-sm"
              panelClassName="sv-dropdown-sm-panel"
              style={{ minWidth: 200 }}
            />
          </div>
        )}

        {/* Spacer + refresh */}
        <div className="flex-1" />
        <button
          onClick={() =>
            selectedCat && selectedSub && fetchData(selectedCat, selectedSub)
          }
          disabled={loading}
          title="Refresh"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--surface-border)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: loading ? "not-allowed" : "pointer",
            color: "var(--text-color-secondary)",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <i
            className={`pi ${loading ? "pi-spin pi-spinner" : "pi-refresh"}`}
          />
        </button>
      </div>

      {/* ── Stats Strip ─────────────────────────────────────────────── */}
      {stats && !loading && (
        <div
          className="flex flex-wrap gap-3 px-4 py-2 align-items-center"
          style={{
            background: "var(--surface-section)",
            borderBottom: "1px solid var(--surface-border)",
            fontSize: 12,
          }}
        >
          <div className="flex align-items-center gap-2">
            <span style={{ color: "var(--text-color-secondary)" }}>
              Avg Change:
            </span>
            <span style={{ color: avgColor, fontWeight: 700 }}>
              {fmtPct(stats.avgChange)}
            </span>
          </div>
          <div className="flex align-items-center gap-2">
            <Tag
              value={`▲ ${stats.gainers} Gainers`}
              style={{
                background: "rgba(34,197,94,0.15)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.3)",
                fontSize: 11,
                padding: "2px 8px",
              }}
            />
            <Tag
              value={`▼ ${stats.losers} Losers`}
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 11,
                padding: "2px 8px",
              }}
            />
            {stats.unchanged > 0 && (
              <Tag
                value={`◆ ${stats.unchanged} Flat`}
                style={{
                  background: "rgba(148,163,184,0.15)",
                  color: "var(--text-color-secondary)",
                  border: "1px solid var(--surface-border)",
                  fontSize: 11,
                  padding: "2px 8px",
                }}
              />
            )}
          </div>
          <div className="flex align-items-center gap-2 ml-2">
            <i
              className="pi pi-arrow-up"
              style={{ color: "#22c55e", fontSize: 10 }}
            />
            <span style={{ color: "var(--text-color-secondary)" }}>Best:</span>
            <span style={{ color: "var(--text-color)", fontWeight: 600 }}>
              {stats.bestSector}
            </span>
          </div>
          <div className="flex align-items-center gap-2">
            <i
              className="pi pi-arrow-down"
              style={{ color: "#ef4444", fontSize: 10 }}
            />
            <span style={{ color: "var(--text-color-secondary)" }}>Worst:</span>
            <span style={{ color: "var(--text-color)", fontWeight: 600 }}>
              {stats.worstSector}
            </span>
          </div>
        </div>
      )}

      {/* ── Chart Area ──────────────────────────────────────────────── */}
      <div className="flex-1 pt-3 pb-2" style={{ minHeight: 0 }}>
        {error && (
          <div
            className="flex align-items-center justify-content-center"
            style={{ height: 400 }}
          >
            <div className="text-center">
              <i
                className="pi pi-exclamation-triangle text-4xl mb-3"
                style={{ color: "#f59e0b" }}
              />
              <p style={{ color: "var(--text-color-secondary)" }}>{error}</p>
              <button
                onClick={() =>
                  selectedCat &&
                  selectedSub &&
                  fetchData(selectedCat, selectedSub)
                }
                style={{
                  marginTop: 12,
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid #3b82f6",
                  background: "transparent",
                  color: "#3b82f6",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div>
            <Skeleton height="60vh" borderRadius="12px" />
          </div>
        )}

        {!loading && !error && chartOptions && (
          <div
            style={{
              height: "calc(100vh - 310px)",
              minHeight: 480,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--surface-border)",
              background: "var(--surface-card)",
            }}
          >
            <HighchartsReact
              ref={chartRef}
              highcharts={Highcharts}
              options={chartOptions}
              containerProps={{ style: { width: "100%", height: "100%" } }}
            />
          </div>
        )}

        {!loading && !error && !chartOptions && categories.length === 0 && (
          <div
            className="flex align-items-center justify-content-center"
            style={{ height: 400 }}
          >
            <div className="text-center">
              <i
                className="pi pi-map text-6xl mb-3"
                style={{ color: "var(--surface-border)" }}
              />
              <p style={{ color: "var(--text-color-secondary)" }}>
                Select a category to view the holdings map
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Color Legend ─────────────────────────────────────────────── */}
      <div
        className="flex align-items-center justify-content-center gap-3 px-4 py-2"
        style={{
          borderTop: "1px solid var(--surface-border)",
          background: "var(--surface-ground)",
          fontSize: 11,
          color: "var(--text-color-secondary)",
        }}
      >
        <span>Loss</span>
        <div
          style={{
            width: 180,
            height: 10,
            borderRadius: 5,
            background:
              "linear-gradient(to right, rgb(235,30,30), rgb(180,60,60), rgb(80,80,100), rgb(60,160,50), rgb(50,205,50))",
          }}
        />
        <span>Gain</span>
        <span className="ml-3" style={{ opacity: 0.6 }}>
          · Size = Market Cap · Click sector to drill down
        </span>
      </div>
    </div>
  );
};

export default HoldingsMapPage;
