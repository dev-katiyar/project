import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import api from "@/services/api";
import { useTheme, type ThemeName } from "@/contexts/ThemeContext";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { TabView, TabPanel } from "primereact/tabview";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { SelectButton } from "primereact/selectbutton";
import { InputNumber } from "primereact/inputnumber";
import { Panel } from "primereact/panel";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import SvMoneyFlowChart, {
  type MfRowResult,
} from "@/components/strategy/SvMoneyFlowChart";
import SvPairMoneyFlowChart from "@/components/strategy/SvPairMoneyFlowChart";
import SvWeeklyMoneyFlowChart, {
  type WeeklyMfRowResult,
} from "@/components/strategy/SvWeeklyMoneyFlowChart";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SvStrategy {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
}
interface UserPreset {
  id: string;
  name: string;
  symbol?: string;
  created_at?: string;
}
interface MfResult {
  date: string[];
  close: number[];
  ria: number[];
  ria_trigger: number[];
  ria_diff: number[];
  stoch: number[];
  stoch_trigger: number[];
  stoch_diff: number[];
  macd: number[];
  macd_trigger: number[];
  macd_diff: number[];
  buy_rating: number[];
  sell_rating: number[];
}
interface StrategyBuilderResult {
  date: string[];
  close: number[];
  buy_rating: number[];
  sell_rating: number[];
}
interface Indicator {
  id: string;
  name: string;
  strategies: Array<{
    id: string;
    name: string;
    options?: string[];
    settings?: Array<{ key: string; label: string; default: number }>;
  }>;
}
interface Condition {
  id: string;
  indicatorId: string;
  strategyId: string;
  option: string;
  settings: Record<string, number>;
  operator: "AND" | "OR";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SV_STRATEGIES: SvStrategy[] = [
  {
    id: "svPriceMF",
    name: "SV Money Flow Daily",
    subtitle: "Single symbol momentum",
    icon: "pi-chart-line",
  },
  {
    id: "svRatioMF",
    name: "SV Pair Money Flow",
    subtitle: "Dual symbol ratio analysis",
    icon: "pi-chart-bar",
  },
  {
    id: "svWeeklyMF",
    name: "SV Money Flow Weekly",
    subtitle: "Long-term weekly trend",
    icon: "pi-calendar",
  },
];

const CHART_COLORS: Record<
  ThemeName,
  { bg: string; grid: string; text: string; border: string; tooltip: string }
> = {
  dark: {
    bg: "#0d1220",
    grid: "#1c2840",
    text: "#7a8da8",
    border: "#1c2840",
    tooltip: "#07090f",
  },
  dim: {
    bg: "#162038",
    grid: "#223354",
    text: "#7a92b8",
    border: "#223354",
    tooltip: "#0f1729",
  },
  light: {
    bg: "#ffffff",
    grid: "#dfe7f5",
    text: "#4a5e78",
    border: "#c8d4ec",
    tooltip: "#f8fafe",
  },
};

const LS_RECENT_SYMBOLS = "svmfRecentSymbols";
const LS_RECENT_PAIRS = "svmfRecentSymbolPairs";
const MAX_RECENT = 15;

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function fmtApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dy}`;
}
function subYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() - n);
  return r;
}

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

function addRecentSymbol(sym: string) {
  if (!sym) return;
  let arr: string[] = [];
  try {
    arr = JSON.parse(localStorage.getItem(LS_RECENT_SYMBOLS) || "[]");
  } catch {
    arr = [];
  }
  arr = [
    sym.toUpperCase(),
    ...arr.filter((s) => s !== sym.toUpperCase()),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(LS_RECENT_SYMBOLS, JSON.stringify(arr));
}
function getRecentSymbols(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_RECENT_SYMBOLS) || "[]");
  } catch {
    return [];
  }
}
function addRecentPair(s1: string, s2: string) {
  let arr: { sym1: string; sym2: string }[] = [];
  try {
    arr = JSON.parse(localStorage.getItem(LS_RECENT_PAIRS) || "[]");
  } catch {
    arr = [];
  }
  const key = `${s1.toUpperCase()}/${s2.toUpperCase()}`;
  arr = [
    { sym1: s1.toUpperCase(), sym2: s2.toUpperCase() },
    ...arr.filter((p) => `${p.sym1}/${p.sym2}` !== key),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(LS_RECENT_PAIRS, JSON.stringify(arr));
}
function getRecentPairs(): { sym1: string; sym2: string }[] {
  try {
    return JSON.parse(localStorage.getItem(LS_RECENT_PAIRS) || "[]");
  } catch {
    return [];
  }
}

// ─── Default Parameter Objects ────────────────────────────────────────────────

const DEFAULT_RIA = {
  ria_num_of_periods: 12,
  ria_smoothening_ema_period: 26,
  ria_trigger_ema_period: 9,
  ria_buy_sell_weight: 2,
  ria_condition_buy_below: 20,
  ria_condition_sell_above: 80,
};
const DEFAULT_STOCH = {
  stoch_num_of_periods: 12,
  stoch_smoothening_ema_period: 26,
  stoch_trigger_ema_period: 9,
  stoch_buy_sell_weight: 2,
  stoch_buy_trigger_diff_cross: 0,
  stoch_sell_trigger_diff_cross: 0,
};
const DEFAULT_MFI = { mfi_num_of_periods: 14, mfi_buy_sell_weight: 1 };
const DEFAULT_MACD = {
  macd_slow_period: 26,
  macd_fast_period: 12,
  macd_trigger_period: 9,
  macd_buy_sell_weight: 1,
};
const DEFAULT_SMA = { sma1_period: 13, sma2_period: 34 };
const DEFAULT_MACD1 = {
  macd_slow_ema_period: 26,
  macd_fast_ema_period: 12,
  macd_trigger_period: 12,
};
const DEFAULT_MACD2 = {
  macd_slow_ema_period: 54,
  macd_fast_ema_period: 24,
  macd_trigger_period: 21,
};
const DEFAULT_RSI = { rsi_period: 14 };

// ─── Shared Chart Helpers ─────────────────────────────────────────────────────

function buildSignalSeries(
  dates: string[],
  close: number[],
  buyRating: number[],
  sellRating: number[],
): Highcharts.SeriesOptionsType[] {
  const buyPts: [number, number][] = [];
  const sellPts: [number, number][] = [];
  dates.forEach((d, i) => {
    const ts = new Date(d).getTime();
    if (buyRating[i] > 0) buyPts.push([ts, close[i]]);
    if (sellRating[i] > 0) sellPts.push([ts, close[i]]);
  });
  return [
    {
      type: "scatter",
      name: "Buy Signal",
      data: buyPts,
      yAxis: 0,
      marker: {
        symbol: "triangle",
        radius: 7,
        fillColor: "#22c55e",
        lineColor: "#00ff88",
        lineWidth: 1,
      },
      tooltip: { pointFormat: "<b>BUY</b> @ {point.y:.2f}" },
      zIndex: 10,
    } as Highcharts.SeriesOptionsType,
    {
      type: "scatter",
      name: "Sell Signal",
      data: sellPts,
      yAxis: 0,
      marker: {
        symbol: "triangle-down",
        radius: 7,
        fillColor: "#ef4444",
        lineColor: "#ff4466",
        lineWidth: 1,
      },
      tooltip: { pointFormat: "<b>SELL</b> @ {point.y:.2f}" },
      zIndex: 10,
    } as Highcharts.SeriesOptionsType,
  ];
}

function buildBaseChartOptions(
  cc: (typeof CHART_COLORS)[ThemeName],
): Highcharts.Options {
  return {
    chart: {
      backgroundColor: cc.bg,
      style: { fontFamily: "'Inter', 'Segoe UI', sans-serif" },
      animation: false,
      zooming: { type: "x" },
    },
    title: { text: undefined },
    credits: { enabled: false },
    legend: {
      enabled: true,
      itemStyle: { color: cc.text, fontWeight: "500", fontSize: "11px" },
      itemHoverStyle: { color: "#ffffff" },
      backgroundColor: "transparent",
    },
    tooltip: {
      shared: true,
      split: false,
      backgroundColor: cc.tooltip,
      borderColor: cc.border,
      borderRadius: 6,
      style: { color: "#d8e4f0", fontSize: "11px" },
    },
    plotOptions: {
      series: {
        animation: false,
        states: { hover: { lineWidthPlus: 0 } },
        dataGrouping: { enabled: false },
      },
      column: { borderWidth: 0, pointPadding: 0, groupPadding: 0 },
      line: { lineWidth: 1.5 },
    },
  };
}

// ─── Shared UI Micro-Components ───────────────────────────────────────────────

function StatBar({
  lastSignal,
  buys,
  sells,
}: {
  lastSignal: string;
  buys: number;
  sells: number;
}) {
  const signalSev =
    lastSignal === "Buy"
      ? "success"
      : lastSignal === "Sell"
        ? "danger"
        : "warning";
  return (
    <div className="flex align-items-center gap-3 mb-3 p-2 border-round sv-data-card">
      <span className="text-sm sv-text-muted">Last Signal:</span>
      <Tag
        value={lastSignal}
        severity={signalSev as "success" | "info" | "warning" | "danger"}
      />
      <Divider layout="vertical" className="m-0" style={{ height: "18px" }} />
      <i
        className="pi pi-arrow-up sv-text-gain"
        style={{ fontSize: "0.8rem" }}
      />
      <span className="text-sm font-semibold sv-text-gain">{buys} Buy</span>
      <Divider layout="vertical" className="m-0" style={{ height: "18px" }} />
      <i
        className="pi pi-arrow-down sv-text-loss"
        style={{ fontSize: "0.8rem" }}
      />
      <span className="text-sm font-semibold sv-text-loss">{sells} Sell</span>
    </div>
  );
}

function RecentChips({
  items,
  onSelect,
}: {
  items: string[];
  onSelect: (s: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.slice(0, 8).map((sym) => (
        <span
          key={sym}
          onClick={() => onSelect(sym)}
          className="sv-symbol-chip cursor-pointer"
        >
          {sym}
        </span>
      ))}
    </div>
  );
}

// ─── AdvancedParamsPanel (shared sub-component) ──────────────────────────────

interface MfAdvParams {
  riaP: typeof DEFAULT_RIA;
  setRiaP: React.Dispatch<React.SetStateAction<typeof DEFAULT_RIA>>;
  stochP: typeof DEFAULT_STOCH;
  setStochP: React.Dispatch<React.SetStateAction<typeof DEFAULT_STOCH>>;
  mfiP: typeof DEFAULT_MFI;
  setMfiP: React.Dispatch<React.SetStateAction<typeof DEFAULT_MFI>>;
  macdP: typeof DEFAULT_MACD;
  setMacdP: React.Dispatch<React.SetStateAction<typeof DEFAULT_MACD>>;
}

function AdvancedMfParams({
  riaP,
  setRiaP,
  stochP,
  setStochP,
  mfiP,
  setMfiP,
  macdP,
  setMacdP,
}: MfAdvParams) {
  const [open, setOpen] = useState(false);
  return (
    <Panel
      header={
        <span className="text-sm font-semibold text-color-secondary">
          Advanced Parameters
        </span>
      }
      toggleable
      collapsed={!open}
      onToggle={(e) => setOpen(!e.value)}
      className="mb-3"
    >
      <div className="grid">
        {/* SV MF */}
        <div className="col-12">
          <span className="text-xs font-bold uppercase sv-text-accent">
            SV Money Flow
          </span>
        </div>
        {(
          [
            { label: "Periods", key: "ria_num_of_periods" },
            { label: "Smoothing EMA", key: "ria_smoothening_ema_period" },
            { label: "Trigger EMA", key: "ria_trigger_ema_period" },
          ] as { label: string; key: keyof typeof DEFAULT_RIA }[]
        ).map((f) => (
          <div key={f.key} className="col-4">
            <label className="block text-xs mb-1 sv-text-muted">
              {f.label}
            </label>
            <InputNumber
              value={riaP[f.key] as number}
              onValueChange={(e) =>
                setRiaP((p) => ({ ...p, [f.key]: e.value ?? p[f.key] }))
              }
              min={1}
              max={200}
              showButtons
              className="w-full"
              inputClassName="w-full"
            />
          </div>
        ))}
        {/* Stochastic */}
        <div className="col-12 mt-2">
          <span className="text-xs font-bold uppercase sv-text-accent">
            Stochastic
          </span>
        </div>
        {(
          [
            { label: "Periods", key: "stoch_num_of_periods" },
            { label: "Smoothing EMA", key: "stoch_smoothening_ema_period" },
            { label: "Trigger EMA", key: "stoch_trigger_ema_period" },
          ] as { label: string; key: keyof typeof DEFAULT_STOCH }[]
        ).map((f) => (
          <div key={f.key} className="col-4">
            <label className="block text-xs mb-1 sv-text-muted">
              {f.label}
            </label>
            <InputNumber
              value={stochP[f.key] as number}
              onValueChange={(e) =>
                setStochP((p) => ({ ...p, [f.key]: e.value ?? p[f.key] }))
              }
              min={1}
              max={200}
              showButtons
              className="w-full"
              inputClassName="w-full"
            />
          </div>
        ))}
        {/* MFI */}
        <div className="col-12 mt-2">
          <span className="text-xs font-bold uppercase sv-text-accent">
            MFI
          </span>
        </div>
        <div className="col-4">
          <label className="block text-xs mb-1 sv-text-muted">Periods</label>
          <InputNumber
            value={mfiP.mfi_num_of_periods}
            onValueChange={(e) =>
              setMfiP((p) => ({
                ...p,
                mfi_num_of_periods: e.value ?? p.mfi_num_of_periods,
              }))
            }
            min={1}
            max={200}
            showButtons
            className="w-full"
            inputClassName="w-full"
          />
        </div>
        {/* MACD */}
        <div className="col-12 mt-2">
          <span className="text-xs font-bold uppercase sv-text-accent">
            MACD
          </span>
        </div>
        {(
          [
            { label: "Slow EMA", key: "macd_slow_period" },
            { label: "Fast EMA", key: "macd_fast_period" },
            { label: "Trigger", key: "macd_trigger_period" },
          ] as { label: string; key: keyof typeof DEFAULT_MACD }[]
        ).map((f) => (
          <div key={f.key} className="col-4">
            <label className="block text-xs mb-1 sv-text-muted">
              {f.label}
            </label>
            <InputNumber
              value={macdP[f.key] as number}
              onValueChange={(e) =>
                setMacdP((p) => ({ ...p, [f.key]: e.value ?? p[f.key] }))
              }
              min={1}
              max={200}
              showButtons
              className="w-full"
              inputClassName="w-full"
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── MoneyFlowPanel (svPriceMF) ───────────────────────────────────────────────

const MoneyFlowPanel: React.FC<{ presetName?: string }> = ({ presetName }) => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];
  const [symbol, setSymbol] = useState("SPY");
  const [startDate, setStartDate] = useState<Date>(() =>
    subYears(new Date(), 1),
  );
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [freq, setFreq] = useState<"days" | "weeks">("days");
  const [riaP, setRiaP] = useState({ ...DEFAULT_RIA });
  const [stochP, setStochP] = useState({ ...DEFAULT_STOCH });
  const [mfiP, setMfiP] = useState({ ...DEFAULT_MFI });
  const [macdP, setMacdP] = useState({ ...DEFAULT_MACD });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MfRowResult[] | null>(null);
  const [recent, setRecent] = useState<string[]>(getRecentSymbols);
  const freqOpts = [
    { label: "Days", value: "days" },
    { label: "Weeks", value: "weeks" },
  ];

  const run = useCallback(async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/strategy/riapro", {
        model_inputs: {
          symbol: sym,
          symbol1: sym,
          symbol2: "SPY",
          start_date: fmtApiDate(startDate),
          end_date: fmtApiDate(endDate),
          test_period: 366,
          sample_frequency: freq,
        },
        ria_pro_inputs: {
          ria_inputs: riaP,
          stoch_inputs: stochP,
          mfi_inputs: mfiP,
          macd_inputs: macdP,
        },
      });
      setResult(data);
      addRecentSymbol(sym);
      setRecent(getRecentSymbols());
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Failed to load strategy data");
    } finally {
      setLoading(false);
    }
  }, [symbol, startDate, endDate, freq, riaP, stochP, mfiP, macdP]);

  const { lastSignal, buys, sells } = useMemo(() => {
    if (!result || !result.length)
      return { lastSignal: "Hold", buys: 0, sells: 0 };
    let ls = "Hold";
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].buy_rating > 0) {
        ls = "Buy";
        break;
      }
      if (result[i].sell_rating > 0) {
        ls = "Sell";
        break;
      }
    }
    return {
      lastSignal: ls,
      buys: result.filter((r) => r.buy_rating > 0).length,
      sells: result.filter((r) => r.sell_rating > 0).length,
    };
  }, [result]);

  return (
    <div>
      {presetName && (
        <div className="flex align-items-center gap-2 mb-3">
          <i className="pi pi-bookmark sv-text-accent" />
          <span className="font-semibold text-sm text-color-secondary">
            {presetName}
          </span>
        </div>
      )}
      <div className="grid mb-2">
        <div className="col-12 md:col-4">
          <label className="block mb-1 text-sm sv-text-muted">Symbol</label>
          <InputText
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="e.g. AAPL"
            className="w-full"
          />
          <RecentChips items={recent} onSelect={setSymbol} />
        </div>
        <div className="col-12 md:col-3">
          <label className="block mb-1 text-sm sv-text-muted">Start Date</label>
          <Calendar
            value={startDate}
            onChange={(e) => setStartDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-3">
          <label className="block mb-1 text-sm sv-text-muted">End Date</label>
          <Calendar
            value={endDate}
            onChange={(e) => setEndDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-2">
          <label className="block mb-1 text-sm sv-text-muted">Frequency</label>
          <SelectButton
            value={freq}
            onChange={(e) => setFreq(e.value)}
            options={freqOpts}
            className="w-full"
          />
        </div>
      </div>
      <AdvancedMfParams
        riaP={riaP}
        setRiaP={setRiaP}
        stochP={stochP}
        setStochP={setStochP}
        mfiP={mfiP}
        setMfiP={setMfiP}
        macdP={macdP}
        setMacdP={setMacdP}
      />
      <div className="flex gap-2 mb-3">
        <Button
          label="Run Strategy"
          icon="pi pi-play"
          onClick={run}
          loading={loading}
          className="p-button-sm p-button-primary"
        />
        <Button
          label="Reset Params"
          icon="pi pi-refresh"
          onClick={() => {
            setRiaP({ ...DEFAULT_RIA });
            setStochP({ ...DEFAULT_STOCH });
            setMfiP({ ...DEFAULT_MFI });
            setMacdP({ ...DEFAULT_MACD });
          }}
          className="p-button-sm p-button-outlined"
        />
      </div>
      {error && (
        <div className="mb-3 p-3 border-round flex align-items-center gap-2 sv-alert-error">
          <i className="pi pi-exclamation-triangle" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {loading && <Skeleton height="580px" className="border-round-lg" />}
      {result && !loading && (
        <>
          <StatBar lastSignal={lastSignal} buys={buys} sells={sells} />
          <SvMoneyFlowChart chartData={result} cc={cc} />
        </>
      )}
    </div>
  );
};

// ─── MoneyFlowPairPanel (svRatioMF) ──────────────────────────────────────────

const MoneyFlowPairPanel: React.FC = () => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];
  const [sym1, setSym1] = useState("AAPL");
  const [sym2, setSym2] = useState("SPY");
  const [startDate, setStartDate] = useState<Date>(() =>
    subYears(new Date(), 1),
  );
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [freq, setFreq] = useState<"days" | "weeks">("days");
  const [riaP, setRiaP] = useState({ ...DEFAULT_RIA });
  const [stochP, setStochP] = useState({ ...DEFAULT_STOCH });
  const [mfiP, setMfiP] = useState({ ...DEFAULT_MFI });
  const [macdP, setMacdP] = useState({ ...DEFAULT_MACD });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MfRowResult[] | null>(null);
  const [recentPairs, setRecentPairs] =
    useState<{ sym1: string; sym2: string }[]>(getRecentPairs);
  const freqOpts = [
    { label: "Days", value: "days" },
    { label: "Weeks", value: "weeks" },
  ];

  const run = useCallback(async () => {
    const s1 = sym1.trim().toUpperCase();
    const s2 = sym2.trim().toUpperCase();
    if (!s1 || !s2) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/strategy/riapro-pair", {
        model_inputs: {
          symbol: s1,
          symbol1: s1,
          symbol2: s2,
          start_date: fmtApiDate(startDate),
          end_date: fmtApiDate(endDate),
          test_period: 366,
          sample_frequency: freq,
        },
        ria_pro_inputs: {
          ria_inputs: riaP,
          stoch_inputs: stochP,
          mfi_inputs: mfiP,
          macd_inputs: macdP,
        },
      });
      setResult(data);
      addRecentPair(s1, s2);
      setRecentPairs(getRecentPairs());
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(
        err?.response?.data?.message ?? "Failed to load pair strategy data",
      );
    } finally {
      setLoading(false);
    }
  }, [sym1, sym2, startDate, endDate, freq, riaP, stochP, mfiP, macdP]);

  const { lastSignal, buys, sells } = useMemo(() => {
    if (!result || !result.length)
      return { lastSignal: "Hold", buys: 0, sells: 0 };
    let ls = "Hold";
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].buy_rating > 0) {
        ls = "Buy";
        break;
      }
      if (result[i].sell_rating > 0) {
        ls = "Sell";
        break;
      }
    }
    return {
      lastSignal: ls,
      buys: result.filter((r) => r.buy_rating > 0).length,
      sells: result.filter((r) => r.sell_rating > 0).length,
    };
  }, [result]);

  return (
    <div>
      <div className="grid mb-2">
        <div className="col-12 md:col-3">
          <label className="block mb-1 text-sm sv-text-muted">Symbol 1</label>
          <InputText
            value={sym1}
            onChange={(e) => setSym1(e.target.value.toUpperCase())}
            className="w-full"
          />
        </div>
        <div className="col-12 md:col-3">
          <label className="block mb-1 text-sm sv-text-muted">Symbol 2</label>
          <InputText
            value={sym2}
            onChange={(e) => setSym2(e.target.value.toUpperCase())}
            className="w-full"
          />
        </div>
        <div className="col-12 md:col-2">
          <label className="block mb-1 text-sm sv-text-muted">Start Date</label>
          <Calendar
            value={startDate}
            onChange={(e) => setStartDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-2">
          <label className="block mb-1 text-sm sv-text-muted">End Date</label>
          <Calendar
            value={endDate}
            onChange={(e) => setEndDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-2">
          <label className="block mb-1 text-sm sv-text-muted">Frequency</label>
          <SelectButton
            value={freq}
            onChange={(e) => setFreq(e.value)}
            options={freqOpts}
            className="w-full"
          />
        </div>
      </div>
      {recentPairs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs mr-1 sv-text-muted align-self-center">
            Recent:
          </span>
          {recentPairs.slice(0, 6).map((p) => (
            <span
              key={`${p.sym1}/${p.sym2}`}
              onClick={() => {
                setSym1(p.sym1);
                setSym2(p.sym2);
              }}
              className="sv-symbol-chip cursor-pointer"
            >
              {p.sym1}/{p.sym2}
            </span>
          ))}
        </div>
      )}
      <AdvancedMfParams
        riaP={riaP}
        setRiaP={setRiaP}
        stochP={stochP}
        setStochP={setStochP}
        mfiP={mfiP}
        setMfiP={setMfiP}
        macdP={macdP}
        setMacdP={setMacdP}
      />
      <div className="flex gap-2 mb-3">
        <Button
          label="Run Strategy"
          icon="pi pi-play"
          onClick={run}
          loading={loading}
          className="p-button-sm p-button-primary"
        />
      </div>
      {error && (
        <div className="mb-3 p-3 border-round flex align-items-center gap-2 sv-alert-error">
          <i className="pi pi-exclamation-triangle" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {loading && <Skeleton height="580px" className="border-round-lg" />}
      {result && !loading && (
        <>
          <StatBar lastSignal={lastSignal} buys={buys} sells={sells} />
          <SvPairMoneyFlowChart
            chartData={result}
            cc={cc}
            sym1={sym1}
            sym2={sym2}
          />
        </>
      )}
    </div>
  );
};

// ─── MoneyFlowWeeklyPanel (svWeeklyMF) ───────────────────────────────────────

const MoneyFlowWeeklyPanel: React.FC = () => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];
  const [symbol, setSymbol] = useState("SPY");
  const [startDate, setStartDate] = useState<Date>(() =>
    subYears(new Date(), 2),
  );
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [smaP, setSmaP] = useState({ ...DEFAULT_SMA });
  const [riaP, setRiaP] = useState({ ...DEFAULT_RIA });
  const [stochP, setStochP] = useState({ ...DEFAULT_STOCH });
  const [mfiP, setMfiP] = useState({ ...DEFAULT_MFI });
  const [macd1P, setMacd1P] = useState({ ...DEFAULT_MACD1 });
  const [macd2P, setMacd2P] = useState({ ...DEFAULT_MACD2 });
  const [rsiP, setRsiP] = useState({ ...DEFAULT_RSI });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WeeklyMfRowResult[] | null>(null);
  const [recent, setRecent] = useState<string[]>(getRecentSymbols);
  const [advOpen, setAdvOpen] = useState(false);

  const run = useCallback(
    async (overrideSym?: string) => {
      const sym = (overrideSym ?? symbol).trim().toUpperCase();
      if (!sym) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.post("/strategy/riapro2024", {
          model_inputs: {
            symbol: sym,
            start_date: fmtApiDate(startDate),
            end_date: fmtApiDate(endDate),
            sample_frequency: "weeks",
          },
          ria_pro_inputs: {
            sma_inputs: {
              sma1_num_of_period: smaP.sma1_period,
              sma2_num_of_period: smaP.sma2_period,
              sma_buy_sell_weight: 1,
              label: `WMA(${smaP.sma1_period}) & WMA(${smaP.sma2_period})`,
            },
            ria_inputs: riaP,
            stoch_inputs: stochP,
            mfi_inputs: mfiP,
            macd_inputs: DEFAULT_MACD,
            macd1_inputs: {
              macd_slow_period: macd1P.macd_slow_ema_period,
              macd_fast_period: macd1P.macd_fast_ema_period,
              macd_trigger_period: macd1P.macd_trigger_period,
              macd_buy_sell_weight: 1,
              label: `MACD(${macd1P.macd_fast_ema_period},${macd1P.macd_slow_ema_period},${macd1P.macd_trigger_period})`,
            },
            macd2_inputs: {
              macd_slow_period: macd2P.macd_slow_ema_period,
              macd_fast_period: macd2P.macd_fast_ema_period,
              macd_trigger_period: macd2P.macd_trigger_period,
              macd_buy_sell_weight: 1,
              label: `MACD(${macd2P.macd_fast_ema_period},${macd2P.macd_slow_ema_period},${macd2P.macd_trigger_period})`,
            },
            rsi_inputs: {
              rsi_period: rsiP.rsi_period,
              macd_buy_sell_weight: 1,
            },
          },
        });
        setResult(data);
        addRecentSymbol(sym);
        setRecent(getRecentSymbols());
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(
          err?.response?.data?.message ?? "Failed to load weekly strategy data",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      symbol,
      startDate,
      endDate,
      smaP,
      riaP,
      stochP,
      mfiP,
      macd1P,
      macd2P,
      rsiP,
    ],
  );

  useEffect(() => {
    run("SPY");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { lastSignal, buys, sells } = useMemo(() => {
    if (!result || !result.length)
      return { lastSignal: "Hold", buys: 0, sells: 0 };
    let ls = "Hold";
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].buy_rating > 0) {
        ls = "Buy";
        break;
      }
      if (result[i].sell_rating > 0) {
        ls = "Sell";
        break;
      }
    }
    return {
      lastSignal: ls,
      buys: result.filter((r) => r.buy_rating > 0).length,
      sells: result.filter((r) => r.sell_rating > 0).length,
    };
  }, [result]);

  return (
    <div>
      <div className="grid mb-2">
        <div className="col-12 md:col-4">
          <label className="block mb-1 text-sm sv-text-muted">Symbol</label>
          <InputText
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && run()}
            className="w-full"
          />
          <RecentChips items={recent} onSelect={(s) => setSymbol(s)} />
        </div>
        <div className="col-12 md:col-3">
          <label className="block mb-1 text-sm sv-text-muted">Start Date</label>
          <Calendar
            value={startDate}
            onChange={(e) => setStartDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-3">
          <label className="block mb-1 text-sm sv-text-muted">End Date</label>
          <Calendar
            value={endDate}
            onChange={(e) => setEndDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-2 flex align-items-end">
          <Tag
            value="Weekly"
            icon="pi pi-calendar"
            className="w-full justify-content-center p-2"
            style={{
              background: "var(--sv-accent-bg)",
              color: "var(--sv-accent)",
              border: "1px solid var(--sv-accent)",
            }}
          />
        </div>
      </div>
      <Panel
        header={
          <span className="text-sm font-semibold text-color-secondary">
            Advanced Parameters
          </span>
        }
        toggleable
        collapsed={!advOpen}
        onToggle={(e) => setAdvOpen(!e.value)}
        className="mb-3"
      >
        <div className="grid">
          <div className="col-12">
            <span className="text-xs font-bold uppercase sv-text-accent">
              Moving Averages
            </span>
          </div>
          <div className="col-4">
            <label className="block text-xs mb-1 sv-text-muted">
              WMA1 Period
            </label>
            <InputNumber
              value={smaP.sma1_period}
              onValueChange={(e) =>
                setSmaP((p) => ({
                  ...p,
                  sma1_period: e.value ?? p.sma1_period,
                }))
              }
              min={1}
              max={200}
              showButtons
              className="w-full"
              inputClassName="w-full"
            />
          </div>
          <div className="col-4">
            <label className="block text-xs mb-1 sv-text-muted">
              WMA2 Period
            </label>
            <InputNumber
              value={smaP.sma2_period}
              onValueChange={(e) =>
                setSmaP((p) => ({
                  ...p,
                  sma2_period: e.value ?? p.sma2_period,
                }))
              }
              min={1}
              max={200}
              showButtons
              className="w-full"
              inputClassName="w-full"
            />
          </div>
          <div className="col-4">
            <label className="block text-xs mb-1 sv-text-muted">
              RSI Period
            </label>
            <InputNumber
              value={rsiP.rsi_period}
              onValueChange={(e) =>
                setRsiP((p) => ({ ...p, rsi_period: e.value ?? p.rsi_period }))
              }
              min={1}
              max={100}
              showButtons
              className="w-full"
              inputClassName="w-full"
            />
          </div>
          <div className="col-12 mt-2">
            <span className="text-xs font-bold uppercase sv-text-accent">
              MACD 1
            </span>
          </div>
          {(
            [
              { label: "Slow", key: "macd_slow_ema_period" },
              { label: "Fast", key: "macd_fast_ema_period" },
              { label: "Trigger", key: "macd_trigger_period" },
            ] as { label: string; key: keyof typeof DEFAULT_MACD1 }[]
          ).map((f) => (
            <div key={f.key} className="col-4">
              <label className="block text-xs mb-1 sv-text-muted">
                {f.label}
              </label>
              <InputNumber
                value={macd1P[f.key] as number}
                onValueChange={(e) =>
                  setMacd1P((p) => ({ ...p, [f.key]: e.value ?? p[f.key] }))
                }
                min={1}
                max={200}
                showButtons
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          ))}
          <div className="col-12 mt-2">
            <span className="text-xs font-bold uppercase sv-text-accent">
              MACD 2
            </span>
          </div>
          {(
            [
              { label: "Slow", key: "macd_slow_ema_period" },
              { label: "Fast", key: "macd_fast_ema_period" },
              { label: "Trigger", key: "macd_trigger_period" },
            ] as { label: string; key: keyof typeof DEFAULT_MACD2 }[]
          ).map((f) => (
            <div key={f.key} className="col-4">
              <label className="block text-xs mb-1 sv-text-muted">
                {f.label}
              </label>
              <InputNumber
                value={macd2P[f.key] as number}
                onValueChange={(e) =>
                  setMacd2P((p) => ({ ...p, [f.key]: e.value ?? p[f.key] }))
                }
                min={1}
                max={200}
                showButtons
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex gap-2 mb-3">
        <Button
          label="Run Strategy"
          icon="pi pi-play"
          onClick={() => run()}
          loading={loading}
          className="p-button-sm p-button-primary"
        />
      </div>
      {error && (
        <div className="mb-3 p-3 border-round flex align-items-center gap-2 sv-alert-error">
          <i className="pi pi-exclamation-triangle" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {loading && <Skeleton height="1200px" className="border-round-lg" />}
      {result && !loading && (
        <>
          <StatBar lastSignal={lastSignal} buys={buys} sells={sells} />
          <SvWeeklyMoneyFlowChart
            chartData={result}
            cc={cc}
            sma1Period={smaP.sma1_period}
            sma2Period={smaP.sma2_period}
            rsiPeriod={rsiP.rsi_period}
          />
        </>
      )}
    </div>
  );
};

// ─── StrategyBuilderPanel (custom strategies) ────────────────────────────────

let _condCounter = 0;
function newCondId() {
  return `cond_${++_condCounter}`;
}

const StrategyBuilderPanel: React.FC<{
  preset?: UserPreset;
  onSave?: () => void;
}> = ({ preset, onSave }) => {
  const { theme } = useTheme();
  const cc = CHART_COLORS[theme];
  const toastRef = useRef<Toast>(null);

  const [symbol, setSymbol] = useState(preset?.symbol ?? "SPY");
  const [startDate, setStartDate] = useState<Date>(() =>
    subYears(new Date(), 1),
  );
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [buyConds, setBuyConds] = useState<Condition[]>([]);
  const [sellConds, setSellConds] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInd, setLoadingInd] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StrategyBuilderResult | null>(null);
  const [saveDialog, setSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState(preset?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [recent, setRecent] = useState<string[]>(getRecentSymbols);

  useEffect(() => {
    setLoadingInd(true);
    api
      .get("/stg/indicators")
      .then((r) => setIndicators(r.data || []))
      .catch(() => setIndicators([]))
      .finally(() => setLoadingInd(false));
  }, []);

  const indicatorOpts = useMemo(
    () => indicators.map((ind) => ({ label: ind.name, value: ind.id })),
    [indicators],
  );

  const getIndicator = useCallback(
    (id: string) => indicators.find((ind) => ind.id === id),
    [indicators],
  );
  const getStrategy = useCallback(
    (indId: string, stgId: string) =>
      getIndicator(indId)?.strategies.find((s) => s.id === stgId),
    [getIndicator],
  );

  function updateCond(
    list: Condition[],
    setList: React.Dispatch<React.SetStateAction<Condition[]>>,
    id: string,
    patch: Partial<Condition>,
  ) {
    setList(list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addCond(setList: React.Dispatch<React.SetStateAction<Condition[]>>) {
    setList((prev) => [
      ...prev,
      {
        id: newCondId(),
        indicatorId: "",
        strategyId: "",
        option: "",
        settings: {},
        operator: "AND",
      },
    ]);
  }

  function removeCond(
    id: string,
    setList: React.Dispatch<React.SetStateAction<Condition[]>>,
  ) {
    setList((prev) => prev.filter((c) => c.id !== id));
  }

  const run = useCallback(async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      toastRef.current?.show({ severity: "warn", summary: "Symbol required" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/stg/runstrategy", {
        symbol: sym,
        start_date: fmtApiDate(startDate),
        end_date: fmtApiDate(endDate),
        buy_conditions: buyConds.map((c) => ({
          indicator: c.indicatorId,
          strategy: c.strategyId,
          option: c.option,
          settings: c.settings,
          operator: c.operator,
        })),
        sell_conditions: sellConds.map((c) => ({
          indicator: c.indicatorId,
          strategy: c.strategyId,
          option: c.option,
          settings: c.settings,
          operator: c.operator,
        })),
      });
      setResult(data);
      addRecentSymbol(sym);
      setRecent(getRecentSymbols());
      setActiveTab(0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Strategy execution failed");
    } finally {
      setLoading(false);
    }
  }, [symbol, startDate, endDate, buyConds, sellConds]);

  const savePreset = useCallback(async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      await api.post("/stg/preset", {
        name: saveName.trim(),
        symbol: symbol.trim().toUpperCase(),
        buy_conditions: buyConds,
        sell_conditions: sellConds,
      });
      setSaveDialog(false);
      toastRef.current?.show({
        severity: "success",
        summary: "Strategy saved",
      });
      onSave?.();
    } catch {
      toastRef.current?.show({
        severity: "error",
        summary: "Failed to save strategy",
      });
    } finally {
      setSaving(false);
    }
  }, [saveName, symbol, buyConds, sellConds, onSave]);

  const chartOptions = useMemo((): Highcharts.Options => {
    if (!result) return {};
    const ts = result.date.map((d) => new Date(d).getTime());
    const base = buildBaseChartOptions(cc);
    const sigs = buildSignalSeries(
      result.date,
      result.close,
      result.buy_rating,
      result.sell_rating,
    );
    return {
      ...base,
      chart: { ...base.chart, height: 400 },
      xAxis: {
        type: "datetime",
        crosshair: true,
        gridLineColor: cc.grid,
        lineColor: cc.border,
        tickColor: cc.border,
        labels: { style: { color: cc.text } },
      },
      yAxis: [
        {
          gridLineColor: cc.grid,
          lineColor: cc.border,
          labels: { style: { color: cc.text } },
          title: { text: "" },
        },
      ],
      series: [
        {
          type: "line",
          name: symbol.toUpperCase(),
          data: ts.map((t, i) => [t, result.close[i]]),
          yAxis: 0,
          color: "#60a5fa",
          lineWidth: 1.5,
        },
        ...sigs,
      ] as Highcharts.SeriesOptionsType[],
    };
  }, [result, cc, symbol]);

  const tableData = useMemo(() => {
    if (!result) return [];
    return result.date.map((d, i) => ({
      date: d,
      close: result.close[i]?.toFixed(2),
      buy: result.buy_rating[i],
      sell: result.sell_rating[i],
    }));
  }, [result]);

  const { lastSignal, buys, sells } = useMemo(() => {
    if (!result) return { lastSignal: "Hold", buys: 0, sells: 0 };
    let ls = "Hold";
    for (let i = result.buy_rating.length - 1; i >= 0; i--) {
      if (result.buy_rating[i] > 0) {
        ls = "Buy";
        break;
      }
      if (result.sell_rating[i] > 0) {
        ls = "Sell";
        break;
      }
    }
    return {
      lastSignal: ls,
      buys: result.buy_rating.filter((v) => v > 0).length,
      sells: result.sell_rating.filter((v) => v > 0).length,
    };
  }, [result]);

  function renderCondRow(
    cond: Condition,
    idx: number,
    list: Condition[],
    setList: React.Dispatch<React.SetStateAction<Condition[]>>,
  ) {
    const ind = getIndicator(cond.indicatorId);
    const stg = ind
      ? getStrategy(cond.indicatorId, cond.strategyId)
      : undefined;
    const stratOpts = ind
      ? ind.strategies.map((s) => ({ label: s.name, value: s.id }))
      : [];
    const optOpts = stg?.options
      ? stg.options.map((o) => ({ label: o, value: o }))
      : [];
    return (
      <div key={cond.id} className="mb-2">
        {idx > 0 && (
          <div className="flex align-items-center gap-2 mb-1">
            <SelectButton
              value={cond.operator}
              onChange={(e) =>
                updateCond(list, setList, cond.id, { operator: e.value })
              }
              options={[
                { label: "AND", value: "AND" },
                { label: "OR", value: "OR" },
              ]}
            />
          </div>
        )}
        <div className="grid align-items-end">
          <div className="col-12 md:col-3">
            <Dropdown
              value={cond.indicatorId}
              options={loadingInd ? [] : indicatorOpts}
              onChange={(e) =>
                updateCond(list, setList, cond.id, {
                  indicatorId: e.value,
                  strategyId: "",
                  option: "",
                  settings: {},
                })
              }
              placeholder="Select Indicator"
              className="w-full"
              emptyMessage={loadingInd ? "Loading..." : "No indicators"}
            />
          </div>
          {cond.indicatorId && (
            <div className="col-12 md:col-3">
              <Dropdown
                value={cond.strategyId}
                options={stratOpts}
                onChange={(e) => {
                  const s = getStrategy(cond.indicatorId, e.value);
                  const defs: Record<string, number> = {};
                  s?.settings?.forEach((st) => {
                    defs[st.key] = st.default;
                  });
                  updateCond(list, setList, cond.id, {
                    strategyId: e.value,
                    option: "",
                    settings: defs,
                  });
                }}
                placeholder="Select Strategy"
                className="w-full"
              />
            </div>
          )}
          {stg?.options && stg.options.length > 0 && (
            <div className="col-12 md:col-2">
              <Dropdown
                value={cond.option}
                options={optOpts}
                onChange={(e) =>
                  updateCond(list, setList, cond.id, { option: e.value })
                }
                placeholder="Option"
                className="w-full"
              />
            </div>
          )}
          {stg?.settings?.map((s) => (
            <div key={s.key} className="col-6 md:col-2">
              <label className="block text-xs mb-1 sv-text-muted">
                {s.label}
              </label>
              <InputNumber
                value={cond.settings[s.key] ?? s.default}
                onValueChange={(e) =>
                  updateCond(list, setList, cond.id, {
                    settings: {
                      ...cond.settings,
                      [s.key]: e.value ?? s.default,
                    },
                  })
                }
                min={1}
                showButtons
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          ))}
          <div className="col-12 md:col-1 flex justify-content-end">
            <Button
              icon="pi pi-times"
              className="p-button-sm p-button-danger p-button-text"
              onClick={() => removeCond(cond.id, setList)}
              tooltip="Remove"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Toast ref={toastRef} position="top-right" />
      <div className="grid mb-3">
        <div className="col-12 md:col-4">
          <label className="block mb-1 text-sm sv-text-muted">Symbol</label>
          <InputText
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full"
          />
          <RecentChips items={recent} onSelect={setSymbol} />
        </div>
        <div className="col-12 md:col-4">
          <label className="block mb-1 text-sm sv-text-muted">Start Date</label>
          <Calendar
            value={startDate}
            onChange={(e) => setStartDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
        <div className="col-12 md:col-4">
          <label className="block mb-1 text-sm sv-text-muted">End Date</label>
          <Calendar
            value={endDate}
            onChange={(e) => setEndDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            className="w-full"
            showIcon
          />
        </div>
      </div>

      {/* Buy Conditions */}
      <div
        className="mb-3 p-3 border-round"
        style={{
          background: "var(--sv-bg-surface)",
          border: "1px solid var(--sv-success-bg)",
        }}
      >
        <div className="flex align-items-center justify-content-between mb-2">
          <span className="font-semibold text-sm sv-text-gain">
            <i className="pi pi-arrow-up mr-1" />
            Buy Conditions
          </span>
          <Button
            label="Add Buy Condition"
            icon="pi pi-plus"
            className="p-button-sm p-button-success p-button-outlined"
            onClick={() => addCond(setBuyConds)}
          />
        </div>
        {buyConds.length === 0 && (
          <div className="text-center py-2 text-sm sv-text-muted">
            No buy conditions. Click "Add Buy Condition" to start building.
          </div>
        )}
        {buyConds.map((c, i) => renderCondRow(c, i, buyConds, setBuyConds))}
      </div>

      {/* Sell Conditions */}
      <div
        className="mb-3 p-3 border-round"
        style={{
          background: "var(--sv-bg-surface)",
          border: "1px solid var(--sv-danger-bg)",
        }}
      >
        <div className="flex align-items-center justify-content-between mb-2">
          <span className="font-semibold text-sm sv-text-loss">
            <i className="pi pi-arrow-down mr-1" />
            Sell Conditions
          </span>
          <Button
            label="Add Sell Condition"
            icon="pi pi-plus"
            className="p-button-sm p-button-danger p-button-outlined"
            onClick={() => addCond(setSellConds)}
          />
        </div>
        {sellConds.length === 0 && (
          <div className="text-center py-2 text-sm sv-text-muted">
            No sell conditions. Click "Add Sell Condition" to start building.
          </div>
        )}
        {sellConds.map((c, i) => renderCondRow(c, i, sellConds, setSellConds))}
      </div>

      <div className="flex gap-2 mb-3">
        <Button
          label="Run Strategy"
          icon="pi pi-play"
          onClick={run}
          loading={loading}
          className="p-button-sm p-button-primary"
        />
        <Button
          label="Save Strategy"
          icon="pi pi-save"
          className="p-button-sm p-button-outlined"
          onClick={() => setSaveDialog(true)}
        />
      </div>

      {error && (
        <div className="mb-3 p-3 border-round flex align-items-center gap-2 sv-alert-error">
          <i className="pi pi-exclamation-triangle" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {loading && <Skeleton height="400px" className="border-round-lg" />}
      {result && !loading && (
        <>
          <StatBar lastSignal={lastSignal} buys={buys} sells={sells} />
          <TabView
            activeIndex={activeTab}
            onTabChange={(e) => setActiveTab(e.index)}
          >
            <TabPanel
              header={
                <span>
                  <i className="pi pi-chart-line mr-1" />
                  Chart
                </span>
              }
            >
              <div
                className="border-round-lg overflow-hidden"
                style={{ background: cc.bg }}
              >
                <HighchartsReact
                  highcharts={Highcharts}
                  options={chartOptions}
                />
              </div>
            </TabPanel>
            <TabPanel
              header={
                <span>
                  <i className="pi pi-table mr-1" />
                  Signals Table
                </span>
              }
            >
              <DataTable
                value={tableData}
                paginator
                rows={50}
                rowsPerPageOptions={[25, 50, 100]}
                size="small"
                scrollable
                scrollHeight="500px"
                className="text-sm"
              >
                <Column
                  field="date"
                  header="Date"
                  sortable
                  style={{ minWidth: "110px" }}
                />
                <Column
                  field="close"
                  header="Close"
                  sortable
                  style={{ minWidth: "90px", textAlign: "right" }}
                />
                <Column
                  field="buy"
                  header="Buy Rating"
                  sortable
                  style={{ minWidth: "100px", textAlign: "center" }}
                  body={(row: { buy: number }) =>
                    row.buy > 0 ? (
                      <Tag value={String(row.buy)} severity="success" />
                    ) : (
                      <span className="sv-text-muted">-</span>
                    )
                  }
                />
                <Column
                  field="sell"
                  header="Sell Rating"
                  sortable
                  style={{ minWidth: "100px", textAlign: "center" }}
                  body={(row: { sell: number }) =>
                    row.sell > 0 ? (
                      <Tag value={String(row.sell)} severity="danger" />
                    ) : (
                      <span className="sv-text-muted">-</span>
                    )
                  }
                />
              </DataTable>
            </TabPanel>
          </TabView>
        </>
      )}

      <Dialog
        visible={saveDialog}
        onHide={() => setSaveDialog(false)}
        header="Save Strategy"
        style={{ width: "380px" }}
        modal
      >
        <div className="mb-3">
          <label className="block mb-1 text-sm sv-text-muted">
            Strategy Name
          </label>
          <InputText
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="w-full"
            placeholder="My Strategy"
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-content-end">
          <Button
            label="Cancel"
            className="p-button-text p-button-sm"
            onClick={() => setSaveDialog(false)}
          />
          <Button
            label="Save"
            icon="pi pi-save"
            className="p-button-sm p-button-primary"
            onClick={savePreset}
            loading={saving}
            disabled={!saveName.trim()}
          />
        </div>
      </Dialog>
    </div>
  );
};

// ─── WelcomePanel (default view) ─────────────────────────────────────────────

const WelcomePanel: React.FC<{
  userCount: number;
  onLaunch: (id: string) => void;
  onNew: () => void;
}> = ({ userCount, onLaunch, onNew }) => {
  const cards = [
    {
      id: "svPriceMF",
      icon: "pi-chart-line",
      name: "SV Money Flow Daily",
      sub: "Single-symbol momentum",
      desc: "Analyzes daily price action using a proprietary Money Flow oscillator combined with MACD and Stochastics to identify high-probability buy and sell signals.",
      grad: "linear-gradient(135deg, rgba(59,130,246,.15) 0%, rgba(120,44,168,.15) 100%)",
      accent: "#3b82f6",
    },
    {
      id: "svRatioMF",
      icon: "pi-chart-bar",
      name: "SV Pair Money Flow",
      sub: "Dual-symbol ratio analysis",
      desc: "Compares two symbols using ratio-based Money Flow, revealing relative strength and rotation patterns not visible on individual charts.",
      grad: "linear-gradient(135deg, rgba(16,185,129,.15) 0%, rgba(245,158,11,.15) 100%)",
      accent: "#10b981",
    },
    {
      id: "svWeeklyMF",
      icon: "pi-calendar",
      name: "SV Money Flow Weekly",
      sub: "Long-term weekly trend",
      desc: "Weekly timeframe analysis with dual MACD systems and RSI overlay for identifying major trend reversals and long-term positioning opportunities.",
      grad: "linear-gradient(135deg, rgba(168,85,247,.15) 0%, rgba(236,72,153,.15) 100%)",
      accent: "#a855f7",
    },
  ];

  return (
    <div>
      <div className="text-center mb-4 pt-4 pb-2 px-3">
        <i className="pi pi-chart-line mb-3 sv-hero-icon sv-text-accent" />
        <h2
          className="m-0 mb-2 font-bold text-color sv-page-title"
          style={{ fontSize: "1.5rem" }}
        >
          Strategy Dashboard
        </h2>
        <p className="m-0 text-sm sv-text-muted" style={{ margin: "0 auto" }}>
          Professional-grade signal analysis. Select a built-in strategy or
          build your own custom signal engine.
        </p>
      </div>

      <div className="grid mb-4">
        {cards.map((c) => (
          <div key={c.id} className="col-12 md:col-4">
            <div
              className="sv-feature-card border-round-lg p-4 h-full flex flex-column"
              style={{
                background: c.grad,
                border: `1px solid ${c.accent}30`,
              }}
            >
              <div className="flex align-items-center gap-2 mb-3">
                <div
                  className="border-round p-2"
                  style={{ background: `${c.accent}20` }}
                >
                  <i
                    className={`pi ${c.icon}`}
                    style={{ color: c.accent, fontSize: "1.1rem" }}
                  />
                </div>
                <div>
                  <div className="font-bold text-sm text-color">{c.name}</div>
                  <div className="text-xs sv-text-muted">{c.sub}</div>
                </div>
              </div>
              <p
                className="text-sm flex-grow-1 mb-3 m-0 text-color-secondary"
                style={{ lineHeight: "1.55" }}
              >
                {c.desc}
              </p>
              <Button
                label="Launch Strategy"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="p-button-sm w-full"
                style={{
                  background: c.accent,
                  border: "none",
                  fontWeight: 600,
                }}
                onClick={() => onLaunch(c.id)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="col-12 md:col-6">
          <div className="sv-data-card sv-preset-card border-round-lg p-4 flex align-items-center gap-3">
            <div className="sv-icon-badge border-round p-3 flex-shrink-0">
              <i className="pi pi-cog" style={{ fontSize: "1.3rem" }} />
            </div>
            <div className="flex-grow-1">
              <div className="font-bold mb-1 text-color">
                Custom Strategy Builder
              </div>
              <div className="text-sm sv-text-muted">
                Combine technical indicators to build and backtest your own
                strategy
              </div>
            </div>
            <Button
              label="Build"
              icon="pi pi-plus"
              className="p-button-sm p-button-outlined"
              onClick={onNew}
            />
          </div>
        </div>
        <div className="col-12 md:col-6">
          <div className="sv-data-card border-round-lg p-4 flex align-items-center gap-3">
            <div
              className="border-round p-3 flex-shrink-0"
              style={{ background: "var(--sv-success-bg)" }}
            >
              <i
                className="pi pi-bookmark sv-text-gain"
                style={{ fontSize: "1.3rem" }}
              />
            </div>
            <div className="flex-grow-1">
              <div className="font-bold mb-1 text-color">Saved Strategies</div>
              <div className="text-sm sv-text-muted">
                {userCount > 0
                  ? `${userCount} saved ${userCount === 1 ? "strategy" : "strategies"} in your library`
                  : "No saved strategies yet. Start building!"}
              </div>
            </div>
            <div
              className="font-bold sv-text-gain"
              style={{
                fontSize: "1.8rem",
                minWidth: "2rem",
                textAlign: "center",
              }}
            >
              {userCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const StrategyDashboardPage: React.FC = () => {
  const toast = useRef<Toast>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<UserPreset | null>(null);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadPresets = useCallback(() => {
    setLoadingPresets(true);
    api
      .get("/stg/preset")
      .then((r) => setUserPresets(r.data || []))
      .catch(() => setUserPresets([]))
      .finally(() => setLoadingPresets(false));
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const deletePreset = useCallback(
    (id: string, name: string) => {
      confirmDialog({
        message: `Delete strategy "${name}"?`,
        header: "Confirm Delete",
        icon: "pi pi-exclamation-triangle",
        acceptClassName: "p-button-danger",
        accept: async () => {
          try {
            await api.delete("/stg/preset", { params: { id } });
            toast.current?.show({
              severity: "success",
              summary: "Strategy deleted",
            });
            loadPresets();
            if (selectedPreset?.id === id) {
              setSelectedId(null);
              setSelectedPreset(null);
            }
          } catch {
            toast.current?.show({
              severity: "error",
              summary: "Failed to delete strategy",
            });
          }
        },
      });
    },
    [loadPresets, selectedPreset],
  );

  function selectSvStrategy(id: string) {
    setSelectedId(id);
    setSelectedPreset(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function selectUserPreset(p: UserPreset) {
    setSelectedId(`user_${p.id}`);
    setSelectedPreset(p);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function getPanelTitle(): string {
    if (!selectedId || selectedId === "__welcome__")
      return "Strategy Dashboard";
    const sv = SV_STRATEGIES.find((s) => s.id === selectedId);
    if (sv) return sv.name;
    if (selectedPreset) return selectedPreset.name;
    if (selectedId === "__new__") return "New Custom Strategy";
    return "Strategy";
  }

  function renderMainPanel() {
    if (!selectedId || selectedId === "__welcome__") {
      return (
        <WelcomePanel
          userCount={userPresets.length}
          onLaunch={selectSvStrategy}
          onNew={() => {
            setSelectedId("__new__");
            setSelectedPreset(null);
          }}
        />
      );
    }
    if (selectedId === "svPriceMF") return <MoneyFlowPanel />;
    if (selectedId === "svRatioMF") return <MoneyFlowPairPanel />;
    if (selectedId === "svWeeklyMF") return <MoneyFlowWeeklyPanel />;
    if (selectedId === "__new__" || selectedId?.startsWith("user_")) {
      return (
        <StrategyBuilderPanel
          preset={selectedPreset ?? undefined}
          onSave={loadPresets}
        />
      );
    }
    return null;
  }

  return (
    <div
      className="p-4"
      style={{ minHeight: "100vh", background: "var(--sv-bg-card)" }}
    >
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />
      <div className="flex align-items-center gap-2 mb-3">
        <Button
          icon={sidebarOpen ? "pi pi-chevron-left" : "pi pi-bars"}
          className="p-button-sm p-button-text"
          onClick={() => setSidebarOpen((v) => !v)}
          tooltip={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          tooltipOptions={{ position: "right" }}
        />
        <i className="pi pi-chart-bar sv-text-accent" />
        <span className="font-bold text-color" style={{ fontSize: "1.1rem" }}>
          {getPanelTitle()}
        </span>
      </div>
      <div className="grid align-items-start" style={{ gap: 0 }}>
        {sidebarOpen && (
          <div className="col-12 md:col-3 pr-3">
            <div
              className="sv-data-card border-round-lg overflow-hidden"
              style={{ position: "sticky", top: "1rem" }}
            >
              {/* SV Strategies section */}
              <div
                className="p-3 pb-2"
                style={{ borderBottom: "1px solid var(--sv-border)" }}
              >
                <span className="text-xs font-bold uppercase sv-info-label">
                  SV Strategies
                </span>
              </div>
              {SV_STRATEGIES.map((s) => {
                const active = selectedId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`sv-sidebar-item flex align-items-center gap-2${active ? " active" : ""}`}
                    onClick={() => selectSvStrategy(s.id)}
                  >
                    <div
                      className="border-round flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        background: active
                          ? "var(--sv-accent)"
                          : "rgba(255,255,255,.06)",
                        minWidth: "32px",
                        minHeight: "32px",
                      }}
                    >
                      <i
                        className={`pi ${s.icon}`}
                        style={{
                          color: active ? "#fff" : "var(--sv-accent)",
                          fontSize: ".85rem",
                        }}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis">
                        {s.name}
                      </div>
                      <div className="text-xs sv-text-muted">{s.subtitle}</div>
                    </div>
                  </div>
                );
              })}

              {/* My Strategies section */}
              <div
                className="p-3 pb-2"
                style={{
                  borderTop: "1px solid var(--sv-border)",
                  borderBottom: "1px solid var(--sv-border)",
                  marginTop: ".25rem",
                }}
              >
                <div className="flex align-items-center justify-content-between">
                  <span className="text-xs font-bold uppercase sv-info-label">
                    My Strategies
                  </span>
                  {userPresets.length > 0 && (
                    <Tag
                      value={String(userPresets.length)}
                      className="border-round-xl"
                      style={{
                        background: "var(--sv-accent-bg)",
                        color: "var(--sv-accent)",
                        fontSize: "0.7rem",
                      }}
                    />
                  )}
                </div>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {loadingPresets ? (
                  <div className="p-3">
                    {[1, 2, 3].map((k) => (
                      <Skeleton
                        key={k}
                        height="40px"
                        className="mb-2 border-round"
                      />
                    ))}
                  </div>
                ) : userPresets.length === 0 ? (
                  <div className="p-3 text-center text-xs sv-text-muted">
                    No saved strategies yet.
                  </div>
                ) : (
                  userPresets.map((p) => {
                    const pKey = `user_${p.id}`;
                    const active = selectedId === pKey;
                    return (
                      <div
                        key={p.id}
                        className="flex align-items-center gap-2 p-3 cursor-pointer"
                        style={{
                          borderLeft: active
                            ? "3px solid var(--sv-warning)"
                            : "3px solid transparent",
                          background: active
                            ? "var(--sv-warning-bg)"
                            : "transparent",
                          transition: "all .15s",
                        }}
                        onClick={() => selectUserPreset(p)}
                      >
                        <i
                          className="pi pi-bookmark flex-shrink-0"
                          style={{
                            color: active
                              ? "var(--sv-warning)"
                              : "var(--sv-text-muted)",
                            fontSize: ".85rem",
                          }}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <div
                            className="text-sm font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis"
                            style={{
                              color: active
                                ? "var(--sv-warning)"
                                : "var(--sv-text-primary)",
                            }}
                          >
                            {p.name}
                          </div>
                          {p.symbol && (
                            <div className="text-xs sv-text-muted">
                              {p.symbol}
                            </div>
                          )}
                        </div>
                        <Button
                          icon="pi pi-trash"
                          className="p-button-sm p-button-text p-button-danger"
                          style={{
                            padding: "4px",
                            width: "26px",
                            height: "26px",
                            flexShrink: 0,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(p.id, p.name);
                          }}
                          tooltip="Delete"
                          tooltipOptions={{ position: "left" }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
              <div
                className="p-3"
                style={{ borderTop: "1px solid var(--sv-border)" }}
              >
                <Button
                  label="New Strategy"
                  icon="pi pi-plus"
                  className="p-button-sm w-full p-button-outlined"
                  onClick={() => {
                    setSelectedId("__new__");
                    setSelectedPreset(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Main content */}
        <div className={sidebarOpen ? "col-12 md:col-9" : "col-12"}>
          <div
            className="sv-data-card border-round-lg p-4"
            style={{ minHeight: "80vh" }}
          >
            {renderMainPanel()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyDashboardPage;
