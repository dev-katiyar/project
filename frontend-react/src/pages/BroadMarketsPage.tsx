import React, { useState, useEffect, useRef } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";

/* ── Tab config ───────────────────────────────────────────────────────────── */

const TABS = [
  { label: "Asset Class",     icon: "pi-chart-bar",    typeId: "5"  },
  { label: "Global Equities", icon: "pi-globe",         typeId: "7"  },
  { label: "Bonds",           icon: "pi-percentage",    typeId: "24" },
  { label: "Commodities",     icon: "pi-box",           typeId: "43" },
  { label: "Asia Pacific",    icon: "pi-map-marker",    typeId: "23" },
];

/* ── Types ────────────────────────────────────────────────────────────────── */

interface TechnicalRow {
  symbol:        string;
  alternate_name: string;
  rating:        number;
  price:         number;
  priceChange:   number;
  priceChangePct: number;
  mtd:           number;
  ytd:           number;
  low52:         number;
  high52:        number;
  rsi:           number;
  sma20:         number;
  sma50:         number;
  sma100:        number;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const fmtPrice = (v?: number) =>
  v != null
    ? v.toLocaleString("en-US", {
        style: "currency", currency: "USD",
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })
    : "—";

const fmtPct = (v?: number) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—";

const getRatingInfo = (r: number) => {
  if (r >= 7) return { label: "Bullish", color: "var(--sv-gain)",    bg: "rgba(34,197,94,0.12)"   };
  if (r >= 4) return { label: "Neutral", color: "var(--sv-warning)", bg: "rgba(245,166,35,0.12)"  };
  return           { label: "Bearish", color: "var(--sv-loss)",    bg: "rgba(239,68,68,0.12)"   };
};

const getRsiInfo = (rsi: number) => {
  if (rsi < 30) return { label: "Oversold",   color: "var(--sv-gain)"       };
  if (rsi < 45) return { label: "Near OS",    color: "#86efac"              };
  if (rsi < 55) return { label: "Neutral",    color: "var(--sv-text-secondary)" };
  if (rsi < 70) return { label: "Near OB",    color: "#fca5a5"              };
  return             { label: "Overbought", color: "var(--sv-loss)"       };
};

/* ── Column body renderers ────────────────────────────────────────────────── */

const symbolBody = (row: TechnicalRow) => (
  <span
    style={{
      fontWeight: 700,
      color: "var(--sv-accent)",
      fontFamily: "'Courier New', monospace",
      fontSize: "0.9rem",
      letterSpacing: "0.04em",
      cursor: "pointer",
    }}
  >
    {row.symbol}
  </span>
);

const nameBody = (row: TechnicalRow) => (
  <span style={{ color: "var(--sv-text-primary)", fontSize: "0.85rem" }}>
    {row.alternate_name}
  </span>
);

const ratingBody = (row: TechnicalRow) => {
  const info = getRatingInfo(row.rating ?? 0);
  const barPct = ((row.rating ?? 0) / 10) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <div
        style={{
          width: "2.1rem", height: "2.1rem", borderRadius: "50%",
          background: info.bg, border: `2px solid ${info.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", fontWeight: 700, color: info.color, flexShrink: 0,
        }}
      >
        {row.rating ?? "—"}
      </div>
      <div style={{ flex: 1, minWidth: "4.5rem" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: info.color, marginBottom: "0.2rem" }}>
          {info.label}
        </div>
        <div style={{ height: "3px", background: "var(--sv-border)", borderRadius: "2px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%", width: `${barPct}%`,
              background: info.color, borderRadius: "2px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
};

const priceBody = (row: TechnicalRow) => (
  <span
    style={{
      fontFamily: "'Courier New', monospace",
      fontWeight: 600, color: "var(--sv-text-primary)", fontSize: "0.9rem",
    }}
  >
    {fmtPrice(row.price)}
  </span>
);

const changeBody = (row: TechnicalRow) => {
  const isUp = (row.priceChange ?? 0) >= 0;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        color: isUp ? "var(--sv-gain)" : "var(--sv-loss)",
      }}
    >
      <i className={`pi ${isUp ? "pi-arrow-up" : "pi-arrow-down"}`} style={{ fontSize: "0.65rem" }} />
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.875rem", fontWeight: 600 }}>
        {fmtPct(row.priceChangePct)}
      </span>
    </div>
  );
};

const pctBody = (field: "mtd" | "ytd") => (row: TechnicalRow) => {
  const val = row[field];
  const isUp = (val ?? 0) >= 0;
  return (
    <span
      style={{
        fontFamily: "'Courier New', monospace", fontSize: "0.875rem",
        fontWeight: 600, color: isUp ? "var(--sv-gain)" : "var(--sv-loss)",
      }}
    >
      {fmtPct(val)}
    </span>
  );
};

const rangeBody = (row: TechnicalRow) => {
  const { low52, high52, price } = row;
  const range = (high52 ?? 0) - (low52 ?? 0);
  const pct = range > 0 ? Math.min(Math.max(((price - low52) / range) * 100, 0), 100) : 50;
  return (
    <div style={{ minWidth: "10rem", padding: "0 0.25rem" }}>
      <div
        style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: "0.35rem", fontSize: "0.67rem", color: "var(--sv-text-muted)",
        }}
      >
        <span>{fmtPrice(low52)}</span>
        <span>{fmtPrice(high52)}</span>
      </div>
      <div style={{ position: "relative", height: "6px", background: "var(--sv-border)", borderRadius: "3px" }}>
        <div
          style={{
            position: "absolute", inset: 0, width: `${pct}%`,
            background: "linear-gradient(90deg, var(--sv-loss), var(--sv-accent) 50%, var(--sv-gain))",
            borderRadius: "3px",
          }}
        />
        <div
          style={{
            position: "absolute", top: "50%", left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: "11px", height: "11px", borderRadius: "50%",
            background: "var(--sv-accent)", border: "2px solid var(--sv-bg-card)",
            boxShadow: "0 0 5px rgba(245,166,35,0.55)",
          }}
        />
      </div>
    </div>
  );
};

const rsiBody = (row: TechnicalRow) => {
  const info = getRsiInfo(row.rsi ?? 50);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
      <span
        style={{
          fontFamily: "'Courier New', monospace", fontWeight: 700,
          fontSize: "0.9rem", color: info.color,
        }}
      >
        {row.rsi != null ? row.rsi.toFixed(1) : "—"}
      </span>
      <span style={{ fontSize: "0.63rem", color: info.color, fontWeight: 600, letterSpacing: "0.02em" }}>
        {info.label}
      </span>
    </div>
  );
};

const smaBody = (field: "sma20" | "sma50" | "sma100") => (row: TechnicalRow) => {
  const val = row[field];
  const pctDiff =
    val != null && row.price != null && val !== 0
      ? ((row.price - val) / val) * 100
      : null;
  const isAbove = pctDiff != null && pctDiff >= 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.8rem", color: "var(--sv-text-primary)" }}>
        {fmtPrice(val)}
      </span>
      {pctDiff != null && (
        <span
          style={{
            fontSize: "0.64rem", fontWeight: 600,
            color: isAbove ? "var(--sv-gain)" : "var(--sv-loss)",
          }}
        >
          {isAbove ? "▲" : "▼"} {Math.abs(pctDiff).toFixed(1)}%
        </span>
      )}
    </div>
  );
};

/* ── Skeleton loader ──────────────────────────────────────────────────────── */

const TableSkeleton = () => (
  <div style={{ padding: "0.5rem 1rem" }}>
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "0.8rem", alignItems: "center" }}>
        <Skeleton width="5rem"  height="1.5rem" borderRadius="4px" />
        <Skeleton width="14rem" height="1.5rem" borderRadius="4px" />
        <Skeleton width="8rem"  height="1.5rem" borderRadius="4px" />
        <Skeleton width="6rem"  height="1.5rem" borderRadius="4px" />
        <Skeleton width="6rem"  height="1.5rem" borderRadius="4px" />
        <Skeleton width="5rem"  height="1.5rem" borderRadius="4px" />
        <Skeleton width="5rem"  height="1.5rem" borderRadius="4px" />
        <Skeleton width="10rem" height="1.5rem" borderRadius="4px" />
        <Skeleton width="5rem"  height="1.5rem" borderRadius="4px" />
      </div>
    ))}
  </div>
);

/* ── Main component ───────────────────────────────────────────────────────── */

const BroadMarketsPage: React.FC = () => {
  const [activeTab,       setActiveTab]       = useState(0);
  const [technicalsCache, setTechnicalsCache] = useState<Record<string, TechnicalRow[]>>({});
  const [loadingTabs,     setLoadingTabs]     = useState<Record<string, boolean>>({});

  const loadedRef  = useRef<Set<string>>(new Set());
  const loadingRef = useRef<Set<string>>(new Set());

  const loadTab = async (tabIndex: number) => {
    const tab = TABS[tabIndex];
    if (loadedRef.current.has(tab.typeId) || loadingRef.current.has(tab.typeId)) return;

    loadingRef.current.add(tab.typeId);
    setLoadingTabs((prev) => ({ ...prev, [tab.typeId]: true }));

    try {
      const symbolsRes = await api.get<string[]>(`/symbol/list_type/${tab.typeId}`);
      const symbols = symbolsRes.data;
      if (Array.isArray(symbols) && symbols.length > 0) {
        const techRes = await api.get<TechnicalRow[]>(`/symbol/technical/${symbols.join(",")}`);
        setTechnicalsCache((prev) => ({ ...prev, [tab.typeId]: techRes.data ?? [] }));
      } else {
        setTechnicalsCache((prev) => ({ ...prev, [tab.typeId]: [] }));
      }
      loadedRef.current.add(tab.typeId);
    } catch {
      setTechnicalsCache((prev) => ({ ...prev, [tab.typeId]: [] }));
    } finally {
      loadingRef.current.delete(tab.typeId);
      setLoadingTabs((prev) => ({ ...prev, [tab.typeId]: false }));
    }
  };

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTable = (typeId: string) => {
    const data = technicalsCache[typeId];
    if (!data || loadingTabs[typeId]) return <TableSkeleton />;

    return (
      <DataTable
        value={data}
        sortMode="single"
        removableSort
        size="small"
        scrollable
        scrollHeight="calc(100vh - 310px)"
        stripedRows
        showGridlines={false}
        rowHover
        emptyMessage="No data available."
        style={{ fontSize: "0.85rem" }}
      >
        <Column field="symbol"        header="Symbol"    sortable body={symbolBody}         style={{ minWidth: "6rem"  }} />
        <Column field="alternate_name" header="Name"     sortable body={nameBody}           style={{ minWidth: "13rem" }} />
        <Column field="rating"        header="Trend"     sortable body={ratingBody}         style={{ minWidth: "10rem" }} />
        <Column field="price"         header="Last"      sortable body={priceBody}          style={{ minWidth: "7rem"  }} />
        <Column field="priceChangePct" header="1D %"     sortable body={changeBody}         style={{ minWidth: "7rem"  }} />
        <Column field="mtd"           header="MTD"       sortable body={pctBody("mtd")}     style={{ minWidth: "6rem"  }} />
        <Column field="ytd"           header="YTD"       sortable body={pctBody("ytd")}     style={{ minWidth: "6rem"  }} />
        <Column                        header="52-Wk"            body={rangeBody}           style={{ minWidth: "12rem" }} />
        <Column field="rsi"           header="RSI"       sortable body={rsiBody}            style={{ minWidth: "6.5rem", textAlign: "center" as const }} />
        <Column field="sma20"         header="SMA 20"    sortable body={smaBody("sma20")}   style={{ minWidth: "7rem"  }} />
        <Column field="sma50"         header="SMA 50"    sortable body={smaBody("sma50")}   style={{ minWidth: "7rem"  }} />
        <Column field="sma100"        header="SMA 100"   sortable body={smaBody("sma100")}  style={{ minWidth: "7rem"  }} />
      </DataTable>
    );
  };

  return (
    <div style={{ padding: "1.5rem 2rem", minHeight: "100vh", background: "var(--sv-bg-body)" }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          marginBottom: "1.5rem", paddingBottom: "1rem",
          borderBottom: "1px solid var(--sv-border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
            <div
              style={{
                width: "3px", height: "1.75rem",
                background: "var(--sv-accent-gradient)", borderRadius: "2px",
              }}
            />
            <h1
              style={{
                fontSize: "1.55rem", fontWeight: 700,
                color: "var(--sv-text-primary)", margin: 0, letterSpacing: "-0.02em",
              }}
            >
              Broad Markets
            </h1>
          </div>
          <p
            style={{
              color: "var(--sv-text-secondary)", fontSize: "0.83rem",
              margin: 0, paddingLeft: "1rem",
            }}
          >
            Technical indicators across global asset classes · sortable &amp; filterable
          </p>
        </div>

        {/* Live indicator */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.35rem 0.85rem",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "2rem",
          }}
        >
          <span
            style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "var(--sv-gain)", display: "inline-block",
              boxShadow: "0 0 6px var(--sv-gain)",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--sv-gain)" }}>
            Live Data
          </span>
        </div>
      </div>

      {/* ── Legend strip ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "1.5rem",
          marginBottom: "1rem", flexWrap: "wrap",
        }}
      >
        {[
          { label: "Bullish (7–10)", color: "var(--sv-gain)"    },
          { label: "Neutral (4–6)", color: "var(--sv-warning)" },
          { label: "Bearish (0–3)", color: "var(--sv-loss)"    },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div
              style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: color,
              }}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)" }}>{label}</span>
          </div>
        ))}
        <div style={{ width: "1px", height: "12px", background: "var(--sv-border)" }} />
        <span style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)" }}>
          SMA % = distance from last price &nbsp;·&nbsp; RSI: &lt;30 oversold, &gt;70 overbought
        </span>
      </div>

      {/* ── Tab card ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
          borderRadius: "0.75rem",
          overflow: "hidden",
          boxShadow: "var(--sv-shadow-md)",
        }}
      >
        <TabView
          activeIndex={activeTab}
          onTabChange={(e) => setActiveTab(e.index)}
        >
          {TABS.map((tab) => (
            <TabPanel
              key={tab.typeId}
              header={tab.label}
              leftIcon={`pi ${tab.icon} mr-2`}
            >
              <div style={{ padding: "0.25rem 0" }}>
                {renderTable(tab.typeId)}
              </div>
            </TabPanel>
          ))}
        </TabView>
      </div>

      {/* ── Pulse animation ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default BroadMarketsPage;
