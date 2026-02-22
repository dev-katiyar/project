import React from "react";
import {
  useTheme,
  type ThemeName,
  type FontSize,
} from "@/contexts/ThemeContext";
import { Card } from "primereact/card";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const THEMES: { key: ThemeName; label: string; swatch: string }[] = [
  { key: "dark", label: "Dark", swatch: "#0a0e17" },
  { key: "dim", label: "Dim", swatch: "#15202b" },
  { key: "light", label: "Light", swatch: "#f5f7fa" },
];

const FONT_SIZES: { key: FontSize; label: string }[] = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const { theme, fontSize, setTheme, setFontSize } = useTheme();

  return (
    <>
      {/* Backdrop */}
      {open && <div className="sv-settings-overlay" onClick={onClose} />}

      {/* Panel */}
      <aside className={`sv-settings-panel ${open ? "open" : ""}`}>
        {/* Header */}
        <div className="flex align-items-center justify-content-between mb-4">
          <span
            className="font-semibold text-lg"
            style={{ color: "var(--sv-text-primary)" }}
          >
            Display Settings
          </span>
          <button
            onClick={onClose}
            className="p-link"
            style={{
              color: "var(--sv-text-muted)",
              fontSize: "1.2rem",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Theme Selection */}
        <div className="mb-4">
          <div
            className="text-xs font-bold uppercase mb-2"
            style={{ color: "var(--sv-text-muted)", letterSpacing: "0.05em" }}
          >
            Theme
          </div>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map((t) => (
              <button
                key={t.key}
                className={`sv-option-btn ${theme === t.key ? "active" : ""}`}
                onClick={() => setTheme(t.key)}
              >
                <span className="flex align-items-center gap-2">
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: t.swatch,
                      border: "2px solid var(--sv-border)",
                      display: "inline-block",
                    }}
                  />
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Selection */}
        <div className="mb-4">
          <div
            className="text-xs font-bold uppercase mb-2"
            style={{ color: "var(--sv-text-muted)", letterSpacing: "0.05em" }}
          >
            Font Size
          </div>
          <div className="flex gap-2 flex-wrap">
            {FONT_SIZES.map((f) => (
              <button
                key={f.key}
                className={`sv-option-btn ${fontSize === f.key ? "active" : ""}`}
                onClick={() => setFontSize(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-3">
          <div
            className="text-xs font-bold uppercase mb-2"
            style={{ color: "var(--sv-text-muted)", letterSpacing: "0.05em" }}
          >
            Preview
          </div>
          <Card className="mt-2">
            <div className="font-semibold mb-2">S&P 500</div>
            <div className="flex justify-content-between">
              <span>5,234.18</span>
              <span style={{ color: "var(--sv-gain)" }}>+1.23%</span>
            </div>
          </Card>
        </div>
      </aside>
    </>
  );
};

export default SettingsPanel;
