import React, { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Augment window to expose TradingView and Datafeeds globals loaded via script tags
declare global {
  interface Window {
    TradingView: {
      widget: new (options: Record<string, unknown>) => ITvWidget;
    };
    Datafeeds: {
      UDFCompatibleDatafeed: new (url: string, timeout?: number) => unknown;
    };
  }
}

interface ITvWidget {
  onChartReady(cb: () => void): void;
  activeChart(): {
    symbol(): string;
    onSymbolChanged(): { subscribe(ctx: null, cb: () => void): void };
    setSymbol(symbol: string, cb: () => void): void;
    resetData(): void;
    createStudy(
      name: string,
      forceOverlay?: boolean,
      lock?: boolean,
      inputs?: unknown[]
    ): Promise<unknown>;
  };
  layoutName(): string | null;
  remove(): void;
}

const DATAFEED_URL = "/api/tv";
const LIBRARY_PATH = "/charting_library/";
const CLIENT_ID = "simplevisor.com";

const TIME_FRAMES = [
  { text: "1M", resolution: "1D", description: "1 Month", title: "1M" },
  { text: "3M", resolution: "1D", description: "3 Months", title: "3M" },
  { text: "6M", resolution: "1D", description: "6 Months", title: "6M" },
  { text: "1Y", resolution: "1D", description: "1 Year", title: "1Y" },
  { text: "5Y", resolution: "1W", description: "5 Years", title: "5Y" },
  { text: "50Y", resolution: "3M", description: "50 Years", title: "All" },
];

const TvChartsPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ITvWidget | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!containerRef.current) return;
    if (!window.TradingView || !window.Datafeeds) return;

    const userId = user?.userId ?? "sv_unknown_user";
    const symbol = localStorage.getItem("currentSymbol") ?? "AAPL";

    const widgetOptions = {
      symbol,
      datafeed: new window.Datafeeds.UDFCompatibleDatafeed(
        DATAFEED_URL,
        10000 * 1000
      ),
      interval: "D",
      container: containerRef.current,
      library_path: LIBRARY_PATH,
      locale: "en",
      disabled_features: ["use_localstorage_for_settings"],
      enabled_features: ["study_templates"],
      charts_storage_url: "https://saveload.tradingview.com",
      charts_storage_api_version: "1.1",
      load_last_chart: true,
      client_id: CLIENT_ID,
      user_id: userId,
      fullscreen: false,
      autosize: true,
      time_frames: TIME_FRAMES,
      debug: false,
      studies_overrides: {
        "moving average.plot.color": "#000000",
      },
    };

    const tvWidget = new window.TradingView.widget(widgetOptions);
    widgetRef.current = tvWidget;

    tvWidget.onChartReady(() => {
      tvWidget.activeChart().onSymbolChanged().subscribe(null, () => {
        const newSymbol = tvWidget.activeChart().symbol();
        localStorage.setItem("currentSymbol", newSymbol);
      });

      if (!tvWidget.layoutName()) {
        tvWidget.activeChart().createStudy("Moving Average", false, false, [200]);
        tvWidget.activeChart().createStudy("Bollinger Bands", false, false, [50]);
        tvWidget.activeChart().createStudy("MACD");
      }
    });

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
        widgetRef.current = null;
      }
    };
  }, [user]);

  return (
    <div className="sv-page-min-h">
      <div
        ref={containerRef}
        id="tv_chart_container"
        style={{ height: "calc(100vh - 80px)", margin: "-0.75rem" }}
      />
    </div>
  );
};

export default TvChartsPage;