import React, { useState, useRef } from "react";
import api from "@/services/api";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";

const PLACEHOLDER = 'Click "Generate Temp Pass" to create';

const AdminSettingsTab: React.FC = () => {
  const toast = useRef<Toast>(null);
  const [tempPass, setTempPass] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const generateTempPass = async () => {
    setTempPass("");
    setMessage("");
    setGenerating(true);
    try {
      const { data } = await api.get("/login/create_temp_stock");
      setTempPass(data.temp_password || "");
      setMessage(data.message || "");
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
      detail: "Temp password copied to clipboard",
      life: 1200,
    });
  };

  return (
    <>
      <Toast ref={toast} />
      <div className="grid">
        <div className="col-12">
          <div
            className="p-3 border-round"
            style={{
              background: "var(--sv-bg-card)",
              border: "1px solid var(--sv-border)",
            }}
          >
            <div className="font-bold text-xl mb-2" style={{ color: "var(--sv-text-primary)" }}>
              Generate Test User Passwords
            </div>
            <hr style={{ margin: "0.5rem 0", borderColor: "var(--sv-border)" }} />

            <div className="mt-3 mb-2 text-sm" style={{ color: "var(--sv-text-secondary)" }}>
              This is temp password generator for test users. This is valid for 1 hour only.
              Create a new one each time it expires or is lost.
            </div>

            <div className="flex align-items-center gap-4 flex-wrap mt-3">
              <span className="font-semibold" style={{ color: "var(--sv-text-secondary)" }}>
                Temp Pass:
              </span>
              <span
                className="font-bold font-mono"
                style={{ color: tempPass ? "var(--sv-text-primary)" : "var(--sv-text-muted)" }}
              >
                {tempPass || PLACEHOLDER}
              </span>
              <Button
                label="Copy Temp Pass"
                icon="pi pi-copy"
                className="p-button-rounded p-button-success"
                size="small"
                disabled={!tempPass}
                onClick={copyTempPass}
              />
              <Button
                label="Generate Temp Pass"
                icon="pi pi-refresh"
                className="p-button-rounded"
                size="small"
                loading={generating}
                onClick={generateTempPass}
              />
            </div>

            {message && (
              <div className="mt-2 text-sm text-center" style={{ color: "var(--sv-success)" }}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSettingsTab;
