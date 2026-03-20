import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Message } from "primereact/message";

interface UserSubscriptionData {
  stripe_user_id?: string;
  subscriptionName?: string;
  subscriptionId?: number;
  isPaid?: number;
  date?: string;
  api_created_at?: string;
  api_key?: string;
  userId?: number;
}

interface StripeSubscription {
  plan?: { nickname?: string; amount?: number };
  start_date?: number;
  status?: string;
  canceled_at?: number;
  cancel_at?: number;
}

interface CardInfo {
  brand?: string;
  last4?: string;
  exp_year?: number;
  exp_month?: number;
}

const fmtAmount = (amount?: number) => {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
};

const fmtTimestamp = (ts?: number) => {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "long",
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

const SectionCard: React.FC<{ icon: string; iconBg: string; iconColor: string; title: string; subtitle: string; children: React.ReactNode }> = ({
  icon, iconBg, iconColor, title, subtitle, children,
}) => (
  <div
    className="p-4 border-round-xl"
    style={{ background: "var(--sv-bg-card)", border: "1px solid var(--sv-border)" }}
  >
    <div className="flex align-items-center gap-3 mb-4">
      <div
        className="flex align-items-center justify-content-center border-circle flex-shrink-0"
        style={{ width: 44, height: 44, background: iconBg }}
      >
        <i className={`pi ${icon}`} style={{ color: iconColor, fontSize: "1.1rem" }} />
      </div>
      <div>
        <div className="font-bold text-lg" style={{ color: "var(--sv-text-primary)" }}>{title}</div>
        <div className="text-sm" style={{ color: "var(--sv-text-secondary)" }}>{subtitle}</div>
      </div>
    </div>
    {children}
  </div>
);

const InfoRow: React.FC<{ icon: string; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex align-items-center gap-2 mb-2">
    <i className={`pi ${icon} text-sm`} style={{ color: "var(--sv-text-muted)", width: 16 }} />
    <span className="text-sm" style={{ color: "var(--sv-text-secondary)", minWidth: 130 }}>{label}</span>
    <span className="font-semibold text-sm">{value}</span>
  </div>
);

const SubscriptionTab: React.FC = () => {
  const toast = useRef<Toast>(null);

  const [subUserData, setSubUserData] = useState<UserSubscriptionData | null>(null);
  const [stripeDetails, setStripeDetails] = useState<StripeSubscription | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(true);

  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [cardStatus, setCardStatus] = useState<string>("");
  const [loadingCard, setLoadingCard] = useState(true);

  const [apiKey, setApiKey] = useState<string>("");
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
    loadCardInfo();
  }, []);

  const loadSubscriptionData = async () => {
    setLoadingDetails(true);
    try {
      const { data } = await api.get("/user/subscription");
      const user: UserSubscriptionData = data;
      setSubUserData(user);

      // Mask the stored API key
      if (user.api_key) {
        setApiKey("*".repeat(84));
      }

      const stripeId = user.stripe_user_id;
      if (stripeId === "sv_internal_users_riaproo") {
        setSubscriptionMessage(
          "You are an internal user of SimpleVisor. You do not need a subscription to access the platform.",
        );
        return;
      }
      if (stripeId === "lifetime_plan_user") {
        setSubscriptionMessage(
          "You have a lifetime plan. You do not need a subscription to access the platform.",
        );
        return;
      }

      if (stripeId) {
        // Fetch Stripe subscription details
        try {
          const { data: stripeRes } = await api.get("/user/subscription-details");
          if (stripeRes?.data?.subscription) {
            setStripeDetails(stripeRes.data.subscription);
          } else {
            setSubscriptionMessage(
              "Your subscription has cancelled or expired. Please consider re-subscribing to continue enjoying our services.",
            );
          }
        } catch {
          /* non-critical */
        }
      } else if (!user.subscriptionName) {
        setSubscriptionMessage("");
      }
    } catch {
      /* non-critical */
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadCardInfo = async () => {
    setLoadingCard(true);
    try {
      const { data } = await api.get("/user/subscription/card");
      setCardInfo(data?.card || null);
      setCardStatus(data?.status || "");
    } catch {
      setCardInfo(null);
      setCardStatus("Error");
    } finally {
      setLoadingCard(false);
    }
  };

  const generateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const { data } = await api.get("/generate-api-key");
      const key = data.api_key || data.apiKey || "";
      setApiKey(key);
      toast.current?.show({ severity: "success", summary: "Generated", detail: data.message || "New API key generated", life: 2000 });
    } catch {
      toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to generate API key" });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyApiKey = () => {
    if (!apiKey || apiKey.startsWith("*")) return;
    navigator.clipboard.writeText(apiKey);
    toast.current?.show({ severity: "success", summary: "Copied", detail: "API key copied to clipboard", life: 1500 });
  };

  const today = new Date();
  const cardExpiringThisMonth =
    cardInfo &&
    today.getFullYear() === cardInfo.exp_year &&
    today.getMonth() + 1 === cardInfo.exp_month;
  const cardExpired =
    cardInfo &&
    (today.getFullYear() > cardInfo.exp_year! ||
      (today.getFullYear() === cardInfo.exp_year && today.getMonth() + 1 > cardInfo.exp_month!));

  const isInternal =
    subUserData?.stripe_user_id === "sv_internal_users_riaproo" ||
    subUserData?.stripe_user_id === "lifetime_plan_user";

  const isCancelled = !!stripeDetails?.canceled_at;

  return (
    <>
      <Toast ref={toast} />
      <div className="flex flex-column gap-3">

        {/* ── Current Plan ──────────────────────────────────────────── */}
        <SectionCard
          icon="pi-star-fill"
          iconBg="var(--sv-accent-bg)"
          iconColor="var(--sv-accent)"
          title="Current Plan"
          subtitle="Your subscription details"
        >
          {loadingDetails ? (
            <>
              <Skeleton height="28px" className="mb-3" />
              <Skeleton height="16px" width="70%" className="mb-2" />
              <Skeleton height="16px" width="55%" className="mb-2" />
              <Skeleton height="16px" width="60%" />
            </>
          ) : (
            <>
              {subscriptionMessage && (
                <Message severity="info" text={subscriptionMessage} className="w-full mb-3" />
              )}

              {!subscriptionMessage && !stripeDetails && (
                <Message
                  severity="warn"
                  text="No subscription details found for this user. Please contact us."
                  className="w-full mb-3"
                />
              )}

              {stripeDetails && (
                <>
                  <div className="flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                    <span className="font-bold text-2xl" style={{ color: "var(--sv-accent)" }}>
                      SimpleVisor {stripeDetails.plan?.nickname}
                    </span>
                    <div className="flex align-items-center gap-2">
                      {isCancelled && (
                        <Tag value="Cancelled" severity="danger" />
                      )}
                      <Tag
                        value={stripeDetails.status || "unknown"}
                        severity={getStatusSeverity(stripeDetails.status)}
                        style={{ textTransform: "capitalize" }}
                      />
                    </div>
                  </div>

                  <InfoRow
                    icon="pi-dollar"
                    label="Billing"
                    value={stripeDetails.plan?.amount ? `${fmtAmount(stripeDetails.plan.amount)} / month` : "—"}
                  />
                  <InfoRow
                    icon="pi-calendar"
                    label="Subscription From"
                    value={fmtTimestamp(stripeDetails.start_date)}
                  />
                  {subUserData?.date && (
                    <InfoRow
                      icon="pi-user"
                      label="User Since"
                      value={new Date(subUserData.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    />
                  )}

                  {isCancelled && (
                    <>
                      <InfoRow icon="pi-times-circle" label="Cancelled On" value={fmtTimestamp(stripeDetails.canceled_at)} />
                      <InfoRow icon="pi-calendar-times" label="Access Ends On" value={fmtTimestamp(stripeDetails.cancel_at)} />
                    </>
                  )}

                  <div className="flex gap-2 mt-4 flex-wrap">
                    {!isCancelled && (
                      <>
                        <Button label="Change Plan" icon="pi pi-sync" size="small" severity="success" />
                        <Button label="Cancel Subscription" icon="pi pi-times" size="small" outlined />
                      </>
                    )}
                    {isCancelled && (
                      <Button label="Subscribe" icon="pi pi-check" size="small" severity="success" />
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </SectionCard>

        <div className="grid">
          {/* ── Payment Method ──────────────────────────────────────── */}
          <div className="col-12 md:col-6">
            <SectionCard
              icon="pi-credit-card"
              iconBg="var(--sv-success-bg, var(--sv-accent-bg))"
              iconColor="var(--sv-success, var(--sv-accent))"
              title="Payment Method"
              subtitle="Your card on file"
            >
              {loadingCard ? (
                <>
                  <Skeleton height="20px" width="60%" className="mb-2" />
                  <Skeleton height="16px" width="40%" />
                </>
              ) : cardInfo ? (
                <>
                  <div className="flex align-items-center justify-content-between mb-3">
                    <div className="flex align-items-center gap-2">
                      <i className="pi pi-lock text-sm" style={{ color: "var(--sv-text-muted)" }} />
                      <span className="font-semibold">
                        {cardInfo.brand}: **** {cardInfo.last4}
                      </span>
                    </div>
                    <Button label="Update Card" icon="pi pi-pencil" size="small" outlined />
                  </div>

                  {cardExpiringThisMonth && (
                    <Message
                      severity="warn"
                      text="Your card is expiring this month. Please update the card details to continue the service."
                      className="w-full"
                    />
                  )}
                  {cardExpired && (
                    <Message
                      severity="error"
                      text="Your card has expired. Please update the card details to continue the service."
                      className="w-full"
                    />
                  )}
                </>
              ) : (
                <>
                  {cardStatus === "Internal" && (
                    <Message severity="info" text="You are an internal or lifetime plan user. No card to show/update." className="w-full" />
                  )}
                  {cardStatus === "Error" && (
                    <Message severity="error" text="We could not retrieve any card for this account. Please contact us." className="w-full" />
                  )}
                  {!cardStatus && !isInternal && (
                    <span className="text-sm" style={{ color: "var(--sv-text-muted)" }}>No payment method on file.</span>
                  )}
                </>
              )}
            </SectionCard>
          </div>

          {/* ── API Key (only for users with api_created_at) ─────────── */}
          {subUserData?.api_created_at && (
            <div className="col-12 md:col-6">
              <SectionCard
                icon="pi-key"
                iconBg="var(--sv-info-bg)"
                iconColor="var(--sv-info)"
                title="API Access Key"
                subtitle="For programmatic data access"
              >
                <p className="text-sm mb-3" style={{ color: "var(--sv-text-secondary)", lineHeight: 1.6 }}>
                  The API key can be used to interact with a limited set of APIs programmatically.
                  A new key must be generated if lost.
                </p>

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
                  {apiKey || "—"}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {subUserData?.isPaid === 1 && (
                    <Button
                      label="Generate New Key"
                      icon="pi pi-refresh"
                      size="small"
                      outlined
                      loading={generatingKey}
                      onClick={generateApiKey}
                    />
                  )}
                  <Button
                    label="Copy"
                    icon="pi pi-copy"
                    size="small"
                    severity="secondary"
                    outlined
                    disabled={!apiKey || apiKey.startsWith("*")}
                    onClick={copyApiKey}
                  />
                </div>
              </SectionCard>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default SubscriptionTab;
