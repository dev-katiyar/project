import React, { useState } from "react";
import { Skeleton } from "primereact/skeleton";
import { formatDate, stripHtml } from "@/components/common/PostCard";
import SidebarCard from "@/components/common/SidebarCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PopularPost {
  id: number;
  title: string | { rendered: string };
  date: string;
  link: string;
  yoast_head_json?: { og_image?: Array<{ url: string }> };
  meta?: { views?: number };
}

// ─── PopularPostItem ──────────────────────────────────────────────────────────

const PopularPostItem: React.FC<{ post: PopularPost; rank: number }> = ({ post, rank }) => {
  const [hovered, setHovered] = useState(false);
  const title =
    typeof post.title === "string"
      ? post.title
      : stripHtml((post.title as { rendered: string }).rendered ?? "");
  const imageUrl = post.yoast_head_json?.og_image?.[0]?.url;

  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.65rem",
        padding: "0.5rem 0.4rem",
        borderRadius: 7,
        textDecoration: "none",
        background: hovered ? "var(--sv-bg-surface)" : "transparent",
        transition: "background 0.15s",
        marginBottom: "0.25rem",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rank bubble */}
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background:
            rank <= 3
              ? "var(--sv-accent)"
              : "color-mix(in srgb, var(--sv-accent) 15%, var(--sv-bg-surface))",
          color: rank <= 3 ? "#fff" : "var(--sv-accent)",
          fontSize: "0.6rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {rank}
      </span>

      {/* Thumbnail (optional) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          style={{ width: 46, height: 38, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
        />
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: hovered ? "var(--sv-accent)" : "var(--sv-text-primary)",
            lineHeight: 1.45,
            transition: "color 0.15s",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        {post.date && (
          <div style={{ fontSize: "0.62rem", color: "var(--sv-text-muted)", marginTop: "0.2rem" }}>
            {formatDate(post.date)}
          </div>
        )}
      </div>
    </a>
  );
};

// ─── PopularPostsSidebarCard ──────────────────────────────────────────────────

interface PopularPostsSidebarCardProps {
  loading: boolean;
  posts: PopularPost[];
  icon?: string;
}

const PopularPostsSidebarCard: React.FC<PopularPostsSidebarCardProps> = ({
  loading,
  posts,
  icon = "pi-star",
}) => (
  <SidebarCard title="Popular Posts" icon={icon}>
    {loading ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Skeleton width="22px" height="22px" borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="100%" height="12px" borderRadius="4px" className="mb-1" />
              <Skeleton width="60%" height="12px" borderRadius="4px" />
            </div>
          </div>
        ))}
      </div>
    ) : posts.length === 0 ? (
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--sv-text-muted)",
          textAlign: "center",
          margin: 0,
        }}
      >
        No popular posts available.
      </p>
    ) : (
      <div>
        {posts.map((post, i) => (
          <PopularPostItem key={post.id} post={post} rank={i + 1} />
        ))}
      </div>
    )}
  </SidebarCard>
);

export default PopularPostsSidebarCard;
