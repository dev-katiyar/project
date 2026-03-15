import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { InputText } from "primereact/inputtext";
import { OverlayPanel } from "primereact/overlaypanel";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Investor {
  code: string;
  name: string;
}

interface Holding {
  rep_symbol: string;
  sector: string;
  rep_pcnt: number;
  rep_qty: number;
  rep_price: number;
  rep_value: number;
  rep_date: string;
  rep_portf_total_value: number;
}

interface SectorData {
  sector: string;
  percent: number;
}

interface ReportDate {
  rep_date: string;
}

interface Transaction {
  name: string;
  rep_date: string;
  rep_symbol_name: string;
  rep_side: string;
  rep_qty: number;
  rep_price: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHART_COLORS: Record<
  ThemeName,
  {
    tooltipBg: string;
    tooltipText: string;
    textColor: string;
    titleColor: string;
  }
> = {
  dark: {
    tooltipBg: "#121a2e",
    tooltipText: "#e8edf5",
    textColor: "#7a8da8",
    titleColor: "#e8edf5",
  },
  dim: {
    tooltipBg: "#1c2945",
    tooltipText: "#dce8f5",
    textColor: "#7a92b8",
    titleColor: "#dce8f5",
  },
  light: {
    tooltipBg: "#ffffff",
    tooltipText: "#0d1425",
    textColor: "#4a5e78",
    titleColor: "#0d1425",
  },
};

const PIE_COLORS = [
  "#2e5be6",
  "#f5a623",
  "#22c55e",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#ef4444",
  "#84cc16",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#94a3b8",
  "#e11d48",
  "#0891b2",
  "#7c3aed",
  "#d946ef",
  "#0284c7",
  "#65a30d",
  "#dc2626",
  "#9333ea",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#3b82f6",
];

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#2e5be6",
  "Information Technology": "#2e5be6",
  Healthcare: "#22c55e",
  "Health Care": "#22c55e",
  Financials: "#f5a623",
  Finance: "#f5a623",
  "Consumer Discretionary": "#a855f7",
  "Communication Services": "#06b6d4",
  Industrials: "#f97316",
  "Consumer Staples": "#84cc16",
  Energy: "#ef4444",
  Utilities: "#6366f1",
  "Real Estate": "#ec4899",
  Materials: "#14b8a6",
};

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtCompactUsd = (v: any): string => {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtUsd = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n)
    ? "—"
    : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtNum = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toLocaleString();
};

const fmtPct = (v: any): string => {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `${(n * 100).toFixed(2)}%`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  subValue?: string;
}> = ({ icon, label, value, accent = false, subValue }) => (
  <div
    className="p-card flex align-items-center gap-3 flex-1 p-3"
    style={{ minWidth: 0 }}
  >
    <div
      className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
      style={{
        width: 46,
        height: 46,
        background: accent ? "var(--sv-accent-bg)" : "var(--sv-bg-surface)",
      }}
    >
      <i
        className={`${icon} text-lg`}
        style={{
          color: accent ? "var(--sv-accent)" : "var(--sv-text-secondary)",
        }}
      />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="sv-info-label text-xs mb-1">{label}</div>
      <div
        className="text-lg font-bold"
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
      {subValue && <div className="sv-text-muted text-xs mt-1">{subValue}</div>}
    </div>
  </div>
);

const SelectorCard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="p-card flex align-items-center gap-3 flex-wrap p-3 mb-4">
    {children}
  </div>
);

const EmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="p-card text-center sv-text-muted p-6">
    <i
      className={`${icon} sv-text-accent block mb-3`}
      style={{ fontSize: "3rem" }}
    />
    <div
      className="font-semibold mb-2 text-base"
      style={{ color: "var(--sv-text-secondary)" }}
    >
      {title}
    </div>
    <div className="text-sm">{description}</div>
  </div>
);

const HoldingsLoadingSkeleton: React.FC = () => (
  <div className="flex flex-column gap-3 pt-2">
    <div className="flex gap-3 flex-wrap">
      <Skeleton
        height="80px"
        className="flex-1"
        borderRadius="12px"
        style={{ minWidth: 160 }}
      />
      <Skeleton
        height="80px"
        className="flex-1"
        borderRadius="12px"
        style={{ minWidth: 160 }}
      />
      <Skeleton
        height="80px"
        className="flex-1"
        borderRadius="12px"
        style={{ minWidth: 160 }}
      />
    </div>
    <div className="flex gap-3 flex-wrap">
      <Skeleton
        height="360px"
        className="flex-1"
        borderRadius="12px"
        style={{ minWidth: 280 }}
      />
      <Skeleton
        height="360px"
        className="flex-1"
        borderRadius="12px"
        style={{ minWidth: 280 }}
      />
    </div>
    <Skeleton height="440px" borderRadius="12px" />
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const SuperInvestorPage: React.FC = () => {
  const { code: routeCode } = useParams<{ code: string }>();
  const { theme } = useTheme();

  const holdingsTableRef = useRef<any>(null);
  const txnsTableRef = useRef<any>(null);
  const overlayRef = useRef<OverlayPanel>(null);

  // Investor list
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null,
  );

  // Combined tab – report dates
  const [reportDates, setReportDates] = useState<ReportDate[]>([]);
  const [selectedReportDate, setSelectedReportDate] = useState<string>("");

  // Holdings data (shared)
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [sectorDist, setSectorDist] = useState<SectorData[]>([]);
  const [includedInvestors, setIncludedInvestors] = useState<any[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [loadingTxns, setLoadingTxns] = useState(false);

  // UI
  const [activeTab, setActiveTab] = useState(0);
  const [globalFilter, setGlobalFilter] = useState("");

  const cc = CHART_COLORS[theme];

  // ── Compute sector distribution ───────────────────────────────────────────

  const computeSectorDist = useCallback((hData: Holding[]) => {
    const dist: SectorData[] = [];
    for (const h of hData) {
      const sector = h.sector || "Unknown";
      const idx = dist.findIndex((d) => d.sector === sector);
      if (idx === -1) dist.push({ sector, percent: h.rep_pcnt });
      else dist[idx].percent += h.rep_pcnt;
    }
    setSectorDist(dist.sort((a, b) => b.percent - a.percent));
  }, []);

  // ── Load holdings ─────────────────────────────────────────────────────────

  const loadHoldings = useCallback(
    async (code: string, date?: string | null) => {
      setLoadingHoldings(true);
      setHoldings(null);
      setSectorDist([]);
      setIncludedInvestors([]);
      setGlobalFilter("");
      try {
        const url = date ? `/holdings/${code}/${date}` : `/holdings/${code}`;
        const res = await api.get(url);
        if (res.data?.status === "ok") {
          const hData: Holding[] = res.data.holdings ?? [];
          setHoldings(hData);
          setIncludedInvestors(res.data.investors ?? []);
          computeSectorDist(hData);
        } else {
          setHoldings([]);
        }
      } catch {
        setHoldings([]);
      } finally {
        setLoadingHoldings(false);
      }
    },
    [computeSectorDist],
  );

  // ── Load investors on mount ───────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/super-investors");
        const data: Investor[] = res.data ?? [];
        setInvestors(data);
        if (routeCode) {
          const found = data.find((inv) => inv.code === routeCode);
          if (found) setSelectedInvestor(found);
          else if (data.length > 0) setSelectedInvestor(data[0]);
        } else if (data.length > 0) {
          setSelectedInvestor(data[0]);
        }
      } catch {
        // silent
      } finally {
        setLoadingInvestors(false);
      }
    })();
  }, [routeCode]);

  // ── Load holdings when individual investor changes ────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 0 && selectedInvestor) {
      loadHoldings(selectedInvestor.code);
    }
  }, [selectedInvestor]);

  // ── Tab switching ─────────────────────────────────────────────────────────

  const handleTabChange = (e: { index: number }) => {
    const newTab = e.index;
    setActiveTab(newTab);
    setHoldings(null);
    setSectorDist([]);
    setGlobalFilter("");

    if (newTab === 1) {
      if (reportDates.length > 0 && selectedReportDate) {
        loadHoldings("all", selectedReportDate);
      } else {
        (async () => {
          try {
            const res = await api.get("/holdings/report-dates");
            const dates: ReportDate[] = res.data ?? [];
            setReportDates(dates);
            if (dates.length > 0) {
              const firstDate = dates[0].rep_date;
              setSelectedReportDate(firstDate);
              loadHoldings("all", firstDate);
            }
          } catch {
            // silent
          }
        })();
      }
    } else if (newTab === 0 && selectedInvestor) {
      loadHoldings(selectedInvestor.code);
    }
  };

  const handleReportDateChange = (date: string) => {
    setSelectedReportDate(date);
    loadHoldings("all", date);
  };

  // ── Transactions ──────────────────────────────────────────────────────────

  const openTransactions = useCallback(async () => {
    const code = activeTab === 0 ? selectedInvestor?.code : "all";
    if (!code) return;
    setLoadingTxns(true);
    setTransactions([]);
    setShowTransactions(true);
    try {
      const res = await api.get(`/super-investors-transactions/${code}`);
      setTransactions(res.data ?? []);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTxns(false);
    }
  }, [activeTab, selectedInvestor]);

  // ── Highcharts options ────────────────────────────────────────────────────

  const holdingsChartOptions = useMemo((): Highcharts.Options => {
    if (!holdings || holdings.length === 0) return {};

    let data = [...holdings].sort((a, b) => b.rep_pcnt - a.rep_pcnt);
    if (data.length > 30) {
      const top = data.slice(0, 29);
      const othersPct = data.slice(29).reduce((s, h) => s + h.rep_pcnt, 0);
      data = [...top, { rep_symbol: "Others", rep_pcnt: othersPct } as Holding];
    }

    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 360,
        margin: [30, 0, 10, 0],
      },
      title: {
        text: "Holdings by Symbol",
        style: { color: cc.titleColor, fontSize: "13px", fontWeight: "600" },
        align: "center",
        y: 20,
      },
      tooltip: {
        pointFormat: "<b>{point.name}</b>: <b>{point.percentage:.1f}%</b>",
        borderColor: "#1c2840",
        backgroundColor: cc.tooltipBg,
        style: { color: cc.tooltipText, fontSize: "12px" },
      },
      plotOptions: {
        pie: {
          innerSize: "60%",
          dataLabels: {
            enabled: true,
            format: "{point.name}<br/><b>{point.percentage:.1f}%</b>",
            style: {
              color: cc.textColor,
              fontSize: "10px",
              fontWeight: "normal",
              textOutline: "none",
            },
            distance: 14,
            filter: { property: "percentage", operator: ">", value: 2 },
          },
          showInLegend: false,
          borderWidth: 0,
          states: { hover: { brightness: 0.1 } },
        },
      },
      series: [
        {
          type: "pie",
          name: "Portfolio Weight",
          colorByPoint: true,
          colors: PIE_COLORS,
          data: data.map((h) => ({ name: h.rep_symbol, y: h.rep_pcnt })),
        },
      ],
      credits: { enabled: false },
    };
  }, [holdings, cc]);

  const sectorChartOptions = useMemo((): Highcharts.Options => {
    if (!sectorDist || sectorDist.length === 0) return {};

    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 360,
        margin: [30, 0, 10, 0],
      },
      title: {
        text: "Sector Distribution",
        style: { color: cc.titleColor, fontSize: "13px", fontWeight: "600" },
        align: "center",
        y: 20,
      },
      tooltip: {
        pointFormat: "<b>{point.name}</b>: <b>{point.percentage:.1f}%</b>",
        borderColor: "#1c2840",
        backgroundColor: cc.tooltipBg,
        style: { color: cc.tooltipText, fontSize: "12px" },
      },
      plotOptions: {
        pie: {
          innerSize: "60%",
          dataLabels: {
            enabled: true,
            format: "{point.name}<br/><b>{point.percentage:.1f}%</b>",
            style: {
              color: cc.textColor,
              fontSize: "10px",
              fontWeight: "normal",
              textOutline: "none",
            },
            distance: 14,
            filter: { property: "percentage", operator: ">", value: 2 },
          },
          showInLegend: false,
          borderWidth: 0,
          states: { hover: { brightness: 0.1 } },
        },
      },
      series: [
        {
          type: "pie",
          name: "Sector Weight",
          colorByPoint: true,
          colors: sectorDist.map((s) => SECTOR_COLORS[s.sector] ?? "#94a3b8"),
          data: sectorDist.map((s) => ({ name: s.sector, y: s.percent })),
        },
      ],
      credits: { enabled: false },
    };
  }, [sectorDist, cc]);

  // ── Column body renderers ─────────────────────────────────────────────────

  const symbolBody = (row: Holding) => (
    <span
      className="sv-text-accent font-bold text-sm"
      style={{ letterSpacing: "0.02em" }}
    >
      {row.rep_symbol}
    </span>
  );

  const sectorBody = (row: Holding) => {
    const color = SECTOR_COLORS[row.sector];
    return (
      <span
        className="text-xs font-medium border-round"
        style={{
          display: "inline-block",
          padding: "2px 8px",
          background: color ? `${color}22` : "var(--sv-bg-surface)",
          color: color ?? "var(--sv-text-secondary)",
          border: `1px solid ${color ? `${color}44` : "var(--sv-border)"}`,
          whiteSpace: "nowrap",
        }}
      >
        {row.sector || "—"}
      </span>
    );
  };

  const pctBody = (row: Holding) => (
    <div className="text-right font-semibold text-sm">
      {fmtPct(row.rep_pcnt)}
    </div>
  );

  const qtyBody = (row: Holding) => (
    <div className="text-right sv-text-muted text-sm">
      {fmtNum(row.rep_qty)}
    </div>
  );

  const priceBody = (row: Holding) => (
    <div className="text-right text-sm">{fmtUsd(row.rep_price)}</div>
  );

  const valueBody = (row: Holding) => (
    <div className="text-right font-semibold text-sm">
      {fmtCompactUsd(row.rep_value)}
    </div>
  );

  const txnSideBody = (row: Transaction) => {
    const isBuy = row.rep_side?.toLowerCase() === "buy";
    return (
      <Tag
        value={row.rep_side?.toUpperCase() ?? "—"}
        severity={isBuy ? "success" : "danger"}
        className="text-xs font-bold"
        style={{ minWidth: 44, justifyContent: "center" }}
      />
    );
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const reportDate = holdings?.[0]?.rep_date ?? "—";
  const totalValue = holdings?.[0]?.rep_portf_total_value;
  const holdingsCount = holdings?.length ?? 0;

  // ── Holdings display (shared between both tabs) ───────────────────────────

  const renderHoldings = (investorName: string) => {
    if (loadingHoldings) return <HoldingsLoadingSkeleton />;

    if (!holdings) return null;

    if (holdings.length === 0) {
      return (
        <EmptyState
          icon="pi pi-inbox"
          title="No Holdings Data"
          description="No holdings data is available for this selection."
        />
      );
    }

    const showSymbolChart = holdings.length < 1000;

    return (
      <>
        {/* Investor name + actions */}
        <div className="flex align-items-center justify-content-between mb-3 flex-wrap gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold">{investorName}</h2>
            <span className="sv-text-muted text-xs">Portfolio Holdings</span>
          </div>
          <Button
            label="Recent Transactions"
            icon="pi pi-history"
            severity="secondary"
            size="small"
            onClick={openTransactions}
          />
        </div>

        {/* Stats row */}
        <div className="flex gap-3 flex-wrap mb-4">
          <StatCard
            icon="pi pi-calendar"
            label="Report Date"
            value={reportDate}
          />
          <StatCard
            icon="pi pi-wallet"
            label="Total Portfolio Value"
            value={fmtCompactUsd(totalValue)}
            accent
          />
          <StatCard
            icon="pi pi-chart-bar"
            label="Holdings"
            value={`${holdingsCount} stocks`}
          />
        </div>

        {/* Charts */}
        <div className="flex gap-3 flex-wrap mb-4">
          {showSymbolChart && (
            <div className="p-card flex-1 p-3" style={{ minWidth: 280 }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={holdingsChartOptions}
              />
            </div>
          )}
          <div className="p-card flex-1 p-3" style={{ minWidth: 280 }}>
            <HighchartsReact
              highcharts={Highcharts}
              options={sectorChartOptions}
            />
          </div>
        </div>

        {/* Table toolbar */}
        <div className="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search symbol or sector…"
              size="small"
              style={{ width: 240 }}
            />
          </span>
          <Button
            label="Export CSV"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            text
            onClick={() => holdingsTableRef.current?.exportCSV()}
          />
        </div>

        {/* Holdings table */}
        <div className="p-card overflow-hidden">
          <DataTable
            ref={holdingsTableRef}
            value={holdings}
            sortField="rep_pcnt"
            sortOrder={-1}
            paginator
            rows={20}
            rowsPerPageOptions={[10, 20, 50, 100]}
            globalFilter={globalFilter}
            globalFilterFields={["rep_symbol", "sector"]}
            emptyMessage="No holdings found."
            className="p-datatable-sm p-datatable-striped text-sm"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          >
            <Column
              field="rep_symbol"
              header="Symbol"
              sortable
              body={symbolBody}
              style={{ minWidth: 80 }}
              exportField="rep_symbol"
            />
            <Column
              field="sector"
              header="Sector"
              sortable
              body={sectorBody}
              style={{ minWidth: 160 }}
              exportField="sector"
            />
            <Column
              field="rep_pcnt"
              header="Portfolio %"
              sortable
              body={pctBody}
              style={{ minWidth: 110 }}
              align="right"
            />
            <Column
              field="rep_qty"
              header="Quantity"
              sortable
              body={qtyBody}
              style={{ minWidth: 110 }}
              align="right"
            />
            <Column
              field="rep_price"
              header="Reported Cost"
              sortable
              body={priceBody}
              style={{ minWidth: 130 }}
              align="right"
            />
            <Column
              field="rep_value"
              header="Value"
              sortable
              body={valueBody}
              style={{ minWidth: 110 }}
              align="right"
            />
          </DataTable>
        </div>
      </>
    );
  };

  // ── Transactions dialog body ──────────────────────────────────────────────

  const renderTransactions = () => {
    if (loadingTxns) {
      return (
        <div className="flex flex-column gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="42px" borderRadius="8px" />
          ))}
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center p-5 sv-text-muted">
          <i className="pi pi-inbox block mb-3" style={{ fontSize: "2rem" }} />
          No recent transactions found.
        </div>
      );
    }

    return (
      <>
        <div className="flex justify-content-end mb-3">
          <Button
            label="Export CSV"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            text
            onClick={() => txnsTableRef.current?.exportCSV()}
          />
        </div>
        <DataTable
          ref={txnsTableRef}
          value={transactions}
          sortField="rep_date"
          sortOrder={-1}
          scrollable
          scrollHeight="55vh"
          className="p-datatable-sm p-datatable-striped text-sm"
        >
          <Column
            field="name"
            header="Fund Name"
            sortable
            style={{ minWidth: 150 }}
          />
          <Column
            field="rep_date"
            header="Date"
            sortable
            style={{ minWidth: 110 }}
          />
          <Column
            field="rep_symbol_name"
            header="Symbol"
            sortable
            style={{ minWidth: 140 }}
          />
          <Column
            field="rep_side"
            header="Action"
            sortable
            body={txnSideBody}
            style={{ minWidth: 90 }}
            align="center"
          />
          <Column
            field="rep_qty"
            header="Quantity"
            sortable
            body={(r: Transaction) => (
              <div className="text-right">{fmtNum(r.rep_qty)}</div>
            )}
            style={{ minWidth: 110 }}
            align="right"
          />
          <Column
            field="rep_price"
            header="Price"
            sortable
            body={(r: Transaction) => (
              <div className="text-right">{fmtUsd(r.rep_price)}</div>
            )}
            style={{ minWidth: 110 }}
            align="right"
          />
          <Column
            header="Value"
            body={(r: Transaction) => (
              <div className="text-right font-semibold">
                {fmtCompactUsd(r.rep_qty * r.rep_price)}
              </div>
            )}
            style={{ minWidth: 110 }}
            align="right"
          />
        </DataTable>
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="sv-layout-wrap p-4">
      {/* ── Tabs ── */}
      <TabView
        activeIndex={activeTab}
        onTabChange={handleTabChange}
        pt={{ root: { className: "sv-tabs" } }}
      >
        {/* ── Tab 1: Individual Investor ── */}
        <TabPanel header="Individual Investor" leftIcon="pi pi-user mr-2">
          <div className="pt-1">
            {/* Investor selector */}
            <SelectorCard>
              <i className="pi pi-search sv-text-muted" />
              <Dropdown
                value={selectedInvestor}
                options={investors}
                onChange={(e) => setSelectedInvestor(e.value)}
                optionLabel="name"
                placeholder={
                  loadingInvestors
                    ? "Loading investors…"
                    : "Select a Super Investor…"
                }
                filter
                filterBy="name"
                showClear
                disabled={loadingInvestors}
                style={{ flex: 1, maxWidth: 440 }}
                emptyMessage="No investors found"
              />
              {loadingInvestors && (
                <i className="pi pi-spin pi-spinner sv-text-muted" />
              )}
            </SelectorCard>

            {/* Empty state when no investor is selected */}
            {!selectedInvestor && !loadingHoldings && !loadingInvestors && (
              <EmptyState
                icon="pi pi-user"
                title="Select an Investor to View Portfolio"
                description="Choose from legendary investors like Warren Buffett, Bill Ackman, and more"
              />
            )}

            {selectedInvestor && renderHoldings(selectedInvestor.name)}
          </div>
        </TabPanel>

        {/* ── Tab 2: Combined Portfolio ── */}
        <TabPanel header="Combined Portfolio" leftIcon="pi pi-users mr-2">
          <div className="pt-1">
            {/* Controls */}
            <SelectorCard>
              <i className="pi pi-calendar sv-text-muted" />
              <div className="flex align-items-center gap-2">
                <span
                  className="sv-info-label text-xs"
                  style={{ whiteSpace: "nowrap" }}
                >
                  Report Date
                </span>
                <Dropdown
                  value={selectedReportDate}
                  options={reportDates}
                  onChange={(e) => handleReportDateChange(e.value)}
                  optionLabel="rep_date"
                  optionValue="rep_date"
                  placeholder="Select date…"
                  style={{ minWidth: 160 }}
                />
              </div>

              {includedInvestors.length > 0 && (
                <>
                  <Button
                    label={`${includedInvestors.length} Investors Included`}
                    icon="pi pi-list"
                    severity="secondary"
                    size="small"
                    outlined
                    onClick={(e) => overlayRef.current?.toggle(e)}
                  />
                  <OverlayPanel
                    ref={overlayRef}
                    style={{ maxWidth: 320 }}
                    pt={{ content: { style: { padding: "0.75rem 1rem" } } }}
                  >
                    <div className="font-bold mb-2 text-sm">
                      Included Super Investors
                    </div>
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {includedInvestors.map((inv, i) => (
                        <div
                          key={i}
                          className="flex align-items-center gap-2 text-sm"
                          style={{
                            padding: "0.35rem 0",
                            borderBottom: "1px solid var(--sv-border)",
                            color: "var(--sv-text-secondary)",
                          }}
                        >
                          <i className="pi pi-user sv-text-accent text-xs" />
                          {inv.investor_name ?? inv.name ?? String(inv)}
                        </div>
                      ))}
                    </div>
                  </OverlayPanel>
                </>
              )}
            </SelectorCard>

            {renderHoldings("Super Investors Combined")}
          </div>
        </TabPanel>
      </TabView>

      {/* ── Transactions Dialog ── */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-history sv-text-accent" />
            <span className="font-bold">Recent Transactions</span>
          </div>
        }
        visible={showTransactions}
        onHide={() => setShowTransactions(false)}
        modal
        style={{ width: "min(1050px, 96vw)" }}
        contentStyle={{ padding: "1rem 1.25rem" }}
      >
        {renderTransactions()}
      </Dialog>
    </div>
  );
};

export default SuperInvestorPage;
