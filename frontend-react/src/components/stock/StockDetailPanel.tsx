import React, { useState, useEffect, useRef } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Tag } from "primereact/tag";
import api from "@/services/api";
import StockOverviewTab from "@/components/stock/StockOverviewTab";
import StockChartTab from "@/components/stock/StockChartTab";
import StockTechnicalsTab from "@/components/stock/StockTechnicalsTab";
import StockNewsTab from "@/components/stock/StockNewsTab";
import StockFundamentalsTab from "@/components/stock/StockFundamentalsTab";
import StockShortInterestTab from "@/components/stock/StockShortInterestTab";
import StockInsiderTransactionsTab from "@/components/stock/StockInsiderTransactionsTab";
import StockOptionsTab from "@/components/stock/StockOptionsTab";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SearchResult { symbol: string; name: string }
interface LiveSymbol   { companyname: string; asset_type: string }

const ASSET_TYPE_SEVERITY: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  STOCKS: "success", ETFS: "info", FUNDS: "info", INDEXES: "warning", Crypto: "danger", FUTURE: "secondary",
};

export interface StockDetailPanelProps {
  /** The symbol to display. The panel also has its own internal search. */
  symbol: string;
  /** Called whenever the user selects a different symbol from the panel's search bar. */
  onSymbolChange?: (symbol: string) => void;
  /** Hide the search bar (e.g. when the parent already provides symbol navigation). */
  hideSearch?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const StockDetailPanel: React.FC<StockDetailPanelProps> = ({
  symbol: externalSymbol,
  onSymbolChange,
  hideSearch = false,
}) => {
  const [symbol,       setSymbol]       = useState(externalSymbol);
  const [searchText,   setSearchText]   = useState(externalSymbol);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [liveSymbol,    setLiveSymbol]    = useState<LiveSymbol | null>(null);
  const [activeTab,     setActiveTab]     = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync when parent changes the symbol (e.g. URL navigation or dialog re-open)
  useEffect(() => {
    if (externalSymbol && externalSymbol !== symbol) {
      setSymbol(externalSymbol);
      setSearchText(externalSymbol);
      setActiveTab(0);
    }
  }, [externalSymbol]);

  // Live symbol info (company name + asset type for header)
  useEffect(() => {
    setLiveSymbol(null);
    api.get(`/symbol/live/${symbol}`)
      .then(({ data }) => setLiveSymbol(data?.[symbol] ?? data))
      .catch(() => setLiveSymbol(null));
  }, [symbol]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    const upper = val.toUpperCase();
    setSearchText(upper);
    setShowDropdown(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!upper) return;
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search/${upper}`);
        setSearchResults((res.data as SearchResult[]).slice(0, 7));
        setShowDropdown(true);
      } catch { /* ignore */ }
    }, 400);
  };

  const selectSymbol = (sym: string) => {
    const s = sym.toUpperCase();
    setSymbol(s);
    setSearchText(s);
    setShowDropdown(false);
    setActiveTab(0);
    localStorage.setItem("currentSymbol", s);
    onSymbolChange?.(s);
  };

  const assetType = liveSymbol?.asset_type ?? "STOCKS";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header bar */}
      <div className="surface-card border-bottom-1 surface-border px-4 py-2 flex align-items-center gap-3 flex-wrap">

        {!hideSearch && (
          <div style={{ position: "relative" }}>
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search sv-text-muted" />
              <InputText
                value={searchText}
                onChange={e => handleSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && searchText) selectSymbol(searchText); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search symbol…"
                className="sv-search-input"
                style={{ width: 240 }}
              />
            </IconField>

            {showDropdown && searchResults.length > 0 && (
              <div
                className="surface-overlay border-1 surface-border border-round-xl shadow-3"
                style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 320, zIndex: 1000, maxHeight: 300, overflowY: "auto" }}
              >
                {searchResults.map(r => (
                  <div
                    key={r.symbol}
                    onMouseDown={() => selectSymbol(r.symbol)}
                    className="sv-dropdown-item flex align-items-center gap-2"
                    style={{ borderBottom: "1px solid var(--sv-border-light)" }}
                  >
                    <span className="font-bold sv-text-accent" style={{ minWidth: 60 }}>{r.symbol}</span>
                    <span className="text-xs text-color-secondary">{r.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Symbol identity */}
        {liveSymbol && (
          <div className="flex align-items-center gap-2 flex-1 min-w-0">
            <span className="font-bold text-color" style={{ fontSize: 16, letterSpacing: "0.02em" }}>{symbol}</span>
            <span className="text-color-secondary text-sm truncate">{liveSymbol.companyname}</span>
            <Tag value={assetType} severity={ASSET_TYPE_SEVERITY[assetType] ?? "secondary"} style={{ fontSize: 11 }} />
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="px-4 py-3">
        <TabView
          activeIndex={activeTab}
          onTabChange={e => setActiveTab(e.index)}
          pt={{ root: { className: "sv-tabs" } }}
        >
          <TabPanel header="Stock Overview" leftIcon="pi pi-chart-bar mr-2">
            <StockOverviewTab symbol={symbol} companyName={liveSymbol?.companyname} assetType={assetType} />
          </TabPanel>
          <TabPanel header="Chart" leftIcon="pi pi-chart-line mr-2">
            <StockChartTab symbol={symbol} />
          </TabPanel>
          <TabPanel header="Technicals" leftIcon="pi pi-sliders-h mr-2">
            <StockTechnicalsTab symbol={symbol} />
          </TabPanel>
          <TabPanel header="Fundamentals" leftIcon="pi pi-chart-bar mr-2">
            <StockFundamentalsTab symbol={symbol} />
          </TabPanel>
          <TabPanel header="Short Interest" leftIcon="pi pi-arrow-down-left-and-arrow-up-right-to-center mr-2">
            <StockShortInterestTab symbol={symbol} />
          </TabPanel>
          <TabPanel header="Insider Transactions" leftIcon="pi pi-users mr-2">
            <StockInsiderTransactionsTab symbol={symbol} />
          </TabPanel>
          <TabPanel header="Options" leftIcon="pi pi-chart-line mr-2">
            <StockOptionsTab symbol={symbol} />
          </TabPanel>
          <TabPanel header="News" leftIcon="pi pi-newspaper mr-2">
            <StockNewsTab symbol={symbol} />
          </TabPanel>
        </TabView>
      </div>
    </div>
  );
};

export default StockDetailPanel;
