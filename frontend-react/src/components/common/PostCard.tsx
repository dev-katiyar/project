import React, { useState } from "react";
import { Skeleton } from "primereact/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WpPost {
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

export interface PostCardProps {
  post: WpPost;
  /** Icon class shown in the thumbnail placeholder (e.g. "pi-bolt"). Default: "pi-bolt" */
  placeholderIcon?: string;
  /** Label shown as an overlay badge on the thumbnail */
  overlayLabel?: string;
  /** Position of the overlay badge. Default: "top" */
  overlayPosition?: "top" | "bottom";
  /** Static category tag shown in the meta row (e.g. "Newsletter") */
  metaTag?: string;
  /** When true, shows a "New" badge and time-ago for recently published posts */
  showFreshBadge?: boolean;
  /** Max excerpt length. Default: 200 */
  excerptMaxLen?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRESH_HOURS = 48;

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function formatDate(dateStr: string): string {
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

export function getIssueLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getExcerpt(html: string, maxLen: number): string {
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

function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < FRESH_HOURS * 60 * 60 * 1000;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return `${Math.floor(diffMs / (1000 * 60))}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

export const CardSkeleton: React.FC = () => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 14,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Skeleton width="100%" height="110px" borderRadius="0" />
    <div style={{ padding: "0.875rem" }}>
      <Skeleton width="80px" height="14px" borderRadius="4px" className="mb-2" />
      <Skeleton width="100%" height="14px" borderRadius="4px" className="mb-1" />
      <Skeleton width="70%" height="14px" borderRadius="4px" className="mb-2" />
      <Skeleton width="100%" height="11px" borderRadius="4px" className="mb-1" />
      <Skeleton width="85%" height="11px" borderRadius="4px" />
    </div>
  </div>
);

// ─── PostCard ─────────────────────────────────────────────────────────────────

const PostCard: React.FC<PostCardProps> = ({
  post,
  placeholderIcon = "pi-bolt",
  overlayLabel,
  overlayPosition = "top",
  metaTag,
  showFreshBadge = false,
  excerptMaxLen = 200,
}) => {
  const title = stripHtml(post.title.rendered);
  const author = getAuthor(post);
  const imageUrl = getImageUrl(post);
  const recent = showFreshBadge && isRecent(post.date);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <a
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", flexShrink: 0 }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "55%",
            background: "var(--sv-bg-surface)",
            overflow: "hidden",
          }}
        >
          {!imgLoaded && (
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
                className={`pi ${placeholderIcon}`}
                style={{ fontSize: "1.5rem", color: "var(--sv-accent)", opacity: 0.3 }}
              />
            </div>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              onLoad={() => setImgLoaded(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.3s, transform 0.35s",
                transform: hovered ? "scale(1.05)" : "scale(1)",
              }}
            />
          )}
          {/* Overlay badge */}
          {overlayLabel && (
            <div
              style={{
                position: "absolute",
                ...(overlayPosition === "top" ? { top: 7, left: 7 } : { bottom: 7, left: 7 }),
              }}
            >
              <span
                style={{
                  fontSize: "0.52rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0.15rem 0.4rem",
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.6)",
                  color: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(4px)",
                  fontFamily: "inherit",
                }}
              >
                {overlayLabel}
              </span>
            </div>
          )}
        </div>
      </a>

      {/* Content */}
      <div style={{ padding: "0.875rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "0.45rem",
            flexWrap: "wrap",
          }}
        >
          {metaTag && (
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.14rem 0.4rem",
                borderRadius: 3,
                background: "color-mix(in srgb, var(--sv-accent) 10%, transparent)",
                color: "var(--sv-accent)",
                border: "1px solid color-mix(in srgb, var(--sv-accent) 22%, transparent)",
              }}
            >
              {metaTag}
            </span>
          )}
          {recent && (
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.14rem 0.4rem",
                borderRadius: 3,
                background: "color-mix(in srgb, var(--sv-success, #22c55e) 12%, transparent)",
                color: "var(--sv-success, #22c55e)",
                border: "1px solid color-mix(in srgb, var(--sv-success, #22c55e) 25%, transparent)",
              }}
            >
              New
            </span>
          )}
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.62rem" }}>
            <i className="pi pi-calendar mr-1" style={{ fontSize: "0.55rem" }} />
            {formatDate(post.date)}
          </span>
          {recent && (
            <span style={{ color: "var(--sv-text-muted)", fontSize: "0.62rem" }}>
              · {timeAgo(post.date)}
            </span>
          )}
        </div>

        {/* Title */}
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "var(--sv-text-primary)",
            fontWeight: 700,
            fontSize: "0.85rem",
            lineHeight: 1.4,
            textDecoration: "none",
            marginBottom: "0.4rem",
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
            fontSize: "0.72rem",
            lineHeight: 1.6,
            margin: "0 0 auto 0",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {getExcerpt(post.excerpt.rendered, excerptMaxLen)}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.75rem",
            paddingTop: "0.55rem",
            borderTop: "1px solid var(--sv-border)",
          }}
        >
          <span style={{ fontSize: "0.62rem", color: "var(--sv-text-muted)" }}>
            <i className="pi pi-user mr-1" style={{ fontSize: "0.55rem" }} />
            {author}
          </span>
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "var(--sv-accent)",
              textDecoration: "none",
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

export default PostCard;
