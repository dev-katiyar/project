import React, { useState, useEffect, useCallback, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsSolidGauge from "highcharts/modules/solid-gauge";
import HighchartsTreemapModule from "highcharts/modules/treemap";
import { TabView, TabPanel } from "primereact/tabview";
import { Skeleton } from "primereact/skeleton";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";
import MarketDataTable, {
  COLUMN_PRESETS,
} from "@/components/market-data/MarketDataTable";
import LivePricesTable, {
  type ChartSelection,
} from "@/components/market-data/LivePricesTable";
import IndexSelector, {
  INDEX_OPTIONS,
  type IndexOption,
} from "@/components/common/IndexSelector";
import AssetLineChart from "@/components/common/AssetLineChart";
import MarketSummaryWidget from "@/components/market-data/MarketSummaryWidget";
import PortfolioSummaryTable, {
  type Portfolio,
} from "@/components/portfolio/PortfolioSummaryTable";

/* ── Initialize Highcharts modules (ESM/CJS interop) ─────────────────────── */

function _initHcMod(mod: unknown) {
  const fn =
    typeof (mod as { default?: unknown }).default === "function"
      ? (mod as { default: (h: typeof Highcharts) => void }).default
      : typeof mod === "function"
        ? (mod as (h: typeof Highcharts) => void)
        : null;
  if (fn) fn(Highcharts);
}
_initHcMod(HighchartsMore);
_initHcMod(HighchartsSolidGauge);
_initHcMod(HighchartsTreemapModule);

/* ── Constants ────────────────────────────────────────────────────────────── */

const ASSET_URLS = {
  indices: "/symbol/list_type2/8",
  bonds: "/symbol/list_type2/24",
  commodities: "/symbol/list_type2/22",
  cryptos: "/symbol/list_type2/39",
} as const;

const CAT_COMMENTARY = 12335;
const CAT_TRADE_ALERTS = 12338;

/* ── Types ────────────────────────────────────────────────────────────────── */

interface FearGreedData {
  fear_greed: number;
  technical: number;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
}

interface WpPost {
  id: number;
  date: string;
  title: { rendered: string };
  link: string;
  yoast_head_json?: {
    og_image?: Array<{ url: string }>;
  };
}

interface TreemapRow {
  symbol: string;
  priceChangePct: number;
  sectorName: string;
  marketCap?: number;
}

/* ── Chart theme ──────────────────────────────────────────────────────────── */

interface ChartTheme {
  bg: string;
  grid: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  gain: string;
  loss: string;
  accent: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    bg: "transparent",
    grid: "#1c2840",
    label: "#7a8da8",
    tooltipBg: "#0d1220",
    tooltipBorder: "#1c2840",
    tooltipText: "#e8edf5",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#f5a623",
  },
  dim: {
    bg: "transparent",
    grid: "#283a5c",
    label: "#7a92b8",
    tooltipBg: "#162038",
    tooltipBorder: "#283a5c",
    tooltipText: "#d8e0f0",
    gain: "#22c55e",
    loss: "#ef4444",
    accent: "#f5a623",
  },
  light: {
    bg: "transparent",
    grid: "#e2e8f0",
    label: "#4a5e78",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0d1425",
    gain: "#16a34a",
    loss: "#dc2626",
    accent: "#2e5be6",
  },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

function fmtDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getSentimentMeta(v: number): { label: string; color: string } {
  if (v >= 75) return { label: "Extreme Greed", color: "#22c55e" };
  if (v >= 55) return { label: "Greed", color: "#86efac" };
  if (v >= 45) return { label: "Neutral", color: "#f5a623" };
  if (v >= 25) return { label: "Fear", color: "#f97316" };
  return { label: "Extreme Fear", color: "#ef4444" };
}

function getTechMeta(v: number): { label: string; color: string } {
  if (v >= 70) return { label: "Strong Buy", color: "#22c55e" };
  if (v >= 55) return { label: "Buy", color: "#86efac" };
  if (v >= 45) return { label: "Neutral", color: "#f5a623" };
  if (v >= 30) return { label: "Sell", color: "#f97316" };
  return { label: "Strong Sell", color: "#ef4444" };
}

/* ── Panel ────────────────────────────────────────────────────────────────── */

const Panel: React.FC<{
  title?: string;
  extra?: React.ReactNode;
  linkTo?: string;
  linkLabel?: string;
  minH?: number;
  noPad?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  extra,
  linkTo,
  linkLabel = "View Details",
  minH,
  noPad,
  children,
}) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 12,
      padding: noPad ? 0 : "0.875rem 1rem",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      boxShadow: "var(--sv-shadow-sm)",
    }}
  >
    {title && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.625rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--sv-border)",
          flexShrink: 0,
          padding: noPad ? "0.875rem 1rem 0.5rem" : undefined,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--sv-text-primary)",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {extra}
          {linkTo && (
            <Link
              to={linkTo}
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--sv-accent)",
                textDecoration: "none",
                padding: "0.2rem 0.55rem",
                borderRadius: 4,
                border:
                  "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
                background: "var(--sv-accent-bg)",
              }}
            >
              {linkLabel}
            </Link>
          )}
        </div>
      </div>
    )}
    <div
      style={{
        flex: 1,
        minHeight: minH,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: noPad && title ? "0 1rem 0.875rem" : undefined,
      }}
    >
      {children}
    </div>
  </div>
);

/* ── Sentiment header badges (compact) ───────────────────────────────────── */

const SentimentBadge: React.FC<{
  label: string;
  value: number;
  getMeta: (v: number) => { label: string; color: string };
}> = ({ label, value, getMeta }) => {
  const { label: sentiment, color } = getMeta(value);
  return (
    <div
      style={{
        padding: "0.375rem 0.75rem",
        borderRadius: 8,
        border: `1px solid ${color}35`,
        background: `${color}14`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 96,
      }}
    >
      <span
        style={{
          fontSize: "0.58rem",
          color: "var(--sv-text-muted)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{ fontSize: "1.15rem", fontWeight: 800, color, lineHeight: 1.2 }}
      >
        {Math.round(value)}
      </span>
      <span
        style={{
          fontSize: "0.55rem",
          fontWeight: 700,
          color,
          letterSpacing: "0.03em",
        }}
      >
        {sentiment}
      </span>
    </div>
  );
};

/* ── Highcharts solid gauge ───────────────────────────────────────────────── */

const GaugeChart: React.FC<{
  value?: number;
  title: string;
  ct: ChartTheme;
}> = ({ value, title, ct }) => {
  const val = value ?? 0;
  const options = useMemo(
    (): Highcharts.Options => ({
      chart: {
        type: "solidgauge",
        backgroundColor: ct.bg,
        height: 200,
        spacing: [0, 0, 0, 0],
        style: { fontFamily: "inherit" },
      },
      title: { text: undefined },
      pane: {
        center: ["50%", "80%"],
        size: "140%",
        startAngle: -90,
        endAngle: 90,
        background: [
          {
            backgroundColor: ct.grid,
            innerRadius: "60%",
            outerRadius: "100%",
            shape: "arc",
            borderColor: "transparent",
          },
        ],
      },
      yAxis: {
        min: 0,
        max: 100,
        stops: [
          [0.1, "#ef4444"],
          [0.5, "#f5a623"],
          [0.9, "#22c55e"],
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: undefined,
        tickAmount: 2,
        labels: { y: 20, style: { fontSize: "0.68rem", color: ct.label } },
      },
      plotOptions: {
        solidgauge: {
          innerRadius: "60%",
          dataLabels: {
            y: -10,
            borderWidth: 0,
            useHTML: true,
            formatter(this: any) {
              return `<div style="text-align:center;line-height:1.2"><span style="font-size:1.5rem;font-weight:800;color:${ct.tooltipText}">${Math.round(this.y ?? 0)}</span><br><span style="font-size:0.6rem;color:${ct.label};letter-spacing:0.04em">${title}</span></div>`;
            },
          },
        },
      },
      series: [{ type: "solidgauge" as any, name: title, data: [val] }],
      tooltip: { enabled: false },
      credits: { enabled: false },
      legend: { enabled: false },
    }),
    [val, ct, title],
  );

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/* ── Market Map (treemap) ────────────────────────────────────────────────── */

const MarketMapChart: React.FC<{ index: IndexOption; ct: ChartTheme }> = ({
  index,
  ct,
}) => {
  const [rows, setRows] = useState<TreemapRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows(null);
    api
      .get<TreemapRow[]>(index.urls.treemap)
      .then(({ data }) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
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
  }, [index.urls.treemap]);

  const options = useMemo((): Highcharts.Options => {
    if (!rows?.length) return {};
    const sectors = [...new Set(rows.map((d) => d.sectorName))];
    const sectorPoints = sectors.map((s) => ({
      id: s,
      name: s,
      color: ct.grid,
    }));
    const stockPoints = rows.map((d) => ({
      name: d.symbol,
      value: Math.abs(d.marketCap ?? 1000),
      colorValue: d.priceChangePct ?? 0,
      parent: d.sectorName,
      custom: { pct: d.priceChangePct },
    }));
    return {
      chart: { backgroundColor: ct.bg, height: 290, spacing: [2, 2, 2, 2] },
      title: { text: undefined },
      colorAxis: {
        min: -5,
        max: 5,
        stops: [
          [0, ct.loss],
          [0.5, ct.grid],
          [1, ct.gain],
        ],
      },
      series: [
        {
          type: "treemap" as any,
          layoutAlgorithm: "squarified",
          animationLimit: 1000,
          dataLabels: {
            enabled: true,
            style: {
              fontSize: "9px",
              fontWeight: "600",
              textOutline: "none",
              color: "#fff",
            },
            formatter(this: any) {
              const pt = this.point;
              const pct = pt?.custom?.pct;
              return pct != null
                ? `${pt.name}<br><span style="font-weight:400">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%</span>`
                : pt.name;
            },
          },
          levels: [
            {
              level: 1,
              dataLabels: { enabled: false },
              borderWidth: 2,
              borderColor: ct.bg,
            },
          ],
          data: [...sectorPoints, ...stockPoints],
        },
      ],
      tooltip: {
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        style: { color: ct.tooltipText },
        formatter(this: any) {
          const pt = this.point;
          if (!pt?.parent) return false;
          const pct = pt.custom?.pct ?? 0;
          return `<b>${pt.name}</b><br>Sector: ${pt.parent}<br>Change: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
        },
      },
      credits: { enabled: false },
      legend: { enabled: false },
    };
  }, [rows, ct]);

  if (loading) return <Skeleton height="290px" />;
  if (!rows || !rows.length)
    return (
      <div
        style={{
          height: 290,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--sv-text-muted)",
        }}
      >
        <i
          className="pi pi-th-large"
          style={{ fontSize: "2rem", opacity: 0.2, marginBottom: "0.5rem" }}
        />
        <span style={{ fontSize: "0.75rem" }}>Market map unavailable</span>
      </div>
    );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/* ── Insights strip (horizontal scroll) ──────────────────────────────────── */

const InsightsStrip: React.FC = () => {
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<WpPost[]>("/wp-json/wp/v2/posts", {
        params: { categories: CAT_COMMENTARY, per_page: 3 },
      }),
      api.get<WpPost[]>("/wp-json/wp/v2/posts", {
        params: { categories: CAT_TRADE_ALERTS, per_page: 3 },
      }),
    ])
      .then(([comRes, alertRes]) => {
        const combined: WpPost[] = [
          ...(comRes.status === "fulfilled" && Array.isArray(comRes.value.data)
            ? comRes.value.data
            : []),
          ...(alertRes.status === "fulfilled" &&
          Array.isArray(alertRes.value.data)
            ? alertRes.value.data
            : []),
        ];
        setPosts(combined);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ flexShrink: 0, width: 200 }}>
            <Skeleton height="100px" borderRadius="10px" />
          </div>
        ))}
      </div>
    );
  }

  if (!posts.length)
    return (
      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--sv-text-muted)",
          margin: 0,
        }}
      >
        No insights available
      </p>
    );

  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        overflowX: "auto",
        paddingBottom: "0.25rem",
        scrollbarWidth: "thin",
      }}
    >
      {posts.map((post) => {
        const title = stripHtml(post.title.rendered);
        const imgUrl = post.yoast_head_json?.og_image?.[0]?.url;
        return (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0,
              width: 210,
              display: "flex",
              flexDirection: "column",
              background: "var(--sv-bg-surface)",
              border: "1px solid var(--sv-border)",
              borderRadius: 10,
              overflow: "hidden",
              textDecoration: "none",
              transition:
                "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--sv-accent)";
              e.currentTarget.style.boxShadow = "var(--sv-shadow-md)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--sv-border)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {imgUrl ? (
              <div
                style={{
                  height: 80,
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <img
                  src={imgUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: 50,
                  background: "var(--sv-accent-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className="pi pi-file-edit"
                  style={{
                    color: "var(--sv-accent)",
                    fontSize: "1.25rem",
                    opacity: 0.5,
                  }}
                />
              </div>
            )}
            <div style={{ padding: "0.5rem 0.625rem", flex: 1 }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--sv-text-primary)",
                  lineHeight: 1.45,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {title}
              </span>
              <div
                style={{
                  fontSize: "0.58rem",
                  color: "var(--sv-text-muted)",
                  marginTop: "0.3rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <i className="pi pi-calendar" style={{ fontSize: "0.52rem" }} />
                {fmtDate(post.date)}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};

/* ── News table ───────────────────────────────────────────────────────────── */

const NewsTable: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<NewsItem[]>("/news/rss")
      .then(({ data }) => setNews(Array.isArray(data) ? data.slice(0, 18) : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "0.25rem 0" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "0.5rem 0",
              borderBottom: "1px solid var(--sv-border)",
            }}
          >
            <Skeleton width="4px" height="40px" />
            <div style={{ flex: 1 }}>
              <Skeleton height="13px" className="mb-1" />
              <Skeleton width="60%" height="11px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!news.length) {
    return (
      <div
        style={{
          padding: "2.5rem 1rem",
          textAlign: "center",
          color: "var(--sv-text-muted)",
        }}
      >
        <i
          className="pi pi-newspaper"
          style={{
            fontSize: "2rem",
            display: "block",
            marginBottom: "0.5rem",
            opacity: 0.2,
          }}
        />
        <span style={{ fontSize: "0.78rem" }}>No news available</span>
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", maxHeight: 280 }}>
      {news.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.625rem",
            padding: "0.5rem 0",
            borderBottom:
              i < news.length - 1 ? "1px solid var(--sv-border)" : "none",
          }}
        >
          <div
            style={{
              width: 3,
              flexShrink: 0,
              alignSelf: "stretch",
              borderRadius: 2,
              background: "var(--sv-accent)",
              opacity: 0.4,
              marginTop: 2,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--sv-text-primary)",
                textDecoration: "none",
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--sv-accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--sv-text-primary)")
              }
            >
              {item.title}
            </a>
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--sv-text-muted)",
                marginTop: "0.2rem",
                display: "flex",
                gap: "0.5rem",
              }}
            >
              {item.source && (
                <span style={{ fontWeight: 600 }}>{item.source}</span>
              )}
              {item.pubDate && <span>{fmtDateTime(item.pubDate)}</span>}
            </div>
          </div>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexShrink: 0, marginTop: 3 }}
          >
            <i
              className="pi pi-external-link"
              style={{ fontSize: "0.6rem", color: "var(--sv-text-muted)" }}
            />
          </a>
        </div>
      ))}
    </div>
  );
};

/* ── Skeleton for index selector area ────────────────────────────────────── */

const IndexDrop: React.FC<{
  value: IndexOption;
  onChange: (v: IndexOption) => void;
}> = ({ value, onChange }) => (
  <div style={{ flexShrink: 0 }}>
    <IndexSelector value={value} onChange={onChange} />
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main Page                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

const DashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme] ?? CHART_THEME.dim;

  /* ── Index selectors ── */
  const [highlightsIndex, setHighlightsIndex] = useState<IndexOption>(
    INDEX_OPTIONS[0],
  );
  const [mapIndex, setMapIndex] = useState<IndexOption>(INDEX_OPTIONS[0]);
  const [rsiIndex, setRsiIndex] = useState<IndexOption>(INDEX_OPTIONS[0]);
  const [momentumIndex, setMomentumIndex] = useState<IndexOption>(
    INDEX_OPTIONS[0],
  );
  const [rsIndex, setRsIndex] = useState<IndexOption>(INDEX_OPTIONS[0]);

  /* ── Selected symbol for chart ── */
  const [selectedSymbol, setSelectedSymbol] = useState<ChartSelection | null>(
    null,
  );

  /* ── Fear / Greed + Technical ── */
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [loadingFG, setLoadingFG] = useState(true);

  /* ── Portfolios ── */
  const [svPortfolios, setSvPortfolios] = useState<Portfolio[]>([]);
  const [userPortfolios, setUserPortfolios] = useState<Portfolio[]>([]);
  const [loadingSV, setLoadingSV] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);

  /* ── Effects ── */
  useEffect(() => {
    api
      .get<FearGreedData>("/symbol/technical-fear-greed")
      .then(({ data }) => setFearGreed(data))
      .catch(() => setFearGreed(null))
      .finally(() => setLoadingFG(false));
  }, []);

  useEffect(() => {
    api
      .get<Portfolio[]>("/modelportfolio/read/summary/riapro/3")
      .then(({ data }) => setSvPortfolios(Array.isArray(data) ? data : []))
      .catch(() => setSvPortfolios([]))
      .finally(() => setLoadingSV(false));

    api
      .get<Portfolio[]>("/modelportfolio/read/summary/user/3")
      .then(({ data }) => setUserPortfolios(Array.isArray(data) ? data : []))
      .catch(() => setUserPortfolios([]))
      .finally(() => setLoadingUser(false));
  }, []);

  const handleChartClick = useCallback(
    (sel: ChartSelection) => setSelectedSymbol(sel),
    [],
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* ── Render ── */
  return (
    <>
      {/* ════ Page Header ════ */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h1 className="text-2xl font-bold mt-0 mb-1 sv-page-title">
              Market Overview
            </h1>
            <p
              className="mt-0 mb-0"
              style={{ fontSize: "0.8rem", color: "var(--sv-text-muted)" }}
            >
              <i
                className="pi pi-calendar mr-1"
                style={{ fontSize: "0.75rem" }}
              />
              {today}
            </p>
          </div>
          {/* Sentiment quick badges */}
          {!loadingFG && fearGreed && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <SentimentBadge
                label="Fear / Greed"
                value={fearGreed.fear_greed}
                getMeta={getSentimentMeta}
              />
              <SentimentBadge
                label="Technical"
                value={fearGreed.technical}
                getMeta={getTechMeta}
              />
            </div>
          )}
          {loadingFG && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Skeleton width="96px" height="64px" borderRadius="8px" />
              <Skeleton width="96px" height="64px" borderRadius="8px" />
            </div>
          )}
        </div>
        {/* Accent underline */}
        <div
          style={{
            height: 3,
            marginTop: "0.75rem",
            width: 64,
            background: "var(--sv-accent-gradient)",
            borderRadius: 2,
          }}
        />
      </div>

      {/* ════ Row 1: Asset Classes | Price Chart | Market Sentiment ════ */}
      <div className="grid mb-2">
        {/* 1. Asset Classes */}
        <div className="col-12 lg:col-4 p-1">
          <Panel title="Asset Classes" minH={300}>
            <TabView pt={{ root: { className: "sv-tabs" } }}>
              <TabPanel header="Indices">
                <LivePricesTable
                  columns={COLUMN_PRESETS.GENERIC}
                  symbolsURL={ASSET_URLS.indices}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="250px"
                />
              </TabPanel>
              <TabPanel header="Bonds">
                <LivePricesTable
                  columns={COLUMN_PRESETS.BONDS}
                  symbolsURL={ASSET_URLS.bonds}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="250px"
                />
              </TabPanel>
              <TabPanel header="Commodities">
                <LivePricesTable
                  columns={COLUMN_PRESETS.GENERIC}
                  symbolsURL={ASSET_URLS.commodities}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="250px"
                />
              </TabPanel>
              <TabPanel header="Cryptos">
                <LivePricesTable
                  columns={COLUMN_PRESETS.GENERIC}
                  symbolsURL={ASSET_URLS.cryptos}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="250px"
                />
              </TabPanel>
            </TabView>
          </Panel>
        </div>

        {/* 2. Price Chart */}
        <div className="col-12 lg:col-5 p-1">
          <Panel
            title={
              selectedSymbol
                ? `${selectedSymbol.name} — Price History`
                : "Price Chart"
            }
            minH={300}
          >
            <AssetLineChart symbols={[selectedSymbol?.symbol ?? null]} />
          </Panel>
        </div>

        {/* 3. Market Summary */}
        <div className="col-12 lg:col-3 p-1">
          <Panel title="Market Summary" minH={300}>
            <MarketSummaryWidget />
          </Panel>
        </div>
      </div>

      {/* ════ Row 2: Stock Highlights | Sector Performance | Market Map ════ */}
      <div className="grid mb-2">
        {/* 4. Stock Highlights */}
        <div className="col-12 lg:col-3 p-1">
          <Panel
            title="Stock Highlights"
            extra={
              <IndexDrop
                value={highlightsIndex}
                onChange={setHighlightsIndex}
              />
            }
            minH={280}
          >
            <TabView pt={{ root: { className: "sv-tabs" } }}>
              <TabPanel header="Top 10">
                <MarketDataTable
                  columns={COLUMN_PRESETS.PERFORMERS}
                  listURL={highlightsIndex.urls.top10}
                  scrollHeight="220px"
                />
              </TabPanel>
              <TabPanel header="Bottom 10">
                <MarketDataTable
                  columns={COLUMN_PRESETS.PERFORMERS}
                  listURL={highlightsIndex.urls.bottom10}
                  scrollHeight="220px"
                />
              </TabPanel>
              <TabPanel header="Most Active">
                <MarketDataTable
                  columns={COLUMN_PRESETS.MOST_ACTIVE}
                  listURL={highlightsIndex.urls.topActive}
                  scrollHeight="220px"
                />
              </TabPanel>
            </TabView>
          </Panel>
        </div>

        {/* 5. Sector Performance */}
        <div className="col-12 lg:col-5 p-1">
          <Panel
            title="Sector Performance"
            linkTo="/relative-absolute-analysis-sectors"
            minH={280}
          >
            <MarketDataTable
              columns={COLUMN_PRESETS.SECTORS}
              listURL="/sector/liveprices"
              showName
              scrollHeight="310px"
            />
          </Panel>
        </div>

        {/* 6. Market Map */}
        <div className="col-12 lg:col-4 p-1">
          <Panel
            title="Market Map"
            linkTo="/holdingsmap"
            extra={<IndexDrop value={mapIndex} onChange={setMapIndex} />}
            minH={280}
          >
            <MarketMapChart index={mapIndex} ct={ct} />
          </Panel>
        </div>
      </div>

      {/* ════ Row 3: RSI | Momentum | Relative Strength ════ */}
      <div className="grid mb-2">
        {/* 7. RSI */}
        <div className="col-12 lg:col-4 p-1">
          <Panel
            title="RSI — Relative Strength Index"
            extra={<IndexDrop value={rsiIndex} onChange={setRsiIndex} />}
            minH={200}
          >
            <TabView pt={{ root: { className: "sv-tabs" } }}>
              <TabPanel header="Top 10 Oversold">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RSI}
                  listURL={rsiIndex.urls.rsiOverSold10}
                  scrollHeight="180px"
                />
              </TabPanel>
              <TabPanel header="Top 10 Overbought">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RSI}
                  listURL={rsiIndex.urls.rsiOverBought10}
                  scrollHeight="180px"
                />
              </TabPanel>
            </TabView>
          </Panel>
        </div>

        {/* 8. Momentum (MACD) */}
        <div className="col-12 lg:col-4 p-1">
          <Panel
            title="Momentum (MACD)"
            extra={
              <IndexDrop value={momentumIndex} onChange={setMomentumIndex} />
            }
            minH={200}
          >
            <TabView pt={{ root: { className: "sv-tabs" } }}>
              <TabPanel header="Top 10 Increase">
                <MarketDataTable
                  columns={COLUMN_PRESETS.MACD}
                  listURL={momentumIndex.urls.momIncrease10}
                  scrollHeight="180px"
                />
              </TabPanel>
              <TabPanel header="Top 10 Decrease">
                <MarketDataTable
                  columns={COLUMN_PRESETS.MACD}
                  listURL={momentumIndex.urls.momDecrease10}
                  scrollHeight="180px"
                />
              </TabPanel>
            </TabView>
          </Panel>
        </div>

        {/* 9. Relative Strength */}
        <div className="col-12 lg:col-4 p-1">
          <Panel
            title="Relative Strength"
            extra={<IndexDrop value={rsIndex} onChange={setRsIndex} />}
            minH={200}
          >
            <TabView pt={{ root: { className: "sv-tabs" } }}>
              <TabPanel header="Outperformers">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RELATIVE_STRENGTH}
                  listURL={rsIndex.urls.rsOutperformers}
                  scrollHeight="180px"
                />
              </TabPanel>
              <TabPanel header="Underperformers">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RELATIVE_STRENGTH}
                  listURL={rsIndex.urls.rsUnderperformers}
                  scrollHeight="180px"
                />
              </TabPanel>
            </TabView>
          </Panel>
        </div>
      </div>

      {/* ════ Row 4: SimpleVisor Insights ════ */}
      <div className="grid mb-2">
        <div className="col-12 p-1">
          <Panel
            title="SimpleVisor Insights"
            linkTo="/insights/latest-insights"
            linkLabel="View More"
          >
            <InsightsStrip />
          </Panel>
        </div>
      </div>

      {/* ════ Row 5: Latest News | Fear/Greed Gauge | Technical Gauge ════ */}
      <div className="grid mb-2">
        {/* 11. Latest News */}
        <div className="col-12 lg:col-6 p-1">
          <Panel title="Latest News" minH={280}>
            <NewsTable />
          </Panel>
        </div>

        {/* 12. Fear / Greed Gauge */}
        <div className="col-12 md:col-6 lg:col-3 p-1">
          <Panel title="Fear / Greed" minH={280}>
            {loadingFG ? (
              <Skeleton height="200px" />
            ) : (
              <GaugeChart
                value={fearGreed?.fear_greed}
                title="Fear / Greed"
                ct={ct}
              />
            )}
            {!loadingFG && fearGreed && (
              <p
                style={{
                  fontSize: "0.62rem",
                  color: "var(--sv-text-muted)",
                  margin: "0.25rem 0 0",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {getSentimentMeta(fearGreed.fear_greed).label} — based on market
                breadth &amp; momentum signals
              </p>
            )}
          </Panel>
        </div>

        {/* 13. Technical Gauge */}
        <div className="col-12 md:col-6 lg:col-3 p-1">
          <Panel title="Technical" minH={280}>
            {loadingFG ? (
              <Skeleton height="200px" />
            ) : (
              <GaugeChart
                value={fearGreed?.technical}
                title="Technical"
                ct={ct}
              />
            )}
            {!loadingFG && fearGreed && (
              <p
                style={{
                  fontSize: "0.62rem",
                  color: "var(--sv-text-muted)",
                  margin: "0.25rem 0 0",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {getTechMeta(fearGreed.technical).label} — composite of MA,
                oscillator &amp; RSI signals
              </p>
            )}
          </Panel>
        </div>
      </div>

      {/* ════ Row 6: SV Core Portfolios | My Portfolios ════ */}
      <div className="grid mb-2">
        {/* 14. SV Core Portfolios */}
        <div className="col-12 lg:col-6 p-1">
          <Panel
            title="SV Core Portfolios"
            linkTo="/portfolioscombined"
            linkLabel="View All"
            minH={200}
          >
            <PortfolioSummaryTable
              portfolios={svPortfolios}
              loading={loadingSV}
            />
          </Panel>
        </div>

        {/* 15. My Portfolios */}
        <div className="col-12 lg:col-6 p-1">
          <Panel
            title="My Portfolios"
            linkTo="/portfolioscombined"
            linkLabel="View All"
            minH={200}
          >
            <PortfolioSummaryTable
              portfolios={userPortfolios}
              loading={loadingUser}
            />
          </Panel>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
