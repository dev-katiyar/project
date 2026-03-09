import { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

/* ── Initialize HighchartsMore (gauge support) ───────────────────────────── */

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

/* ── Chart theme ─────────────────────────────────────────────────────────── */

interface ChartTheme {
  bg: string;
  label: string;
}

const CHART_THEME: Record<ThemeName, ChartTheme> = {
  dark: { bg: "transparent", label: "#7a8da8" },
  dim: { bg: "transparent", label: "#7a92b8" },
  light: { bg: "transparent", label: "#4a5e78" },
};

/* ── GaugeChart ──────────────────────────────────────────────────────────── */

interface GaugeChartProps {
  value?: number;
  title: string;
  startLabel?: string;
  endLabel?: string;
}

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  title,
  startLabel,
  endLabel,
}) => {
  const { theme } = useTheme();
  const ct = CHART_THEME[theme] ?? CHART_THEME.dim;
  const val = value ?? 0;

  const zoneColor =
    val >= 75
      ? "#22c55e"
      : val >= 55
        ? "#86efac"
        : val >= 45
          ? "#f5a623"
          : val >= 25
            ? "#f97316"
            : "#ef4444";

  const options = useMemo(
    (): Highcharts.Options => ({
      chart: {
        type: "gauge",
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
        max: 100,
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: undefined,
        tickPositions: [0, 100],
        labels: {
          y: 16,
          style: { fontSize: "0.9rem", color: ct.label },
          formatter() {
            if (this.value === 0) return startLabel ?? "0";
            if (this.value === 100) return endLabel ?? "100";
            return "";
          },
        },
        plotBands: [
          {
            from: 0,
            to: 25,
            color: "#ef4444aa",
            innerRadius: "60%",
            outerRadius: "100%",
          },
          {
            from: 25,
            to: 45,
            color: "#f97316aa",
            innerRadius: "60%",
            outerRadius: "100%",
          },
          {
            from: 45,
            to: 55,
            color: "#f5a623aa",
            innerRadius: "60%",
            outerRadius: "100%",
          },
          {
            from: 55,
            to: 75,
            color: "#86efacaa",
            innerRadius: "60%",
            outerRadius: "100%",
          },
          {
            from: 75,
            to: 100,
            color: "#22c55eaa",
            innerRadius: "60%",
            outerRadius: "100%",
          },
        ],
      },
      plotOptions: {
        gauge: {
          dataLabels: { enabled: false },
          dial: {
            radius: "80%",
            backgroundColor: zoneColor,
            borderWidth: 0,
            baseWidth: 6,
            topWidth: 1,
            baseLength: "0%",
            rearLength: "10%",
          },
          pivot: {
            radius: 4,
            backgroundColor: zoneColor,
          },
        },
      },
      series: [
        {
          type: "gauge" as const,
          name: title,
          data: [val],
        },
      ],
      tooltip: { enabled: false },
      credits: { enabled: false },
      legend: { enabled: false },
    }),
    [val, ct, title, zoneColor, startLabel, endLabel],
  );

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default GaugeChart;
