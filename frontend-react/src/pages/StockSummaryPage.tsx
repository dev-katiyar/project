import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import StockDetailPanel from "@/components/stock/StockDetailPanel";

const StockSummaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbol = searchParams.get("symbol") ?? "AAPL";

  // Keep localStorage in sync when arriving via URL
  useEffect(() => {
    localStorage.setItem("currentSymbol", symbol);
  }, [symbol]);

  return (
    <StockDetailPanel
      symbol={symbol}
      onSymbolChange={(s) => setSearchParams({ symbol: s })}
    />
  );
};

export default StockSummaryPage;
