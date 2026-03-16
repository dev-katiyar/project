import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Skeleton } from "primereact/skeleton";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { Slider } from "primereact/slider";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { Tooltip } from "primereact/tooltip";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FilterOption {
  id: string;
  name: string;
}

interface ScreenFilter {
  name: string;
  type: "slider" | "dropdown";
  group: string;
  display_order?: number;
  multiple?: boolean;
  allow_custom?: boolean;
  range?: string;
  range_text?: string;
  slider_values?: [number, number];
  selected_slider_values?: [number, number];
  display_values?: FilterOption[];
  selected_value?: string | string[];
  minValue?: number;
  maxValue?: number;
  text?: string;
}

interface PresetTopSymbol {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePct: number;
}

interface PresetSummary {
  preset_id: string;
  preset_name: string;
  preset_top_symbols?: PresetTopSymbol[];
  values?: ScreenFilter[];
  sortBy?: string;
  limit?: number;
}

interface PresetsData {
  msg: string;
  preset_data: PresetSummary[];
}

interface SortColumn {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ID = "-1";
const CUSTOM_ID = "-2";
const LIMIT_OPTS = [
  { label: "10 results", value: 10 },
  { label: "20 results", value: 20 },
  { label: "50 results", value: 50 },
  { label: "100 results", value: 100 },
];
const SORT_ORDER_OPTS = [
  { label: "Descending", value: "Descending" },
  { label: "Ascending", value: "Ascending" },
];

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function fmtPrice(v: number): string {
  if (v == null || isNaN(Number(v))) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function fmtChg(v: number): string {
  if (v == null || isNaN(Number(v))) return "—";
  return `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}`;
}

function fmtPct(v: number): string {
  if (v == null || isNaN(Number(v))) return "—";
  return `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
}

function buildFilterText(f: ScreenFilter): string {
  if (f.type === "slider" && f.slider_values && f.selected_slider_values) {
    const [min, max] = f.slider_values;
    const [selMin, selMax] = f.selected_slider_values;
    const sfx = f.range_text ? ` ${f.range_text}` : "";
    if (selMin === min && selMax === max) return `${f.name}: Any`;
    if (selMin === min) return `${f.name}: ≤ ${selMax}${sfx}`;
    if (selMax === max) return `${f.name}: ≥ ${selMin}${sfx}`;
    return `${f.name}: ${selMin} – ${selMax}${sfx}`;
  }
  if (f.type === "dropdown") {
    if (f.selected_value === CUSTOM_ID) {
      const sfx = f.range_text ?? "";
      return `${f.name}: ${f.minValue ?? ""}–${f.maxValue ?? ""} ${sfx}`.trim();
    }
    if (f.multiple && Array.isArray(f.selected_value) && f.display_values) {
      const names = f.display_values
        .filter((o) => (f.selected_value as string[]).includes(o.id))
        .map((o) => o.name)
        .join(", ");
      return names ? `${f.name}: ${names}` : `${f.name}: Any`;
    }
    const found = f.display_values?.find((o) => o.id === f.selected_value);
    return found ? `${f.name}: ${found.name}` : `${f.name}: Any`;
  }
  return f.name;
}

function isActive(f: ScreenFilter): boolean {
  if (f.type === "slider" && f.slider_values && f.selected_slider_values) {
    return (
      f.selected_slider_values[0] !== f.slider_values[0] ||
      f.selected_slider_values[1] !== f.slider_values[1]
    );
  }
  if (f.type === "dropdown") {
    if (f.multiple) {
      return Array.isArray(f.selected_value) && f.selected_value.length > 0;
    }
    return f.selected_value !== DEFAULT_ID;
  }
  return false;
}

function resetFilter(f: ScreenFilter): ScreenFilter {
  const r = deepClone(f);
  if (r.type === "slider" && r.slider_values) {
    r.selected_slider_values = [...r.slider_values] as [number, number];
  }
  if (r.type === "dropdown") {
    r.selected_value = r.multiple ? [] : DEFAULT_ID;
    r.minValue = undefined;
    r.maxValue = undefined;
  }
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table cell shared styles (no primeflex equivalent for th/td)
// ─────────────────────────────────────────────────────────────────────────────

const thS: React.CSSProperties = {
  padding: "0.3rem 0.7rem",
  fontSize: "0.67rem",
  fontWeight: 600,
  color: "var(--sv-text-muted)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--sv-border)",
  whiteSpace: "nowrap",
};
const tdS: React.CSSProperties = {
  padding: "0.32rem 0.7rem",
  borderBottom: "1px solid var(--sv-border-light)",
  verticalAlign: "middle",
};

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: string; title: string; body?: string }> = ({
  icon,
  title,
  body,
}) => (
  <div className="flex flex-column align-items-center justify-content-center text-center p-5 gap-3 sv-text-muted">
    <i className={`pi ${icon}`} style={{ fontSize: "2.5rem", opacity: 0.18 }} />
    <div className="font-bold text-sm" style={{ color: "var(--sv-text-secondary)" }}>
      {title}
    </div>
    {body && (
      <p className="m-0 text-sm" style={{ maxWidth: "28rem", lineHeight: 1.65 }}>
        {body}
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SV badge
// ─────────────────────────────────────────────────────────────────────────────

const SvBadge: React.FC<{ small?: boolean }> = ({ small }) => (
  <span
    style={{
      background: "var(--sv-accent-gradient)",
      borderRadius: small ? "0.2rem" : "0.25rem",
      padding: small ? "0.05rem 0.28rem" : "0.1rem 0.38rem",
      fontSize: small ? "0.53rem" : "0.58rem",
      fontWeight: 700,
      color: "var(--sv-text-inverse)",
      letterSpacing: "0.07em",
      flexShrink: 0,
    }}
  >
    SV
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// PresetCard — overview grid
// ─────────────────────────────────────────────────────────────────────────────

const PresetCard: React.FC<{
  preset: PresetSummary;
  isSv?: boolean;
  onRun: (p: PresetSummary) => void;
}> = ({ preset, isSv, onRun }) => (
  <div className="sv-data-card sv-preset-card flex flex-column h-full">
    {/* Header */}
    <div
      className="flex align-items-center justify-content-between gap-2 px-3 py-2"
      style={{ borderBottom: "1px solid var(--sv-border)" }}
    >
      <div className="flex align-items-center gap-2 overflow-hidden">
        {isSv && <SvBadge />}
        <div
          className="font-bold text-sm text-overflow-ellipsis white-space-nowrap overflow-hidden"
          style={{ color: "var(--sv-text-primary)" }}
        >
          {preset.preset_name}
        </div>
      </div>
      <Button
        icon="pi pi-play"
        label="Run"
        size="small"
        onClick={() => onRun(preset)}
        style={{ flexShrink: 0, fontSize: "0.78rem" }}
      />
    </div>

    {/* Symbol rows */}
    <div className="flex-1">
      {!preset.preset_top_symbols?.length ? (
        <div className="p-3 text-sm sv-text-muted" style={{ fontStyle: "italic" }}>
          Run screen to populate results
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.79rem" }}>
          <thead>
            <tr style={{ background: "var(--sv-bg-surface)" }}>
              <th style={{ ...thS, textAlign: "left" }}>Symbol</th>
              <th style={{ ...thS, textAlign: "right" }}>Price</th>
              <th style={{ ...thS, textAlign: "right" }}>1D Chg</th>
            </tr>
          </thead>
          <tbody>
            {preset.preset_top_symbols.slice(0, 5).map((row, i) => (
              <tr
                key={row.symbol}
                style={{ background: i % 2 ? "var(--sv-bg-surface)" : "transparent" }}
              >
                <td style={{ ...tdS, fontWeight: 700, letterSpacing: "0.03em" }} className="sv-text-accent">
                  {row.symbol}
                </td>
                <td style={{ ...tdS, textAlign: "right" }}>
                  {fmtPrice(row.price)}
                </td>
                <td
                  style={{ ...tdS, textAlign: "right", fontWeight: 600 }}
                  className={row.priceChange >= 0 ? "sv-text-gain" : "sv-text-loss"}
                >
                  {fmtChg(row.priceChange)} ({fmtPct(row.priceChangePct)})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SidebarItem — preset list in detail mode
// ─────────────────────────────────────────────────────────────────────────────

const SidebarItem: React.FC<{
  preset: PresetSummary;
  selected: boolean;
  isSv?: boolean;
  onSelect: () => void;
}> = ({ preset, selected, isSv, onSelect }) => (
  <div
    onClick={onSelect}
    className={`sv-sidebar-item flex align-items-center gap-2${selected ? " active" : ""}`}
  >
    {isSv && <SvBadge small />}
    <span className="text-overflow-ellipsis white-space-nowrap overflow-hidden flex-1">
      {preset.preset_name}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FilterChip
// ─────────────────────────────────────────────────────────────────────────────

const FilterChip: React.FC<{
  filter: ScreenFilter;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ filter, onEdit, onRemove }) => (
  <div className="sv-filter-chip">
    <span
      className="text-overflow-ellipsis white-space-nowrap overflow-hidden"
      style={{ maxWidth: "200px" }}
    >
      {buildFilterText(filter)}
    </span>
    <button onClick={onEdit} title="Edit filter" className="sv-chip-btn">
      <i className="pi pi-pencil" style={{ fontSize: "0.58rem" }} />
    </button>
    <button onClick={onRemove} title="Remove filter" className="sv-chip-btn remove">
      <i className="pi pi-times" style={{ fontSize: "0.58rem" }} />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FilterEditor — dialog content
// ─────────────────────────────────────────────────────────────────────────────

const FilterEditor: React.FC<{
  filter: ScreenFilter;
  onApply: (f: ScreenFilter) => void;
  onClose: () => void;
}> = ({ filter, onApply, onClose }) => {
  const [local, setLocal] = useState<ScreenFilter>(deepClone(filter));

  const sliderVals = local.selected_slider_values ??
    local.slider_values ?? [0, 100];

  return (
    <div style={{ minWidth: "280px" }}>
      {/* Slider type */}
      {local.type === "slider" && local.slider_values && (
        <div>
          <div className="text-sm sv-text-muted mb-2">
            Range: {local.slider_values[0]} – {local.slider_values[1]}
            {local.range_text ? ` ${local.range_text}` : ""}
          </div>
          <div className="px-2" style={{ paddingBottom: "1.25rem" }}>
            <Slider
              value={sliderVals as number[]}
              onChange={(e) =>
                setLocal((p) => ({
                  ...p,
                  selected_slider_values: e.value as [number, number],
                }))
              }
              min={local.slider_values[0]}
              max={local.slider_values[1]}
              range
            />
          </div>
          <div
            className="flex justify-content-between font-bold mb-4"
            style={{ fontSize: "0.9rem", color: "var(--sv-text-primary)" }}
          >
            <span>{sliderVals[0]}{local.range_text ? ` ${local.range_text}` : ""}</span>
            <span>{sliderVals[1]}{local.range_text ? ` ${local.range_text}` : ""}</span>
          </div>
        </div>
      )}

      {/* Dropdown — single */}
      {local.type === "dropdown" &&
        !local.multiple &&
        local.selected_value !== CUSTOM_ID && (
          <Dropdown
            value={local.selected_value}
            options={local.display_values ?? []}
            optionLabel="name"
            optionValue="id"
            onChange={(e) =>
              setLocal((p) => ({ ...p, selected_value: e.value }))
            }
            className="w-full mb-3"
            placeholder="Select…"
            filter
          />
        )}

      {/* Dropdown — multi */}
      {local.type === "dropdown" && local.multiple && (
        <MultiSelect
          value={local.selected_value}
          options={local.display_values ?? []}
          optionLabel="name"
          optionValue="id"
          onChange={(e) =>
            setLocal((p) => ({ ...p, selected_value: e.value }))
          }
          className="w-full mb-3"
          placeholder="Select options…"
          filter
          display="chip"
        />
      )}

      {/* Dropdown — custom range */}
      {local.type === "dropdown" &&
        local.allow_custom &&
        local.selected_value === CUSTOM_ID && (
          <div className="flex align-items-center gap-2 mb-3 flex-wrap">
            <InputText
              value={String(local.minValue ?? "")}
              onChange={(e) =>
                setLocal((p) => ({ ...p, minValue: Number(e.target.value) }))
              }
              style={{ width: "90px", fontSize: "0.85rem" }}
              placeholder="Min"
            />
            <span className="sv-text-muted">to</span>
            <InputText
              value={String(local.maxValue ?? "")}
              onChange={(e) =>
                setLocal((p) => ({ ...p, maxValue: Number(e.target.value) }))
              }
              style={{ width: "90px", fontSize: "0.85rem" }}
              placeholder="Max"
            />
            {local.range_text && (
              <span className="text-sm sv-text-muted">{local.range_text}</span>
            )}
          </div>
        )}

      <div className="flex justify-content-end gap-2 pt-1">
        <Button label="Cancel" text size="small" onClick={onClose} />
        <Button
          label="Apply"
          icon="pi pi-check"
          size="small"
          onClick={() => {
            onApply(local);
            onClose();
          }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ResultsGrid — scanned symbols display
// ─────────────────────────────────────────────────────────────────────────────

const ResultsGrid: React.FC<{
  symbols: string[];
  loading: boolean;
}> = ({ symbols, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} width="58px" height="28px" borderRadius="0.35rem" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "0.25rem" }}
    >
      {symbols.map((sym) => (
        <span key={sym} className="sv-symbol-chip">
          {sym}
        </span>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — reusable section title row
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  isSv?: boolean;
  title: string;
  action?: React.ReactNode;
}> = ({ isSv, title, action }) => (
  <div className="flex align-items-center gap-3 mb-3">
    {isSv ? (
      <span
        style={{
          background: "var(--sv-accent-gradient)",
          borderRadius: "0.3rem",
          padding: "0.15rem 0.5rem",
          fontSize: "0.6rem",
          fontWeight: 700,
          color: "var(--sv-text-inverse)",
          letterSpacing: "0.1em",
        }}
      >
        SV
      </span>
    ) : (
      <i className="pi pi-user sv-text-accent text-sm" />
    )}
    <h2
      className="m-0 font-bold"
      style={{ fontSize: "0.95rem", color: "var(--sv-text-primary)" }}
    >
      {title}
    </h2>
    <div className="flex-1" style={{ height: "1px", background: "var(--sv-border)" }} />
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Panel — card wrapper using sv-data-card
// ─────────────────────────────────────────────────────────────────────────────

const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className, style }) => (
  <div className={`sv-data-card${className ? ` ${className}` : ""}`} style={style}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ScreensCombinedPage
// ─────────────────────────────────────────────────────────────────────────────

const ScreensCombinedPage: React.FC = () => {
  useTheme(); // for theme-reactive re-renders

  // ── Presets state ────────────────────────────────────────────────────────
  const [svPresets, setSvPresets] = useState<PresetsData | null>(null);
  const [userPresets, setUserPresets] = useState<PresetsData | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState<"overview" | "detail">("overview");
  const [selectedPreset, setSelectedPreset] = useState<PresetSummary | null>(null);
  const [isNewPreset, setIsNewPreset] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [allFilters, setAllFilters] = useState<ScreenFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<ScreenFilter[]>([]);
  const [sortColumns, setSortColumns] = useState<SortColumn[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("Descending");
  const [limit, setLimit] = useState<number>(20);
  const [filterDataLoading, setFilterDataLoading] = useState(false);

  // ── Scan state ───────────────────────────────────────────────────────────
  const [scannedSymbols, setScannedSymbols] = useState<string[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [filterError, setFilterError] = useState("");
  const [hasScanned, setHasScanned] = useState(false);

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [editingFilter, setEditingFilter] = useState<ScreenFilter | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // ── Load presets ─────────────────────────────────────────────────────────

  const loadPresets = useCallback(() => {
    setPresetsLoading(true);
    Promise.all([
      api.get("/screen/model/preset/data/10/5").then((r) => r.data),
      api.get("/screen/user/preset/data/10/5").then((r) => r.data),
    ])
      .then(([sv, user]) => {
        setSvPresets(sv);
        setUserPresets(user);
      })
      .catch(() => {})
      .finally(() => setPresetsLoading(false));
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // ── Load filter data for a preset ────────────────────────────────────────

  const loadFilterData = useCallback(
    (presetId: string, existingPresetData?: PresetSummary) => {
      setFilterDataLoading(true);
      setSelectedFilters([]);
      setScannedSymbols([]);
      setScanMsg("");
      setHasScanned(false);
      setFilterError("");
      setSortBy("");
      setSortOrder("Descending");
      setLimit(20);

      const isNew = presetId.startsWith("new_");

      const fetchPreset =
        existingPresetData
          ? Promise.resolve(existingPresetData)
          : isNew
          ? Promise.resolve(null)
          : api.get(`/screen/preset/data/${presetId}`).then((r) => r.data);

      Promise.all([
        api.get("/screen/filter").then((r) => r.data),
        api.get("/screen/sort_columns").then((r) => r.data),
        fetchPreset,
      ])
        .then(([filtersData, sortColsData, presetData]) => {
          const rawFilters: ScreenFilter[] = Array.isArray(filtersData)
            ? filtersData
            : [];

          const filters = rawFilters.map((f) => {
            const c = deepClone(f);
            if (c.type === "slider" && c.slider_values) {
              c.selected_slider_values = [...c.slider_values] as [number, number];
            }
            if (c.type === "dropdown") {
              c.selected_value = c.multiple ? [] : DEFAULT_ID;
            }
            return c;
          });

          setSortColumns(Array.isArray(sortColsData) ? sortColsData : []);

          if (presetData?.values?.length) {
            const savedValues: ScreenFilter[] = presetData.values;
            const merged = filters.map((f) => {
              const saved = savedValues.find((s) => s.name === f.name);
              if (!saved) return f;
              return { ...f, ...saved };
            });
            setAllFilters(merged);
            setSelectedFilters(merged.filter(isActive));

            if (presetData.sortBy) {
              const parts = (presetData.sortBy as string).split(" ");
              setSortBy(parts[0] ?? "");
              setSortOrder(parts[1] === "asc" ? "Ascending" : "Descending");
            }
            if (presetData.limit) setLimit(presetData.limit);
          } else {
            setAllFilters(filters);
          }
        })
        .catch(() => {})
        .finally(() => setFilterDataLoading(false));
    },
    []
  );

  // ── Run / Open a screen preset ───────────────────────────────────────────

  const handleRunScreen = useCallback(
    (preset: PresetSummary) => {
      setSelectedPreset(preset);
      setIsNewPreset(false);
      setView("detail");
      loadFilterData(preset.preset_id, preset);
    },
    [loadFilterData]
  );

  // ── Create new screen ────────────────────────────────────────────────────

  const handleNewScreen = useCallback(() => {
    const newPreset: PresetSummary = {
      preset_id: `new_${Date.now()}`,
      preset_name: "New Screen",
    };
    setSelectedPreset(newPreset);
    setIsNewPreset(true);
    setView("detail");
    loadFilterData(newPreset.preset_id);
  }, [loadFilterData]);

  // ── Back to overview ─────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    setView("overview");
    setSelectedPreset(null);
    setSelectedFilters([]);
    setAllFilters([]);
    setScannedSymbols([]);
    setScanMsg("");
    setHasScanned(false);
  }, []);

  // ── Derived: remaining (un-added) filters ─────────────────────────────────

  const remainingFilters = useMemo(() => {
    const activeNames = new Set(selectedFilters.map((f) => f.name));
    return allFilters.filter((f) => !activeNames.has(f.name));
  }, [allFilters, selectedFilters]);

  // ── Add / Remove / Edit filters ──────────────────────────────────────────

  const handleAddFilter = useCallback((filter: ScreenFilter) => {
    setSelectedFilters((prev) => [...prev, deepClone(filter)]);
  }, []);

  const handleRemoveFilter = useCallback((filterName: string) => {
    setSelectedFilters((prev) => prev.filter((f) => f.name !== filterName));
    setAllFilters((prev) =>
      prev.map((f) => (f.name === filterName ? resetFilter(f) : f))
    );
  }, []);

  const handleEditFilter = useCallback((filter: ScreenFilter) => {
    setEditingFilter(deepClone(filter));
    setShowEditDialog(true);
  }, []);

  const handleApplyFilterEdit = useCallback((updated: ScreenFilter) => {
    setSelectedFilters((prev) =>
      prev.map((f) => (f.name === updated.name ? updated : f))
    );
    setAllFilters((prev) =>
      prev.map((f) => (f.name === updated.name ? updated : f))
    );
    setShowEditDialog(false);
    setEditingFilter(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedFilters([]);
    setAllFilters((prev) => prev.map(resetFilter));
    setScannedSymbols([]);
    setScanMsg("");
    setHasScanned(false);
    setFilterError("");
  }, []);

  // ── Run scan ─────────────────────────────────────────────────────────────

  const runScan = useCallback(() => {
    setFilterError("");
    setScanLoading(true);
    setScanMsg("");
    const body: Record<string, unknown> = { values: selectedFilters };
    if (sortBy) {
      body.sortBy = `${sortBy} ${sortOrder === "Ascending" ? "asc" : "desc"}`;
    }
    body.limit = limit;

    api
      .post("/screen/filter", body)
      .then((res) => {
        const raw = res.data;
        const symbols: string[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.symbols)
          ? raw.symbols
          : [];
        setScannedSymbols(symbols);
        setScanMsg(
          `${symbols.length} ticker${symbols.length !== 1 ? "s" : ""} found`
        );
        setHasScanned(true);
      })
      .catch(() => {
        setFilterError("Scan failed. Please try again.");
        setHasScanned(true);
      })
      .finally(() => setScanLoading(false));
  }, [selectedFilters, sortBy, sortOrder, limit]);

  // ── Save updated preset ──────────────────────────────────────────────────

  const handleSaveUpdated = useCallback(() => {
    if (!selectedPreset || isNewPreset) return;
    setSaveLoading(true);
    const body = {
      values: selectedFilters,
      sortBy: sortBy
        ? `${sortBy} ${sortOrder === "Ascending" ? "asc" : "desc"}`
        : undefined,
      limit,
    };
    api
      .post(`/screen/preset/update/${selectedPreset.preset_id}`, body)
      .then(() => loadPresets())
      .catch(() => {})
      .finally(() => setSaveLoading(false));
  }, [selectedPreset, isNewPreset, selectedFilters, sortBy, sortOrder, limit, loadPresets]);

  // ── Save as new ──────────────────────────────────────────────────────────

  const handleSaveAsNew = useCallback(() => {
    setSavePresetName("");
    setShowSaveDialog(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    if (!savePresetName.trim()) return;
    setSaveLoading(true);
    const body = {
      name: savePresetName.trim(),
      values: selectedFilters,
      sortBy: sortBy
        ? `${sortBy} ${sortOrder === "Ascending" ? "asc" : "desc"}`
        : undefined,
      limit,
    };
    api
      .post("/screen/preset", body)
      .then((res) => {
        setShowSaveDialog(false);
        setSavePresetName("");
        setIsNewPreset(false);
        const newId =
          res.data?.preset_id ?? res.data?.id ?? selectedPreset?.preset_id;
        if (newId) {
          setSelectedPreset({
            preset_id: newId,
            preset_name: savePresetName.trim(),
          });
        }
        loadPresets();
      })
      .catch(() => {})
      .finally(() => setSaveLoading(false));
  }, [
    savePresetName,
    selectedFilters,
    sortBy,
    sortOrder,
    limit,
    selectedPreset,
    loadPresets,
  ]);

  // ── Delete preset ────────────────────────────────────────────────────────

  const handleDeletePreset = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedPreset || isNewPreset) return;
      confirmPopup({
        target: e.currentTarget as HTMLElement,
        message: `Delete "${selectedPreset.preset_name}"?`,
        icon: "pi pi-exclamation-triangle",
        acceptClassName: "p-button-danger p-button-sm",
        accept: () => {
          api
            .delete(`/screen/preset?id=${selectedPreset.preset_id}`)
            .then(() => {
              handleBack();
              loadPresets();
            })
            .catch(() => {});
        },
      });
    },
    [selectedPreset, isNewPreset, handleBack, loadPresets]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Overview
  // ─────────────────────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div>
      {/* SV Screens */}
      <div className="mb-5">
        <SectionHeader isSv title="SimpleVisor Screens" />
        {presetsLoading ? (
          <div className="grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="col-12 md:col-6 lg:col-4 p-2">
                <Skeleton height="200px" borderRadius="0.75rem" />
              </div>
            ))}
          </div>
        ) : !svPresets?.preset_data?.length ? (
          <Panel>
            <EmptyState
              icon="pi-filter"
              title="No SimpleVisor Screens"
              body="Curated screens from SimpleVisor analysts will appear here."
            />
          </Panel>
        ) : (
          <div className="grid">
            {svPresets.preset_data.map((p) => (
              <div key={p.preset_id} className="col-12 md:col-6 lg:col-4 p-2">
                <PresetCard preset={p} isSv onRun={handleRunScreen} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Screens */}
      <div>
        <SectionHeader
          title="My Screens"
          action={
            <Button
              label="New Screen"
              icon="pi pi-plus"
              size="small"
              onClick={handleNewScreen}
            />
          }
        />
        {presetsLoading ? (
          <div className="grid">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="col-12 md:col-6 lg:col-4 p-2">
                <Skeleton height="200px" borderRadius="0.75rem" />
              </div>
            ))}
          </div>
        ) : !userPresets?.preset_data?.length ? (
          <Panel>
            <EmptyState
              icon="pi-filter-slash"
              title="No screens yet"
              body="Build a custom stock screen to filter stocks by fundamental, technical, and quantitative criteria. Screens save your filter configurations for quick reuse."
            />
          </Panel>
        ) : (
          <div className="grid">
            {userPresets.preset_data.map((p) => (
              <div key={p.preset_id} className="col-12 md:col-6 lg:col-4 p-2">
                <PresetCard preset={p} onRun={handleRunScreen} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Detail (split panel)
  // ─────────────────────────────────────────────────────────────────────────

  const renderDetail = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr",
        gap: "1.25rem",
        minHeight: "75vh",
        alignItems: "start",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Panel style={{ position: "sticky", top: "1rem", overflow: "hidden" }}>
        {/* SV screens label */}
        <div
          className="flex align-items-center gap-2 px-3 py-2"
          style={{ borderBottom: "1px solid var(--sv-border)" }}
        >
          <SvBadge small />
          <span className="sv-info-label" style={{ fontSize: "0.65rem" }}>
            Screens
          </span>
        </div>
        <div className="p-1 pb-0">
          {presetsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="28px" borderRadius="0.35rem" className="mb-1" />
              ))
            : svPresets?.preset_data?.map((p) => (
                <SidebarItem
                  key={p.preset_id}
                  preset={p}
                  selected={selectedPreset?.preset_id === p.preset_id}
                  isSv
                  onSelect={() => handleRunScreen(p)}
                />
              ))}
        </div>

        <Divider className="my-1 mx-3" style={{ width: "auto" }} />

        {/* My screens label */}
        <div className="flex align-items-center justify-content-between px-3 py-1">
          <span className="sv-info-label" style={{ fontSize: "0.65rem" }}>
            My Screens
          </span>
          <Button
            icon="pi pi-plus"
            text
            rounded
            size="small"
            onClick={handleNewScreen}
            title="New screen"
            style={{ width: "22px", height: "22px", color: "var(--sv-accent)" }}
          />
        </div>
        <div className="p-1 pb-2">
          {presetsLoading ? (
            <Skeleton height="28px" borderRadius="0.35rem" />
          ) : (
            <>
              {userPresets?.preset_data?.map((p) => (
                <SidebarItem
                  key={p.preset_id}
                  preset={p}
                  selected={selectedPreset?.preset_id === p.preset_id}
                  onSelect={() => handleRunScreen(p)}
                />
              ))}
              {isNewPreset && selectedPreset && (
                <SidebarItem
                  preset={selectedPreset}
                  selected
                  onSelect={() => {}}
                />
              )}
              {!userPresets?.preset_data?.length && !isNewPreset && (
                <div
                  className="px-3 py-2 text-sm sv-text-muted"
                  style={{ fontStyle: "italic" }}
                >
                  No screens yet
                </div>
              )}
            </>
          )}
        </div>
      </Panel>

      {/* ── Filter + Results panel ─────────────────────────────────────── */}
      <div className="flex flex-column gap-3">
        {/* Panel header */}
        <div className="flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="flex align-items-center gap-3">
            <Button
              icon="pi pi-arrow-left"
              label="All Screens"
              text
              size="small"
              onClick={handleBack}
              style={{ color: "var(--sv-accent)", fontWeight: 600, fontSize: "0.82rem", padding: 0 }}
            />
            <span style={{ color: "var(--sv-border-light)" }}>|</span>
            <div className="font-bold" style={{ fontSize: "1rem", color: "var(--sv-text-primary)" }}>
              {isNewPreset ? "New Screen" : selectedPreset?.preset_name}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {!isNewPreset && (
              <Button
                label="Save"
                icon="pi pi-save"
                size="small"
                severity="secondary"
                loading={saveLoading}
                onClick={handleSaveUpdated}
              />
            )}
            <Button
              label="Save as New"
              icon="pi pi-copy"
              size="small"
              severity="secondary"
              onClick={handleSaveAsNew}
            />
            {!isNewPreset && (
              <Button
                label="Delete"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                onClick={handleDeletePreset}
              />
            )}
          </div>
        </div>

        {/* ── Filter configuration panel ──────────────────────────────── */}
        <Panel style={{ padding: "1rem" }}>
          {/* Controls row */}
          <div className="flex gap-2 align-items-center flex-wrap mb-3">
            <Dropdown
              value={null}
              options={remainingFilters}
              optionLabel="name"
              placeholder="+ Add Filter"
              filter
              filterBy="name"
              onChange={(e) => {
                if (e.value) handleAddFilter(e.value);
              }}
              style={{ minWidth: "170px", fontSize: "0.82rem" }}
              disabled={filterDataLoading}
            />

            {sortColumns.length > 0 && (
              <>
                <Dropdown
                  value={sortBy}
                  options={sortColumns}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Sort by…"
                  onChange={(e) => setSortBy(e.value)}
                  style={{ minWidth: "130px", fontSize: "0.82rem" }}
                  showClear
                />
                {sortBy && (
                  <Dropdown
                    value={sortOrder}
                    options={SORT_ORDER_OPTS}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => setSortOrder(e.value)}
                    style={{ width: "130px", fontSize: "0.82rem" }}
                  />
                )}
              </>
            )}

            <Dropdown
              value={limit}
              options={LIMIT_OPTS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setLimit(e.value)}
              style={{ width: "120px", fontSize: "0.82rem" }}
            />

            <Button
              label="Reset"
              icon="pi pi-refresh"
              size="small"
              text
              severity="secondary"
              onClick={handleResetFilters}
              className="ml-auto"
            />
          </div>

          {/* Active filter chips */}
          <div
            className="flex flex-wrap gap-2 align-items-center py-1"
            style={{ minHeight: "2.5rem" }}
          >
            {filterDataLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} width="120px" height="30px" borderRadius="1rem" />
              ))
            ) : selectedFilters.length > 0 ? (
              selectedFilters.map((f) => (
                <FilterChip
                  key={f.name}
                  filter={f}
                  onEdit={() => handleEditFilter(f)}
                  onRemove={() => handleRemoveFilter(f.name)}
                />
              ))
            ) : (
              <span className="text-sm sv-text-muted" style={{ fontStyle: "italic" }}>
                No filters applied — showing all stocks · Use "+ Add Filter" to narrow results
              </span>
            )}
          </div>

          {/* Error */}
          {filterError && (
            <div className="flex align-items-center gap-2 sv-error-text text-sm mt-2">
              <i className="pi pi-exclamation-circle" />
              {filterError}
            </div>
          )}

          {/* Run row */}
          <div
            className="flex justify-content-between align-items-center mt-3 pt-3"
            style={{ borderTop: "1px solid var(--sv-border-light)" }}
          >
            <div className="flex align-items-center gap-2 text-sm" style={{ color: "var(--sv-text-secondary)" }}>
              {scanMsg && (
                <>
                  <i className="pi pi-chart-bar sv-text-accent" />
                  <span>
                    <strong className="sv-text-accent">{scanMsg.split(" ")[0]}</strong>{" "}
                    {scanMsg.split(" ").slice(1).join(" ")}
                  </span>
                </>
              )}
            </div>
            <Button
              label="Run Screen"
              icon="pi pi-play"
              loading={scanLoading}
              disabled={filterDataLoading}
              onClick={runScan}
            />
          </div>
        </Panel>

        {/* ── Results panel ──────────────────────────────────────────────── */}
        {(hasScanned || scanLoading) && (
          <Panel style={{ overflow: "hidden" }}>
            {/* Results header */}
            <div
              className="flex align-items-center justify-content-between px-3 py-3"
              style={{ borderBottom: "1px solid var(--sv-border)" }}
            >
              <div className="flex align-items-center gap-2 font-bold text-sm" style={{ color: "var(--sv-text-primary)" }}>
                <i className="pi pi-list sv-text-accent text-sm" />
                Scan Results
              </div>
              {!scanLoading && scannedSymbols.length > 0 && (
                <span
                  className="font-bold text-xs"
                  style={{
                    background: "var(--sv-accent-bg)",
                    color: "var(--sv-accent)",
                    borderRadius: "1rem",
                    padding: "0.18rem 0.65rem",
                  }}
                >
                  {scannedSymbols.length} ticker{scannedSymbols.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="p-3">
              {!scanLoading && scannedSymbols.length === 0 ? (
                <div className="text-sm sv-text-muted py-1">
                  No stocks matched the current filters.
                </div>
              ) : (
                <ResultsGrid symbols={scannedSymbols} loading={scanLoading} />
              )}
            </div>
          </Panel>
        )}

        {/* Placeholder when not yet scanned */}
        {!hasScanned && !scanLoading && !filterDataLoading && (
          <Panel>
            <EmptyState
              icon="pi-search"
              title="Configure filters and run the screen"
              body="Add filters above to define your criteria, then click Run Screen to find matching stocks."
            />
          </Panel>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "1.25rem 1.5rem", minHeight: "100vh" }}>
      <ConfirmPopup />

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex align-items-start justify-content-between flex-wrap gap-3 mb-5">
        <div>
          <div className="flex align-items-center gap-2 mb-1">
            <span
              style={{
                background: "var(--sv-accent-gradient)",
                borderRadius: "0.35rem",
                padding: "0.2rem 0.55rem",
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "var(--sv-text-inverse)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              SCREENER
            </span>
            <h1
              className="m-0 font-bold sv-page-title"
              style={{ fontSize: "1.35rem", color: "var(--sv-text-primary)" }}
            >
              Stock Screener
            </h1>
          </div>
          <p className="m-0 text-sm sv-text-muted">
            Filter stocks by fundamental, technical &amp; quantitative criteria
          </p>
        </div>

        {view === "overview" && (
          <Button
            label="New Screen"
            icon="pi pi-plus"
            size="small"
            onClick={handleNewScreen}
          />
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {view === "overview" ? renderOverview() : renderDetail()}

      {/* ── Filter Edit Dialog ───────────────────────────────────────────── */}
      <Dialog
        header={editingFilter?.name ?? "Edit Filter"}
        visible={showEditDialog}
        onHide={() => {
          setShowEditDialog(false);
          setEditingFilter(null);
        }}
        modal
        style={{ width: "360px" }}
        draggable={false}
      >
        {editingFilter && (
          <FilterEditor
            filter={editingFilter}
            onApply={handleApplyFilterEdit}
            onClose={() => {
              setShowEditDialog(false);
              setEditingFilter(null);
            }}
          />
        )}
      </Dialog>

      {/* ── Save New Preset Dialog ───────────────────────────────────────── */}
      <Dialog
        header="Save Screen"
        visible={showSaveDialog}
        onHide={() => setShowSaveDialog(false)}
        modal
        style={{ width: "380px" }}
        draggable={false}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label="Cancel" text onClick={() => setShowSaveDialog(false)} />
            <Button
              label="Save"
              icon="pi pi-save"
              disabled={!savePresetName.trim()}
              loading={saveLoading}
              onClick={handleConfirmSave}
            />
          </div>
        }
      >
        <div>
          <label
            className="block mb-2 font-semibold text-sm"
            style={{ color: "var(--sv-text-secondary)" }}
          >
            Screen Name
          </label>
          <InputText
            value={savePresetName}
            onChange={(e) => setSavePresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && savePresetName.trim()) {
                handleConfirmSave();
              }
            }}
            placeholder="e.g. High Growth Tech"
            className="w-full"
            autoFocus
          />
          <div className="text-xs sv-text-muted mt-2">
            Give your screen a memorable name to find it easily later.
          </div>
        </div>
      </Dialog>

      <Tooltip target=".screener-tip" position="top" />
    </div>
  );
};

export default ScreensCombinedPage;
