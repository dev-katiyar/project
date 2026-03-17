import React from "react";
import TvChart from "@/components/common/TvChart";

interface StockChartTabProps {
  symbol: string;
}

const StockChartTab: React.FC<StockChartTabProps> = ({ symbol }) => (
  <TvChart symbol={symbol} height="620px" />
);

export default StockChartTab;
