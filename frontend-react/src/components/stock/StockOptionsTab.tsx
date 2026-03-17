import React, { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Skeleton } from "primereact/skeleton";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import api from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpiryDate {
  id: number;
  name: string;
}

interface OptionContract {
  contractSymbol: string;
  strike: number;
  type?: string;
  volume: number;
  openInterest: number;
  bid: number;
  ask: number;
  lastPrice: number;
  lastTradeDate: string;
  impliedVolatility: number;
  inTheMoney: boolean;
}

interface StraddleRow {
  strike: number;
  lastPrice?: number;
  lastTradeDate?: string;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
  put_lastPrice?: number;
  put_lastTradeDate?: string;
  put_volume?: number;
  put_openInterest?: number;
  put_impliedVolatility?: number;
  put_inTheMoney?: boolean;
}

interface OptionsData {
  calls: OptionContract[];
  puts: OptionContract[];
}

interface StockOptionsTabProps {
  symbol: string;
}

type ViewType = "Side by Side" | "Calls" | "Puts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtIV(iv: number | undefined | null): string {
  if (iv == null || isNaN(iv)) return "—";
  return `${(iv * 100).toFixed(1)}%`;
}

function fmtPrice(p: number | undefined | null): string {
  if (p == null || isNaN(p) || p === 0) return "—";
  return `$${p.toFixed(2)}`;
}

function buildStraddleRows(calls: OptionContract[], puts: OptionContract[]): StraddleRow[] {
  const callsDict: Record<number, OptionContract> = {};
  for (const c of calls) callsDict[c.strike] = c;

  const rows: StraddleRow[] = [];
  for (const put of puts) {
    const call = callsDict[put.strike];
    const row: StraddleRow = {
      strike: put.strike,
      put_lastPrice: put.lastPrice,
      put_lastTradeDate: put.lastTradeDate,
      put_volume: put.volume,
      put_openInterest: put.openInterest,
      put_impliedVolatility: put.impliedVolatility,
      put_inTheMoney: put.inTheMoney,
    };
    if (call) {
      row.lastPrice = call.lastPrice;
      row.lastTradeDate = call.lastTradeDate;
      row.volume = call.volume;
      row.openInterest = call.openInterest;
      row.impliedVolatility = call.impliedVolatility;
      row.inTheMoney = call.inTheMoney;
      delete callsDict[call.strike];
    }
    rows.push(row);
  }
  // leftover calls with no matching put
  for (const leftover of Object.values(callsDict)) {
    rows.push({
      strike: leftover.strike,
      lastPrice: leftover.lastPrice,
      lastTradeDate: leftover.lastTradeDate,
      volume: leftover.volume,
      openInterest: leftover.openInterest,
      impliedVolatility: leftover.impliedVolatility,
      inTheMoney: leftover.inTheMoney,
    });
  }
  return rows.sort((a, b) => a.strike - b.strike);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ToggleBtn: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active, label, onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 14px",
      fontSize: "0.75rem",
      fontWeight: active ? 700 : 500,
      border: active ? "1.5px solid var(--sv-accent)" : "1.5px solid var(--sv-border)",
      borderRadius: 6,
      background: active ? "var(--sv-accent)" : "transparent",
      color: active ? "#000" : "var(--text-color)",
      cursor: "pointer",
      transition: "all 0.15s",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon?: string;
}> = ({ label, value, sub, subColor, icon }) => (
  <div className="sv-data-card p-3 flex flex-column gap-1" style={{ minWidth: 130, flex: 1 }}>
    <div style={{
      fontSize: "0.68rem", color: "var(--sv-text-muted)", textTransform: "uppercase",
      letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5,
    }}>
      {icon && <i className={`pi ${icon}`} style={{ fontSize: 11 }} />}
      {label}
    </div>
    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-color)", lineHeight: 1.2 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: "0.73rem", color: subColor ?? "var(--sv-text-muted)", fontWeight: 500 }}>
        {sub}
      </div>
    )}
  </div>
);

// ── ITM badge ─────────────────────────────────────────────────────────────────

const ItmBadge: React.FC = () => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em",
    background: "rgba(1,152,218,0.12)", color: "#0198da",
    border: "1px solid rgba(1,152,218,0.3)",
    padding: "2px 8px", borderRadius: 20,
  }}>
    <i className="pi pi-check-circle" style={{ fontSize: 10 }} />
    ITM
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────

const StockOptionsTab: React.FC<StockOptionsTabProps> = ({ symbol }) => {
  const [expiryDates, setExpiryDates]   = useState<ExpiryDate[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryDate | null>(null);
  const [optionsData, setOptionsData]   = useState<OptionsData | null>(null);
  const [loadingExpiry,  setLoadingExpiry]  = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");

  const [viewType, setViewType] = useState<ViewType>("Side by Side");
  const [strikeFrom, setStrikeFrom] = useState<number>(0);
  const [strikeTo,   setStrikeTo]   = useState<number>(9999);

  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // ── Load expiry dates ───────────────────────────────────────────────────────

  useEffect(() => {
    setLoadingExpiry(true);
    setError("");
    setExpiryDates([]);
    setSelectedExpiry(null);
    setOptionsData(null);
    api.get<ExpiryDate[]>(`/symbol/option/${symbol}`)
      .then(({ data }) => {
        const dates = Array.isArray(data) ? data : [];
        setExpiryDates(dates);
        if (dates.length > 0) setSelectedExpiry(dates[0]);
        else setError(`No options data available for ${symbol}.`);
      })
      .catch(() => setError(`Failed to load options for ${symbol}.`))
      .finally(() => setLoadingExpiry(false));
  }, [symbol]);

  // ── Load options for selected expiry ───────────────────────────────────────

  useEffect(() => {
    if (!selectedExpiry) return;
    setLoadingOptions(true);
    setOptionsData(null);
    api.get<OptionsData>(`/symbol/option/${symbol}/${selectedExpiry.id}`)
      .then(({ data }) => {
        setOptionsData(data);
        const allStrikes = [...(data.calls ?? []), ...(data.puts ?? [])].map(r => r.strike);
        if (allStrikes.length > 0) {
          setStrikeFrom(Math.min(...allStrikes));
          setStrikeTo(Math.max(...allStrikes));
        }
      })
      .catch(() => setError(`Failed to load options chain for expiry ${selectedExpiry.name}.`))
      .finally(() => setLoadingOptions(false));
  }, [symbol, selectedExpiry]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const calls = optionsData?.calls ?? [];
  const puts  = optionsData?.puts  ?? [];

  const filteredCalls = useMemo(
    () => calls.filter(r => r.strike >= strikeFrom && r.strike <= strikeTo),
    [calls, strikeFrom, strikeTo],
  );

  const filteredPuts = useMemo(
    () => puts.filter(r => r.strike >= strikeFrom && r.strike <= strikeTo),
    [puts, strikeFrom, strikeTo],
  );

  const straddleRows = useMemo(
    () => buildStraddleRows(filteredCalls, filteredPuts),
    [filteredCalls, filteredPuts],
  );

  const stats = useMemo(() => {
    const totalCallOI  = calls.reduce((s, r) => s + (r.openInterest ?? 0), 0);
    const totalPutOI   = puts.reduce((s, r) =>  s + (r.openInterest ?? 0), 0);
    const totalCallVol = calls.reduce((s, r) => s + (r.volume ?? 0), 0);
    const totalPutVol  = puts.reduce((s, r) =>  s + (r.volume ?? 0), 0);
    const pcRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : "—";
    const allIVs = [...calls, ...puts].map(r => r.impliedVolatility).filter(v => v && v > 0);
    const avgIV = allIVs.length > 0 ? allIVs.reduce((s, v) => s + v, 0) / allIVs.length : 0;
    return { totalCallOI, totalPutOI, totalCallVol, totalPutVol, pcRatio, avgIV };
  }, [calls, puts]);

  // ── Open Interest chart ─────────────────────────────────────────────────────

  const chartOptions = useMemo((): Highcharts.Options => {
    const strikes  = [...new Set([...filteredCalls, ...filteredPuts].map(r => r.strike))].sort((a, b) => a - b);
    const callOIMap: Record<number, number> = {};
    const putOIMap:  Record<number, number> = {};
    filteredCalls.forEach(r => { callOIMap[r.strike] = r.openInterest ?? 0; });
    filteredPuts.forEach(r =>  { putOIMap[r.strike]  = r.openInterest ?? 0; });

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 280,
        style: { fontFamily: "Inter, sans-serif" },
        animation: { duration: 250 },
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        enabled: true,
        itemStyle: { color: "var(--text-color)", fontSize: "11px", fontWeight: "500" },
        itemHoverStyle: { color: "var(--sv-accent)" },
      },
      tooltip: {
        shared: true,
        backgroundColor: "var(--surface-overlay)",
        borderColor: "var(--sv-border)",
        style: { color: "var(--text-color)", fontSize: "12px" },
        formatter(this: Highcharts.TooltipFormatterContextObject) {
          const pts = this.points ?? [];
          let s = `<b>Strike $${this.x}</b><br/>`;
          for (const p of pts) {
            const val = typeof p.y === "number" ? fmtNum(p.y) : "0";
            s += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${val}</b><br/>`;
          }
          return s;
        },
      },
      xAxis: {
        categories: strikes.map(s => String(s)),
        lineColor: "var(--sv-border)",
        tickColor: "var(--sv-border)",
        labels: {
          style: { color: "var(--sv-text-muted)", fontSize: "10px" },
          rotation: -45,
          step: Math.max(1, Math.ceil(strikes.length / 20)),
        },
        title: { text: "Strike Price", style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: "Open Interest", style: { color: "var(--sv-text-muted)", fontSize: "11px" } },
        labels: {
          formatter() { return fmtNum(this.value as number); },
          style: { color: "var(--sv-text-muted)", fontSize: "11px" },
        },
        gridLineColor: "var(--sv-border-light)",
      },
      plotOptions: {
        column: { borderRadius: 2, groupPadding: 0.1, pointPadding: 0.05 },
      },
      series: [
        {
          type: "column",
          name: "Call OI",
          data: strikes.map(s => callOIMap[s] ?? 0),
          color: "var(--sv-positive, #4caf50)",
        },
        {
          type: "column",
          name: "Put OI",
          data: strikes.map(s => putOIMap[s] ?? 0),
          color: "#ef5350",
        },
      ],
    };
  }, [filteredCalls, filteredPuts]);

  // ── Table cell helpers ──────────────────────────────────────────────────────

  const itmCellStyle = (inMoney: boolean | undefined, leftAccent = false): React.CSSProperties => {
    if (!inMoney) return {};
    return {
      background: "rgba(1,152,218,0.08)",
      ...(leftAccent ? { borderLeft: "3px solid #0198da" } : {}),
    };
  };

  const loading = loadingExpiry || loadingOptions;

  // ── Single view table (Calls or Puts) ──────────────────────────────────────

  const renderSingleTable = (rows: OptionContract[]) => (
    <DataTable
      value={rows}
      sortField="strike"
      sortOrder={1}
      showGridlines={false}
      stripedRows
      size="small"
      style={{ fontSize: "0.81rem" }}
      scrollable
      scrollHeight="480px"
      rowClassName={(row: OptionContract) => row.inTheMoney ? "sv-itm-row" : ""}
    >
      <Column
        field="strike"
        header="Strike"
        sortable
        style={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}
        body={(row: OptionContract) => (
          <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            ${row.strike.toFixed(2)}
            {row.inTheMoney && <ItmBadge />}
          </span>
        )}
      />
      <Column field="lastPrice"  header="Last"    sortable body={(r: OptionContract) => fmtPrice(r.lastPrice)}  style={{ minWidth: 80,  textAlign: "right" }} />
      <Column field="bid"        header="Bid"     sortable body={(r: OptionContract) => fmtPrice(r.bid)}        style={{ minWidth: 80,  textAlign: "right" }} />
      <Column field="ask"        header="Ask"     sortable body={(r: OptionContract) => fmtPrice(r.ask)}        style={{ minWidth: 80,  textAlign: "right" }} />
      <Column field="volume"     header="Volume"  sortable body={(r: OptionContract) => fmtNum(r.volume)}       style={{ minWidth: 90,  textAlign: "right" }} />
      <Column field="openInterest" header="Open Int." sortable body={(r: OptionContract) => fmtNum(r.openInterest)} style={{ minWidth: 90, textAlign: "right" }} />
      <Column field="impliedVolatility" header="Impl. Vol." sortable body={(r: OptionContract) => fmtIV(r.impliedVolatility)} style={{ minWidth: 90, textAlign: "right" }} />
      <Column field="lastTradeDate" header="Last Trade" sortable style={{ minWidth: 110, color: "var(--sv-text-muted)" }} />
    </DataTable>
  );

  // ── Side by side table ─────────────────────────────────────────────────────

  const renderStraddleTable = () => (
    <DataTable
      value={straddleRows}
      sortField="strike"
      sortOrder={1}
      showGridlines
      size="small"
      style={{ fontSize: "0.8rem" }}
      scrollable
      scrollHeight="480px"
    >
      {/* CALLS side */}
      <Column header="IV"      body={(r: StraddleRow) => <span style={itmCellStyle(r.inTheMoney)}>{fmtIV(r.impliedVolatility)}</span>}  style={{ minWidth: 72,  textAlign: "right", background: r => itmCellStyle(r.inTheMoney).background }} bodyStyle={{ textAlign: "right" }} />
      <Column header="OI"      body={(r: StraddleRow) => <span style={itmCellStyle(r.inTheMoney)}>{fmtNum(r.openInterest)}</span>}       bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />
      <Column header="Vol"     body={(r: StraddleRow) => <span style={itmCellStyle(r.inTheMoney)}>{fmtNum(r.volume)}</span>}              bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />
      <Column header="Last"    body={(r: StraddleRow) => <span style={itmCellStyle(r.inTheMoney, true)}>{fmtPrice(r.lastPrice)}</span>}  bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />

      {/* STRIKE center column */}
      <Column
        field="strike"
        header={selectedExpiry?.name ?? "Strike"}
        sortable
        body={(r: StraddleRow) => (
          <div style={{
            textAlign: "center", fontWeight: 700, fontSize: "0.9rem",
            color: "var(--text-color)", padding: "2px 0",
          }}>
            ${r.strike.toFixed(2)}
          </div>
        )}
        style={{
          minWidth: 110, textAlign: "center",
          borderLeft: "2px solid var(--sv-border)",
          borderRight: "2px solid var(--sv-border)",
          background: "var(--surface-ground)",
          fontWeight: 700,
        }}
      />

      {/* PUTS side */}
      <Column header="Last"  body={(r: StraddleRow) => <span style={itmCellStyle(r.put_inTheMoney, true)}>{fmtPrice(r.put_lastPrice)}</span>}  bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />
      <Column header="Vol"   body={(r: StraddleRow) => <span style={itmCellStyle(r.put_inTheMoney)}>{fmtNum(r.put_volume)}</span>}              bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />
      <Column header="OI"    body={(r: StraddleRow) => <span style={itmCellStyle(r.put_inTheMoney)}>{fmtNum(r.put_openInterest)}</span>}         bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />
      <Column header="IV"    body={(r: StraddleRow) => <span style={itmCellStyle(r.put_inTheMoney)}>{fmtIV(r.put_impliedVolatility)}</span>}     bodyStyle={{ textAlign: "right" }} style={{ minWidth: 72 }} />
    </DataTable>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-column gap-3">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <div className="font-bold" style={{ fontSize: "1.05rem", color: "var(--text-color)" }}>
            Options Chain
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--sv-text-muted)", marginTop: 2 }}>
            Listed calls & puts — strike prices, implied volatility, open interest and volume by expiry date
          </div>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} height="80px" className="flex-1 border-round-xl" />
          ))}
        </div>
      ) : !error && optionsData ? (
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="Call Open Int."
            value={fmtNum(stats.totalCallOI)}
            sub="Total contracts"
            subColor="var(--sv-positive, #4caf50)"
            icon="pi-arrow-up"
          />
          <StatCard
            label="Put Open Int."
            value={fmtNum(stats.totalPutOI)}
            sub="Total contracts"
            subColor="#ef5350"
            icon="pi-arrow-down"
          />
          <StatCard
            label="Put / Call Ratio"
            value={String(stats.pcRatio)}
            sub={
              typeof stats.pcRatio === "string" && stats.pcRatio !== "—"
                ? parseFloat(stats.pcRatio) > 1 ? "Bearish tilt" : "Bullish tilt"
                : ""
            }
            subColor={
              typeof stats.pcRatio === "string" && stats.pcRatio !== "—"
                ? parseFloat(stats.pcRatio) > 1 ? "#ef5350" : "var(--sv-positive, #4caf50)"
                : undefined
            }
            icon="pi-arrows-v"
          />
          <StatCard
            label="Call Volume"
            value={fmtNum(stats.totalCallVol)}
            sub="Today's activity"
            subColor="var(--sv-positive, #4caf50)"
            icon="pi-chart-bar"
          />
          <StatCard
            label="Avg Impl. Vol."
            value={fmtIV(stats.avgIV)}
            sub="Across all strikes"
            icon="pi-percentage"
          />
        </div>
      ) : null}

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      {!loadingExpiry && expiryDates.length > 0 && (
        <div className="sv-data-card p-3 flex align-items-center gap-3 flex-wrap">

          {/* Expiry dropdown */}
          <div className="flex align-items-center gap-2">
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--sv-text-muted)", whiteSpace: "nowrap" }}>
              Expiry
            </span>
            <Dropdown
              value={selectedExpiry}
              options={expiryDates}
              optionLabel="name"
              onChange={e => setSelectedExpiry(e.value)}
              style={{ fontSize: "0.82rem", minWidth: 150 }}
              disabled={loadingOptions}
            />
          </div>

          {/* Strike range filter */}
          <div className="flex align-items-center gap-2">
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--sv-text-muted)", whiteSpace: "nowrap" }}>
              Strike
            </span>
            <InputNumber
              value={strikeFrom}
              onValueChange={e => setStrikeFrom(e.value ?? 0)}
              mode="decimal"
              minFractionDigits={0}
              maxFractionDigits={2}
              min={0}
              step={0.5}
              inputStyle={{ width: 80, fontSize: "0.82rem" }}
              placeholder="From"
            />
            <span style={{ color: "var(--sv-text-muted)", fontSize: "0.78rem" }}>–</span>
            <InputNumber
              value={strikeTo}
              onValueChange={e => setStrikeTo(e.value ?? 9999)}
              mode="decimal"
              minFractionDigits={0}
              maxFractionDigits={2}
              min={0}
              step={0.5}
              inputStyle={{ width: 80, fontSize: "0.82rem" }}
              placeholder="To"
            />
          </div>

          {/* View type toggles */}
          <div className="flex align-items-center gap-2 ml-auto">
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--sv-text-muted)" }}>
              View
            </span>
            {(["Side by Side", "Calls", "Puts"] as ViewType[]).map(v => (
              <ToggleBtn key={v} active={viewType === v} label={v} onClick={() => setViewType(v)} />
            ))}
          </div>

          {/* ITM legend */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginLeft: 4,
            background: "rgba(1,152,218,0.08)", border: "1px solid rgba(1,152,218,0.25)",
            borderRadius: 8, padding: "4px 10px",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0198da" }} />
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#0198da" }}>In The Money</span>
          </div>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="sv-data-card p-4 flex align-items-center justify-content-center" style={{ minHeight: 180 }}>
          <div className="text-center">
            <i className="pi pi-exclamation-circle" style={{ fontSize: 36, color: "var(--sv-text-muted)", marginBottom: 12 }} />
            <div style={{ color: "var(--sv-text-muted)", fontSize: "0.88rem" }}>{error}</div>
          </div>
        </div>
      )}

      {/* ── Open Interest Chart ──────────────────────────────────────────────── */}
      {!error && (
        <div className="sv-data-card p-3">
          <div className="flex align-items-center justify-content-between mb-3">
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, color: "var(--sv-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.09em",
            }}>
              Open Interest by Strike — {selectedExpiry?.name ?? ""}
            </span>
          </div>
          {loading ? (
            <Skeleton height="280px" className="border-round-xl" />
          ) : optionsData ? (
            <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={chartRef} />
          ) : null}
        </div>
      )}

      {/* ── Options Chain Table ──────────────────────────────────────────────── */}
      {!loading && !error && optionsData && (
        <div className="sv-data-card p-3">
          {/* Side by side header row */}
          {viewType === "Side by Side" && (
            <div className="flex align-items-center mb-2" style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <div style={{ flex: 1, color: "var(--sv-positive, #4caf50)" }}>
                <i className="pi pi-arrow-up mr-1" />
                Calls
              </div>
              <div style={{ minWidth: 110, textAlign: "center", color: "var(--sv-text-muted)" }}>
                Strike
              </div>
              <div style={{ flex: 1, textAlign: "right", color: "#ef5350" }}>
                Puts
                <i className="pi pi-arrow-down ml-1" />
              </div>
            </div>
          )}

          {viewType === "Side by Side"
            ? renderStraddleTable()
            : renderSingleTable(viewType === "Calls" ? filteredCalls : filteredPuts)
          }
        </div>
      )}

      {/* ── Education cards ──────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="grid" style={{ margin: 0 }}>
          {[
            {
              icon: "pi-question-circle",
              title: "What is an Options Chain?",
              body: "An options chain lists every available call and put contract for a stock at different strike prices and expiration dates. Each contract gives the holder the right — but not the obligation — to buy (call) or sell (put) shares at the stated strike price.",
            },
            {
              icon: "pi-chart-bar",
              title: "Open Interest & Volume",
              body: "Open interest is the total number of outstanding contracts that haven't been settled. Volume is contracts traded today. High OI at a strike often acts as a support or resistance level, and large spikes can indicate where market participants expect price to move.",
            },
            {
              icon: "pi-percentage",
              title: "Implied Volatility (IV)",
              body: "IV reflects the market's expectation of future price movement, extracted from option prices. High IV means options are expensive (big moves expected); low IV means they're cheap. Comparing IV across strikes reveals the \"volatility skew\" — a key gauge of market sentiment.",
            },
          ].map(card => (
            <div key={card.title} className="col-12 md:col-4" style={{ padding: "0.4rem" }}>
              <div className="sv-data-card p-3 h-full flex flex-column gap-2">
                <div className="flex align-items-center gap-2">
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--sv-accent-subtle, rgba(245,166,35,0.12))",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <i className={`pi ${card.icon}`} style={{ fontSize: 15, color: "var(--sv-accent)" }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-color)" }}>
                    {card.title}
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-color-secondary)", lineHeight: 1.6 }}>
                  {card.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default StockOptionsTab;
