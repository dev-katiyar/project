import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "primereact/skeleton";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ID = 12340; // WpPostCategories.ProNewsletter
const PAGE_SIZE = 6;
const POPULAR_LIMIT = 6;
const ARCHIVE_MONTHS = 18;

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

interface PopularPost {
  id: number;
  title: string;
  date: string;
  link: string;
  meta?: { views?: number };
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

function getExcerpt(html: string, maxLen = 180): string {
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

function buildDateRange(year: number, month: number) {
  const after = new Date(year, month, 1, 0, 0, 0).toISOString();
  const before = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  return { after, before };
}

function getIssueLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const FeaturedSkeleton: React.FC = () => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: "1rem",
    }}
  >
    <Skeleton width="100%" height="280px" borderRadius="0" />
    <div style={{ padding: "1.5rem" }}>
      <Skeleton width="120px" height="20px" borderRadius="4px" className="mb-3" />
      <Skeleton width="80%" height="28px" borderRadius="6px" className="mb-2" />
      <Skeleton width="55%" height="28px" borderRadius="6px" className="mb-3" />
      <Skeleton width="100%" height="14px" borderRadius="4px" className="mb-1" />
      <Skeleton width="90%" height="14px" borderRadius="4px" className="mb-3" />
      <Skeleton width="130px" height="36px" borderRadius="8px" />
    </div>
  </div>
);

const CardSkeleton: React.FC = () => (
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
    <Skeleton width="100%" height="160px" borderRadius="0" />
    <div style={{ padding: "1rem" }}>
      <Skeleton width="80px" height="16px" borderRadius="4px" className="mb-2" />
      <Skeleton width="100%" height="16px" borderRadius="4px" className="mb-1" />
      <Skeleton width="70%" height="16px" borderRadius="4px" className="mb-2" />
      <Skeleton width="100%" height="12px" borderRadius="4px" className="mb-1" />
      <Skeleton width="85%" height="12px" borderRadius="4px" />
    </div>
  </div>
);

// ─── FeaturedCard ─────────────────────────────────────────────────────────────

const FeaturedCard: React.FC<{ post: WpPost }> = ({ post }) => {
  const title = stripHtml(post.title.rendered);
  const author = getAuthor(post);
  const imageUrl = getImageUrl(post);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: "1rem",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cover image */}
      {imageUrl && (
        <a href={post.link} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: "38%",
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
                  className="pi pi-file-edit"
                  style={{ fontSize: "2.5rem", color: "var(--sv-text-muted)", opacity: 0.25 }}
                />
              </div>
            )}
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
                transition: "opacity 0.3s, transform 0.4s",
                transform: hovered ? "scale(1.03)" : "scale(1)",
              }}
            />
            {/* Gradient overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
              }}
            />
            {/* Issue badge */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: "var(--sv-accent)",
                  color: "#fff",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.22rem 0.6rem",
                  borderRadius: 4,
                }}
              >
                Latest Issue
              </span>
              <span
                style={{
                  background: "rgba(0,0,0,0.55)",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "0.22rem 0.6rem",
                  borderRadius: 4,
                  backdropFilter: "blur(4px)",
                }}
              >
                Pro Newsletter
              </span>
            </div>
          </div>
        </a>
      )}

      {/* Content */}
      <div style={{ padding: "1.5rem" }}>
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "0.875rem",
            flexWrap: "wrap",
          }}
        >
          {!imageUrl && (
            <span
              style={{
                background: "var(--sv-accent)",
                color: "#fff",
                fontSize: "0.55rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.22rem 0.6rem",
                borderRadius: 4,
              }}
            >
              Latest Issue
            </span>
          )}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--sv-text-muted)",
              fontSize: "0.72rem",
            }}
          >
            <i className="pi pi-calendar" style={{ fontSize: "0.62rem", color: "var(--sv-accent)" }} />
            {formatDate(post.date)}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--sv-text-muted)",
              fontSize: "0.72rem",
            }}
          >
            <i className="pi pi-user" style={{ fontSize: "0.62rem", color: "var(--sv-accent)" }} />
            {author}
          </span>
        </div>

        {/* Title */}
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            color: "var(--sv-text-primary)",
            fontWeight: 800,
            fontSize: "1.3rem",
            lineHeight: 1.35,
            textDecoration: "none",
            marginBottom: "0.75rem",
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
            fontSize: "0.85rem",
            lineHeight: 1.7,
            margin: "0 0 1.25rem 0",
          }}
        >
          {getExcerpt(post.excerpt.rendered, 280)}
        </p>

        {/* CTA */}
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 1.1rem",
            borderRadius: 8,
            background: "var(--sv-accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.78rem",
            textDecoration: "none",
            letterSpacing: "0.02em",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Read Full Issue
          <i className="pi pi-arrow-right" style={{ fontSize: "0.68rem" }} />
        </a>
      </div>
    </div>
  );
};

// ─── PostCard ─────────────────────────────────────────────────────────────────

const PostCard: React.FC<{ post: WpPost }> = ({ post }) => {
  const title = stripHtml(post.title.rendered);
  const author = getAuthor(post);
  const imageUrl = getImageUrl(post);
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
            paddingBottom: "52%",
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
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <i
                className="pi pi-envelope"
                style={{ fontSize: "1.8rem", color: "var(--sv-accent)", opacity: 0.3 }}
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
          {/* Issue month badge */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "rgba(0,0,0,0.6)",
              color: "rgba(255,255,255,0.95)",
              fontSize: "0.55rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.18rem 0.45rem",
              borderRadius: 4,
              backdropFilter: "blur(4px)",
            }}
          >
            {getIssueLabel(post.date)}
          </div>
        </div>
      </a>

      {/* Content */}
      <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.16rem 0.45rem",
              borderRadius: 3,
              background: "color-mix(in srgb, var(--sv-accent) 10%, transparent)",
              color: "var(--sv-accent)",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 22%, transparent)",
            }}
          >
            Newsletter
          </span>
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.65rem" }}>
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
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "var(--sv-text-primary)",
            fontWeight: 700,
            fontSize: "0.9rem",
            lineHeight: 1.45,
            textDecoration: "none",
            marginBottom: "0.45rem",
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
            fontSize: "0.75rem",
            lineHeight: 1.65,
            margin: "0 0 auto 0",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {getExcerpt(post.excerpt.rendered)}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.85rem",
            paddingTop: "0.65rem",
            borderTop: "1px solid var(--sv-border)",
          }}
        >
          <span style={{ fontSize: "0.65rem", color: "var(--sv-text-muted)" }}>
            <i className="pi pi-user mr-1" style={{ fontSize: "0.58rem" }} />
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
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--sv-accent)",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            Read more
            <i className="pi pi-arrow-right" style={{ fontSize: "0.58rem" }} />
          </a>
        </div>
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

// ─── ArchiveItem ──────────────────────────────────────────────────────────────

const ArchiveItem: React.FC<{
  date: Date;
  idx: number;
  active: boolean;
  onClick: (date: Date) => void;
}> = ({ date, idx, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div
      onClick={() => onClick(date)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.4rem 0.6rem",
        borderRadius: 7,
        cursor: "pointer",
        background: active
          ? "color-mix(in srgb, var(--sv-accent) 12%, transparent)"
          : hovered
          ? "var(--sv-bg-surface)"
          : "transparent",
        border: active
          ? "1px solid color-mix(in srgb, var(--sv-accent) 28%, transparent)"
          : "1px solid transparent",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <i
          className="pi pi-envelope"
          style={{
            color: active ? "var(--sv-accent)" : "var(--sv-text-muted)",
            fontSize: "0.68rem",
            transition: "color 0.15s",
          }}
        />
        <span
          style={{
            fontSize: "0.75rem",
            color: active ? "var(--sv-accent)" : "var(--sv-text-secondary)",
            fontWeight: active ? 700 : 500,
            transition: "color 0.15s",
          }}
        >
          {label}
        </span>
      </div>
      {idx === 0 && (
        <span
          style={{
            fontSize: "0.52rem",
            fontWeight: 700,
            padding: "0.14rem 0.35rem",
            borderRadius: 3,
            background: "var(--sv-success-bg, color-mix(in srgb, #22c55e 12%, transparent))",
            color: "var(--sv-success, #22c55e)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Latest
        </span>
      )}
    </div>
  );
};

// ─── PopularPostItem ──────────────────────────────────────────────────────────

const PopularPostItem: React.FC<{ post: PopularPost; rank: number }> = ({ post, rank }) => {
  const [hovered, setHovered] = useState(false);
  const title = typeof post.title === "string" ? post.title : stripHtml((post.title as any)?.rendered ?? "");

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

// ─── NewsletterPage ───────────────────────────────────────────────────────────

const NewsletterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filter from URL
  const activeYear = useMemo(() => {
    const v = searchParams.get("year");
    return v !== null ? parseInt(v, 10) : null;
  }, [searchParams]);

  const activeMonth = useMemo(() => {
    const v = searchParams.get("month");
    return v !== null ? parseInt(v, 10) : null;
  }, [searchParams]);

  // State
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pageFirst, setPageFirst] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Archive months list
  const archiveMonths = useMemo<Date[]>(() => {
    const now = new Date();
    return Array.from({ length: ARCHIVE_MONTHS }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - i),
    );
  }, []);

  // Load posts
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
    [],
  );

  // Load popular posts
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

  // Reload on filter change
  useEffect(() => {
    setPageFirst(0);
    loadPosts(0, activeYear, activeMonth);
  }, [activeYear, activeMonth, loadPosts]);

  useEffect(() => {
    loadPopularPosts();
  }, [loadPopularPosts]);

  // Pagination
  const handlePageChange = (e: PaginatorPageChangeEvent) => {
    setPageFirst(e.first);
    loadPosts(e.first, activeYear, activeMonth);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Archive filter
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

  // Active filter label
  const activeFilterLabel = useMemo(() => {
    if (activeYear === null || activeMonth === null) return null;
    return new Date(activeYear, activeMonth).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [activeYear, activeMonth]);

  // Derived
  const [featured, ...rest] = posts;
  const showFeatured = !loadingPosts && posts.length > 0 && activeFilterLabel === null;

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-4">
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.25rem" }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: "var(--sv-accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
              flexShrink: 0,
            }}
          >
            <i className="pi pi-envelope" style={{ color: "var(--sv-accent)", fontSize: "1.15rem" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0 sv-page-title">Pro Newsletter</h1>
            <p className="m-0 text-sm" style={{ color: "var(--sv-text-muted)", marginTop: "0.1rem" }}>
              In-depth market analysis, portfolio insights, and macro commentary — delivered to pro
              subscribers
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

      {/* ── Active filter banner ── */}
      {activeFilterLabel && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.6rem 1rem",
            marginBottom: "1rem",
            background: "color-mix(in srgb, var(--sv-accent) 8%, var(--sv-bg-card))",
            border: "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i
              className="pi pi-filter-fill"
              style={{ color: "var(--sv-accent)", fontSize: "0.8rem" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--sv-text-primary)", fontWeight: 600 }}>
              Showing issues from{" "}
              <span style={{ color: "var(--sv-accent)" }}>{activeFilterLabel}</span>
            </span>
          </div>
          <button
            onClick={handleClearFilter}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              color: "var(--sv-text-muted)",
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "0.2rem 0.5rem",
              borderRadius: 5,
            }}
          >
            <i className="pi pi-times" style={{ fontSize: "0.65rem" }} />
            Clear
          </button>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid">
        {/* ── Main content ── */}
        <div className="col-12 lg:col-8 p-1">
          {/* Status bar */}
          {!loadingPosts && posts.length > 0 && (
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
              <span style={{ fontSize: "0.73rem", color: "var(--sv-text-muted)" }}>
                <i
                  className="pi pi-file-edit mr-2"
                  style={{ fontSize: "0.68rem", color: "var(--sv-accent)" }}
                />
                <strong style={{ color: "var(--sv-text-primary)" }}>{totalPosts}</strong> issues
                found
                {activeFilterLabel && (
                  <>
                    {" "}
                    for{" "}
                    <strong style={{ color: "var(--sv-accent)" }}>{activeFilterLabel}</strong>
                  </>
                )}
              </span>
              <span
                style={{
                  fontSize: "0.58rem",
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
                Pro Newsletter
              </span>
            </div>
          )}

          {/* Loading state */}
          {loadingPosts && (
            <>
              <FeaturedSkeleton />
              <div className="grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="col-12 md:col-6 p-2">
                    <CardSkeleton />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!loadingPosts && posts.length === 0 && (
            <div
              style={{
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
                borderRadius: 14,
                padding: "4rem 1rem",
                textAlign: "center",
                boxShadow: "var(--sv-shadow-sm)",
              }}
            >
              <i
                className="pi pi-envelope"
                style={{
                  fontSize: "3rem",
                  color: "var(--sv-accent)",
                  opacity: 0.25,
                  display: "block",
                  marginBottom: "0.875rem",
                }}
              />
              <p
                style={{
                  margin: "0 0 0.25rem",
                  color: "var(--sv-text-primary)",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                No newsletters found
              </p>
              <p style={{ margin: "0 0 1rem", color: "var(--sv-text-muted)", fontSize: "0.8rem" }}>
                {activeFilterLabel
                  ? `No issues published in ${activeFilterLabel}.`
                  : "No newsletter issues available at this time."}
              </p>
              {activeFilterLabel && (
                <button
                  onClick={handleClearFilter}
                  style={{
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
                  <i className="pi pi-times mr-2" style={{ fontSize: "0.68rem" }} />
                  Clear filter
                </button>
              )}
            </div>
          )}

          {/* Posts */}
          {!loadingPosts && posts.length > 0 && (
            <>
              {/* Featured first post (when no filter active) */}
              {showFeatured && <FeaturedCard post={featured} />}

              {/* Remaining grid */}
              <div className="grid">
                {(showFeatured ? rest : posts).map((post) => (
                  <div key={post.id} className="col-12 md:col-6 p-2">
                    <PostCard post={post} />
                  </div>
                ))}
              </div>

              {/* Paginator */}
              {totalPosts > PAGE_SIZE && (
                <div
                  style={{
                    marginTop: "1.25rem",
                    display: "flex",
                    justifyContent: "center",
                    background: "var(--sv-bg-card)",
                    border: "1px solid var(--sv-border)",
                    borderRadius: 10,
                    padding: "0.5rem",
                    boxShadow: "var(--sv-shadow-sm)",
                  }}
                >
                  <Paginator
                    first={pageFirst}
                    rows={PAGE_SIZE}
                    totalRecords={totalPosts}
                    onPageChange={handlePageChange}
                    template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="col-12 lg:col-4 p-1">
          {/* Newsletter info */}
          <SidebarCard title="About Pro Newsletter" icon="pi-envelope">
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
                <i
                  className="pi pi-send"
                  style={{ color: "var(--sv-accent)", fontSize: "1.3rem" }}
                />
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "var(--sv-text-primary)",
                  marginBottom: "0.3rem",
                }}
              >
                SimpleVisor Pro Newsletter
              </div>
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "var(--sv-text-muted)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Weekly in-depth market analysis, portfolio positioning, economic commentary, and
                actionable insights tailored for retail investors.
              </p>
            </div>
            {/* Topics */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {[
                "Market Outlook",
                "Portfolio Strategy",
                "Economic Data",
                "Risk Management",
                "Technical Analysis",
                "Macro Trends",
              ].map((tag) => (
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
          </SidebarCard>

          {/* Popular posts */}
          <SidebarCard title="Popular Posts" icon="pi-star">
            {loadingPopular ? (
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
            ) : popularPosts.length === 0 ? (
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
                {popularPosts.map((post, i) => (
                  <PopularPostItem key={post.id} post={post} rank={i + 1} />
                ))}
              </div>
            )}
          </SidebarCard>

          {/* Newsletter Archives */}
          <SidebarCard title="Newsletter Archives" icon="pi-calendar">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
              {archiveMonths.map((date, i) => (
                <ArchiveItem
                  key={i}
                  date={date}
                  idx={i}
                  active={
                    activeYear === date.getFullYear() && activeMonth === date.getMonth()
                  }
                  onClick={handleArchiveClick}
                />
              ))}
            </div>
          </SidebarCard>
        </div>
      </div>
    </>
  );
};

export default NewsletterPage;
