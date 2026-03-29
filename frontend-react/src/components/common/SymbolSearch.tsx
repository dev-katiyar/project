import React, { useState, useRef, useEffect, useCallback } from "react";
import { InputText } from "primereact/inputtext";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SymbolResult {
  symbol: string;
  name?: string;
}

export interface SymbolSearchProps {
  /** Controlled value — the ticker string (e.g. "AAPL") */
  value: string;
  /** Called with the raw text on every keystroke */
  onChange?: (value: string) => void;
  /** Called when a symbol is confirmed (Enter or click) */
  onSelect: (symbol: string, name?: string) => void;
  placeholder?: string;
  /** Extra path segment appended to /search — e.g. "/etf" */
  urlModifier?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 400;
const MAX_RESULTS = 7;

// ─── Component ────────────────────────────────────────────────────────────────

const SymbolSearch: React.FC<SymbolSearchProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search symbol…",
  urlModifier = "",
  className = "",
  inputClassName = "",
  disabled = false,
  autoFocus = false,
}) => {
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchResults = useCallback(
    async (query: string) => {
      if (!query) {
        setResults([]);
        setOpen(false);
        return;
      }
      try {
        const { data } = await api.get(
          `/search${urlModifier}/${query.toUpperCase()}`,
        );
        const arr: SymbolResult[] = Array.isArray(data)
          ? data
              .slice(0, MAX_RESULTS)
              .map((d: unknown) =>
                typeof d === "string" ? { symbol: d } : (d as SymbolResult),
              )
          : [];
        setResults(arr);
        setOpen(arr.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setOpen(false);
      }
    },
    [urlModifier],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    onChange?.(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(val), DEBOUNCE_MS);
  };

  const confirmSelection = useCallback(
    (item: SymbolResult) => {
      onSelect(item.symbol, item.name);
      onChange?.(item.symbol);
      setOpen(false);
      setResults([]);
    },
    [onSelect, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "Enter" && value) {
        onSelect(value);
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        confirmSelection(results[activeIndex]);
      } else if (value) {
        onSelect(value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ display: "inline-block" }}
    >
      <InputText
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        className={inputClassName}
        style={{ textTransform: "uppercase" }}
      />

      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1200,
            minWidth: "260px",
            maxWidth: "340px",
            marginTop: "2px",
            background: "var(--sv-bg-surface)",
            border: "1px solid var(--sv-border)",
            borderRadius: "8px",
            boxShadow: "var(--sv-shadow-md)",
            overflow: "hidden",
          }}
        >
          {results.map((item, i) => (
            <div
              key={item.symbol}
              onMouseDown={(e) => {
                e.preventDefault();
                confirmSelection(item);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.45rem 0.75rem",
                cursor: "pointer",
                background:
                  i === activeIndex ? "var(--sv-accent-bg)" : "transparent",
                borderBottom:
                  i < results.length - 1
                    ? "1px solid var(--sv-border)"
                    : "none",
                transition: "background 0.1s",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  color: "var(--sv-accent)",
                  minWidth: "60px",
                  flexShrink: 0,
                }}
              >
                {item.symbol}
              </span>
              {item.name && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--sv-text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;
