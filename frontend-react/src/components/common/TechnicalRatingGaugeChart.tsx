import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import { Skeleton } from "primereact/skeleton";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

/* ── Init HighchartsMore (gauge support) ─────────────────────────────────── */

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

/* ── Theme ───────────────────────────────────────────────────────────────── */

interface ChartTheme {
  bg: string;
  label: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: { bg: "transparent", label: "#7a8da8" },
  dim: { bg: "transparent", label: "#7a92b8" },
  light: { bg: "transparent", label: "#4a5e78" },
};

/* ── Single gradient arc band: red (left) → green (right) ───────────────── */

const GRADIENT_BANDS: Highcharts.YAxisPlotBandsOptions[] = [
  {
    from: 0,
    to: 10,
    color: {
      linearGradient: { x1: 0, y1: 0, x2: 1, y2: 0 },
      stops: [
        [0, "hsl(0, 75%, 50%)"],
        [0.25, "hsl(30, 75%, 50%)"],
        [0.5, "hsl(60, 75%, 50%)"],
        [0.75, "hsl(90, 75%, 50%)"],
        [1, "hsl(120, 75%, 50%)"],
      ],
    } as unknown as string,
    innerRadius: "60%",
    outerRadius: "100%",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function accentColor(v: number): string {
  const hue = Math.round((Math.min(Math.max(v, 0), 10) / 10) * 120);
  return `hsl(${hue}, 82%, 44%)`;
}

function getRatingText(v: number): string {
  if (v >= 8) return "Very Strong";
  if (v >= 6) return "Strong";
  if (v >= 4) return "Neutral";
  if (v >= 2) return "Weak";
  return "Very Weak";
}

/* ── Component ───────────────────────────────────────────────────────────── */

interface TechnicalRatingGaugeChartProps {
  /** Numeric score 0–10 from the API */
  value?: number;
  /** Text label e.g. "Strong Buy" from the API */
  rating?: string;
  loading?: boolean;
  /** Label shown at the min (left) end of the arc */
  minLabel?: string;
  /** Label shown at the max (right) end of the arc */
  maxLabel?: string;
}

const TechnicalRatingGaugeChart: React.FC<TechnicalRatingGaugeChartProps> = ({
  value,
  rating,
  loading,
  minLabel = "Very Weak",
  maxLabel = "Very Strong",
}) => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme] ?? CHART_THEME.dim;

  const val = Math.min(Math.max(value ?? 5, 0), 10);
  const color = accentColor(val);
  const label = rating ?? (value != null ? getRatingText(val) : "");

  const options = useMemo(
    (): Highcharts.Options => ({
      chart: {
        type: "gauge",
        backgroundColor: ct.bg,
        height: 150,
        spacing: [0, 0, 0, 0],
        style: { fontFamily: "inherit" },
      },
      title: { text: undefined },
      pane: {
        center: ["50%", "85%"],
        size: "155%",
        startAngle: -90,
        endAngle: 90,
        background: [
          {
            backgroundColor: "transparent",
            innerRadius: "60%",
            outerRadius: "100%",
            shape: "arc",
            borderColor: "transparent",
          },
        ],
      },
      yAxis: {
        min: 0,
        max: 10,
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: undefined,
        tickPositions: [0, 10],
        labels: {
          y: 16,
          style: { fontSize: "0.78rem", color: ct.label },
          formatter() {
            if (this.value === 0) return minLabel;
            if (this.value === 10) return maxLabel;
            return "";
          },
        },
        plotBands: GRADIENT_BANDS,
      },
      plotOptions: {
        gauge: {
          dataLabels: { enabled: false },
          dial: {
            radius: "80%",
            backgroundColor: color,
            borderWidth: 0,
            baseWidth: 6,
            topWidth: 1,
            baseLength: "0%",
            rearLength: "10%",
          },
          pivot: {
            radius: 5,
            backgroundColor: color,
          },
        },
      },
      series: [
        {
          type: "gauge" as const,
          name: "Technical Rating",
          data: [val],
        },
      ],
      tooltip: { enabled: false },
      credits: { enabled: false },
      accessibility: { enabled: false },
      legend: { enabled: false },
    }),
    [val, color, ct, minLabel, maxLabel],
  );

  if (loading) {
    return <Skeleton height="185px" borderRadius="8px" />;
  }

  if (value == null) {
    return (
      <p className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
        No data available
      </p>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ style: { width: "100%" } }}
      />
      {label && (
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color, lineHeight: 1 }}>
          {label}
        </div>
      )}
      <div style={{ fontSize: "0.72rem", color: ct.label, marginTop: 3 }}>
        {val.toFixed(1)} / 10
      </div>
    </div>
  );
};

export default TechnicalRatingGaugeChart;
