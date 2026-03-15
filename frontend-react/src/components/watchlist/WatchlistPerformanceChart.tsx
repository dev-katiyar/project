import React, { useState, useEffect } from "react";
import { MultiSelect } from "primereact/multiselect";
import AssetLineChart from "@/components/common/AssetLineChart";

interface Props {
  /** All symbols available in the watchlist */
  symbols: string[];
}

const WatchlistPerformanceChart: React.FC<Props> = ({ symbols }) => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [chartSymbols, setChartSymbols] = useState<string[]>([]);

  // Re-initialise to first 5 whenever the watchlist symbols change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initial = symbols.slice(0, Math.min(5, symbols.length));
    setSelectedSymbols(initial);
    setChartSymbols(initial);
  }, [symbols.join(",")]);

  const symbolOptions = symbols.map((s) => ({ label: s, value: s }));

  // Only update the chart when the dropdown is closed (mirrors Angular onPanelHide)
  const handlePanelHide = () => {
    setChartSymbols([...selectedSymbols]);
  };

  return (
    <div className="p-3">
      {/* Symbol selector */}
      <div className="flex align-items-center gap-3 mb-4 flex-wrap">
        <label className="font-bold white-space-nowrap text-color-secondary text-sm">
          Select symbols for chart (max 10):
        </label>
        <MultiSelect
          value={selectedSymbols}
          options={symbolOptions}
          onChange={(e) => setSelectedSymbols(e.value)}
          onHide={handlePanelHide}
          selectionLimit={10}
          placeholder="Select symbols for chart (max 10)"
          display="chip"
          filter
          filterPlaceholder="Search symbols"
          showSelectAll
          style={{ flex: 1, minWidth: "220px" }}
        />
      </div>

      {/* Historical line chart */}
      <AssetLineChart symbols={chartSymbols} height={380} filled={false} />
    </div>
  );
};

export default WatchlistPerformanceChart;
