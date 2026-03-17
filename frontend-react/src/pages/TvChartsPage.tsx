import React, { useState } from "react";
import TvChart from "@/components/common/TvChart";

const TvChartsPage: React.FC = () => {
  const [symbol] = useState(() => localStorage.getItem("currentSymbol") ?? "AAPL");

  const handleSymbolChange = (newSymbol: string) => {
    localStorage.setItem("currentSymbol", newSymbol);
  };

  return (
    <div className="sv-page-min-h">
      <div style={{ height: "calc(100vh - 80px)", margin: "-0.75rem" }}>
        <TvChart symbol={symbol} height="100%" onSymbolChange={handleSymbolChange} />
      </div>
    </div>
  );
};

export default TvChartsPage;
