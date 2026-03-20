import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Toast } from "primereact/toast";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Skeleton } from "primereact/skeleton";
import { Divider } from "primereact/divider";

interface EmailPrefs {
  daily_portfolio_mails: boolean;
  sv_trade_alerts: boolean;
  sv_robo_trade_alerts: boolean;
  user_symbol_alerts: boolean;
  blog_alerts: boolean;
  tpa_blog_alerts: boolean;
  weekly_reports: boolean;
}

interface SmsPrefs {
  daily_portfolio_mails: boolean;
  sv_trade_alerts: boolean;
  sv_robo_trade_alerts: boolean;
  user_symbol_alerts: boolean;
  blog_alerts: boolean;
  weekly_reports: boolean;
  phone: string;
}

interface NotificationsTabProps {
  userData?: any;
}

const defaultEmailPrefs: EmailPrefs = {
  daily_portfolio_mails: false,
  sv_trade_alerts: false,
  sv_robo_trade_alerts: false,
  user_symbol_alerts: false,
  blog_alerts: false,
  tpa_blog_alerts: false,
  weekly_reports: false,
};

const defaultSmsPrefs: SmsPrefs = {
  daily_portfolio_mails: false,
  sv_trade_alerts: false,
  sv_robo_trade_alerts: false,
  user_symbol_alerts: false,
  blog_alerts: false,
  weekly_reports: false,
  phone: "",
};

const isTpaMember = (subId?: number) => [3, 4, 5].includes(subId ?? 0);

// ── Reusable pref row ─────────────────────────────────────────────────────────

interface PrefRowProps {
  icon: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const PrefRow: React.FC<PrefRowProps> = ({
  icon,
  label,
  description,
  checked,
  onChange,
}) => (
  <div
    className="flex align-items-center justify-content-between py-3"
    style={{ borderBottom: "1px solid var(--sv-border-light)" }}
  >
    <div className="flex align-items-center gap-3">
      <i
        className={`pi ${icon} text-sm`}
        style={{
          color: checked ? "var(--sv-accent)" : "var(--sv-text-muted)",
          width: 16,
          transition: "color 0.15s ease",
        }}
      />
      <div>
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--sv-text-primary)" }}
        >
          {label}
        </div>
        {description && (
          <div
            className="text-xs mt-1"
            style={{ color: "var(--sv-text-muted)" }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
    <InputSwitch checked={checked} onChange={(e) => onChange(e.value)} />
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const NotificationsTab: React.FC<NotificationsTabProps> = ({ userData }) => {
  const toast = useRef<Toast>(null);
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>(defaultEmailPrefs);
  const [smsPrefs, setSmsPrefs] = useState<SmsPrefs>(defaultSmsPrefs);
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingSms, setSavingSms] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    setLoading(true);
    try {
      const [emailRes, smsRes] = await Promise.all([
        api.get("/email-notifications-pref"),
        api.get("/sms-notifications-pref"),
      ]);
      setEmailPrefs({ ...defaultEmailPrefs, ...emailRes.data });
      setSmsPrefs({ ...defaultSmsPrefs, ...smsRes.data });
    } catch {
      /* use defaults */
    } finally {
      setLoading(false);
    }
  };

  const saveEmailPrefs = async () => {
    setSavingEmail(true);
    try {
      await api.post("/email-notifications-pref", { prefs: emailPrefs });
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Email preferences updated",
        life: 2000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to save email preferences",
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const saveSmsPrefs = async () => {
    setSavingSms(true);
    try {
      const phone = smsPrefs.phone.replace(/[\s\(\)\-]/g, "");
      await api.post("/sms-notifications-pref", {
        prefs: { ...smsPrefs, phone },
      });
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "SMS preferences updated",
        life: 2000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to save SMS preferences",
      });
    } finally {
      setSavingSms(false);
    }
  };

  const setEmail =
    (key: keyof EmailPrefs) =>
    (v: boolean) =>
      setEmailPrefs((p) => ({ ...p, [key]: v }));

  const setSms =
    (key: keyof SmsPrefs) =>
    (v: boolean) =>
      setSmsPrefs((p) => ({ ...p, [key]: v }));

  const LoadingCard = () => (
    <div
      className="p-4 border-round-xl h-full"
      style={{
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
      }}
    >
      <Skeleton height="44px" className="mb-4" />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height="52px" className="mb-2" />
      ))}
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <div className="grid">
        {/* ── Email Notifications ──────────────────────────────── */}
        <div className="col-12 md:col-6">
          {loading ? (
            <LoadingCard />
          ) : (
            <div
              className="p-4 border-round-xl h-full flex flex-column"
              style={{
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
              }}
            >
              <div className="flex align-items-center gap-3 mb-4">
                <div
                  className="flex align-items-center justify-content-center border-circle flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: "var(--sv-accent-bg)",
                  }}
                >
                  <i
                    className="pi pi-envelope"
                    style={{ color: "var(--sv-accent)", fontSize: "1.1rem" }}
                  />
                </div>
                <div>
                  <div
                    className="font-bold text-lg"
                    style={{ color: "var(--sv-text-primary)" }}
                  >
                    Email Notifications
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--sv-text-secondary)" }}
                  >
                    Choose what you receive by email
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <PrefRow
                  icon="pi-chart-bar"
                  label="SV Core Portfolio Trade Alerts"
                  description="Trade signals for core portfolios"
                  checked={emailPrefs.sv_trade_alerts}
                  onChange={setEmail("sv_trade_alerts")}
                />
                <PrefRow
                  icon="pi-robot"
                  label="SV Thematic Portfolio Alerts"
                  description="Robo-driven thematic trade signals"
                  checked={emailPrefs.sv_robo_trade_alerts}
                  onChange={setEmail("sv_robo_trade_alerts")}
                />
                <PrefRow
                  icon="pi-book"
                  label="Blog Alerts"
                  description="New articles and market commentary"
                  checked={emailPrefs.blog_alerts}
                  onChange={setEmail("blog_alerts")}
                />
                <PrefRow
                  icon="pi-bell"
                  label="Symbol Alerts"
                  description="Price target notifications for tracked symbols"
                  checked={emailPrefs.user_symbol_alerts}
                  onChange={setEmail("user_symbol_alerts")}
                />
                <PrefRow
                  icon="pi-file-pdf"
                  label="Weekly Report"
                  description="Portfolio performance digest every week"
                  checked={emailPrefs.weekly_reports}
                  onChange={setEmail("weekly_reports")}
                />
                {!isTpaMember(userData?.subscriptionId) && (
                  <PrefRow
                    icon="pi-star"
                    label="TPA Blog Alerts"
                    description="Exclusive TPA subscriber content"
                    checked={emailPrefs.tpa_blog_alerts}
                    onChange={setEmail("tpa_blog_alerts")}
                  />
                )}
              </div>

              <Divider className="my-3" />
              <Button
                label="Save Email Preferences"
                icon="pi pi-save"
                size="small"
                loading={savingEmail}
                onClick={saveEmailPrefs}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* ── SMS Notifications ────────────────────────────────── */}
        <div className="col-12 md:col-6">
          {loading ? (
            <LoadingCard />
          ) : (
            <div
              className="p-4 border-round-xl h-full flex flex-column"
              style={{
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
              }}
            >
              <div className="flex align-items-center gap-3 mb-4">
                <div
                  className="flex align-items-center justify-content-center border-circle flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: "var(--sv-info-bg)",
                  }}
                >
                  <i
                    className="pi pi-mobile"
                    style={{ color: "var(--sv-info)", fontSize: "1.1rem" }}
                  />
                </div>
                <div>
                  <div
                    className="font-bold text-lg"
                    style={{ color: "var(--sv-text-primary)" }}
                  >
                    SMS Notifications
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--sv-text-secondary)" }}
                  >
                    Receive text alerts on your phone
                  </div>
                </div>
              </div>

              {/* Phone number */}
              <div className="mb-4">
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "var(--sv-text-secondary)" }}
                >
                  <i
                    className="pi pi-phone mr-2"
                    style={{ color: "var(--sv-info)" }}
                  />
                  Mobile Number (include country code)
                </label>
                <InputText
                  value={smsPrefs.phone}
                  onChange={(e) =>
                    setSmsPrefs((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+1 234 567 8900"
                  className="w-full"
                />
              </div>

              <div className="flex-1">
                <PrefRow
                  icon="pi-chart-bar"
                  label="SV Core Portfolios Trade Alerts"
                  description="Core portfolio trade signals via SMS"
                  checked={smsPrefs.sv_trade_alerts}
                  onChange={setSms("sv_trade_alerts")}
                />
                <PrefRow
                  icon="pi-robot"
                  label="SV Thematic Portfolios Alerts"
                  description="Thematic trade signals via SMS"
                  checked={smsPrefs.sv_robo_trade_alerts}
                  onChange={setSms("sv_robo_trade_alerts")}
                />
              </div>

              <div
                className="mt-3 p-3 border-round-lg text-sm flex align-items-start gap-2"
                style={{
                  background: "var(--sv-info-bg)",
                  border: "1px solid var(--sv-info)",
                  color: "var(--sv-info)",
                }}
              >
                <i className="pi pi-info-circle flex-shrink-0 mt-1" />
                <span>
                  SMS is available for USA &amp; Canada only. Message and data
                  rates may apply. Delivery subject to carrier filtering.
                </span>
              </div>

              <Divider className="my-3" />
              <Button
                label="Save SMS Preferences"
                icon="pi pi-save"
                size="small"
                loading={savingSms}
                onClick={saveSmsPrefs}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsTab;
