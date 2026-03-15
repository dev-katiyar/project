import React, { useState, useEffect, useMemo, useCallback } from "react";
import Highcharts from "highcharts";
import { SelectButton } from "primereact/selectbutton";
import { Skeleton } from "primereact/skeleton";
import { Card } from "primereact/card";
import api from "@/services/api";
import ReturnsChart, {
  getSeriesColor,
} from "@/components/portfolio/charts/ReturnsChart";
import PortfolioGrowthChart from "@/components/portfolio/charts/PortfolioGrowthChart";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "yearly" | "quarterly" | "monthly";

interface PerfRow {
  [key: string]: string | number;
}

interface PerfData {
  names: string[];
  yearly?: PerfRow[];
  quarterly?: PerfRow[];
  monthly?: PerfRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_COL: Record<Frequency, string> = {
  yearly: "year",
  quarterly: "quarter",
  monthly: "month",
};

function buildChartData(
  rows: PerfRow[] | undefined,
  names: string[],
  catCol: string,
): { categories: string[]; series: Highcharts.SeriesColumnOptions[] } {
  if (!rows || rows.length === 0) return { categories: [], series: [] };

  const categories = rows.map((r) => String(r[catCol] ?? ""));
  const series: Highcharts.SeriesColumnOptions[] = names.map((name) => ({
    type: "column",
    name,
    color: getSeriesColor(name),
    data: rows.map((r) => {
      const val = Number(r[name] ?? 0);
      return { y: Number(val.toFixed(2)) };
    }),
  }));

  return { categories, series };
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  portfolioId: number | string;
  portfolioName?: string;
  active: boolean;
}

const PerformanceTab: React.FC<Props> = ({
  portfolioId,
  portfolioName,
  active,
}) => {
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("quarterly");

  const loadPerf = useCallback(async () => {
    if (perfData || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/modelportfolio/performance/${portfolioId}`);
      setPerfData(res.data);
    } catch {
      setError("Failed to load performance data.");
    } finally {
      setLoading(false);
    }
  }, [portfolioId, perfData, loading]);

  useEffect(() => {
    if (active) loadPerf();
  }, [active, loadPerf]);

  const freqOptions = [
    { label: "Yearly", value: "yearly" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Monthly", value: "monthly" },
  ];

  const chartData = useMemo(() => {
    if (!perfData) return { categories: [], series: [] };
    const rows = perfData[frequency];
    const catCol = FREQ_COL[frequency];
    return buildChartData(rows, perfData.names ?? [], catCol);
  }, [perfData, frequency]);

  return (
    <div className="p-3">
      {/* Portfolio Growth: historical line chart with period selector */}
      <div className="mb-4">
        <PortfolioGrowthChart
          portfolioId={portfolioId}
          portfolioName={portfolioName}
          active={active}
        />
      </div>

      <div
        className="mb-3"
        style={{ borderTop: "1px solid var(--sv-border)" }}
      />

      {/* Periodic Returns: column chart by frequency */}
      <div className="flex align-items-center gap-2">
        <i
          className="pi pi-chart-bar"
          style={{ color: "var(--sv-accent)", fontSize: "1rem" }}
        />
        <span
          className="font-bold"
          style={{ fontSize: "0.95rem", color: "var(--sv-text-primary)" }}
        >
          Periodic Returns
        </span>
      </div>

      {loading && (
        <>
          <Skeleton
            height="2.5rem"
            width="240px"
            className="mb-3"
            borderRadius="8px"
          />
          <Skeleton height="320px" borderRadius="8px" />
        </>
      )}

      {error && !loading && (
        <div className="sv-alert-error border-round p-4 flex flex-column align-items-center gap-2 text-center">
          <i className="pi pi-exclamation-triangle text-2xl" />
          <p className="m-0">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Frequency selector */}
          <div className="flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
            <div className="sv-info-label font-bold text-sm flex align-items-center"></div>
            <SelectButton
              value={frequency}
              onChange={(e) => e.value && setFrequency(e.value as Frequency)}
              options={freqOptions}
              optionLabel="label"
              optionValue="value"
              pt={{
                button: {
                  style: { padding: "0.25rem 0.75rem", fontSize: "0.75rem" },
                },
              }}
            />
          </div>

          <Card className="p-2">
            <ReturnsChart
              categories={chartData.categories}
              series={chartData.series}
              title={frequency}
            />
          </Card>

          {/* Benchmark legend note */}
          {perfData?.names && perfData.names.length > 1 && (
            <div
              className="text-center sv-text-muted mt-2"
              style={{ fontSize: "0.72rem" }}
            >
              Benchmarks: {perfData.names.slice(1).join(", ")}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceTab;
