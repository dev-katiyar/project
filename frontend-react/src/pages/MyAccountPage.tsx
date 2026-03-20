import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { TabView, TabPanel } from "primereact/tabview";
import { Toast } from "primereact/toast";
import { Skeleton } from "primereact/skeleton";
import { Tag } from "primereact/tag";
import SubscriptionTab from "@/components/account/SubscriptionTab";
import AccountInfoTab from "@/components/account/AccountInfoTab";
import type { UserProfileData } from "@/components/account/AccountInfoTab";
import RiskProfileTab from "@/components/account/RiskProfileTab";
import NotificationsTab from "@/components/account/NotificationsTab";
import AdminSettingsTab from "@/components/account/AdminSettingsTab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (first?: string, last?: string, username?: string) => {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return "U";
};

const planLabel = (subId?: number) => {
  const map: Record<number, string> = {
    1: "SimpleVisor Monthly",
    2: "SimpleVisor Annual",
  };
  return map[subId ?? 0] || "Free";
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const MyAccountPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useRef<Toast>(null);

  const [userData, setUserData] = useState<UserProfileData>({});
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoadingProfile(true);
    try {
      const [adminRes, profileRes] = await Promise.all([
        api.get("/user/isAdmin").catch(() => ({ data: { userType: 0 } })),
        api.get("/user/subscription"),
      ]);
      setIsAdmin(adminRes.data?.userType === 1);
      setUserData({
        ...profileRes.data,
        age: profileRes.data?.age?.toString(),
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load profile data",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const discardChanges = () => loadAll();

  // ─── Field change ──────────────────────────────────────────────────────────

  const handleChange = (field: keyof UserProfileData, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/user/subscription", {
        userData,
        action: "update",
      });
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Your profile has been updated",
        life: 2000,
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to save changes",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived display values ────────────────────────────────────────────────

  const initials = getInitials(
    userData.firstName,
    userData.lastName,
    user?.username,
  );

  const displayName =
    userData.firstName && userData.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : user?.username || "User";

  const tabProps = {
    userData,
    loading: loadingProfile,
    onChange: handleChange,
    onSave: handleSave,
    onDiscard: discardChanges,
    saving,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <Toast ref={toast} />

      {/* ── Profile Hero ────────────────────────────────────────────────────── */}
      <div
        className="sv-hero px-4 py-5 overflow-hidden relative"
        style={{ minHeight: "auto" }}
      >
        <div className="relative z-1 sv-content-medium mx-auto">
          <div className="flex align-items-center gap-4 flex-wrap">
            {/* Avatar */}
            <div
              className="flex align-items-center justify-content-center border-circle flex-shrink-0 font-bold text-xl"
              style={{
                width: 72,
                height: 72,
                background: "var(--sv-accent-gradient)",
                color: "var(--sv-text-inverse)",
                boxShadow: "var(--sv-shadow-glow)",
                letterSpacing: "0.05em",
              }}
            >
              {loadingProfile ? (
                <i className="pi pi-user" style={{ fontSize: "1.4rem" }} />
              ) : (
                initials
              )}
            </div>

            {/* Name & meta */}
            <div className="flex-1">
              {loadingProfile ? (
                <>
                  <Skeleton
                    height="28px"
                    width="200px"
                    className="mb-2"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  />
                  <Skeleton
                    height="18px"
                    width="140px"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  />
                </>
              ) : (
                <>
                  <h1 className="text-white font-bold mt-0 mb-1 sv-hero-heading">
                    {displayName}
                  </h1>
                  <div className="flex align-items-center gap-2 flex-wrap">
                    {userData.emailAddress && (
                      <span className="sv-hero-subtitle text-sm">
                        <i className="pi pi-envelope mr-1 opacity-70" />
                        {userData.emailAddress}
                      </span>
                    )}
                    <Tag
                      value={planLabel(userData.subscriptionId)}
                      style={{
                        background: "var(--sv-accent-gradient)",
                        color: "var(--sv-text-inverse)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                      }}
                    />
                    {user?.hasActiveSubscription && (
                      <Tag
                        value="Active"
                        severity="success"
                        style={{ fontSize: "0.72rem" }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick stats */}
            <div className="hidden md:flex gap-4">
              {[
                {
                  icon: "pi-user",
                  label: user?.username || "—",
                  hint: "Username",
                },
                {
                  icon: "pi-calendar",
                  label: planLabel(userData.subscriptionId),
                  hint: "Plan",
                },
              ].map(({ icon, label, hint }) => (
                <div key={hint} className="text-center">
                  <i
                    className={`pi ${icon} block mb-1`}
                    style={{ color: "var(--sv-accent)", fontSize: "1.1rem" }}
                  />
                  <div
                    className="font-bold text-white text-sm"
                    style={{ lineHeight: 1.2 }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-xs opacity-60 text-white"
                    style={{ lineHeight: 1.2 }}
                  >
                    {hint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TabView Body ─────────────────────────────────────────────────────── */}
      <div className="mx-auto px-3 py-4 sv-content-medium">
        <TabView
          activeIndex={activeTab}
          onTabChange={(e) => setActiveTab(e.index)}
          pt={{ root: { className: "sv-tabs" } }}
        >
          <TabPanel header="Subscription" leftIcon="pi pi-credit-card mr-2">
            <SubscriptionTab />
          </TabPanel>

          <TabPanel header="Account Info" leftIcon="pi pi-user mr-2">
            <AccountInfoTab {...tabProps} />
          </TabPanel>

          <TabPanel header="Risk Profile" leftIcon="pi pi-chart-pie mr-2">
            <RiskProfileTab {...tabProps} />
          </TabPanel>

          <TabPanel header="Notifications" leftIcon="pi pi-bell mr-2">
            <NotificationsTab />
          </TabPanel>

          {isAdmin && (
            <TabPanel header="Admin" leftIcon="pi pi-cog mr-2">
              <AdminSettingsTab />
            </TabPanel>
          )}
        </TabView>
      </div>
    </div>
  );
};

export default MyAccountPage;
