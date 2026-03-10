import React from "react";

const SidebarCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 12,
      marginBottom: "1rem",
      boxShadow: "var(--sv-shadow-sm)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "0.7rem 1rem",
        borderBottom: "1px solid var(--sv-border)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "color-mix(in srgb, var(--sv-accent) 6%, var(--sv-bg-card))",
      }}
    >
      <i className={`pi ${icon}`} style={{ color: "var(--sv-accent)", fontSize: "0.875rem" }} />
      <span
        style={{
          fontWeight: 700,
          fontSize: "0.75rem",
          color: "var(--sv-text-primary)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "0.875rem" }}>{children}</div>
  </div>
);

export default SidebarCard;
