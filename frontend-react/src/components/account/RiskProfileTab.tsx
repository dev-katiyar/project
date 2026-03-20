import React from "react";
import { Dropdown } from "primereact/dropdown";
import { RadioButton } from "primereact/radiobutton";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Skeleton } from "primereact/skeleton";
import type { UserProfileData } from "./AccountInfoTab";

interface RiskProfileTabProps {
  userData: UserProfileData;
  loading: boolean;
  onChange: (field: keyof UserProfileData, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}

const ageOptions = Array.from({ length: 81 }, (_, i) => ({
  label: String(i + 20),
  value: String(i + 20),
}));

const dependentsOptions = Array.from({ length: 6 }, (_, i) => ({
  label: String(i),
  value: String(i),
}));

const maritalStatusOptions = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Divorced", value: "Divorced" },
  { label: "Widowed", value: "Widowed" },
];

const financialGoalOptions = [
  {
    label: "Capital Preservation",
    value: "preservation",
    icon: "pi-shield",
    desc: "Protect what you have",
  },
  {
    label: "Income Generation",
    value: "income",
    icon: "pi-dollar",
    desc: "Steady cash flow",
  },
  {
    label: "Growth",
    value: "growth",
    icon: "pi-chart-line",
    desc: "Long-term appreciation",
  },
  {
    label: "Aggressive Growth",
    value: "aggressive",
    icon: "pi-arrow-up-right",
    desc: "Maximum upside",
  },
];

const riskToleranceOptions = [
  {
    label: "Conservative",
    value: "conservative",
    icon: "pi-lock",
    description: "Low risk — stable, predictable returns",
    color: "var(--sv-success)",
    bg: "var(--sv-success-bg)",
  },
  {
    label: "Moderate",
    value: "moderate",
    icon: "pi-sliders-h",
    description: "Balanced risk and reward profile",
    color: "var(--sv-warning)",
    bg: "var(--sv-warning-bg)",
  },
  {
    label: "Aggressive",
    value: "aggressive",
    icon: "pi-bolt",
    description: "High risk — maximum return potential",
    color: "var(--sv-danger)",
    bg: "var(--sv-danger-bg)",
  },
];

const RiskProfileTab: React.FC<RiskProfileTabProps> = ({
  userData,
  loading,
  onChange,
  onSave,
  onDiscard,
  saving,
}) => {
  if (loading) {
    return (
      <div
        className="p-4 border-round-xl"
        style={{
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
        }}
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="80px" className="mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        className="p-4 border-round-xl mb-4"
        style={{
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex align-items-center gap-3 mb-5">
          <div
            className="flex align-items-center justify-content-center border-circle flex-shrink-0"
            style={{ width: 44, height: 44, background: "var(--sv-accent-bg)" }}
          >
            <i
              className="pi pi-chart-pie"
              style={{ color: "var(--sv-accent)", fontSize: "1.1rem" }}
            />
          </div>
          <div>
            <div
              className="font-bold text-lg"
              style={{ color: "var(--sv-text-primary)" }}
            >
              Investment Profile
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              Help us personalize your analysis and recommendations
            </div>
          </div>
        </div>

        {/* ── About Me ────────────────────────────────────────── */}
        <section className="mb-5">
          <h4
            className="mt-0 mb-3 font-semibold text-xs uppercase"
            style={{ color: "var(--sv-text-muted)", letterSpacing: "0.1em" }}
          >
            <i className="pi pi-user mr-2" />
            About Me
          </h4>
          <div className="grid">
            <div className="col-12 md:col-4">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--sv-text-secondary)" }}
              >
                Age{" "}
                <span style={{ color: "var(--sv-text-muted)" }}>
                  (optional)
                </span>
              </label>
              <Dropdown
                value={userData.age}
                options={ageOptions}
                onChange={(e) => onChange("age", e.value)}
                placeholder="Select age"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--sv-text-secondary)" }}
              >
                Dependents{" "}
                <span style={{ color: "var(--sv-text-muted)" }}>
                  (optional)
                </span>
              </label>
              <Dropdown
                value={userData.dependents}
                options={dependentsOptions}
                onChange={(e) => onChange("dependents", e.value)}
                placeholder="Select count"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-4">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--sv-text-secondary)" }}
              >
                Marital Status{" "}
                <span style={{ color: "var(--sv-text-muted)" }}>
                  (optional)
                </span>
              </label>
              <Dropdown
                value={userData.martial_status}
                options={maritalStatusOptions}
                onChange={(e) => onChange("martial_status", e.value)}
                placeholder="Select status"
                className="w-full"
              />
            </div>
          </div>
        </section>

        <Divider className="my-4" />

        {/* ── Financial Goals ──────────────────────────────────── */}
        <section className="mb-5">
          <h4
            className="mt-0 mb-3 font-semibold text-xs uppercase"
            style={{ color: "var(--sv-text-muted)", letterSpacing: "0.1em" }}
          >
            <i className="pi pi-flag mr-2" />
            Financial Goal
          </h4>
          <div className="grid">
            {financialGoalOptions.map((opt) => {
              const selected = userData.financial_goals === opt.value;
              return (
                <div key={opt.value} className="col-12 sm:col-6 md:col-3">
                  <div
                    className="flex align-items-start gap-3 p-3 border-round-lg cursor-pointer"
                    style={{
                      background: selected
                        ? "var(--sv-accent-bg)"
                        : "var(--sv-bg-surface)",
                      border: `1px solid ${selected ? "var(--sv-accent)" : "var(--sv-border)"}`,
                      transition: "border-color 0.15s ease, background 0.15s ease",
                    }}
                    onClick={() => onChange("financial_goals", opt.value)}
                  >
                    <RadioButton
                      value={opt.value}
                      checked={selected}
                      onChange={(e) => onChange("financial_goals", e.value)}
                    />
                    <div>
                      <i
                        className={`pi ${opt.icon} mb-1 block`}
                        style={{
                          color: selected
                            ? "var(--sv-accent)"
                            : "var(--sv-text-secondary)",
                          fontSize: "1rem",
                        }}
                      />
                      <div
                        className="font-semibold text-sm"
                        style={{
                          color: selected
                            ? "var(--sv-text-primary)"
                            : "var(--sv-text-secondary)",
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        className="text-xs mt-1"
                        style={{ color: "var(--sv-text-muted)" }}
                      >
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Divider className="my-4" />

        {/* ── Risk Tolerance ───────────────────────────────────── */}
        <section>
          <h4
            className="mt-0 mb-3 font-semibold text-xs uppercase"
            style={{ color: "var(--sv-text-muted)", letterSpacing: "0.1em" }}
          >
            <i className="pi pi-gauge mr-2" />
            Risk Tolerance
          </h4>
          <div className="grid">
            {riskToleranceOptions.map((opt) => {
              const selected = userData.risk_tolerance === opt.value;
              return (
                <div key={opt.value} className="col-12 md:col-4">
                  <div
                    className="flex align-items-start gap-3 p-4 border-round-lg cursor-pointer"
                    style={{
                      background: selected ? opt.bg : "var(--sv-bg-surface)",
                      border: `1px solid ${selected ? opt.color : "var(--sv-border)"}`,
                      transition: "border-color 0.15s ease, background 0.15s ease",
                    }}
                    onClick={() => onChange("risk_tolerance", opt.value)}
                  >
                    <RadioButton
                      value={opt.value}
                      checked={selected}
                      onChange={(e) => onChange("risk_tolerance", e.value)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div>
                      <div className="flex align-items-center gap-2 mb-1">
                        <i
                          className={`pi ${opt.icon}`}
                          style={{
                            color: selected ? opt.color : "var(--sv-text-muted)",
                            fontSize: "1rem",
                          }}
                        />
                        <span
                          className="font-bold"
                          style={{
                            color: selected ? opt.color : "var(--sv-text-primary)",
                          }}
                        >
                          {opt.label}
                        </span>
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--sv-text-secondary)" }}
                      >
                        {opt.description}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <Divider />

      {/* ── Action Buttons ────────────────────────────────────── */}
      <div className="flex justify-content-end gap-2">
        <Button
          label="Discard"
          icon="pi pi-times"
          outlined
          severity="secondary"
          onClick={onDiscard}
        />
        <Button
          label="Save Changes"
          icon="pi pi-save"
          loading={saving}
          onClick={onSave}
        />
      </div>
    </div>
  );
};

export default RiskProfileTab;
