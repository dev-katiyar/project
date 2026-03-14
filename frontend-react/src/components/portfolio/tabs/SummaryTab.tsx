import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Card } from "primereact/card";
import { useTheme } from "@/contexts/ThemeContext";
import { type PortfolioDetails } from "@/components/portfolio/PortfolioDetailPanel";

// ─── Chart theme colors ────────────────────────────────────────────────────────

const CHART_BG: Record<string, { bg: string; text: string; tooltip: string }> = {
  dark:  { bg: "transparent", text: "#7a8da8", tooltip: "#07090f" },
  dim:   { bg: "transparent", text: "#7a92b8", tooltip: "#0f1729" },
  light: { bg: "transparent", text: "#4a5568", tooltip: "#ffffff" },
};

const PIE_COLORS = [
  "#4f8ef7", "#34d399", "#f59e0b", "#a78bfa",
  "#f87171", "#38bdf8", "#fb923c", "#818cf8",
  "#2dd4bf", "#facc15", "#c084fc", "#6ee7b7",
];

// ─── Pie chart wrapper ────────────────────────────────────────────────────────

const PieChart: React.FC<{
  title: string;
  data: { name: string; percentage: number }[];
}> = ({ title, data }) => {
  const { theme } = useTheme();
  const cc = CHART_BG[theme] ?? CHART_BG.dark;

  const options = useMemo<Highcharts.Options>(() => ({
    chart: {
      type: "pie",
      backgroundColor: cc.bg,
      height: 260,
      margin: [10, 10, 10, 10],
      style: { fontFamily: "inherit" },
    },
    title: { text: "" },
    tooltip: {
      backgroundColor: cc.tooltip,
      style: { color: "#fff", fontSize: "0.8rem" },
      pointFormat: "<b>{point.name}</b>: {point.percentage:.1f}%",
    },
    legend: {
      enabled: true,
      itemStyle: { color: cc.text, fontSize: "0.75rem", fontWeight: "normal" },
      maxHeight: 80,
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        colors: PIE_COLORS,
        dataLabels: {
          enabled: true,
          format: "{point.percentage:.0f}%",
          style: { color: cc.text, fontSize: "0.7rem", fontWeight: "normal", textOutline: "none" },
          distance: 12,
        },
        showInLegend: true,
        borderWidth: 0,
        innerSize: "40%",
      },
    },
    series: [{
      type: "pie",
      name: title,
      data: data.map((d) => ({ name: d.name, y: d.percentage })),
    }],
    credits: { enabled: false },
  }), [data, cc, title]);

  if (!data || data.length === 0) {
    return (
      <div className="flex align-items-center justify-content-center sv-text-muted text-sm" style={{ height: "260px" }}>
        No data available
      </div>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────

const SummaryTab: React.FC<{ details: PortfolioDetails }> = ({ details }) => {
  const { composition_by_asset, composition_by_sector } = details;

  return (
    <div className="grid m-0 p-3" style={{ gap: "1rem" }}>

      {/* Asset allocation */}
      <div className="col-12 md:col-6 p-0">
        <Card>
          <div className="sv-info-label font-bold text-xs mb-2 flex align-items-center justify-content-center">
            <i className="pi pi-chart-pie mr-2" />
            Asset Allocation
          </div>
          <PieChart title="Assets" data={composition_by_asset ?? []} />
        </Card>
      </div>

      {/* Sector allocation */}
      <div className="col-12 md:col-6 p-0">
        <Card>
          <div className="sv-info-label font-bold text-xs mb-2 flex align-items-center justify-content-center">
            <i className="pi pi-th-large mr-2" />
            Sector Allocation
          </div>
          <PieChart title="Sectors" data={composition_by_sector ?? []} />
        </Card>
      </div>

    </div>
  );
};

export default SummaryTab;
