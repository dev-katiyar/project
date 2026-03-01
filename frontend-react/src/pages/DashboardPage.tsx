import React, { useState, useCallback } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import DashboardCard from "@/components/common/DashboardCard";
import IndexSelector, {
  INDEX_OPTIONS,
  type IndexOption,
} from "@/components/common/IndexSelector";
import MarketDataTable, {
  COLUMN_PRESETS,
} from "@/components/market-data/MarketDataTable";

const Placeholder: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-sm m-0" style={{ color: "var(--sv-text-muted)" }}>
    {text}
  </p>
);

/* ── API paths for asset-class tabs (static lists) ─────── */
const ASSET_URLS = {
  indices: "/symbol/list_type2/8",
  bonds: "/symbol/list_type2/24",
  commodities: "/symbol/list_type2/22",
  cryptos: "/symbol/list_type2/39",
};

const DashboardPage: React.FC = () => {
  const [highlightsIndex, setHighlightsIndex] = useState<IndexOption>(
    INDEX_OPTIONS[0],
  );
  const [mapIndex, setMapIndex] = useState<IndexOption>(INDEX_OPTIONS[0]);
  const [rsiIndex, setRsiIndex] = useState<IndexOption>(INDEX_OPTIONS[0]);
  const [momentumIndex, setMomentumIndex] = useState<IndexOption>(
    INDEX_OPTIONS[0],
  );
  const [rsIndex, setRsIndex] = useState<IndexOption>(INDEX_OPTIONS[0]);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const handleChartClick = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
  }, []);

  return (
    <>
      {/* Page header */}
      <div className="mb-4">
        <h1
          className="text-2xl font-bold mt-0 mb-1"
          style={{ letterSpacing: "-0.02em" }}
        >
          Dashboard
        </h1>
        <p
          className="mt-0 text-sm"
          style={{ color: "var(--sv-text-secondary)" }}
        >
          Market overview and portfolio summary
        </p>
      </div>

      {/* ─── Row 1 ─── */}
      <div className="grid mb-3">
        {/* 1. Asset Classes (Indices / Bonds / Commodities / Cryptos) */}
        <div className="col-12 lg:col-4 p-1">
          <DashboardCard title="Asset Classes" minHeight={320}>
            <TabView>
              <TabPanel header="Indices">
                <MarketDataTable
                  columns={COLUMN_PRESETS.GENERIC}
                  listURL={ASSET_URLS.indices}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="280px"
                />
              </TabPanel>
              <TabPanel header="Bonds">
                <MarketDataTable
                  columns={COLUMN_PRESETS.BONDS}
                  listURL={ASSET_URLS.bonds}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="280px"
                />
              </TabPanel>
              <TabPanel header="Commodities">
                <MarketDataTable
                  columns={COLUMN_PRESETS.GENERIC}
                  listURL={ASSET_URLS.commodities}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="280px"
                />
              </TabPanel>
              <TabPanel header="Cryptos">
                <MarketDataTable
                  columns={COLUMN_PRESETS.GENERIC}
                  listURL={ASSET_URLS.cryptos}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="280px"
                />
              </TabPanel>
            </TabView>
          </DashboardCard>
        </div>

        {/* 2. Top Tickers Yearly Performance */}
        <div className="col-12 lg:col-5 p-1">
          <DashboardCard title="Top Tickers Yearly Performance" minHeight={320}>
            <Placeholder
              text={`LineChart (Highcharts) — historical price / yield${selectedSymbol ? ` for ${selectedSymbol}` : ""}`}
            />
          </DashboardCard>
        </div>

        {/* 3. Market Summary Widget */}
        <div className="col-12 lg:col-3 p-1">
          <DashboardCard title="Market Summary" minHeight={320}>
            <Placeholder text="HeatmapGrid — asset-class performance matrix with period buttons (1D, WTD, MTD, QTD, YTD, 1Y, 2Y)" />
          </DashboardCard>
        </div>
      </div>

      {/* ─── Row 2 ─── */}
      <div className="grid mb-3">
        {/* 4. Stock Highlights */}
        <div className="col-12 lg:col-3 p-1">
          <DashboardCard title="Stock Highlights" minHeight={320}>
            <div className="mb-2">
              <IndexSelector
                value={highlightsIndex}
                onChange={setHighlightsIndex}
              />
            </div>
            <TabView>
              <TabPanel header="Top 10">
                <MarketDataTable
                  columns={COLUMN_PRESETS.PERFORMERS}
                  listURL={highlightsIndex.urls.top10}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="240px"
                />
              </TabPanel>
              <TabPanel header="Bottom 10">
                <MarketDataTable
                  columns={COLUMN_PRESETS.PERFORMERS}
                  listURL={highlightsIndex.urls.bottom10}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="240px"
                />
              </TabPanel>
              <TabPanel header="Most Active">
                <MarketDataTable
                  columns={COLUMN_PRESETS.MOST_ACTIVE}
                  listURL={highlightsIndex.urls.topActive}
                  showChartIcon
                  onChartClick={handleChartClick}
                  scrollHeight="240px"
                />
              </TabPanel>
            </TabView>
          </DashboardCard>
        </div>

        {/* 5. Sector Performance */}
        <div className="col-12 lg:col-5 p-1">
          <DashboardCard
            title="Sector Performance"
            linkTo="/relative-absolute-analysis-sectors"
            minHeight={320}
          >
            <MarketDataTable
              columns={COLUMN_PRESETS.SECTORS}
              listURL="/sector/liveprices"
              showChartIcon
              onChartClick={handleChartClick}
              showName
              scrollHeight="300px"
            />
          </DashboardCard>
        </div>

        {/* 6. Market Map (TreeMap) */}
        <div className="col-12 lg:col-4 p-1">
          <DashboardCard
            title="Market Map"
            linkTo="/holdingsmap"
            minHeight={320}
          >
            <div className="mb-2">
              <IndexSelector value={mapIndex} onChange={setMapIndex} />
            </div>
            <Placeholder text="TreeMapChart (Highcharts) — stocks by sector, sized by market cap, colored by daily change" />
          </DashboardCard>
        </div>
      </div>

      {/* ─── Row 3 ─── */}
      <div className="grid mb-3">
        {/* 7. RSI */}
        <div className="col-12 lg:col-4 p-1">
          <DashboardCard title="RSI — Relative Strength Index" minHeight={280}>
            <div className="mb-2">
              <IndexSelector value={rsiIndex} onChange={setRsiIndex} />
            </div>
            <TabView>
              <TabPanel header="Top 10 Oversold">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RSI}
                  listURL={rsiIndex.urls.rsiOverSold10}
                  scrollHeight="220px"
                />
              </TabPanel>
              <TabPanel header="Top 10 Overbought">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RSI}
                  listURL={rsiIndex.urls.rsiOverBought10}
                  scrollHeight="220px"
                />
              </TabPanel>
            </TabView>
          </DashboardCard>
        </div>

        {/* 8. Momentum (MACD) */}
        <div className="col-12 lg:col-4 p-1">
          <DashboardCard title="Momentum" minHeight={280}>
            <div className="mb-2">
              <IndexSelector
                value={momentumIndex}
                onChange={setMomentumIndex}
              />
            </div>
            <TabView>
              <TabPanel header="Top 10 Increase">
                <MarketDataTable
                  columns={COLUMN_PRESETS.MACD}
                  listURL={momentumIndex.urls.momIncrease10}
                  scrollHeight="220px"
                />
              </TabPanel>
              <TabPanel header="Top 10 Decrease">
                <MarketDataTable
                  columns={COLUMN_PRESETS.MACD}
                  listURL={momentumIndex.urls.momDecrease10}
                  scrollHeight="220px"
                />
              </TabPanel>
            </TabView>
          </DashboardCard>
        </div>

        {/* 9. Relative Strength */}
        <div className="col-12 lg:col-4 p-1">
          <DashboardCard title="Relative Strength" minHeight={280}>
            <div className="mb-2">
              <IndexSelector value={rsIndex} onChange={setRsIndex} />
            </div>
            <TabView>
              <TabPanel header="Outperformers">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RELATIVE_STRENGTH}
                  listURL={rsIndex.urls.rsOutperformers}
                  scrollHeight="220px"
                />
              </TabPanel>
              <TabPanel header="Underperformers">
                <MarketDataTable
                  columns={COLUMN_PRESETS.RELATIVE_STRENGTH}
                  listURL={rsIndex.urls.rsUnderperformers}
                  scrollHeight="220px"
                />
              </TabPanel>
            </TabView>
          </DashboardCard>
        </div>
      </div>

      {/* ─── Row 4 ─── */}
      <div className="grid mb-3">
        {/* 10. SimpleVisor Insights */}
        <div className="col-12 p-1">
          <DashboardCard
            title="SimpleVisor Insights"
            linkTo="/insights/latest-insights"
            linkLabel="View More"
            minHeight={200}
          >
            <Placeholder text="InsightsCarousel — horizontal scrollable cards with latest blog posts and YouTube videos" />
          </DashboardCard>
        </div>
      </div>

      {/* ─── Row 5 ─── */}
      <div className="grid mb-3">
        {/* 11. Latest News */}
        <div className="col-12 lg:col-6 p-1">
          <DashboardCard title="Latest News" minHeight={280}>
            <Placeholder text="NewsTable — RSS feed with published timestamp and clickable title links" />
          </DashboardCard>
        </div>

        {/* 12. Fear / Greed Gauge */}
        <div className="col-12 md:col-6 lg:col-3 p-1">
          <DashboardCard title="Fear / Greed" minHeight={280}>
            <Placeholder text="GaugeChart (Highcharts) — 0-100 gauge with green/yellow/red zones" />
          </DashboardCard>
        </div>

        {/* 13. Technical Gauge */}
        <div className="col-12 md:col-6 lg:col-3 p-1">
          <DashboardCard title="Technical" minHeight={280}>
            <Placeholder text="GaugeChart (Highcharts) — 0-100 gauge for technical indicator" />
          </DashboardCard>
        </div>
      </div>

      {/* ─── Row 6 ─── */}
      <div className="grid mb-3">
        {/* 14. SV Core Portfolios */}
        <div className="col-12 lg:col-6 p-1">
          <DashboardCard
            title="SV Core Portfolios"
            linkTo="/portfolioscombined"
            linkLabel="View All"
            minHeight={200}
          >
            <Placeholder text="PortfolioSummary — model portfolio performance (name, starting cash, value, P&L, daily change)" />
          </DashboardCard>
        </div>

        {/* 15. My Portfolios */}
        <div className="col-12 lg:col-6 p-1">
          <DashboardCard
            title="My Portfolios"
            linkTo="/portfolioscombined"
            linkLabel="View All"
            minHeight={200}
          >
            <Placeholder text="PortfolioSummary — user's personal portfolio performance" />
          </DashboardCard>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
