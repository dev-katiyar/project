import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsTreemapModule from "highcharts/modules/treemap";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeName } from "@/contexts/ThemeContext";

/* ── Initialize treemap module once ─────────────────────────────────────── */

(function initTreemap() {
  const fn =
    typeof (HighchartsTreemapModule as any).default === "function"
      ? (HighchartsTreemapModule as any).default
      : typeof HighchartsTreemapModule === "function"
        ? HighchartsTreemapModule
        : null;
  if (fn) fn(Highcharts);
})();

/* ── Types ───────────────────────────────────────────────────────────────── */

interface TreemapRow {
  symbol: string;
  priceChangePct: number;
  sectorName: string;
  marketCap?: number;
}

interface ChartTheme {
  bg: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: {
    bg: "transparent",
    tooltipBg: "#0d1220",
    tooltipBorder: "#1c2840",
    tooltipText: "#e8edf5",
  },
  dim: {
    bg: "transparent",
    tooltipBg: "#162038",
    tooltipBorder: "#283a5c",
    tooltipText: "#d8e0f0",
  },
  light: {
    bg: "transparent",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0d1425",
  },
};

/* ── Color helpers (matches Angular reference approach) ──────────────────── */

const MIN_RED = 255, MAX_RED = 100;
const MIN_GREEN = 230, MAX_GREEN = 100;

function computeColor(pct: number, minChange: number, maxChange: number): string {
  if (pct < 0) {
    const colNum = Math.round(MIN_RED - (pct / minChange) * (MIN_RED - MAX_RED));
    return `rgb(${colNum},0,0)`;
  }
  if (pct > 0) {
    const colNum = Math.round(MIN_GREEN - (pct / maxChange) * (MIN_GREEN - MAX_GREEN));
    return `rgb(0,${colNum},0)`;
  }
  return "rgb(80,80,80)";
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface MarketMapChartProps {
  /** API endpoint that returns TreemapRow[] */
  dataUrl: string;
  height?: number;
}

const MarketMapChart: React.FC<MarketMapChartProps> = ({
  dataUrl,
  height = 290,
}) => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme] ?? CHART_THEME.dim;

  const [rows, setRows] = useState<TreemapRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows(null);
    api
      .get<TreemapRow[]>(dataUrl)
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
  }, [dataUrl]);

  const options = useMemo((): Highcharts.Options => {
    if (!rows?.length) return {};

    // Compute min/max for color scaling
    let minChange = -0.00001;
    let maxChange = 0.00001;
    for (const row of rows) {
      if (row.priceChangePct < minChange) minChange = row.priceChangePct;
      if (row.priceChangePct > maxChange) maxChange = row.priceChangePct;
    }

    const sectors = [...new Set(rows.map((d) => d.sectorName))];
    const sectorPoints = sectors.map((s) => ({
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
    }));

    const stockPoints = rows.map((d) => ({
      name: d.symbol,
      value: Math.abs(d.marketCap ?? 1000),
      color: computeColor(d.priceChangePct ?? 0, minChange, maxChange),
      parent: d.sectorName,
      custom: { pct: d.priceChangePct ?? 0 },
    }));

    return {
      chart: {
        backgroundColor: ct.bg,
        height,
        spacing: [2, 2, 2, 2],
      },
      title: { text: undefined },
      subtitle: { text: undefined },
      series: [
        {
          type: "treemap" as any,
          layoutAlgorithm: "squarified",
          allowDrillToNode: true as any,
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
              if (pct == null) return pt.name;
              const sign = pct >= 0 ? "+" : "";
              return `${pt.name}<br><span style="font-weight:400">${sign}${pct.toFixed(2)}%</span>`;
            },
          },
          levels: [
            {
              level: 1,
              dataLabels: { enabled: true },
              borderWidth: 3,
            },
          ] as any,
          data: [...sectorPoints, ...stockPoints],
        },
      ],
      tooltip: {
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        style: { color: ct.tooltipText },
        formatter(this: any) {
          const pt = this.point;
          if (!pt?.parent) return `<b>${pt.name}</b>`;
          const pct = pt.custom?.pct ?? 0;
          const sign = pct >= 0 ? "+" : "";
          const cap = pt.value;
          const capStr =
            cap > 1e9
              ? `${Math.floor(cap / 1e9).toLocaleString()}B`
              : cap > 1e6
                ? `${Math.floor(cap / 1e6).toLocaleString()}M`
                : cap.toLocaleString();
          return `<b>${pt.name}</b><br>Sector: ${pt.parent}<br>Change: ${sign}${pct.toFixed(2)}%<br>Market Cap: ${capStr}`;
        },
      },
      credits: { enabled: false },
      accessibility: { enabled: false },
      legend: { enabled: false },
    };
  }, [rows, ct, height]);

  if (loading) return <Skeleton height={`${height}px`} />;

  if (!rows?.length) {
    return (
      <div
        style={{
          height,
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
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default MarketMapChart;
