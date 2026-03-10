import React from "react";

interface AboutSidebarCardProps {
  cardTitle: string;
  cardIcon: string;
  badgeIcon: string;
  name: string;
  description: string;
  tags: string[];
}

const AboutSidebarCard: React.FC<AboutSidebarCardProps> = ({
  cardTitle,
  cardIcon,
  badgeIcon,
  name,
  description,
  tags,
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
    {/* Card header */}
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
      <i className={`pi ${cardIcon}`} style={{ color: "var(--sv-accent)", fontSize: "0.875rem" }} />
      <span
        style={{
          fontWeight: 700,
          fontSize: "0.75rem",
          color: "var(--sv-text-primary)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {cardTitle}
      </span>
    </div>

    {/* Card body */}
    <div style={{ padding: "0.875rem" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--sv-accent-bg)",
            border: "2px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.5rem",
          }}
        >
          <i className={`pi ${badgeIcon}`} style={{ color: "var(--sv-accent)", fontSize: "1.3rem" }} />
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "var(--sv-text-primary)",
            marginBottom: "0.3rem",
          }}
        >
          {name}
        </div>
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--sv-text-muted)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              padding: "0.2rem 0.5rem",
              borderRadius: 4,
              background: "var(--sv-bg-surface)",
              color: "var(--sv-text-muted)",
              border: "1px solid var(--sv-border)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default AboutSidebarCard;
