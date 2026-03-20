import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";

interface SubscriptionDetails {
  nickname?: string;
  amount?: number;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface SubscriptionTabProps {
  userData: any;
}

const fmtAmount = (amount?: number) => {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

const fmtDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const ts = Number(dateStr);
  const d = ts > 1e10 ? new Date(ts) : new Date(ts * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusSeverity = (
  status?: string,
): "success" | "info" | "warning" | "danger" | "secondary" => {
  if (status === "active") return "success";
  if (status === "trialing") return "info";
  if (status === "past_due") return "warning";
  if (status === "canceled") return "danger";
  return "secondary";
};

const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex align-items-center gap-2 mb-2">
    <i
      className={`pi ${icon} text-sm`}
      style={{ color: "var(--sv-text-muted)", width: 16 }}
    />
    <span
      className="text-sm"
      style={{ color: "var(--sv-text-secondary)", minWidth: 110 }}
    >
      {label}
    </span>
    <span className="font-semibold text-sm">{value}</span>
  </div>
);

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ userData }) => {
  const toast = useRef<Toast>(null);
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(
    null,
  );
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [apiKey, setApiKey] = useState<string>("");
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    loadSubDetails();
  }, []);

  const loadSubDetails = async () => {
    setLoadingDetails(true);
    try {
      const { data } = await api.get("/user/subscription-details");
      setSubDetails(data);
      if (data?.apiKey || data?.api_key) {
        setApiKey(data.apiKey || data.api_key);
      }
    } catch {
      /* non-critical */
    } finally {
      setLoadingDetails(false);
    }
  };

  const generateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const { data } = await api.get("/generate-api-key");
      setApiKey(data.apiKey || data.api_key || "");
      toast.current?.show({
        severity: "success",
        summary: "Generated",
        detail: "New API key generated",
        life: 2000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to generate API key",
      });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast.current?.show({
      severity: "success",
      summary: "Copied",
      detail: "API key copied to clipboard",
      life: 1500,
    });
  };

  const planLabel = (subId?: number) => {
    const map: Record<number, string> = {
      1: "Basic",
      2: "Standard",
      3: "TPA Subscriber",
      4: "TPA Premium",
      5: "TPA Elite",
    };
    return map[subId ?? 0] || "Free";
  };

  return (
    <>
      <Toast ref={toast} />
      <div className="grid">
        {/* ── Current Plan ─────────────────────────────────────── */}
        <div className="col-12 md:col-6">
          <div
            className="p-4 border-round-xl h-full"
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
                  className="pi pi-star-fill"
                  style={{ color: "var(--sv-accent)", fontSize: "1.1rem" }}
                />
              </div>
              <div>
                <div
                  className="font-bold text-lg"
                  style={{ color: "var(--sv-text-primary)" }}
                >
                  Current Plan
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--sv-text-secondary)" }}
                >
                  Your subscription details
                </div>
              </div>
            </div>

            {loadingDetails ? (
              <>
                <Skeleton height="28px" className="mb-3" />
                <Skeleton height="16px" width="60%" className="mb-2" />
                <Skeleton height="16px" width="40%" className="mb-2" />
                <Skeleton height="16px" width="50%" />
              </>
            ) : (
              <>
                <div className="flex align-items-center justify-content-between mb-4">
                  <span
                    className="font-bold text-2xl"
                    style={{ color: "var(--sv-accent)" }}
                  >
                    {subDetails?.nickname || planLabel(userData?.subscriptionId)}
                  </span>
                  <Tag
                    value={subDetails?.status || (userData?.hasActiveSubscription ? "active" : "inactive")}
                    severity={getStatusSeverity(subDetails?.status || (userData?.hasActiveSubscription ? "active" : "inactive"))}
                    style={{ textTransform: "capitalize" }}
                  />
                </div>

                <InfoRow
                  icon="pi-dollar"
                  label="Billing"
                  value={
                    subDetails?.amount
                      ? `${fmtAmount(subDetails.amount)} / month`
                      : "—"
                  }
                />
                <InfoRow
                  icon="pi-calendar"
                  label="Period Start"
                  value={fmtDate(subDetails?.current_period_start)}
                />
                <InfoRow
                  icon="pi-calendar-plus"
                  label={subDetails?.cancel_at_period_end ? "Cancels On" : "Renews On"}
                  value={fmtDate(subDetails?.current_period_end)}
                />

                {subDetails?.cancel_at_period_end && (
                  <div
                    className="mt-3 p-3 border-round-lg text-sm flex align-items-center gap-2"
                    style={{
                      background: "var(--sv-warning-bg)",
                      color: "var(--sv-warning)",
                      border: "1px solid var(--sv-warning)",
                    }}
                  >
                    <i className="pi pi-exclamation-triangle flex-shrink-0" />
                    <span>
                      Your subscription will cancel at the end of the current
                      billing period.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── API Key ────────────────────────────────────────────── */}
        <div className="col-12 md:col-6">
          <div
            className="p-4 border-round-xl h-full"
            style={{
              background: "var(--sv-bg-card)",
              border: "1px solid var(--sv-border)",
            }}
          >
            <div className="flex align-items-center gap-3 mb-4">
              <div
                className="flex align-items-center justify-content-center border-circle flex-shrink-0"
                style={{ width: 44, height: 44, background: "var(--sv-info-bg)" }}
              >
                <i
                  className="pi pi-key"
                  style={{ color: "var(--sv-info)", fontSize: "1.1rem" }}
                />
              </div>
              <div>
                <div
                  className="font-bold text-lg"
                  style={{ color: "var(--sv-text-primary)" }}
                >
                  API Access Key
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--sv-text-secondary)" }}
                >
                  For programmatic data access
                </div>
              </div>
            </div>

            <div
              className="mb-3 p-3 border-round-lg font-mono text-sm"
              style={{
                background: "var(--sv-bg-surface)",
                border: "1px solid var(--sv-border)",
                wordBreak: "break-all",
                color: apiKey ? "var(--sv-text-primary)" : "var(--sv-text-muted)",
                minHeight: 52,
                lineHeight: 1.6,
              }}
            >
              {apiKey || 'Click "Generate Key" to create one'}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                label="Generate Key"
                icon="pi pi-refresh"
                size="small"
                outlined
                loading={generatingKey}
                onClick={generateApiKey}
              />
              <Button
                label="Copy"
                icon="pi pi-copy"
                size="small"
                severity="secondary"
                outlined
                disabled={!apiKey}
                onClick={copyApiKey}
              />
            </div>

            <Divider />

            <div
              className="text-sm"
              style={{ color: "var(--sv-text-muted)", lineHeight: 1.6 }}
            >
              <i className="pi pi-info-circle mr-2" />
              Keep your API key confidential. Regenerating a key will
              invalidate the previous one.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionTab;
