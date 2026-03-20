import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Message } from "primereact/message";
import { Dialog } from "primereact/dialog";
import { RadioButton } from "primereact/radiobutton";
import { Checkbox } from "primereact/checkbox";
import { InputTextarea } from "primereact/inputtextarea";

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

interface SubscriptionPlan {
  id: string | number;
  name: string;
}

interface ExitReason {
  id: number;
  description: string;
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

  // Plan dialog
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | number | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Unsubscribe dialog
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [exitReasons, setExitReasons] = useState<ExitReason[]>([{ id: 1, description: "Other" }]);
  const [selectedReasonIds, setSelectedReasonIds] = useState<number[]>([]);
  const [exitFeedback, setExitFeedback] = useState("");
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);

  // Change card dialog
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardAgreed, setCardAgreed] = useState(false);
  const [cardUpdateLoading, setCardUpdateLoading] = useState(false);
  const [cardUpdateMessage, setCardUpdateMessage] = useState("");

  useEffect(() => {
    loadSubscriptionData();
    loadCardInfo();
    // Initialize Stripe publishable key
    if (window.Stripe) {
      window.Stripe.setPublishableKey(import.meta.env.VITE_STRIPE_KEY as string);
    }
  }, []);

  const loadSubscriptionData = async () => {
    setLoadingDetails(true);
    try {
      const { data } = await api.get("/user/subscription");
      const user: UserSubscriptionData = data;
      setSubUserData(user);

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

  // ── Plan dialog ──────────────────────────────────────────────────────────

  const openPlanDialog = async (action: string) => {
    setActionType(action);
    setSelectedPlanId(subUserData?.subscriptionId ?? null);
    setShowPlanDialog(true);
    if (plans.length === 0) {
      try {
        const { data } = await api.get("/subscriptions/all");
        setPlans(Array.isArray(data) ? data : []);
      } catch {
        /* non-critical */
      }
    }
  };

  const confirmPlanChange = async () => {
    if (!selectedPlanId) return;
    setPlanLoading(true);
    try {
      const { data } = await api.post("/user/subscription", { action: actionType, subscriptionId: selectedPlanId });
      setShowPlanDialog(false);
      toast.current?.show({ severity: "success", summary: "Success", detail: data?.message || "Subscription updated", life: 2500 });
      loadSubscriptionData();
    } catch {
      toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to update subscription" });
    } finally {
      setPlanLoading(false);
    }
  };

  // ── Unsubscribe dialog ───────────────────────────────────────────────────

  const openUnsubscribeDialog = async () => {
    setSelectedReasonIds([]);
    setExitFeedback("");
    setShowUnsubscribeDialog(true);
    try {
      const { data } = await api.get("/user/exit-reasons");
      if (data?.data) setExitReasons(data.data);
    } catch {
      setExitReasons([{ id: 1, description: "Other" }]);
    }
  };

  const confirmUnsubscribe = async () => {
    setUnsubscribeLoading(true);
    try {
      const { data } = await api.post("/user/subscription", {
        action: "unsubscribe",
        exitFeedback: {
          userId: subUserData?.userId,
          selUserExitReasons: selectedReasonIds.map((id) => ({ id })),
          feedback: exitFeedback,
        },
      });
      setShowUnsubscribeDialog(false);
      toast.current?.show({ severity: "info", summary: "Unsubscribed", detail: data?.message || "You have been unsubscribed", life: 3000 });
      loadSubscriptionData();
    } catch {
      toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to cancel subscription" });
    } finally {
      setUnsubscribeLoading(false);
    }
  };

  // ── Update card dialog ───────────────────────────────────────────────────

  const openCardDialog = () => {
    setCardNumber("");
    setCardExpMonth("");
    setCardExpYear("");
    setCardCvc("");
    setCardAgreed(false);
    setCardUpdateMessage("");
    setShowCardDialog(true);
  };

  const isCardFormValid = () =>
    cardNumber.replace(/\s/g, "").length >= 13 &&
    cardExpMonth.length === 2 &&
    cardExpYear.length === 4 &&
    cardCvc.length >= 3 &&
    cardAgreed;

  const submitCardUpdate = () => {
    if (!isCardFormValid()) return;
    setCardUpdateLoading(true);
    setCardUpdateMessage("Securing card details with payment provider...");

    window.Stripe.createToken(
      {
        number: cardNumber.replace(/\s/g, ""),
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
        cvc: cardCvc,
      },
      async (status, response) => {
        if (status !== 200 || response.error) {
          setCardUpdateMessage(response.error?.message || "Card tokenization failed. Please check your card details.");
          setCardUpdateLoading(false);
          return;
        }
        setCardUpdateMessage("Card details secured. Updating...");
        try {
          const { data } = await api.post("/user/update_creditcard", { card_id: response.id });
          setCardUpdateMessage(data?.message || "Card updated successfully.");
          toast.current?.show({ severity: "success", summary: "Updated", detail: data?.message || "Card updated", life: 2500 });
          setShowCardDialog(false);
          loadCardInfo();
        } catch {
          setCardUpdateMessage("Failed to update card. Please try again.");
        } finally {
          setCardUpdateLoading(false);
        }
      },
    );
  };

  // ── Derived state ────────────────────────────────────────────────────────

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
                        <Button
                          label="Change Plan"
                          icon="pi pi-sync"
                          size="small"
                          severity="success"
                          onClick={() => openPlanDialog("changeSubscription")}
                        />
                        <Button
                          label="Cancel Subscription"
                          icon="pi pi-times"
                          size="small"
                          outlined
                          onClick={openUnsubscribeDialog}
                        />
                      </>
                    )}
                    {isCancelled && (
                      <Button
                        label="Subscribe"
                        icon="pi pi-check"
                        size="small"
                        severity="success"
                        onClick={() => openPlanDialog("subscribe")}
                      />
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
                    <Button label="Update Card" icon="pi pi-pencil" size="small" outlined onClick={openCardDialog} />
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

          {/* ── API Key ─────────────────────────────────────────────── */}
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

      {/* ── Plan Selection Dialog ──────────────────────────────────── */}
      <Dialog
        header="Select Subscription Plan"
        visible={showPlanDialog}
        modal
        style={{ width: "30rem" }}
        onHide={() => setShowPlanDialog(false)}
        footer={
          <div className="flex gap-2 justify-content-end">
            <Button label="Cancel" icon="pi pi-times" severity="secondary" outlined onClick={() => setShowPlanDialog(false)} />
            <Button
              label="Select Plan"
              icon="pi pi-check"
              severity="success"
              loading={planLoading}
              disabled={!selectedPlanId}
              onClick={confirmPlanChange}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          {plans.length === 0 ? (
            <Skeleton height="60px" />
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="flex align-items-center gap-3 p-3 border-round-lg cursor-pointer"
                style={{
                  border: `1px solid ${selectedPlanId === plan.id ? "var(--sv-accent)" : "var(--sv-border)"}`,
                  background: selectedPlanId === plan.id ? "var(--sv-accent-bg)" : "transparent",
                }}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <RadioButton
                  inputId={String(plan.id)}
                  value={plan.id}
                  checked={selectedPlanId === plan.id}
                  onChange={(e) => setSelectedPlanId(e.value)}
                />
                <label htmlFor={String(plan.id)} className="cursor-pointer font-semibold">{plan.name}</label>
              </div>
            ))
          )}
        </div>
      </Dialog>

      {/* ── Unsubscribe Dialog ─────────────────────────────────────── */}
      <Dialog
        header="Unsubscribe from SimpleVisor?"
        visible={showUnsubscribeDialog}
        modal
        style={{ width: "min(600px, 95vw)" }}
        onHide={() => setShowUnsubscribeDialog(false)}
        footer={
          <div className="flex gap-2 justify-content-end">
            <Button
              label="Nevermind, keep my account"
              icon="pi pi-heart"
              severity="success"
              onClick={() => setShowUnsubscribeDialog(false)}
            />
            <Button
              label="Yes, Cancel"
              icon="pi pi-times"
              severity="danger"
              outlined
              loading={unsubscribeLoading}
              disabled={selectedReasonIds.length === 0 || !exitFeedback.trim()}
              onClick={confirmUnsubscribe}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <h3 className="mt-0 mb-1">We're sorry to see you go!</h3>
          <p className="mt-0 mb-2 font-semibold" style={{ color: "var(--sv-text-secondary)" }}>
            Please let us know why you're unsubscribing. Your feedback helps us improve. This won't affect your cancellation.
          </p>

          <div>
            <div className="font-semibold mb-2">
              Exit Reason <span style={{ color: "var(--sv-danger, red)" }}>*</span>
            </div>
            <div className="flex flex-column gap-2 pl-2">
              {exitReasons.map((reason) => (
                <div key={reason.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`reason-${reason.id}`}
                    value={reason.id}
                    checked={selectedReasonIds.includes(reason.id)}
                    onChange={(e) => {
                      setSelectedReasonIds((prev) =>
                        e.checked ? [...prev, reason.id] : prev.filter((id) => id !== reason.id),
                      );
                    }}
                  />
                  <label htmlFor={`reason-${reason.id}`}>{reason.description}</label>
                </div>
              ))}
            </div>
            {selectedReasonIds.length === 0 && (
              <small className="text-red-500">Please select at least one reason.</small>
            )}
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="exitFeedback" className="font-semibold">
              Feedback <span style={{ color: "var(--sv-danger, red)" }}>*</span>
            </label>
            <InputTextarea
              id="exitFeedback"
              rows={4}
              value={exitFeedback}
              onChange={(e) => setExitFeedback(e.target.value)}
              placeholder="Please share any additional feedback..."
              className="w-full"
            />
            {!exitFeedback.trim() && (
              <small className="text-red-500">Please add some feedback.</small>
            )}
          </div>
        </div>
      </Dialog>

      {/* ── Update Card Dialog ─────────────────────────────────────── */}
      <Dialog
        header="Update Payment Card"
        visible={showCardDialog}
        modal
        style={{ width: "min(480px, 95vw)" }}
        onHide={() => !cardUpdateLoading && setShowCardDialog(false)}
        footer={
          <div className="flex gap-2 justify-content-end">
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              outlined
              disabled={cardUpdateLoading}
              onClick={() => setShowCardDialog(false)}
            />
            <Button
              label="Submit"
              icon="pi pi-check"
              severity="info"
              loading={cardUpdateLoading}
              disabled={!isCardFormValid()}
              onClick={submitCardUpdate}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block text-sm font-semibold mb-1">Card Number <span style={{ color: "var(--sv-danger, red)" }}>*</span></label>
            <input
              type="text"
              className="sv-card-field"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              maxLength={19}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                setCardNumber(raw.replace(/(.{4})/g, "$1 ").trim());
              }}
            />
          </div>

          <div className="grid">
            <div className="col-4">
              <label className="block text-sm font-semibold mb-1">Exp Month <span style={{ color: "var(--sv-danger, red)" }}>*</span></label>
              <input
                type="text"
                className="sv-card-field"
                placeholder="MM"
                value={cardExpMonth}
                maxLength={2}
                onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </div>
            <div className="col-4">
              <label className="block text-sm font-semibold mb-1">Exp Year <span style={{ color: "var(--sv-danger, red)" }}>*</span></label>
              <input
                type="text"
                className="sv-card-field"
                placeholder="YYYY"
                value={cardExpYear}
                maxLength={4}
                onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div className="col-4">
              <label className="block text-sm font-semibold mb-1">CVC <span style={{ color: "var(--sv-danger, red)" }}>*</span></label>
              <input
                type="text"
                className="sv-card-field"
                placeholder="123"
                value={cardCvc}
                maxLength={4}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
          </div>

          <div className="flex align-items-start gap-2">
            <Checkbox
              inputId="cardAgreement"
              checked={cardAgreed}
              onChange={(e) => setCardAgreed(!!e.checked)}
            />
            <label htmlFor="cardAgreement" className="text-sm" style={{ color: "var(--sv-text-secondary)" }}>
              You must read and agree to our{" "}
              <a href="/agreement" target="_blank" style={{ color: "var(--sv-accent)" }}>Subscriber Agreement</a>{" "}
              to become a subscriber. Your subscription will renew automatically unless cancelled prior to renewal.
            </label>
          </div>

          {cardUpdateMessage && (
            <Message
              severity={cardUpdateMessage.toLowerCase().includes("fail") || cardUpdateMessage.toLowerCase().includes("error") ? "error" : "info"}
              text={cardUpdateMessage}
              className="w-full"
            />
          )}

          <p className="text-xs mb-0 flex align-items-center gap-1" style={{ color: "var(--sv-text-muted)" }}>
            <i className="pi pi-lock" />
            Your payment info is encrypted and processed securely via Stripe.
          </p>
        </div>
      </Dialog>
    </>
  );
};

export default SubscriptionTab;
