import React, { useState, useEffect, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Skeleton } from "primereact/skeleton";
import { ProgressBar } from "primereact/progressbar";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const NON_HUMAN_AGENTS = [
  "fundamentals_agent",
  "sentiment_agent",
  "technical_analyst_agent",
  "valuation_agent",
];

interface AgentRow {
  agentKey: string;
  agentName: string;
  bullish: number;
  neutral: number;
  bearish: number;
}

interface AgentSymbol {
  ticker: string;
  signal: string;
  confidence: number;
}

interface CombinedStats {
  buy: number;
  hold: number;
  short: number;
}

const formatAgentName = (key: string): string =>
  key
    .replace(/_agent$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getSignalColor = (signal: string) => {
  if (signal === "bullish") return "var(--sv-success)";
  if (signal === "bearish") return "var(--sv-danger)";
  return "var(--sv-warning)";
};

const getSignalBg = (signal: string) => {
  if (signal === "bullish") return "var(--sv-success-bg)";
  if (signal === "bearish") return "var(--sv-danger-bg)";
  return "var(--sv-warning-bg)";
};

const getSignalIcon = (signal: string) => {
  if (signal === "bullish") return "pi-arrow-up-right";
  if (signal === "bearish") return "pi-arrow-down-right";
  return "pi-minus";
};

const AiDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [humanAgents, setHumanAgents] = useState<AgentRow[]>([]);
  const [aiAgents, setAiAgents] = useState<AgentRow[]>([]);
  const [combined, setCombined] = useState<CombinedStats | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedSignal, setSelectedSignal] = useState<string>("");
  const [symbols, setSymbols] = useState<AgentSymbol[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  const loadSymbols = useCallback(async (agentKey: string, signal: string) => {
    setSymbolsLoading(true);
    try {
      const res = await api.get(
        `/ai-agents/agent-dec-symbols/${agentKey}/${signal}`
      );
      setSymbols(res.data ?? []);
    } catch {
      setSymbols([]);
    } finally {
      setSymbolsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/ai-agents/summary");
        const data = res.data;
        setCombined(data.combined_decision);

        const human: AgentRow[] = [];
        const ai: AgentRow[] = [];

        Object.entries(data).forEach(([key, val]: [string, any]) => {
          if (key === "combined_decision") return;
          const row: AgentRow = {
            agentKey: key,
            agentName: formatAgentName(key),
            bullish: val.bullish ?? 0,
            neutral: val.neutral ?? 0,
            bearish: val.bearish ?? 0,
          };
          if (NON_HUMAN_AGENTS.includes(key)) ai.push(row);
          else human.push(row);
        });

        setHumanAgents(human);
        setAiAgents(ai);

        if (ai.length > 0) {
          setSelectedAgent(ai[0].agentKey);
          setSelectedSignal("bullish");
          loadSymbols(ai[0].agentKey, "bullish");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSymbols]);

  const handleCellClick = (agentKey: string, signal: string) => {
    setSelectedAgent(agentKey);
    setSelectedSignal(signal);
    loadSymbols(agentKey, signal);
  };

  const renderSignalCell = (
    rowData: AgentRow,
    signal: "bullish" | "neutral" | "bearish"
  ) => {
    const count = rowData[signal];
    const isSelected =
      selectedAgent === rowData.agentKey && selectedSignal === signal;
    const color = getSignalColor(signal);

    return (
      <div
        onClick={() => handleCellClick(rowData.agentKey, signal)}
        style={{
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "44px",
          padding: "3px 12px",
          borderRadius: "999px",
          border: `1.5px solid ${isSelected ? color : "var(--sv-border)"}`,
          backgroundColor: isSelected ? color : "transparent",
          color: isSelected ? "#fff" : color,
          fontWeight: 700,
          fontSize: "0.875rem",
          transition: "all 0.15s ease",
          userSelect: "none",
        }}
      >
        {count}
      </div>
    );
  };

  const renderAgentTable = (
    rows: AgentRow[],
    title: string,
    icon: string
  ) => (
    <div className="mb-3">
      <div className="flex align-items-center gap-2 mb-3">
        <i
          className={`pi ${icon}`}
          style={{ color: "var(--sv-accent)", fontSize: "0.9rem" }}
        />
        <span
          style={{
            color: "var(--sv-text-secondary)",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {title}
        </span>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="2.2rem" className="mb-2" />
          ))}
        </div>
      ) : (
        <DataTable value={rows} size="small" showGridlines style={{ fontSize: "0.875rem" }}>
          <Column
            field="agentName"
            header="Analyst"
            style={{ color: "var(--sv-text-primary)", fontWeight: 500 }}
          />
          <Column
            header={
              <span style={{ color: "var(--sv-success)", fontWeight: 700 }}>
                Bullish
              </span>
            }
            body={(row) => renderSignalCell(row, "bullish")}
            style={{ textAlign: "center", width: "90px" }}
          />
          <Column
            header={
              <span style={{ color: "var(--sv-warning)", fontWeight: 700 }}>
                Neutral
              </span>
            }
            body={(row) => renderSignalCell(row, "neutral")}
            style={{ textAlign: "center", width: "90px" }}
          />
          <Column
            header={
              <span style={{ color: "var(--sv-danger)", fontWeight: 700 }}>
                Bearish
              </span>
            }
            body={(row) => renderSignalCell(row, "bearish")}
            style={{ textAlign: "center", width: "90px" }}
          />
        </DataTable>
      )}
    </div>
  );

  const selectedAgentName =
    [...humanAgents, ...aiAgents].find((a) => a.agentKey === selectedAgent)
      ?.agentName ?? "";
  const signalColor = getSignalColor(selectedSignal);
  const signalBg = getSignalBg(selectedSignal);
  const signalLabel =
    selectedSignal.charAt(0).toUpperCase() + selectedSignal.slice(1);

  const totalBullish = (combined?.buy ?? 0);
  const totalNeutral = (combined?.hold ?? 0);
  const totalBearish = (combined?.short ?? 0);
  const totalAll = totalBullish + totalNeutral + totalBearish || 1;

  return (
    <div className="p-3 md:p-4">
      {/* ── Page header ── */}
      <div className="flex align-items-center gap-2 mb-1">
        <i
          className="pi pi-microchip-ai"
          style={{ color: "var(--sv-accent)", fontSize: "1.4rem" }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--sv-text-primary)",
          }}
        >
          AI Agent Decisions
        </h1>
      </div>
      <p
        style={{
          margin: "0 0 1.25rem",
          color: "var(--sv-text-secondary)",
          fontSize: "0.875rem",
        }}
      >
        Aggregated signals from human analysts and AI-powered agents across your
        universe
      </p>

      {/* ── Combined consensus bar ── */}
      {!loading && combined && (
        <Card
          className="mb-4"
          style={{
            background: "var(--sv-bg-card)",
            border: "1px solid var(--sv-border)",
          }}
        >
          <div className="flex align-items-center gap-2 mb-3">
            <span
              style={{
                color: "var(--sv-text-secondary)",
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Combined Consensus
            </span>
            <Tag
              value={`${totalAll} Symbols`}
              style={{
                background: "var(--sv-accent-bg)",
                color: "var(--sv-accent)",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            />
          </div>

          {/* Stacked bar */}
          <div
            style={{
              display: "flex",
              borderRadius: "6px",
              overflow: "hidden",
              height: "12px",
              marginBottom: "12px",
            }}
          >
            <div
              title={`Bullish: ${totalBullish}`}
              style={{
                flex: totalBullish,
                background: "var(--sv-success)",
                transition: "flex 0.5s ease",
              }}
            />
            <div
              title={`Neutral: ${totalNeutral}`}
              style={{
                flex: totalNeutral,
                background: "var(--sv-warning)",
                transition: "flex 0.5s ease",
              }}
            />
            <div
              title={`Bearish: ${totalBearish}`}
              style={{
                flex: totalBearish,
                background: "var(--sv-danger)",
                transition: "flex 0.5s ease",
              }}
            />
          </div>

          <div className="flex gap-4">
            {[
              { label: "Bullish", value: totalBullish, signal: "bullish" },
              { label: "Neutral", value: totalNeutral, signal: "neutral" },
              { label: "Bearish", value: totalBearish, signal: "bearish" },
            ].map(({ label, value, signal }) => {
              const c = getSignalColor(signal);
              return (
                <div key={signal} className="flex align-items-center gap-2">
                  <i
                    className={`pi ${getSignalIcon(signal)}`}
                    style={{ color: c, fontSize: "0.9rem" }}
                  />
                  <span
                    style={{ color: c, fontWeight: 800, fontSize: "1.1rem" }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      color: "var(--sv-text-secondary)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      color: "var(--sv-text-muted)",
                      fontSize: "0.75rem",
                    }}
                  >
                    ({Math.round((value / totalAll) * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {loading && (
        <Skeleton height="6rem" className="mb-4" />
      )}

      {/* ── Main two-panel layout ── */}
      <div className="grid">
        {/* Left: Agent tables */}
        <div className="col-12 lg:col-7">
          <Card
            style={{
              background: "var(--sv-bg-card)",
              border: "1px solid var(--sv-border)",
              height: "100%",
            }}
          >
            {renderAgentTable(humanAgents, "Human Analysts", "pi-user")}
            <Divider style={{ margin: "0.75rem 0" }} />
            {renderAgentTable(aiAgents, "AI Agents", "pi-microchip-ai")}
            <p
              style={{
                margin: "0.75rem 0 0",
                color: "var(--sv-text-muted)",
                fontSize: "0.75rem",
              }}
            >
              Click any signal count to load the corresponding symbol list →
            </p>
          </Card>
        </div>

        {/* Right: Symbol panel */}
        <div className="col-12 lg:col-5">
          <Card
            style={{
              background: "var(--sv-bg-card)",
              border: "1px solid var(--sv-border)",
              height: "100%",
            }}
          >
            {selectedAgent ? (
              <>
                {/* Panel header */}
                <div className="flex align-items-start justify-content-between mb-3">
                  <div>
                    <div
                      style={{
                        color: "var(--sv-text-muted)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "4px",
                      }}
                    >
                      Agent
                    </div>
                    <div
                      style={{
                        color: "var(--sv-text-primary)",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      {selectedAgentName}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 14px",
                      borderRadius: "999px",
                      backgroundColor: signalBg,
                      color: signalColor,
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      border: `1.5px solid ${signalColor}`,
                    }}
                  >
                    <i
                      className={`pi ${getSignalIcon(selectedSignal)} mr-1`}
                      style={{ fontSize: "0.75rem" }}
                    />
                    {signalLabel}
                  </div>
                </div>
                <Divider style={{ margin: "0 0 0.75rem" }} />

                {/* Symbol list */}
                {symbolsLoading ? (
                  <div>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height="2rem" className="mb-2" />
                    ))}
                  </div>
                ) : symbols.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--sv-text-muted)",
                      padding: "3rem 1rem",
                    }}
                  >
                    <i
                      className="pi pi-inbox"
                      style={{
                        fontSize: "2rem",
                        display: "block",
                        marginBottom: "0.75rem",
                      }}
                    />
                    No symbols found for this signal
                  </div>
                ) : (
                  <DataTable
                    value={symbols}
                    size="small"
                    paginator
                    rows={15}
                    sortField="confidence"
                    sortOrder={-1}
                    style={{ fontSize: "0.875rem" }}
                  >
                    <Column
                      field="ticker"
                      header="Symbol"
                      sortable
                      body={(row) => (
                        <span
                          onClick={() => navigate(`/ai-tools/${row.ticker}`)}
                          style={{
                            color: "var(--sv-accent)",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                          }}
                        >
                          {row.ticker}
                        </span>
                      )}
                    />
                    <Column
                      field="signal"
                      header="Signal"
                      sortable
                      body={(row) => {
                        const s = row.signal?.toLowerCase() ?? "";
                        const isBull = s === "bullish" || s === "buy";
                        const isBear =
                          s === "bearish" || s === "sell" || s === "short";
                        const c = isBull
                          ? "var(--sv-success)"
                          : isBear
                          ? "var(--sv-danger)"
                          : "var(--sv-warning)";
                        return (
                          <span
                            style={{
                              color: c,
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </span>
                        );
                      }}
                    />
                    <Column
                      field="confidence"
                      header="Confidence"
                      sortable
                      body={(row) => (
                        <div
                          className="flex align-items-center gap-2"
                          style={{ minWidth: "100px" }}
                        >
                          <ProgressBar
                            value={row.confidence}
                            showValue={false}
                            style={{ flex: 1, height: "6px" }}
                            color={signalColor}
                          />
                          <span
                            style={{
                              color: "var(--sv-text-secondary)",
                              fontSize: "0.8rem",
                              minWidth: "34px",
                              textAlign: "right",
                            }}
                          >
                            {Math.round(row.confidence)}%
                          </span>
                        </div>
                      )}
                    />
                  </DataTable>
                )}
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--sv-text-muted)",
                  padding: "4rem 1rem",
                }}
              >
                <i
                  className="pi pi-arrow-circle-left"
                  style={{ fontSize: "2rem", display: "block", marginBottom: "0.75rem" }}
                />
                <div style={{ fontSize: "0.9rem" }}>
                  Select an agent signal to view matching symbols
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <p
        style={{
          marginTop: "1.5rem",
          color: "var(--sv-text-muted)",
          fontSize: "0.75rem",
          textAlign: "center",
        }}
      >
        AI-generated signals are for informational purposes only and do not
        constitute financial advice. Past performance does not guarantee future
        results.
      </p>
    </div>
  );
};

export default AiDashboardPage;
