import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "primereact/button";
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
// Shared micro-styles
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
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1.5rem",
      gap: "0.75rem",
      color: "var(--sv-text-muted)",
      textAlign: "center",
    }}
  >
    <i className={`pi ${icon}`} style={{ fontSize: "2.5rem", opacity: 0.18 }} />
    <div
      style={{
        fontWeight: 700,
        color: "var(--sv-text-secondary)",
        fontSize: "0.9rem",
      }}
    >
      {title}
    </div>
    {body && (
      <p
        style={{
          margin: 0,
          fontSize: "0.81rem",
          maxWidth: "28rem",
          lineHeight: 1.65,
        }}
      >
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
}> = ({ preset, isSv, onRun }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid ${hov ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: "0.75rem",
        overflow: "hidden",
        boxShadow: hov ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.85rem 1rem 0.6rem",
          borderBottom: "1px solid var(--sv-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            minWidth: 0,
          }}
        >
          {isSv && <SvBadge />}
          <div
            style={{
              fontWeight: 700,
              color: "var(--sv-text-primary)",
              fontSize: "0.88rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
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
      <div style={{ flex: 1 }}>
        {!preset.preset_top_symbols?.length ? (
          <div
            style={{
              padding: "0.65rem 1rem",
              fontSize: "0.78rem",
              color: "var(--sv-text-muted)",
              fontStyle: "italic",
            }}
          >
            Run screen to populate results
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.79rem",
            }}
          >
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
                  style={{
                    background:
                      i % 2 ? "var(--sv-bg-surface)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      ...tdS,
                      fontWeight: 700,
                      color: "var(--sv-accent)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {row.symbol}
                  </td>
                  <td
                    style={{
                      ...tdS,
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                  >
                    {fmtPrice(row.price)}
                  </td>
                  <td
                    style={{
                      ...tdS,
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      color:
                        row.priceChange >= 0
                          ? "var(--sv-gain)"
                          : "var(--sv-loss)",
                    }}
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
};

// ─────────────────────────────────────────────────────────────────────────────
// SidebarItem — preset list in detail mode
// ─────────────────────────────────────────────────────────────────────────────

const SidebarItem: React.FC<{
  preset: PresetSummary;
  selected: boolean;
  isSv?: boolean;
  onSelect: () => void;
}> = ({ preset, selected, isSv, onSelect }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "0.5rem 0.7rem",
        cursor: "pointer",
        borderRadius: "0.35rem",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        background:
          selected
            ? "var(--sv-accent-bg)"
            : hov
            ? "var(--sv-bg-surface)"
            : "transparent",
        borderLeft: `3px solid ${
          selected ? "var(--sv-accent)" : "transparent"
        }`,
        color: selected ? "var(--sv-accent)" : "var(--sv-text-primary)",
        fontWeight: selected ? 700 : 400,
        fontSize: "0.83rem",
        transition: "all 0.1s",
        overflow: "hidden",
        marginBottom: "1px",
      }}
    >
      {isSv && <SvBadge small />}
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
      >
        {preset.preset_name}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FilterChip
// ─────────────────────────────────────────────────────────────────────────────

const FilterChip: React.FC<{
  filter: ScreenFilter;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ filter, onEdit, onRemove }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
      background: "var(--sv-accent)",
      color: "var(--sv-text-inverse)",
      borderRadius: "1rem",
      padding: "0.28rem 0.4rem 0.28rem 0.7rem",
      fontSize: "0.78rem",
      fontWeight: 600,
      flexShrink: 0,
    }}
  >
    <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {buildFilterText(filter)}
    </span>
    <button
      onClick={onEdit}
      title="Edit filter"
      style={{
        background: "rgba(255,255,255,0.22)",
        border: "none",
        cursor: "pointer",
        borderRadius: "50%",
        width: "18px",
        height: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "inherit",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <i className="pi pi-pencil" style={{ fontSize: "0.58rem" }} />
    </button>
    <button
      onClick={onRemove}
      title="Remove filter"
      style={{
        background: "rgba(255,255,255,0.15)",
        border: "none",
        cursor: "pointer",
        borderRadius: "50%",
        width: "18px",
        height: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "inherit",
        padding: 0,
        flexShrink: 0,
      }}
    >
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
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--sv-text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            Range: {local.slider_values[0]} – {local.slider_values[1]}
            {local.range_text ? ` ${local.range_text}` : ""}
          </div>
          <div style={{ padding: "0.25rem 0.5rem 1.25rem" }}>
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
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "var(--sv-text-primary)",
              marginBottom: "1.25rem",
              fontFamily: "monospace",
            }}
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
            style={{ width: "100%", marginBottom: "1rem" }}
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
          style={{ width: "100%", marginBottom: "1rem" }}
          placeholder="Select options…"
          filter
          display="chip"
        />
      )}

      {/* Dropdown — custom range */}
      {local.type === "dropdown" &&
        local.allow_custom &&
        local.selected_value === CUSTOM_ID && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <InputText
              value={String(local.minValue ?? "")}
              onChange={(e) =>
                setLocal((p) => ({ ...p, minValue: Number(e.target.value) }))
              }
              style={{ width: "90px", fontSize: "0.85rem" }}
              placeholder="Min"
            />
            <span style={{ color: "var(--sv-text-muted)" }}>to</span>
            <InputText
              value={String(local.maxValue ?? "")}
              onChange={(e) =>
                setLocal((p) => ({ ...p, maxValue: Number(e.target.value) }))
              }
              style={{ width: "90px", fontSize: "0.85rem" }}
              placeholder="Max"
            />
            {local.range_text && (
              <span style={{ fontSize: "0.8rem", color: "var(--sv-text-muted)" }}>
                {local.range_text}
              </span>
            )}
          </div>
        )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
          paddingTop: "0.25rem",
        }}
      >
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} width="58px" height="28px" borderRadius="0.35rem" />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.35rem",
        maxHeight: "320px",
        overflowY: "auto",
        paddingRight: "0.25rem",
      }}
    >
      {symbols.map((sym) => (
        <span
          key={sym}
          style={{
            background: "var(--sv-bg-surface)",
            border: "1px solid var(--sv-border)",
            borderRadius: "0.35rem",
            padding: "0.22rem 0.55rem",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--sv-accent)",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            cursor: "default",
            transition: "border-color 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--sv-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--sv-border)";
          }}
        >
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
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.65rem",
      marginBottom: "0.875rem",
    }}
  >
    {isSv && (
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
    )}
    {!isSv && (
      <i
        className="pi pi-user"
        style={{ color: "var(--sv-accent)", fontSize: "0.85rem" }}
      />
    )}
    <h2
      style={{
        margin: 0,
        fontSize: "0.95rem",
        fontWeight: 700,
        color: "var(--sv-text-primary)",
      }}
    >
      {title}
    </h2>
    <div style={{ flex: 1, height: "1px", background: "var(--sv-border)" }} />
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────────────────────

const Panel: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: "0.75rem",
      boxShadow: "var(--sv-shadow-sm)",
      ...style,
    }}
  >
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
    (presetId: string) => {
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

      const fetchPreset = isNew
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

          // Apply defaults to all filters
          const filters = rawFilters.map((f) => {
            const c = deepClone(f);
            if (c.type === "slider" && c.slider_values) {
              c.selected_slider_values = [...c.slider_values] as [
                number,
                number,
              ];
            }
            if (c.type === "dropdown") {
              c.selected_value = c.multiple ? [] : DEFAULT_ID;
            }
            return c;
          });

          setSortColumns(
            Array.isArray(sortColsData) ? sortColsData : []
          );

          if (presetData?.values?.length) {
            const savedValues: ScreenFilter[] = presetData.values;
            // Merge saved values into the full filter list
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
              setSortOrder(
                parts[1] === "asc" ? "Ascending" : "Descending"
              );
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
      loadFilterData(preset.preset_id);
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
      <div style={{ marginBottom: "2.5rem" }}>
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
      <Panel
        style={{
          position: "sticky",
          top: "1rem",
          overflow: "hidden",
        }}
      >
        {/* SV label */}
        <div
          style={{
            padding: "0.65rem 0.75rem 0.3rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            borderBottom: "1px solid var(--sv-border)",
          }}
        >
          <SvBadge small />
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "var(--sv-text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Screens
          </span>
        </div>
        <div style={{ padding: "0.35rem 0.35rem 0.25rem" }}>
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

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "var(--sv-border)",
            margin: "0.25rem 0.75rem",
          }}
        />

        {/* My screens label */}
        <div
          style={{
            padding: "0.3rem 0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "var(--sv-text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            My Screens
          </span>
          <button
            onClick={handleNewScreen}
            title="New screen"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--sv-accent)",
              display: "flex",
              alignItems: "center",
              padding: "0.15rem",
              borderRadius: "0.25rem",
            }}
          >
            <i className="pi pi-plus" style={{ fontSize: "0.72rem" }} />
          </button>
        </div>
        <div style={{ padding: "0.25rem 0.35rem 0.5rem" }}>
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
                  style={{
                    padding: "0.4rem 0.7rem",
                    fontSize: "0.77rem",
                    color: "var(--sv-text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  No screens yet
                </div>
              )}
            </>
          )}
        </div>
      </Panel>

      {/* ── Filter + Results panel ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Panel header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
          >
            <button
              onClick={handleBack}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--sv-accent)",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: 0,
              }}
            >
              <i className="pi pi-arrow-left" />
              All Screens
            </button>
            <span style={{ color: "var(--sv-border-light)" }}>|</span>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--sv-text-primary)",
              }}
            >
              {isNewPreset ? "New Screen" : selectedPreset?.preset_name}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "0.875rem",
            }}
          >
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
              style={{ marginLeft: "auto" }}
            />
          </div>

          {/* Active filter chips */}
          <div
            style={{
              minHeight: "2.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.45rem",
              alignItems: "center",
              padding: "0.25rem 0",
            }}
          >
            {filterDataLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width="120px"
                  height="30px"
                  borderRadius="1rem"
                />
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
              <span
                style={{
                  fontSize: "0.81rem",
                  color: "var(--sv-text-muted)",
                  fontStyle: "italic",
                }}
              >
                No filters applied — showing all stocks · Use "+ Add Filter"
                to narrow results
              </span>
            )}
          </div>

          {/* Error */}
          {filterError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                color: "var(--sv-danger)",
                fontSize: "0.82rem",
                marginTop: "0.5rem",
              }}
            >
              <i className="pi pi-exclamation-circle" />
              {filterError}
            </div>
          )}

          {/* Run row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.875rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--sv-border-light)",
            }}
          >
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--sv-text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {scanMsg && (
                <>
                  <i
                    className="pi pi-chart-bar"
                    style={{ color: "var(--sv-accent)" }}
                  />
                  <span>
                    <strong style={{ color: "var(--sv-accent)" }}>
                      {scanMsg.split(" ")[0]}
                    </strong>{" "}
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
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--sv-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: "var(--sv-text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <i
                  className="pi pi-list"
                  style={{ color: "var(--sv-accent)", fontSize: "0.85rem" }}
                />
                Scan Results
              </div>
              {!scanLoading && scannedSymbols.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      background: "var(--sv-accent-bg)",
                      color: "var(--sv-accent)",
                      borderRadius: "1rem",
                      padding: "0.18rem 0.65rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {scannedSymbols.length} ticker
                    {scannedSymbols.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            <div style={{ padding: "0.875rem 1rem" }}>
              {!scanLoading && scannedSymbols.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--sv-text-muted)",
                    padding: "0.5rem 0",
                  }}
                >
                  No stocks matched the current filters.
                </div>
              ) : (
                <ResultsGrid
                  symbols={scannedSymbols}
                  loading={scanLoading}
                />
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.75rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              marginBottom: "0.3rem",
            }}
          >
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
              style={{
                margin: 0,
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--sv-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Stock Screener
            </h1>
          </div>
          <p
            style={{ margin: 0, fontSize: "0.82rem", color: "var(--sv-text-muted)" }}
          >
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
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
          >
            <Button
              label="Cancel"
              text
              onClick={() => setShowSaveDialog(false)}
            />
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
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "0.85rem",
              color: "var(--sv-text-secondary)",
              fontWeight: 600,
            }}
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
            style={{ width: "100%" }}
            autoFocus
          />
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--sv-text-muted)",
              marginTop: "0.5rem",
            }}
          >
            Give your screen a memorable name to find it easily later.
          </div>
        </div>
      </Dialog>

      <Tooltip target=".screener-tip" position="top" />
    </div>
  );
};

export default ScreensCombinedPage;
