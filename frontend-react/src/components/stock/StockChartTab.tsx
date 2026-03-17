import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface StockChartTabProps {
  symbol: string;
}

const StockChartTab: React.FC<StockChartTabProps> = ({ symbol }) => {
  const { theme } = useTheme();

  const src = `https://www.tradingview.com/widgetembed/?frameElementId=tv_${symbol}&symbol=${symbol}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=${theme === "light" ? "light" : "dark"}&style=1&timezone=UTC&withdateranges=1&hideideas=1&locale=en`;

  return (
    <div className="border-1 surface-border border-round-xl overflow-hidden" style={{ width: "100%", height: 620 }}>
      <iframe
        key={`${symbol}-${theme}`}
        src={src}
        width="100%"
        height="100%"
        frameBorder={0}
        allowFullScreen
        title={`${symbol} TradingView Chart`}
      />
    </div>
  );
};

export default StockChartTab;
