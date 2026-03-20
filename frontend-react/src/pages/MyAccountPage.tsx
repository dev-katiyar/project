import React from "react";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import { useAuth } from "@/contexts/AuthContext";

const MyAccountPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* ── Hero ── */}
      <div className="sv-hero text-center px-4 py-7 overflow-hidden relative">
        <div className="relative z-1">
          <i className="pi pi-user block mb-3 sv-hero-icon" />
          <h1 className="text-white font-bold mt-0 mb-2 sv-hero-heading">
            My Account
          </h1>
          <p className="mt-0 text-lg sv-hero-subtitle">
            Manage your profile, preferences, and subscription.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto px-3 py-5 sv-content-medium">
        <div className="surface-card border-1 surface-border border-round-xl p-5 shadow-4 text-center">
          <i
            className="pi pi-wrench mb-4"
            style={{ fontSize: "3rem", color: "var(--primary-color)" }}
          />
          <h2 className="mt-0 mb-2 font-bold text-xl">Coming Soon</h2>
          <p className="mt-0 mb-4 text-color-secondary line-height-3">
            Account management is currently under construction. Soon you'll be
            able to update your profile, change your password, manage billing,
            and customize your notification preferences here.
          </p>

          {user && (
            <>
              <Divider />
              <div className="flex flex-column align-items-center gap-2 text-sm text-color-secondary">
                <span>
                  Signed in as <strong>{user.username}</strong>
                </span>
                {user.email && <span>{user.email}</span>}
              </div>
            </>
          )}

          <Divider />

          <Button
            label="Contact Support"
            icon="pi pi-envelope"
            className="p-button-outlined"
            onClick={() => (window.location.href = "/contact-us")}
          />
        </div>
      </div>
    </div>
  );
};

export default MyAccountPage;
