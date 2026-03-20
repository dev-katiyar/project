import React, { useState, useRef } from "react";
import api from "@/services/api";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";

const AdminSettingsTab: React.FC = () => {
  const toast = useRef<Toast>(null);
  const [tempPass, setTempPass] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const generateTempPass = async () => {
    setGenerating(true);
    try {
      const { data } = await api.get("/login/create_temp_stock");
      setTempPass(data.password || data.temp_pass || data.tempPass || "");
      toast.current?.show({
        severity: "success",
        summary: "Generated",
        detail: "Temporary password created (valid for 1 hour)",
        life: 3000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to generate temporary password",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyTempPass = () => {
    if (!tempPass) return;
    navigator.clipboard.writeText(tempPass);
    toast.current?.show({
      severity: "success",
      summary: "Copied",
      detail: "Temporary password copied to clipboard",
      life: 1500,
    });
  };

  return (
    <>
      <Toast ref={toast} />
      <div className="grid">
        <div className="col-12 md:col-6">
          <div
            className="p-4 border-round-xl"
            style={{
              background: "var(--sv-bg-card)",
              border: "1px solid var(--sv-border)",
            }}
          >
            {/* Header */}
            <div className="flex align-items-center gap-3 mb-4">
              <div
                className="flex align-items-center justify-content-center border-circle flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: "var(--sv-warning-bg)",
                }}
              >
                <i
                  className="pi pi-cog"
                  style={{ color: "var(--sv-warning)", fontSize: "1.1rem" }}
                />
              </div>
              <div>
                <div
                  className="font-bold text-lg"
                  style={{ color: "var(--sv-text-primary)" }}
                >
                  Test User Access
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--sv-text-secondary)" }}
                >
                  Generate temporary passwords for test users
                </div>
              </div>
            </div>

            {/* Temp password display */}
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--sv-text-secondary)" }}
            >
              <i
                className="pi pi-key mr-2"
                style={{ color: "var(--sv-warning)" }}
              />
              Temporary Password
            </label>
            <div
              className="mb-3 p-3 border-round-lg font-mono text-sm"
              style={{
                background: "var(--sv-bg-surface)",
                border: "1px solid var(--sv-border)",
                color: tempPass
                  ? "var(--sv-text-primary)"
                  : "var(--sv-text-muted)",
                minHeight: 48,
                wordBreak: "break-all",
              }}
            >
              {tempPass || 'Click "Generate Temp Password" to create one'}
            </div>

            <div className="flex gap-2">
              <Button
                label="Generate Temp Password"
                icon="pi pi-refresh"
                size="small"
                outlined
                loading={generating}
                onClick={generateTempPass}
              />
              <Button
                label="Copy"
                icon="pi pi-copy"
                size="small"
                severity="secondary"
                outlined
                disabled={!tempPass}
                onClick={copyTempPass}
              />
            </div>

            <Divider />

            <div
              className="text-sm p-3 border-round-lg flex align-items-start gap-2"
              style={{
                background: "var(--sv-warning-bg)",
                border: "1px solid var(--sv-warning)",
                color: "var(--sv-warning)",
              }}
            >
              <i className="pi pi-exclamation-triangle flex-shrink-0 mt-1" />
              <span>
                Temporary passwords are valid for 1 hour. Share only with
                authorized test users and never in public channels.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSettingsTab;
