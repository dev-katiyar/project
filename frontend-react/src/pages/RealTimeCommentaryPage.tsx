import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "primereact/skeleton";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ID = 902; // WpPostCategories.ProCommentary
const PAGE_SIZE = 6;
const POPULAR_LIMIT = 6;
const ARCHIVE_MONTHS = 12;
const FRESH_HOURS = 48; // posts within this window get a "New" badge

// ─── Types ────────────────────────────────────────────────────────────────────

interface WpPost {
  id: number;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  featured_media: number;
  yoast_head_json?: {
    twitter_misc?: { "Written by"?: string };
    og_image?: Array<{ url: string }>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getExcerpt(html: string, maxLen = 200): string {
  const text = stripHtml(html);
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

function getAuthor(post: WpPost): string {
  return post.yoast_head_json?.twitter_misc?.["Written by"] ?? "SimpleVisor";
}

function getImageUrl(post: WpPost): string | undefined {
  const og = post.yoast_head_json?.og_image;
  return og && og.length > 0 ? og[0].url : undefined;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isRecent(dateStr: string): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < FRESH_HOURS * 60 * 60 * 1000;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) {
    const diffM = Math.floor(diffMs / (1000 * 60));
    return `${diffM}m ago`;
  }
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

// ─── LiveDot ──────────────────────────────────────────────────────────────────

const LiveDot: React.FC = () => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      padding: "0.18rem 0.55rem",
      borderRadius: 20,
      background: "color-mix(in srgb, var(--sv-success, #22c55e) 12%, transparent)",
      border: "1px solid color-mix(in srgb, var(--sv-success, #22c55e) 30%, transparent)",
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--sv-success, #22c55e)",
        boxShadow: "0 0 0 3px color-mix(in srgb, var(--sv-success, #22c55e) 25%, transparent)",
        animation: "sv-pulse 1.8s infinite",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
    <span
      style={{
        fontSize: "0.58rem",
        fontWeight: 800,
        letterSpacing: "0.08em",
        color: "var(--sv-success, #22c55e)",
        textTransform: "uppercase",
      }}
    >
      Live
    </span>
    <style>{`
      @keyframes sv-pulse {
        0%   { box-shadow: 0 0 0 0   color-mix(in srgb, var(--sv-success, #22c55e) 50%, transparent); }
        70%  { box-shadow: 0 0 0 7px color-mix(in srgb, var(--sv-success, #22c55e) 0%,  transparent); }
        100% { box-shadow: 0 0 0 0   color-mix(in srgb, var(--sv-success, #22c55e) 0%,  transparent); }
      }
    `}</style>
  </span>
);

// ─── PostCard ─────────────────────────────────────────────────────────────────

const PostCard: React.FC<{ post: WpPost; featured?: boolean }> = ({ post, featured = false }) => {
  const author = getAuthor(post);
  const imageUrl = getImageUrl(post);
  const excerpt = getExcerpt(post.excerpt.rendered, featured ? 280 : 200);
  const title = stripHtml(post.title.rendered);
  const recent = isRecent(post.date);
  const [hovered, setHovered] = useState(false);

  if (featured) {
    // Featured (first) post — full-width card with large image
    return (
      <div
        style={{
          background: "var(--sv-bg-card)",
          border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: "0.875rem",
          boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Hero image */}
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", position: "relative", overflow: "hidden" }}
        >
          <div
            style={{
              paddingBottom: "42%",
              position: "relative",
              background: "var(--sv-bg-surface)",
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.35s",
                  transform: hovered ? "scale(1.04)" : "scale(1)",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className="pi pi-bolt"
                  style={{ fontSize: "3rem", color: "var(--sv-text-muted)", opacity: 0.2 }}
                />
              </div>
            )}
            {/* Gradient */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)",
              }}
            />
            {/* Badges overlay */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.55rem",
                  borderRadius: 4,
                  background: "var(--sv-accent)",
                  color: "#fff",
                }}
              >
                Pro Commentary
              </span>
              {recent && <LiveDot />}
            </div>
          </div>
        </a>

        {/* Content */}
        <div style={{ padding: "1rem 1.25rem 1.1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--sv-text-muted)", fontSize: "0.67rem" }}>
              <i className="pi pi-calendar mr-1" style={{ fontSize: "0.6rem" }} />
              {formatDate(post.date)}
            </span>
            {recent && (
              <span style={{ color: "var(--sv-text-muted)", fontSize: "0.65rem" }}>
                · {timeAgo(post.date)}
              </span>
            )}
          </div>

          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--sv-text-primary)",
              fontWeight: 700,
              fontSize: "1.15rem",
              lineHeight: 1.38,
              textDecoration: "none",
              marginBottom: "0.5rem",
              display: "block",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sv-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sv-text-primary)")}
          >
            {title}
          </a>

          <p
            style={{
              color: "var(--sv-text-secondary)",
              fontSize: "0.82rem",
              lineHeight: 1.68,
              margin: "0 0 0.85rem",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {excerpt}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.7rem",
              borderTop: "1px solid var(--sv-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--sv-accent-bg)",
                  border: "1px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--sv-accent)",
                  fontSize: "0.52rem",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {getInitials(author)}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--sv-text-muted)", fontWeight: 500 }}>
                {author}
              </span>
            </div>
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.4rem 0.85rem",
                borderRadius: 7,
                background: "var(--sv-accent)",
                color: "#fff",
                fontSize: "0.72rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.02em",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Read Analysis
              <i className="pi pi-arrow-right" style={{ fontSize: "0.6rem" }} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Standard compact card — side image layout
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: "0.75rem",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Featured image */}
      <a
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flexShrink: 0,
          width: 170,
          minHeight: 150,
          overflow: "hidden",
          display: "block",
          background: "var(--sv-bg-surface)",
          position: "relative",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.3s",
              transform: hovered ? "scale(1.06)" : "scale(1)",
              position: "absolute",
              inset: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="pi pi-bolt"
              style={{ fontSize: "2rem", color: "var(--sv-text-muted)", opacity: 0.3 }}
            />
          </div>
        )}
        {/* Accent bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--sv-accent-gradient)",
          }}
        />
      </a>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "0.8rem 1rem",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Badge + date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.55rem",
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              padding: "0.18rem 0.5rem",
              borderRadius: 4,
              background: "var(--sv-accent-bg)",
              color: "var(--sv-accent)",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
            }}
          >
            Pro Commentary
          </span>
          {recent && (
            <span
              style={{
                fontSize: "0.52rem",
                fontWeight: 800,
                padding: "0.15rem 0.4rem",
                borderRadius: 3,
                background: "color-mix(in srgb, var(--sv-success, #22c55e) 12%, transparent)",
                color: "var(--sv-success, #22c55e)",
                border: "1px solid color-mix(in srgb, var(--sv-success, #22c55e) 25%, transparent)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              New
            </span>
          )}
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.64rem" }}>
            <i className="pi pi-calendar mr-1" style={{ fontSize: "0.58rem" }} />
            {formatDate(post.date)}
          </span>
        </div>

        {/* Title */}
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--sv-text-primary)",
            fontWeight: 700,
            fontSize: "0.92rem",
            lineHeight: 1.42,
            textDecoration: "none",
            marginBottom: "0.4rem",
            display: "block",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sv-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sv-text-primary)")}
        >
          {title}
        </a>

        {/* Excerpt */}
        <p
          style={{
            color: "var(--sv-text-secondary)",
            fontSize: "0.76rem",
            lineHeight: 1.65,
            margin: 0,
            flexGrow: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {excerpt}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.65rem",
            paddingTop: "0.55rem",
            borderTop: "1px solid var(--sv-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--sv-accent-bg)",
                border: "1px solid color-mix(in srgb, var(--sv-accent) 28%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sv-accent)",
                fontSize: "0.48rem",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {getInitials(author)}
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--sv-text-muted)", fontWeight: 500 }}>
              {author}
            </span>
          </div>
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--sv-accent)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.22rem",
              letterSpacing: "0.02em",
            }}
          >
            Read more
            <i className="pi pi-arrow-right" style={{ fontSize: "0.55rem" }} />
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── PostCardSkeleton ─────────────────────────────────────────────────────────

const PostCardSkeleton: React.FC<{ featured?: boolean }> = ({ featured = false }) => {
  if (featured) {
    return (
      <div
        style={{
          background: "var(--sv-bg-card)",
          border: "1px solid var(--sv-border)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: "0.875rem",
        }}
      >
        <Skeleton width="100%" height="240px" borderRadius="0" />
        <div style={{ padding: "1rem 1.25rem" }}>
          <Skeleton width="150px" height="16px" borderRadius="4px" className="mb-2" />
          <Skeleton width="95%" height="22px" borderRadius="4px" className="mb-1" />
          <Skeleton width="80%" height="22px" borderRadius="4px" className="mb-3" />
          <Skeleton width="100%" height="13px" borderRadius="4px" className="mb-1" />
          <Skeleton width="88%" height="13px" borderRadius="4px" />
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        background: "var(--sv-bg-card)",
        border: "1px solid var(--sv-border)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: "0.75rem",
      }}
    >
      <Skeleton width="170px" height="150px" borderRadius="0" />
      <div style={{ flex: 1, padding: "0.8rem 1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.45rem" }}>
          <Skeleton width="100px" height="16px" borderRadius="4px" />
          <Skeleton width="80px" height="16px" borderRadius="4px" />
        </div>
        <Skeleton width="95%" height="18px" borderRadius="4px" className="mb-1" />
        <Skeleton width="72%" height="18px" borderRadius="4px" className="mb-2" />
        <Skeleton width="100%" height="12px" borderRadius="4px" className="mb-1" />
        <Skeleton width="80%" height="12px" borderRadius="4px" />
      </div>
    </div>
  );
};

// ─── SidebarCard ──────────────────────────────────────────────────────────────

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
        padding: "0.75rem 1rem",
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
          fontSize: "0.78rem",
          color: "var(--sv-text-primary)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "0.75rem" }}>{children}</div>
  </div>
);

// ─── PopularPostItem ──────────────────────────────────────────────────────────

const PopularPostItem: React.FC<{ post: WpPost; rank: number }> = ({ post, rank }) => {
  const title = stripHtml(post.title.rendered);
  const imageUrl = getImageUrl(post);
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        gap: "0.6rem",
        alignItems: "flex-start",
        padding: "0.5rem 0.375rem",
        borderRadius: 8,
        textDecoration: "none",
        marginBottom: "0.1rem",
        background: hovered ? "var(--sv-bg-surface)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: rank <= 3 ? "var(--sv-accent-bg)" : "var(--sv-bg-surface)",
          color: rank <= 3 ? "var(--sv-accent)" : "var(--sv-text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.55rem",
          fontWeight: 800,
          border: `1px solid ${rank <= 3 ? "color-mix(in srgb, var(--sv-accent) 30%, transparent)" : "var(--sv-border)"}`,
          marginTop: 2,
        }}
      >
        {rank}
      </span>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          style={{ width: 46, height: 38, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
        />
      )}
      <span
        style={{
          fontSize: "0.73rem",
          color: "var(--sv-text-primary)",
          lineHeight: 1.45,
          fontWeight: 500,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </span>
    </a>
  );
};

// ─── ArchiveMonthItem ─────────────────────────────────────────────────────────

const ArchiveMonthItem: React.FC<{
  date: Date;
  idx: number;
  active: boolean;
  onClick: () => void;
}> = ({ date, idx, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.4rem 0.5rem",
        borderRadius: 6,
        cursor: "pointer",
        background: active
          ? "color-mix(in srgb, var(--sv-accent) 10%, transparent)"
          : hovered
          ? "var(--sv-bg-surface)"
          : "transparent",
        border: active
          ? "1px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)"
          : "1px solid transparent",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <i
          className={active ? "pi pi-folder-open" : "pi pi-folder"}
          style={{ color: "var(--sv-accent)", fontSize: "0.72rem" }}
        />
        <span
          style={{
            fontSize: "0.77rem",
            color: active ? "var(--sv-accent)" : "var(--sv-text-secondary)",
            fontWeight: active ? 700 : 500,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        {idx === 0 && !active && (
          <span
            style={{
              fontSize: "0.52rem",
              fontWeight: 700,
              padding: "0.15rem 0.35rem",
              borderRadius: 3,
              background: "var(--sv-success-bg)",
              color: "var(--sv-success)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Latest
          </span>
        )}
        {active && (
          <i className="pi pi-check" style={{ fontSize: "0.6rem", color: "var(--sv-accent)" }} />
        )}
      </div>
    </div>
  );
};

// ─── RealTimeCommentaryPage ───────────────────────────────────────────────────

const RealTimeCommentaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeYear = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : null;
  const activeMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;

  const [posts, setPosts] = useState<WpPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pageFirst, setPageFirst] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popularPosts, setPopularPosts] = useState<WpPost[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  const archiveMonths = useMemo<Date[]>(() => {
    const now = new Date();
    return Array.from(
      { length: ARCHIVE_MONTHS },
      (_, i) => new Date(now.getFullYear(), now.getMonth() - i),
    );
  }, []);

  const buildDateRange = useCallback((year: number, month: number) => {
    const after = new Date(year, month, 1, 0, 0, 0).toISOString();
    const before = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    return { after, before };
  }, []);

  const loadPosts = useCallback(
    async (offset: number, year: number | null, month: number | null) => {
      setLoadingPosts(true);
      try {
        const params: Record<string, string | number> = {
          categories: CATEGORY_ID,
          per_page: PAGE_SIZE,
          offset,
        };
        if (year !== null && month !== null) {
          const { after, before } = buildDateRange(year, month);
          params.after = after;
          params.before = before;
        }
        const { data, headers } = await api.get("/wp-json/wp/v2/posts", { params });
        setPosts(Array.isArray(data) ? data : []);
        const total = parseInt(headers["x-wp-total"] ?? "0", 10);
        setTotalPosts(isNaN(total) ? 0 : total);
      } catch {
        setPosts([]);
        setTotalPosts(0);
      } finally {
        setLoadingPosts(false);
      }
    },
    [buildDateRange],
  );

  const loadPopularPosts = useCallback(async () => {
    setLoadingPopular(true);
    try {
      const { data } = await api.get("/wp-json/wordpress-popular-posts/v1/popular-posts", {
        params: { limit: POPULAR_LIMIT, offset: 0 },
      });
      setPopularPosts(Array.isArray(data) ? data : []);
    } catch {
      setPopularPosts([]);
    } finally {
      setLoadingPopular(false);
    }
  }, []);

  useEffect(() => {
    setPageFirst(0);
    loadPosts(0, activeYear, activeMonth);
  }, [activeYear, activeMonth, loadPosts]);

  useEffect(() => {
    loadPopularPosts();
  }, [loadPopularPosts]);

  const handlePageChange = (e: PaginatorPageChangeEvent) => {
    setPageFirst(e.first);
    loadPosts(e.first, activeYear, activeMonth);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleArchiveClick = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    if (activeYear === y && activeMonth === m) {
      setSearchParams({});
    } else {
      setSearchParams({ year: String(y), month: String(m) });
    }
  };

  const handleClearFilter = () => setSearchParams({});

  const activeFilterLabel = useMemo(() => {
    if (activeYear === null || activeMonth === null) return null;
    return new Date(activeYear, activeMonth).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [activeYear, activeMonth]);

  // Separate featured post from the rest
  const [featuredPost, ...restPosts] = posts;

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.25rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "var(--sv-accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
              flexShrink: 0,
            }}
          >
            <i className="pi pi-bolt" style={{ color: "var(--sv-accent)", fontSize: "1.15rem" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h1 className="text-2xl font-bold m-0 sv-page-title">Real-Time Commentary</h1>
              <LiveDot />
            </div>
            <p className="m-0 text-sm" style={{ color: "var(--sv-text-muted)", marginTop: "0.1rem" }}>
              Live pro market commentary — expert insights published throughout the trading day
            </p>
          </div>
        </div>
        <div
          style={{
            height: 3,
            marginTop: "0.875rem",
            background: "var(--sv-accent-gradient)",
            borderRadius: 2,
            width: 80,
          }}
        />
      </div>

      {/* ── Active month filter banner ── */}
      {activeFilterLabel && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.55rem 0.9rem",
            marginBottom: "1rem",
            background: "color-mix(in srgb, var(--sv-accent) 8%, var(--sv-bg-card))",
            border: "1px solid color-mix(in srgb, var(--sv-accent) 28%, transparent)",
            borderRadius: 8,
            boxShadow: "var(--sv-shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i
              className="pi pi-filter-fill"
              style={{ color: "var(--sv-accent)", fontSize: "0.78rem" }}
            />
            <span style={{ fontSize: "0.78rem", color: "var(--sv-text-primary)", fontWeight: 600 }}>
              Filtered by:{" "}
              <span style={{ color: "var(--sv-accent)" }}>{activeFilterLabel}</span>
            </span>
          </div>
          <button
            onClick={handleClearFilter}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.25rem 0.6rem",
              borderRadius: 5,
              border: "1px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)",
              background: "transparent",
              color: "var(--sv-accent)",
              fontSize: "0.7rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <i className="pi pi-times" style={{ fontSize: "0.6rem" }} />
            Clear
          </button>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid">
        {/* ── Main posts column ── */}
        <div className="col-12 lg:col-8 p-1">

          {/* Post count bar */}
          {!loadingPosts && totalPosts > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.875rem",
                padding: "0.5rem 0.75rem",
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
                borderRadius: 8,
                boxShadow: "var(--sv-shadow-sm)",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--sv-text-muted)" }}>
                <i
                  className="pi pi-list mr-2"
                  style={{ fontSize: "0.7rem", color: "var(--sv-accent)" }}
                />
                Showing{" "}
                <strong style={{ color: "var(--sv-text-primary)" }}>
                  {pageFirst + 1}–{Math.min(pageFirst + PAGE_SIZE, totalPosts)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "var(--sv-text-primary)" }}>{totalPosts}</strong>{" "}
                articles
              </span>
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  borderRadius: 4,
                  background: "var(--sv-accent-bg)",
                  color: "var(--sv-accent)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "1px solid color-mix(in srgb, var(--sv-accent) 22%, transparent)",
                }}
              >
                Pro Commentary
              </span>
            </div>
          )}

          {/* Loading skeletons */}
          {loadingPosts ? (
            <>
              <PostCardSkeleton featured />
              {Array.from({ length: PAGE_SIZE - 1 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </>
          ) : posts.length === 0 ? (
            <div
              style={{
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
                borderRadius: 12,
                padding: "4rem 1rem",
                textAlign: "center",
                boxShadow: "var(--sv-shadow-sm)",
              }}
            >
              <i
                className="pi pi-inbox"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--sv-text-muted)",
                  opacity: 0.4,
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              />
              <p
                style={{
                  margin: "0 0 0.5rem",
                  color: "var(--sv-text-muted)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                No articles found{activeFilterLabel ? ` for ${activeFilterLabel}` : ""}.
              </p>
              {activeFilterLabel && (
                <button
                  onClick={handleClearFilter}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.45rem 1.1rem",
                    borderRadius: 7,
                    border: "1px solid var(--sv-accent)",
                    background: "var(--sv-accent-bg)",
                    color: "var(--sv-accent)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  View all articles
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Featured first post */}
              {featuredPost && <PostCard post={featuredPost} featured />}

              {/* Rest of posts */}
              {restPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {totalPosts > PAGE_SIZE && (
                <div
                  style={{
                    background: "var(--sv-bg-card)",
                    border: "1px solid var(--sv-border)",
                    borderRadius: 10,
                    padding: "0.25rem",
                    boxShadow: "var(--sv-shadow-sm)",
                    marginTop: "0.5rem",
                  }}
                >
                  <Paginator
                    first={pageFirst}
                    rows={PAGE_SIZE}
                    totalRecords={totalPosts}
                    onPageChange={handlePageChange}
                    template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                    style={{ background: "transparent" }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="col-12 lg:col-4 p-1">

          {/* About Pro Commentary */}
          <SidebarCard title="About Pro Commentary" icon="pi-bolt">
            <p
              style={{
                fontSize: "0.77rem",
                color: "var(--sv-text-secondary)",
                lineHeight: 1.7,
                margin: "0 0 0.75rem",
              }}
            >
              Real-time market analysis delivered by our professional team throughout the trading
              day. Get actionable insights on macro trends, sector moves, and market-moving events
              as they happen.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {[
                "Market Commentary",
                "Real-Time Alerts",
                "Technical Analysis",
                "Macro Trends",
                "Sector Rotation",
                "Risk Management",
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.57rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.5rem",
                    borderRadius: 4,
                    background: "var(--sv-bg-surface)",
                    color: "var(--sv-text-muted)",
                    border: "1px solid var(--sv-border)",
                    letterSpacing: "0.03em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </SidebarCard>

          {/* Popular Posts */}
          <SidebarCard title="Popular Posts" icon="pi-fire">
            {loadingPopular ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", padding: "0.5rem 0.375rem" }}
                >
                  <Skeleton width="20px" height="20px" borderRadius="50%" />
                  <Skeleton width="46px" height="38px" borderRadius="6px" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="100%" height="12px" borderRadius="4px" style={{ marginBottom: "0.3rem" }} />
                    <Skeleton width="75%" height="12px" borderRadius="4px" />
                  </div>
                </div>
              ))
            ) : popularPosts.length === 0 ? (
              <p style={{ color: "var(--sv-text-muted)", fontSize: "0.78rem", margin: 0 }}>
                No popular posts available.
              </p>
            ) : (
              popularPosts.map((post, i) => (
                <PopularPostItem key={post.id} post={post} rank={i + 1} />
              ))
            )}
          </SidebarCard>

          {/* Monthly Archive */}
          <SidebarCard title="Monthly Archive" icon="pi-calendar">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
              {archiveMonths.map((date, i) => {
                const isActive =
                  activeYear === date.getFullYear() && activeMonth === date.getMonth();
                return (
                  <ArchiveMonthItem
                    key={i}
                    date={date}
                    idx={i}
                    active={isActive}
                    onClick={() => handleArchiveClick(date)}
                  />
                );
              })}
            </div>
            {activeFilterLabel && (
              <button
                onClick={handleClearFilter}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                  width: "100%",
                  marginTop: "0.625rem",
                  padding: "0.4rem 0",
                  borderRadius: 6,
                  border: "1px solid var(--sv-border)",
                  background: "var(--sv-bg-surface)",
                  color: "var(--sv-text-muted)",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <i className="pi pi-times" style={{ fontSize: "0.6rem" }} />
                Show all months
              </button>
            )}
          </SidebarCard>
        </div>
      </div>
    </>
  );
};

export default RealTimeCommentaryPage;
