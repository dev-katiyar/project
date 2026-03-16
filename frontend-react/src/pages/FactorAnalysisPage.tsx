import React, { useState, useEffect, useMemo } from "react";
import { SelectButton } from "primereact/selectbutton";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";
import FactorAnalysisView from "./FactorAnalysisView";

// ── Constants ──────────────────────────────────────────────────────────────────

const LS_CUSTOM_KEY = "sv_fa_custom_symbols";

const DICT_TYPE: Record<string, string> = {
  factors: "factor_analysis",
  sectors: "factor_analysis_sector",
  custom:  "factor_analysis_custom",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface SymbolDict { code: string; name: string; dict: Record<string, string> }

interface HoldingsDialog {
  symbol: string;
  name: string;
  dict: Record<string, string> | null;
  loading: boolean;
}

// ── Local-storage helpers ──────────────────────────────────────────────────────

function loadCustomLS(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_CUSTOM_KEY) ?? "{}"); } catch { return {}; }
}
function saveCustomLS(d: Record<string, string>) {
  try { localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

// ── Main component ─────────────────────────────────────────────────────────────

const FactorAnalysisPage: React.FC = () => {
  // ── Symbol dict ─────────────────────────────────────────────────────────────
  const [builtinDicts, setBuiltinDicts] = useState<SymbolDict[]>([]);
  const [mode, setMode]                 = useState<string>("factors");
  const [customDict, setCustomDict]     = useState<Record<string, string>>(loadCustomLS);
  const [customInput, setCustomInput]   = useState("");
  const [customError, setCustomError]   = useState("");

  // ── Holdings dialog ──────────────────────────────────────────────────────────
  const [holdingsDialog, setHoldingsDialog] = useState<HoldingsDialog | null>(null);

  // ── Mode options ──────────────────────────────────────────────────────────────
  const modeOptions = [
    { label: "Factors", value: "factors" },
    { label: "Sectors", value: "sectors" },
    { label: "Custom",  value: "custom"  },
  ];

  // ── Load symbol dicts ────────────────────────────────────────────────────────
  useEffect(() => {
    api.post("/get-symbols", { categories: ["Factor", "Sector"] })
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? {};
        setBuiltinDicts([
          { code: "factor_analysis",        name: "Factors", dict: raw["Factor"] ?? raw["Factors"] ?? {} },
          { code: "factor_analysis_sector", name: "Sectors", dict: raw["Sector"] ?? raw["Sectors"] ?? {} },
        ]);
      })
      .catch(() => {});
  }, []);

  // ── Derived active dict ──────────────────────────────────────────────────────
  const activeDict = useMemo<SymbolDict>(() => {
    if (mode === "custom") return { code: "factor_analysis_custom", name: "Custom", dict: customDict };
    const code = DICT_TYPE[mode] ?? "factor_analysis";
    return builtinDicts.find((d) => d.code === code) ?? { code, name: mode, dict: {} };
  }, [mode, builtinDicts, customDict]);

  // ── Custom symbol management ──────────────────────────────────────────────────
  const addCustomSymbol = () => {
    const sym = customInput.trim().toUpperCase();
    setCustomError("");
    if (!sym) return;
    if (Object.keys(customDict).length >= 10) { setCustomError("Max 10 symbols"); return; }
    if (sym in customDict) { setCustomError("Already added"); return; }
    const next = { ...customDict, [sym]: sym };
    setCustomDict(next);
    saveCustomLS(next);
    setCustomInput("");
  };

  const removeCustomSymbol = (sym: string) => {
    if (Object.keys(customDict).length <= 4) { setCustomError("Min 4 symbols required"); return; }
    const next = { ...customDict };
    delete next[sym];
    setCustomDict(next);
    saveCustomLS(next);
    setCustomError("");
  };

  // ── Holdings drill-down ──────────────────────────────────────────────────────
  const handleHoldingsClick = (symbol: string, name: string) => {
    setHoldingsDialog({ symbol, name, dict: null, loading: true });
    api.get(`/etf/holdings/${symbol}`)
      .then((res) => {
        const dict: Record<string, string> = {};
        (res.data ?? []).forEach((item: { symbol: string; name: string }) => {
          dict[item.symbol] = item.name;
        });
        setHoldingsDialog({ symbol, name, dict, loading: false });
      })
      .catch(() => setHoldingsDialog({ symbol, name, dict: {}, loading: false }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="sv-page-min-h">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="sv-page-title m-0 font-bold" style={{ fontSize: "1.45rem" }}>
            Factor Analysis
          </h2>
          <p className="m-0 text-sm mt-1" style={{ color: "var(--sv-text-secondary)" }}>
            Excess Return Analysis vs SPY &nbsp;·&nbsp; Excess Returns, Correlations &amp; Z-Score Rankings
          </p>
        </div>

        <div className="flex align-items-center gap-2 flex-wrap">
          <SelectButton
            value={mode}
            options={modeOptions}
            onChange={(e) => e.value && setMode(e.value)}
            pt={{ button: { style: { fontSize: "0.82rem", padding: "0.4rem 1rem" } } }}
          />
        </div>
      </div>

      {/* ── CUSTOM SYMBOLS ──────────────────────────────────────────────────── */}
      {mode === "custom" && (
        <div className="surface-card border-1 border-round-xl p-3 mb-4" style={{ borderColor: "var(--sv-border)", boxShadow: "var(--sv-shadow-sm)" }}>
          <div className="flex align-items-center gap-3 mb-2 flex-wrap">
            <span className="sv-info-label text-xs font-bold">
              Custom Symbols &nbsp;
              <span className="border-1 border-round px-1" style={{ borderColor: "var(--sv-border)", background: "var(--sv-bg-surface)", fontWeight: 400 }}>
                {Object.keys(customDict).length}/10
              </span>
            </span>
            <div className="flex gap-2 align-items-center ml-auto">
              <InputText
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addCustomSymbol()}
                placeholder="TICKER"
                style={{ width: "88px", fontSize: "0.82rem", letterSpacing: "0.05em" }}
              />
              <Button icon="pi pi-plus" size="small" label="Add" onClick={addCustomSymbol} disabled={!customInput.trim()} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(customDict).map((sym) => (
              <span
                key={sym}
                className="inline-flex align-items-center gap-1 border-1 border-round-3xl px-2 py-1 text-xs font-bold sv-text-accent"
                style={{ background: "var(--sv-bg-surface)", borderColor: "var(--sv-border)" }}
              >
                {sym}
                <i className="pi pi-times" style={{ fontSize: "0.5rem", cursor: "pointer", opacity: 0.65 }} onClick={() => removeCustomSymbol(sym)} />
              </span>
            ))}
            {!Object.keys(customDict).length && (
              <span className="sv-text-muted text-sm" style={{ fontStyle: "italic" }}>
                Add at least 4 symbols to run analysis
              </span>
            )}
          </div>
          {customError && (
            <p className="sv-error-text text-xs m-0 mt-2">
              <i className="pi pi-exclamation-circle mr-1" />
              {customError}
            </p>
          )}
        </div>
      )}

      {/* ── MAIN ANALYSIS ───────────────────────────────────────────────────── */}
      <FactorAnalysisView
        dictType={activeDict.code}
        dict={activeDict.dict}
        isEtfView={false}
        onHoldingsClick={mode !== "custom" ? handleHoldingsClick : undefined}
      />

      {/* ── HOLDINGS DRILL-DOWN DIALOG ───────────────────────────────────────── */}
      <Dialog
        visible={!!holdingsDialog}
        onHide={() => setHoldingsDialog(null)}
        header={
          holdingsDialog ? (
            <div className="flex align-items-center gap-2 flex-wrap">
              <i className="pi pi-sitemap sv-text-accent" style={{ fontSize: "1rem" }} />
              <span className="font-bold" style={{ fontSize: "1rem" }}>
                {holdingsDialog.symbol}
              </span>
              <span style={{ color: "var(--sv-text-secondary)", fontWeight: 400, fontSize: "0.9rem" }}>
                — Top 10 Holdings Analysis
              </span>
              {holdingsDialog.name && (
                <span className="sv-text-muted" style={{ fontSize: "0.8rem" }}>
                  ({holdingsDialog.name})
                </span>
              )}
            </div>
          ) : ""
        }
        style={{ width: "min(98vw, 1280px)" }}
        contentStyle={{ padding: "1rem 1.25rem 1.5rem" }}
        draggable={false}
        maximizable
      >
        {holdingsDialog?.loading && (
          <div className="flex flex-column gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height="2.2rem" borderRadius="0.3rem" />
            ))}
          </div>
        )}

        {!holdingsDialog?.loading && holdingsDialog?.dict && Object.keys(holdingsDialog.dict).length > 0 && (
          <FactorAnalysisView
            dictType="factor_analysis_etf_holdings"
            dict={holdingsDialog.dict}
            isEtfView={true}
          />
        )}

        {!holdingsDialog?.loading && holdingsDialog?.dict && Object.keys(holdingsDialog.dict).length === 0 && (
          <div className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted" style={{ height: "200px" }}>
            <i className="pi pi-inbox" style={{ fontSize: "2.5rem", opacity: 0.2 }} />
            <span style={{ fontSize: "0.88rem" }}>No holdings data available for {holdingsDialog.symbol}</span>
          </div>
        )}
      </Dialog>

    </div>
  );
};

export default FactorAnalysisPage;
