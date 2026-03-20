import React from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Skeleton } from "primereact/skeleton";

export interface UserProfileData {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  age?: string;
  dependents?: string;
  martial_status?: string;
  financial_goals?: string;
  risk_tolerance?: string;
  subscriptionId?: number;
}

interface AccountInfoTabProps {
  userData: UserProfileData;
  loading: boolean;
  onChange: (field: keyof UserProfileData, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}

const AccountInfoTab: React.FC<AccountInfoTabProps> = ({
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
        <Skeleton height="44px" className="mb-3" />
        <div className="grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-12 md:col-6">
              <Skeleton height="16px" width="40%" className="mb-2" />
              <Skeleton height="42px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Personal Details ────────────────────────────────── */}
      <div
        className="p-4 border-round-xl mb-4"
        style={{
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
        }}
      >
        <div className="flex align-items-center gap-3 mb-4">
          <div
            className="flex align-items-center justify-content-center border-circle flex-shrink-0"
            style={{ width: 44, height: 44, background: "var(--sv-accent-bg)" }}
          >
            <i
              className="pi pi-user-edit"
              style={{ color: "var(--sv-accent)", fontSize: "1.1rem" }}
            />
          </div>
          <div>
            <div
              className="font-bold text-lg"
              style={{ color: "var(--sv-text-primary)" }}
            >
              Account Details
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              Update your personal information
            </div>
          </div>
        </div>

        <div className="grid">
          {/* First Name */}
          <div className="col-12 md:col-6">
            <label
              className="block font-semibold text-sm mb-2"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              <i
                className="pi pi-id-card mr-2"
                style={{ color: "var(--sv-accent)" }}
              />
              First Name
            </label>
            <InputText
              value={userData.firstName || ""}
              onChange={(e) => onChange("firstName", e.target.value)}
              className="w-full"
              placeholder="Enter first name"
            />
          </div>

          {/* Last Name */}
          <div className="col-12 md:col-6">
            <label
              className="block font-semibold text-sm mb-2"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              <i
                className="pi pi-id-card mr-2"
                style={{ color: "var(--sv-accent)" }}
              />
              Last Name
            </label>
            <InputText
              value={userData.lastName || ""}
              onChange={(e) => onChange("lastName", e.target.value)}
              className="w-full"
              placeholder="Enter last name"
            />
          </div>

          {/* Email */}
          <div className="col-12 md:col-6">
            <label
              className="block font-semibold text-sm mb-2"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              <i
                className="pi pi-envelope mr-2"
                style={{ color: "var(--sv-accent)" }}
              />
              Email Address
            </label>
            <InputText
              type="email"
              value={userData.emailAddress || ""}
              onChange={(e) => onChange("emailAddress", e.target.value)}
              className="w-full"
              placeholder="Enter email address"
            />
          </div>

          {/* Password */}
          <div className="col-12 md:col-6">
            <label
              className="block font-semibold text-sm mb-2"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              <i
                className="pi pi-lock mr-2"
                style={{ color: "var(--sv-accent)" }}
              />
              Password
            </label>
            <div className="flex gap-2">
              <InputText
                type="password"
                value="••••••••••"
                readOnly
                className="w-full"
                style={{ color: "var(--sv-text-muted)" }}
              />
              <Button
                label="Reset"
                icon="pi pi-external-link"
                outlined
                size="small"
                className="flex-shrink-0"
                onClick={() =>
                  (window.location.href = "/forgot-password")
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Security Notice ──────────────────────────────────── */}
      <div
        className="p-3 border-round-lg mb-4 flex align-items-center gap-2 text-sm"
        style={{
          background: "var(--sv-info-bg)",
          border: "1px solid var(--sv-info)",
          color: "var(--sv-info)",
        }}
      >
        <i className="pi pi-shield flex-shrink-0" />
        <span>
          Changes to your email address may require re-verification. Password
          resets are sent to your registered email.
        </span>
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

export default AccountInfoTab;
