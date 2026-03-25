import React, { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

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
const LIBRARY_PATH = `${import.meta.env.BASE_URL}charting_library/`;
const CLIENT_ID = "simplevisor.com";

const TIME_FRAMES = [
  { text: "1M", resolution: "1D", description: "1 Month",  title: "1M"  },
  { text: "3M", resolution: "1D", description: "3 Months", title: "3M"  },
  { text: "6M", resolution: "1D", description: "6 Months", title: "6M"  },
  { text: "1Y", resolution: "1D", description: "1 Year",   title: "1Y"  },
  { text: "5Y", resolution: "1W", description: "5 Years",  title: "5Y"  },
  { text: "50Y", resolution: "3M", description: "50 Years", title: "All" },
];

const TV_THEME_CONFIG: Record<
  ThemeName,
  { theme: "Dark" | "Light"; toolbar_bg: string; overrides: Record<string, string> }
> = {
  dark: {
    theme: "Dark",
    toolbar_bg: "#0d1220",
    overrides: {
      "paneProperties.background": "#121a2e",
      "paneProperties.backgroundType": "solid",
      "paneProperties.vertGridProperties.color": "#1c2840",
      "paneProperties.horzGridProperties.color": "#1c2840",
      "scalesProperties.textColor": "#7a8da8",
      "scalesProperties.backgroundColor": "#121a2e",
    },
  },
  dim: {
    theme: "Dark",
    toolbar_bg: "#162038",
    overrides: {
      "paneProperties.background": "#1c2945",
      "paneProperties.backgroundType": "solid",
      "paneProperties.vertGridProperties.color": "#283a5c",
      "paneProperties.horzGridProperties.color": "#283a5c",
      "scalesProperties.textColor": "#7a92b8",
      "scalesProperties.backgroundColor": "#1c2945",
    },
  },
  light: {
    theme: "Light",
    toolbar_bg: "#ffffff",
    overrides: {
      "paneProperties.background": "#ffffff",
      "paneProperties.backgroundType": "solid",
      "paneProperties.vertGridProperties.color": "#dfe7f5",
      "paneProperties.horzGridProperties.color": "#dfe7f5",
      "scalesProperties.textColor": "#4a5e78",
      "scalesProperties.backgroundColor": "#ffffff",
    },
  },
};

interface TvChartProps {
  symbol: string;
  height?: string;
  onSymbolChange?: (symbol: string) => void;
}

const TvChart: React.FC<TvChartProps> = ({
  symbol,
  height = "calc(100vh - 80px)",
  onSymbolChange,
}) => {
  const containerRef   = useRef<HTMLDivElement>(null);
  const widgetRef      = useRef<ITvWidget | null>(null);
  const chartReadyRef  = useRef(false);
  // Keep a ref so the init effect always reads the latest symbol without re-running
  const symbolRef      = useRef(symbol);
  const { user }       = useAuth();
  const { theme }      = useTheme();

  useEffect(() => { symbolRef.current = symbol; }, [symbol]);

  // ── Initialize / reinitialize widget when user or theme changes ──────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (!window.TradingView || !window.Datafeeds) return;

    chartReadyRef.current = false;
    const tvConfig = TV_THEME_CONFIG[theme];

    const tvWidget = new window.TradingView.widget({
      symbol: symbolRef.current,
      datafeed: new window.Datafeeds.UDFCompatibleDatafeed(DATAFEED_URL, 10_000_000),
      interval: "D",
      container: containerRef.current,
      library_path: LIBRARY_PATH,
      locale: "en",
      theme: tvConfig.theme,
      toolbar_bg: tvConfig.toolbar_bg,
      overrides: tvConfig.overrides,
      disabled_features: ["use_localstorage_for_settings"],
      enabled_features: ["study_templates"],
      charts_storage_url: "https://saveload.tradingview.com",
      charts_storage_api_version: "1.1",
      load_last_chart: true,
      client_id: CLIENT_ID,
      user_id: user?.userId ?? "sv_unknown_user",
      fullscreen: false,
      autosize: true,
      time_frames: TIME_FRAMES,
      debug: false,
      studies_overrides: { "moving average.plot.color": "#000000" },
    });

    widgetRef.current = tvWidget;

    tvWidget.onChartReady(() => {
      chartReadyRef.current = true;

      tvWidget.activeChart().onSymbolChanged().subscribe(null, () => {
        onSymbolChange?.(tvWidget.activeChart().symbol());
      });

      if (!tvWidget.layoutName()) {
        tvWidget.activeChart().createStudy("Moving Average", false, false, [200]);
        tvWidget.activeChart().createStudy("Bollinger Bands", false, false, [50]);
        tvWidget.activeChart().createStudy("MACD");
      }
    });

    return () => {
      chartReadyRef.current = false;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  }, [user, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync symbol prop changes to an already-running widget ────────────────
  useEffect(() => {
    if (!chartReadyRef.current || !widgetRef.current) return;
    widgetRef.current.activeChart().setSymbol(symbol, () => {});
  }, [symbol]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
};

export default TvChart;
