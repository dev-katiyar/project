import React, { useState, useEffect } from "react";
import { MultiSelect } from "primereact/multiselect";
import AssetLineChart from "@/components/common/AssetLineChart";
import {
  type SymbolData,
  getRawPct,
  getPrice,
  fmtPrice,
  fmtPct,
  gainColor,
} from "@/components/watchlist/WatchlistTickerTable";

interface Props {
  /** All symbols available in the watchlist */
  symbols: string[];
  /** Full symbol data for mini price cards */
  symbolData: SymbolData[];
}

const WatchlistPerformanceChart: React.FC<Props> = ({ symbols, symbolData }) => {
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

      {/* Mini price cards for the symbols currently charted */}
      {chartSymbols.length > 0 && (
        <div className="grid mb-4 gap-2">
          {chartSymbols.map((sym) => {
            const d = symbolData.find((s) => s.symbol === sym);
            if (!d) return null;
            const pct = getRawPct(d);
            return (
              <div key={sym} className="col-6 lg:col-3 xl:col-2 p-0">
                <div
                  className="surface-overlay border-round-lg p-3 text-center"
                  style={{
                    border: "1px solid var(--sv-border)",
                    borderTop: `3px solid ${
                      pct == null
                        ? "var(--sv-border)"
                        : pct > 0
                          ? "var(--sv-gain)"
                          : "var(--sv-loss)"
                    }`,
                  }}
                >
                  <div
                    className="font-bold sv-text-accent mb-1"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {sym}
                  </div>
                  <div
                    className="font-bold text-color"
                    style={{ fontSize: "1rem" }}
                  >
                    {fmtPrice(getPrice(d))}
                  </div>
                  <div
                    className="font-bold"
                    style={{ fontSize: "0.78rem", color: gainColor(pct) }}
                  >
                    {fmtPct(pct)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historical line chart */}
      <AssetLineChart symbols={chartSymbols} height={380} filled={false} />
    </div>
  );
};

export default WatchlistPerformanceChart;
