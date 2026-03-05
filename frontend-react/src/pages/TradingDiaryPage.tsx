import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "primereact/skeleton";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import api from "@/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ID = 12338; // WpPostCategories.ProTrading
const PAGE_SIZE = 6;
const POPULAR_LIMIT = 6;
const ARCHIVE_MONTHS = 5;

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

function getExcerpt(html: string, maxLen = 160): string {
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

// ─── PostCard ─────────────────────────────────────────────────────────────────

const PostCard: React.FC<{ post: WpPost }> = ({ post }) => {
  const author = getAuthor(post);
  const imageUrl = getImageUrl(post);
  const excerpt = getExcerpt(post.excerpt.rendered);
  const title = stripHtml(post.title.rendered);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: "0.875rem",
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
          width: 180,
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
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          /* Fallback when no image */
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 150,
            }}
          >
            <i
              className="pi pi-chart-line"
              style={{ fontSize: "2rem", color: "var(--sv-text-muted)", opacity: 0.4 }}
            />
          </div>
        )}
        {/* Accent bar overlay */}
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
          padding: "0.875rem 1rem",
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
            gap: "0.5rem",
            marginBottom: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.2rem 0.55rem",
              borderRadius: 4,
              background: "var(--sv-accent-bg)",
              color: "var(--sv-accent)",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
            }}
          >
            Pro Trading
          </span>
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.68rem" }}>
            <i className="pi pi-calendar mr-1" style={{ fontSize: "0.6rem" }} />
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
            fontSize: "0.975rem",
            lineHeight: 1.4,
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
            fontSize: "0.78rem",
            lineHeight: 1.65,
            margin: 0,
            flexGrow: 1,
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
            marginTop: "0.75rem",
            paddingTop: "0.625rem",
            borderTop: "1px solid var(--sv-border)",
          }}
        >
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--sv-accent-bg)",
                border: "1px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sv-accent)",
                fontSize: "0.5rem",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {getInitials(author)}
            </div>
            <span
              style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", fontWeight: 500 }}
            >
              {author}
            </span>
          </div>

          {/* Read more */}
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--sv-accent)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
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

// ─── PostCardSkeleton ─────────────────────────────────────────────────────────

const PostCardSkeleton: React.FC = () => (
  <div
    style={{
      display: "flex",
      gap: 0,
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: "0.875rem",
    }}
  >
    <Skeleton width="180px" height="150px" borderRadius="0" />
    <div style={{ flex: 1, padding: "0.875rem 1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Skeleton width="72px" height="18px" borderRadius="4px" />
        <Skeleton width="90px" height="18px" borderRadius="4px" />
      </div>
      <Skeleton width="95%" height="20px" borderRadius="4px" className="mb-1" />
      <Skeleton width="70%" height="20px" borderRadius="4px" className="mb-3" />
      <Skeleton width="100%" height="13px" borderRadius="4px" className="mb-1" />
      <Skeleton width="90%" height="13px" borderRadius="4px" className="mb-1" />
      <Skeleton width="75%" height="13px" borderRadius="4px" />
    </div>
  </div>
);

// ─── SidebarCard ──────────────────────────────────────────────────────────────

const SidebarCard: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
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
          fontSize: "0.8rem",
          color: "var(--sv-text-primary)",
          letterSpacing: "0.03em",
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
        gap: "0.625rem",
        alignItems: "flex-start",
        padding: "0.5rem 0.375rem",
        borderRadius: 8,
        textDecoration: "none",
        marginBottom: "0.125rem",
        background: hovered ? "var(--sv-bg-surface)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rank badge */}
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

      {/* Thumbnail */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          style={{
            width: 46,
            height: 38,
            objectFit: "cover",
            borderRadius: 6,
            flexShrink: 0,
          }}
        />
      )}

      {/* Title */}
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

const ArchiveMonthItem: React.FC<{ date: Date; idx: number }> = ({ date, idx }) => {
  const [hovered, setHovered] = useState(false);
  const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.4rem 0.5rem",
        borderRadius: 6,
        cursor: "pointer",
        background: hovered ? "var(--sv-bg-surface)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <i
          className="pi pi-folder-open"
          style={{ color: "var(--sv-accent)", fontSize: "0.72rem" }}
        />
        <span
          style={{ fontSize: "0.77rem", color: "var(--sv-text-secondary)", fontWeight: 500 }}
        >
          {label}
        </span>
      </div>
      {idx === 0 && (
        <span
          style={{
            fontSize: "0.55rem",
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
    </div>
  );
};

// ─── TradingDiaryPage ─────────────────────────────────────────────────────────

const TradingDiaryPage: React.FC = () => {
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pageFirst, setPageFirst] = useState(0); // PrimeReact Paginator "first" index
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popularPosts, setPopularPosts] = useState<WpPost[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  /* Last 5 calendar months for archive */
  const archiveMonths = useMemo<Date[]>(() => {
    const now = new Date();
    return Array.from({ length: ARCHIVE_MONTHS }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - i),
    );
  }, []);

  const loadPosts = useCallback(async (offset: number) => {
    setLoadingPosts(true);
    try {
      const { data, headers } = await api.get("/wp-json/wp/v2/posts", {
        params: { categories: CATEGORY_ID, per_page: PAGE_SIZE, offset },
      });
      setPosts(Array.isArray(data) ? data : []);
      const total = parseInt(headers["x-wp-total"] ?? "0", 10);
      setTotalPosts(isNaN(total) ? 0 : total);
    } catch {
      setPosts([]);
      setTotalPosts(0);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const loadPopularPosts = useCallback(async () => {
    setLoadingPopular(true);
    try {
      const { data } = await api.get(
        "/wp-json/wordpress-popular-posts/v1/popular-posts",
        { params: { limit: POPULAR_LIMIT, offset: 0 } },
      );
      setPopularPosts(Array.isArray(data) ? data : []);
    } catch {
      setPopularPosts([]);
    } finally {
      setLoadingPopular(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(0);
    loadPopularPosts();
  }, [loadPosts, loadPopularPosts]);

  const handlePageChange = (e: PaginatorPageChangeEvent) => {
    setPageFirst(e.first);
    loadPosts(e.first);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-4">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--sv-accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
              flexShrink: 0,
            }}
          >
            <i className="pi pi-book" style={{ color: "var(--sv-accent)", fontSize: "1.05rem" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0 sv-page-title">Trading Diary</h1>
            <p className="m-0 text-sm" style={{ color: "var(--sv-text-muted)", marginTop: "0.1rem" }}>
              Pro trading commentary &amp; market insights from the SimpleVisor team
            </p>
          </div>
        </div>

        {/* Decorative accent strip */}
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

      {/* ── Two-column layout ── */}
      <div className="grid">
        {/* ── Main posts column ── */}
        <div className="col-12 lg:col-8 p-1">

          {/* Post count indicator */}
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
                <i className="pi pi-list mr-2" style={{ fontSize: "0.7rem", color: "var(--sv-accent)" }} />
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
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  borderRadius: 4,
                  background: "var(--sv-accent-bg)",
                  color: "var(--sv-accent)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Pro Trading
              </span>
            </div>
          )}

          {/* Posts list / skeletons / empty state */}
          {loadingPosts ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => <PostCardSkeleton key={i} />)
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
              <p style={{ margin: 0, color: "var(--sv-text-muted)", fontSize: "0.9rem" }}>
                No posts found at this time.
              </p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {/* Paginator */}
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

          {/* Popular Posts */}
          <SidebarCard title="Popular Posts" icon="pi-fire">
            {loadingPopular ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    padding: "0.5rem 0.375rem",
                  }}
                >
                  <Skeleton width="20px" height="20px" borderRadius="50%" />
                  <Skeleton width="46px" height="38px" borderRadius="6px" />
                  <div style={{ flex: 1 }}>
                    <Skeleton
                      width="100%"
                      height="12px"
                      borderRadius="4px"
                      style={{ marginBottom: "0.3rem" }}
                    />
                    <Skeleton width="75%" height="12px" borderRadius="4px" />
                  </div>
                </div>
              ))
            ) : popularPosts.length === 0 ? (
              <p
                style={{ color: "var(--sv-text-muted)", fontSize: "0.78rem", margin: 0 }}
              >
                No popular posts available.
              </p>
            ) : (
              popularPosts.map((post, i) => (
                <PopularPostItem key={post.id} post={post} rank={i + 1} />
              ))
            )}
          </SidebarCard>

          {/* Newsletter Archives */}
          <SidebarCard title="Newsletter Archives" icon="pi-calendar">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
              {archiveMonths.map((date, i) => (
                <ArchiveMonthItem key={i} date={date} idx={i} />
              ))}
            </div>
          </SidebarCard>

          {/* About */}
          <SidebarCard title="About Trading Diary" icon="pi-info-circle">
            <p
              style={{
                fontSize: "0.77rem",
                color: "var(--sv-text-secondary)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              The Trading Diary features professional commentary and trade analysis from
              the SimpleVisor pro team. Stay up to date with expert market observations
              and actionable insights tailored for serious investors.
            </p>
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {["Technical Analysis", "Market Commentary", "Trade Ideas"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.58rem",
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
        </div>
      </div>
    </>
  );
};

export default TradingDiaryPage;
