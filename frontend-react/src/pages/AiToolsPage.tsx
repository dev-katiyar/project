import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Skeleton } from "primereact/skeleton";
import { ProgressBar } from "primereact/progressbar";
import { Panel } from "primereact/panel";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "@/services/api";

const NON_HUMAN_AGENTS = [
  "fundamentals_agent",
  "sentiment_agent",
  "technical_analyst_agent",
  "valuation_agent",
];

const EXCLUDED_AGENTS = ["risk_management_agent"];

interface AgentDecision {
  agentKey: string;
  agentName: string;
  signal: string;
  confidence: number;
  reasoning: any;
  description: string;
  isHuman: boolean;
  superInvestorCode?: string;
}

interface CombinedDecision {
  action: string;
  confidence: number;
  reasoning: any;
  signal: string;
}

const formatAgentName = (key: string): string =>
  key
    .replace(/_agent$/, "")
    .replace(/analyst$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .trim();

/** Safely extract a display string from a value that might be an object */
const toStr = (val: any): string => {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    // Descriptions API sometimes returns {code, description}
    return val.description ?? val.text ?? val.name ?? JSON.stringify(val);
  }
  return String(val);
};

const getSignalColor = (signal: string) => {
  const s = signal?.toLowerCase() ?? "";
  if (s === "bullish" || s === "buy") return "var(--sv-success)";
  if (s === "bearish" || s === "sell" || s === "short") return "var(--sv-danger)";
  return "var(--sv-warning)";
};

const getSignalBg = (signal: string) => {
  const s = signal?.toLowerCase() ?? "";
  if (s === "bullish" || s === "buy") return "var(--sv-success-bg)";
  if (s === "bearish" || s === "sell" || s === "short") return "var(--sv-danger-bg)";
  return "var(--sv-warning-bg)";
};

const getSignalIcon = (signal: string) => {
  const s = signal?.toLowerCase() ?? "";
  if (s === "bullish" || s === "buy") return "pi-arrow-up-right";
  if (s === "bearish" || s === "sell" || s === "short") return "pi-arrow-down-right";
  return "pi-minus";
};

const normalizeLabel = (signal: string) => {
  const s = signal?.toLowerCase() ?? "";
  if (s === "buy") return "Bullish";
  if (s === "sell" || s === "short") return "Bearish";
  if (s === "hold") return "Neutral";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ── Confidence ring (SVG-based) ──────────────────────────────────────────────
const ConfidenceRing: React.FC<{ value: number; color: string }> = ({
  value,
  color,
}) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="var(--sv-border)"
        strokeWidth="5"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text
        x="36"
        y="40"
        textAnchor="middle"
        fill={color}
        fontSize="13"
        fontWeight="800"
        fontFamily="inherit"
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
};

// ── Reasoning display ─────────────────────────────────────────────────────────
const ReasoningDisplay: React.FC<{ reasoning: any }> = ({ reasoning }) => {
  if (!reasoning) return null;

  if (typeof reasoning === "string") {
    return (
      <p
        style={{
          color: "var(--sv-text-secondary)",
          fontSize: "0.8rem",
          margin: 0,
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
        }}
      >
        {reasoning}
      </p>
    );
  }

  if (typeof reasoning === "object" && !Array.isArray(reasoning)) {
    const rows = Object.entries(reasoning);
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <tbody>
            {rows.map(([key, val]) => (
              <tr key={key} style={{ borderBottom: "1px solid var(--sv-border)" }}>
                <td
                  style={{
                    padding: "5px 8px",
                    color: "var(--sv-text-secondary)",
                    width: "42%",
                    fontWeight: 600,
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    color: "var(--sv-text-primary)",
                    wordBreak: "break-word",
                  }}
                >
                  {typeof val === "object"
                    ? JSON.stringify(val)
                    : String(val ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
};

// ── Agent decision card ───────────────────────────────────────────────────────
const AgentCard: React.FC<{ agent: AgentDecision }> = ({ agent }) => {
  const color = getSignalColor(agent.signal);
  const bg = getSignalBg(agent.signal);
  const icon = getSignalIcon(agent.signal);
  const label = normalizeLabel(agent.signal);

  return (
    <Card
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid var(--sv-border)`,
        borderTop: `3px solid ${color}`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Card header */}
      <div className="flex align-items-start justify-content-between mb-3">
        <div>
          {!agent.isHuman && (
            <Tag
              value="AI Agent"
              style={{
                background: "var(--sv-accent-bg)",
                color: "var(--sv-accent)",
                fontSize: "0.65rem",
                fontWeight: 700,
                marginBottom: "4px",
                display: "block",
              }}
            />
          )}
          {agent.isHuman && (
            <Tag
              value="Human Analyst"
              style={{
                background: "var(--sv-info-bg)",
                color: "var(--sv-info)",
                fontSize: "0.65rem",
                fontWeight: 700,
                marginBottom: "4px",
                display: "block",
              }}
            />
          )}
          <span
            style={{
              color: "var(--sv-text-primary)",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {agent.agentName}
          </span>
        </div>

        {/* Signal badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <ConfidenceRing value={agent.confidence} color={color} />
          <div
            style={{
              padding: "2px 10px",
              borderRadius: "999px",
              backgroundColor: bg,
              border: `1.5px solid ${color}`,
              color,
              fontWeight: 700,
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <i className={`pi ${icon}`} style={{ fontSize: "0.7rem" }} />
            {label}
          </div>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <div
          style={{
            color: "var(--sv-text-secondary)",
            fontSize: "0.8rem",
            margin: "0 0 12px",
            lineHeight: 1.55,
          }}
          dangerouslySetInnerHTML={{ __html: agent.description }}
        />
      )}

      {/* Reasoning */}
      {agent.reasoning && (
        <Panel
          header="Reasoning"
          toggleable
          collapsed
          style={{ border: "none", padding: 0, marginTop: "auto" }}
        >
          <ReasoningDisplay reasoning={agent.reasoning} />
        </Panel>
      )}
    </Card>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const AiToolsPage: React.FC = () => {
  const { symbol: routeSymbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [inputSymbol, setInputSymbol] = useState(
    routeSymbol?.toUpperCase() ?? ""
  );
  const [activeSymbol, setActiveSymbol] = useState(
    routeSymbol?.toUpperCase() ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [combinedDecision, setCombinedDecision] =
    useState<CombinedDecision | null>(null);
  const [humanAgents, setHumanAgents] = useState<AgentDecision[]>([]);
  const [aiAgents, setAiAgents] = useState<AgentDecision[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentDecision | null>(
    null
  );
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  const loadData = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    setCombinedDecision(null);
    setHumanAgents([]);
    setAiAgents([]);
    setSelectedAgent(null);
    try {
      const [decisionsRes, descRes] = await Promise.all([
        api.get(`/ai-agents/decisions/${sym}`),
        api.get("/ai-agents/descriptions"),
      ]);
      const data = decisionsRes.data;
      const descMap: Record<string, string> = descRes.data ?? {};
      setDescriptions(descMap);

      const cd = data.combined_decision;
      setCombinedDecision({
        action: cd.action,
        confidence: cd.confidence ?? 0,
        reasoning: cd.reasoning,
        signal: cd.signal ?? cd.signalClass ?? cd.action,
      });

      const human: AgentDecision[] = [];
      const ai: AgentDecision[] = [];

      Object.entries(data.analyst_signals ?? {}).forEach(
        ([key, val]: [string, any]) => {
          if (EXCLUDED_AGENTS.includes(key)) return;
          const isHuman = !NON_HUMAN_AGENTS.includes(key);
          const decision: AgentDecision = {
            agentKey: key,
            agentName: formatAgentName(key),
            signal: val.signal ?? val.signalClass ?? val.action,
            confidence: val.confidence ?? 0,
            reasoning: val.reasoning,
            description: toStr(descMap[key] ?? val.description),
            isHuman,
            superInvestorCode: val.superInvestorCode,
          };
          if (isHuman) human.push(decision);
          else ai.push(decision);
        }
      );

      setHumanAgents(human);
      setAiAgents(ai);
      if (ai.length > 0) setSelectedAgent(ai[0]);
      else if (human.length > 0) setSelectedAgent(human[0]);
      setActiveSymbol(sym);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeSymbol) {
      const sym = routeSymbol.toUpperCase();
      setInputSymbol(sym);
      loadData(sym);
    }
  }, [routeSymbol, loadData]);

  const handleSearch = () => {
    const sym = inputSymbol.trim().toUpperCase();
    if (!sym) return;
    navigate(`/ai-tools/${sym}`);
  };

  const allAgents = [...aiAgents, ...humanAgents];
  const hasData = combinedDecision !== null;
  const signalColor = hasData
    ? getSignalColor(combinedDecision!.signal)
    : "var(--sv-text-muted)";
  const signalBg = hasData
    ? getSignalBg(combinedDecision!.signal)
    : "transparent";
  const signalLabel = hasData ? normalizeLabel(combinedDecision!.signal) : "—";

  return (
    <div className="p-3 md:p-4">
      {/* ── Page header + search ── */}
      <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
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
              AI Agent Analysis
            </h1>
            {activeSymbol && (
              <Tag
                value={activeSymbol}
                style={{
                  background: "var(--sv-accent-bg)",
                  color: "var(--sv-accent)",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                }}
              />
            )}
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--sv-text-secondary)",
              fontSize: "0.875rem",
            }}
          >
            Deep AI-powered analysis and reasoning for any ticker
          </p>
        </div>

        {/* Symbol search */}
        <div className="p-inputgroup" style={{ maxWidth: "280px" }}>
          <InputText
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ticker (e.g. AAPL)"
            style={{ fontWeight: 700, letterSpacing: "0.05em" }}
          />
          <Button
            icon="pi pi-search"
            onClick={handleSearch}
            style={{
              background: "var(--sv-accent)",
              borderColor: "var(--sv-accent)",
              color: "var(--sv-text-inverse)",
            }}
          />
        </div>
      </div>

      {/* ── Empty state ── */}
      {!activeSymbol && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            color: "var(--sv-text-muted)",
          }}
        >
          <i
            className="pi pi-search"
            style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}
          />
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              color: "var(--sv-text-secondary)",
            }}
          >
            Enter a symbol to begin
          </div>
          <div style={{ fontSize: "0.875rem" }}>
            Type any stock ticker above and press Search or Enter
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div>
          <Skeleton height="9rem" className="mb-4" borderRadius="8px" />
          <div className="grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="col-12 md:col-6 lg:col-3">
                <Skeleton height="15rem" borderRadius="8px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Data ── */}
      {!loading && hasData && (
        <>
          {/* Combined decision banner */}
          <Card
            className="mb-4"
            style={{
              background: `linear-gradient(135deg, var(--sv-bg-card) 60%, ${signalBg} 100%)`,
              border: `1px solid ${signalColor}55`,
            }}
          >
            <div className="grid align-items-center">
              <div className="col-12 md:col-9">
                <div className="flex align-items-center gap-3 mb-3 flex-wrap">
                  <div
                    style={{
                      padding: "6px 20px",
                      borderRadius: "999px",
                      backgroundColor: signalBg,
                      border: `2px solid ${signalColor}`,
                      color: signalColor,
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      letterSpacing: "0.06em",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <i
                      className={`pi ${getSignalIcon(combinedDecision!.signal)}`}
                    />
                    {signalLabel}
                  </div>
                  <span
                    style={{
                      color: "var(--sv-text-primary)",
                      fontWeight: 800,
                      fontSize: "1.4rem",
                      letterSpacing: "0.05em",
                      fontFamily: "monospace",
                    }}
                  >
                    {activeSymbol}
                  </span>
                  <span
                    style={{
                      color: "var(--sv-text-secondary)",
                      fontSize: "0.875rem",
                    }}
                  >
                    AI Consensus
                  </span>
                  <Tag
                    value={`${allAgents.length} Agents`}
                    style={{
                      background: "var(--sv-bg-surface)",
                      color: "var(--sv-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  />
                </div>

                {/* Confidence bar */}
                <div className="flex align-items-center gap-3">
                  <span
                    style={{
                      color: "var(--sv-text-secondary)",
                      fontSize: "0.8rem",
                      minWidth: "72px",
                    }}
                  >
                    Confidence
                  </span>
                  <div style={{ flex: 1, maxWidth: "240px" }}>
                    <ProgressBar
                      value={combinedDecision!.confidence}
                      showValue={false}
                      style={{ height: "8px" }}
                      color={signalColor}
                    />
                  </div>
                  <span
                    style={{
                      color: signalColor,
                      fontWeight: 800,
                      fontSize: "1.25rem",
                    }}
                  >
                    {Math.round(combinedDecision!.confidence)}%
                  </span>
                </div>
              </div>

              {/* Large signal indicator */}
              <div className="col-12 md:col-3 flex justify-content-center md:justify-content-end">
                <ConfidenceRing
                  value={combinedDecision!.confidence}
                  color={signalColor}
                />
              </div>
            </div>

            {/* Reasoning */}
            {combinedDecision!.reasoning && (
              <>
                <Divider style={{ margin: "0.75rem 0" }} />
                <Panel header="Consensus Reasoning" toggleable collapsed>
                  <ReasoningDisplay reasoning={combinedDecision!.reasoning} />
                </Panel>
              </>
            )}
          </Card>

          {/* ── Two-column layout: agent list + detail ── */}
          <div className="grid">
            {/* Agent summary table */}
            <div className="col-12 lg:col-4">
              <Card
                style={{
                  background: "var(--sv-bg-card)",
                  border: "1px solid var(--sv-border)",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    color: "var(--sv-text-secondary)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "12px",
                  }}
                >
                  Agent Signals
                </div>
                <DataTable
                  value={allAgents}
                  size="small"
                  selectionMode="single"
                  selection={selectedAgent}
                  onSelectionChange={(e) => setSelectedAgent(e.value as AgentDecision)}
                  dataKey="agentKey"
                  style={{ fontSize: "0.875rem" }}
                >
                  <Column
                    field="agentName"
                    header="Agent"
                    body={(row) => (
                      <span style={{ color: "var(--sv-text-primary)", fontWeight: 600 }}>
                        {row.agentName}
                      </span>
                    )}
                  />
                  <Column
                    field="signal"
                    header="Signal"
                    body={(row) => {
                      const c = getSignalColor(row.signal);
                      const lbl = normalizeLabel(row.signal);
                      return (
                        <span
                          style={{ color: c, fontWeight: 700, fontSize: "0.8rem" }}
                        >
                          {lbl}
                        </span>
                      );
                    }}
                  />
                  <Column
                    field="confidence"
                    header="Conf."
                    body={(row) => {
                      const c = getSignalColor(row.signal);
                      return (
                        <span style={{ color: c, fontWeight: 700, fontSize: "0.8rem" }}>
                          {Math.round(row.confidence)}%
                        </span>
                      );
                    }}
                  />
                </DataTable>
              </Card>
            </div>

            {/* Selected agent detail */}
            <div className="col-12 lg:col-8">
              {selectedAgent ? (
                <Card
                  style={{
                    background: "var(--sv-bg-card)",
                    border: `1px solid var(--sv-border)`,
                    borderTop: `3px solid ${getSignalColor(selectedAgent.signal)}`,
                    height: "100%",
                  }}
                >
                  {/* Agent header */}
                  <div className="flex align-items-start justify-content-between mb-4">
                    <div>
                      <Tag
                        value={selectedAgent.isHuman ? "Human Analyst" : "AI Agent"}
                        style={{
                          background: selectedAgent.isHuman
                            ? "var(--sv-info-bg)"
                            : "var(--sv-accent-bg)",
                          color: selectedAgent.isHuman
                            ? "var(--sv-info)"
                            : "var(--sv-accent)",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          marginBottom: "6px",
                          display: "block",
                        }}
                      />
                      <h2
                        style={{
                          margin: 0,
                          color: "var(--sv-text-primary)",
                          fontSize: "1.25rem",
                          fontWeight: 800,
                        }}
                      >
                        {selectedAgent.agentName}
                      </h2>
                    </div>

                    <div className="flex flex-column align-items-center gap-1">
                      <ConfidenceRing
                        value={selectedAgent.confidence}
                        color={getSignalColor(selectedAgent.signal)}
                      />
                      <div
                        style={{
                          padding: "3px 12px",
                          borderRadius: "999px",
                          backgroundColor: getSignalBg(selectedAgent.signal),
                          border: `1.5px solid ${getSignalColor(selectedAgent.signal)}`,
                          color: getSignalColor(selectedAgent.signal),
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <i
                          className={`pi ${getSignalIcon(selectedAgent.signal)}`}
                          style={{ fontSize: "0.75rem" }}
                        />
                        {normalizeLabel(selectedAgent.signal)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedAgent.description && (
                    <>
                      <div
                        style={{
                          color: "var(--sv-text-muted)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "6px",
                        }}
                      >
                        Principles &amp; Methodology
                      </div>
                      <div
                        style={{
                          color: "var(--sv-text-secondary)",
                          fontSize: "0.85rem",
                          margin: "0 0 1rem",
                          lineHeight: 1.6,
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedAgent.description }}
                      />
                    </>
                  )}

                  <Divider style={{ margin: "0 0 0.75rem" }} />

                  {/* Reasoning */}
                  <div
                    style={{
                      color: "var(--sv-text-muted)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "8px",
                    }}
                  >
                    Analysis &amp; Reasoning
                  </div>
                  {selectedAgent.reasoning ? (
                    <ReasoningDisplay reasoning={selectedAgent.reasoning} />
                  ) : (
                    <p
                      style={{
                        color: "var(--sv-text-muted)",
                        fontSize: "0.875rem",
                        margin: 0,
                      }}
                    >
                      No reasoning data available for this agent.
                    </p>
                  )}
                </Card>
              ) : (
                <Card
                  style={{
                    background: "var(--sv-bg-card)",
                    border: "1px solid var(--sv-border)",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--sv-text-muted)",
                      padding: "3rem",
                    }}
                  >
                    <i
                      className="pi pi-arrow-left"
                      style={{
                        fontSize: "1.5rem",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    />
                    Select an agent from the table to view detailed reasoning
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* ── Agent cards grid (compact overview) ── */}
          {allAgents.length > 0 && (
            <>
              <Divider style={{ margin: "1.5rem 0 1rem" }} />
              <div
                style={{
                  color: "var(--sv-text-secondary)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.75rem",
                }}
              >
                All Agent Cards
              </div>
              <div className="grid">
                {allAgents.map((agent) => (
                  <div
                    key={agent.agentKey}
                    className="col-12 sm:col-6 lg:col-3"
                  >
                    <AgentCard agent={agent} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Disclaimer ── */}
      {!loading && activeSymbol && (
        <p
          style={{
            marginTop: "1.5rem",
            color: "var(--sv-text-muted)",
            fontSize: "0.75rem",
            textAlign: "center",
          }}
        >
          AI-generated analysis is for informational purposes only and does not
          constitute financial advice. Always do your own research.
        </p>
      )}
    </div>
  );
};

export default AiToolsPage;
