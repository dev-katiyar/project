import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTheme } from "@/contexts/ThemeContext";
import { getSeriesColor, darkenColor } from "@/components/portfolio/charts/chartColors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReturnsChartProps {
  categories: string[];
  series: Highcharts.SeriesColumnOptions[];
  title: string;
}

export { getSeriesColor };

// ─── Chart theme ──────────────────────────────────────────────────────────────

const CHART_BG: Record<string, { bg: string; grid: string; text: string; tooltip: string }> = {
  dark:  { bg: "transparent", grid: "#1c2840", text: "#7a8da8", tooltip: "#07090f" },
  dim:   { bg: "transparent", grid: "#223354", text: "#7a92b8", tooltip: "#0f1729" },
  light: { bg: "transparent", grid: "#e5e7eb", text: "#4a5568", tooltip: "#ffffff" },
};

// ─── Component ────────────────────────────────────────────────────────────────

const ReturnsChart: React.FC<ReturnsChartProps> = ({ categories, series, title }) => {
  const { theme } = useTheme();
  const cc = CHART_BG[theme] ?? CHART_BG.dark;

  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "column",
        backgroundColor: cc.bg,
        height: 320,
        style: { fontFamily: "inherit" },
      },
      title: { text: "" },
      xAxis: {
        categories,
        labels: {
          style: { color: cc.text, fontSize: "0.72rem" },
          rotation: categories.length > 12 ? -45 : 0,
        },
        lineColor: cc.grid,
        tickColor: cc.grid,
      },
      yAxis: {
        title: {
          text: "Return (%)",
          style: { color: cc.text, fontSize: "0.75rem" },
        },
        labels: {
          format: "{value}%",
          style: { color: cc.text, fontSize: "0.72rem" },
        },
        gridLineColor: cc.grid,
        plotLines: [
          {
            color: cc.grid,
            width: 1,
            value: 0,
            zIndex: 4,
          },
        ],
      },
      legend: {
        itemStyle: { color: cc.text, fontSize: "0.78rem", fontWeight: "normal" },
        enabled: series.length > 1,
      },
      tooltip: {
        backgroundColor: cc.tooltip,
        style: { color: "#cdd8ee", fontSize: "0.8rem" },
        shared: true,
        valueSuffix: "%",
      },
      plotOptions: {
        column: {
          borderRadius: 3,
          groupPadding: 0.1,
          pointPadding: 0.05,
        },
      },
      series: series.map(s => ({
        ...s,
        negativeColor: darkenColor((s.color as string) || getSeriesColor(s.name ?? "")),
      })),
      credits: { enabled: false },
    }),
    [categories, series, cc],
  );

  if (!categories.length) {
    return (
      <div
        className="flex align-items-center justify-content-center sv-text-muted text-sm"
        style={{ height: "320px" }}
      >
        No {title.toLowerCase()} data available
      </div>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default ReturnsChart;
