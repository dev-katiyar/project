import React, { useState, useEffect, useCallback } from "react";
import { Skeleton } from "primereact/skeleton";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import api from "@/services/api";
import PostCard, { CardSkeleton, getIssueLabel, stripHtml, type WpPost } from "@/components/common/PostCard";
import AboutSidebarCard from "@/components/common/AboutSidebarCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ID = 256; // WpPostCategories.Investing
const PAGE_SIZE = 6;
const POPULAR_LIMIT = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getImageUrl(post: WpPost): string | undefined {
  const og = post.yoast_head_json?.og_image;
  return og && og.length > 0 ? og[0].url : undefined;
}

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.6rem",
          fontWeight: 800,
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
      </div>
    </a>
  );
};

// ─── RecentRIAPage ────────────────────────────────────────────────────────────

const RecentRIAPage: React.FC = () => {
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pageFirst, setPageFirst] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popularPosts, setPopularPosts] = useState<WpPost[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

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
    loadPosts(0);
  }, [loadPosts]);

  useEffect(() => {
    loadPopularPosts();
  }, [loadPopularPosts]);

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
            <i className="pi pi-globe" style={{ color: "var(--sv-accent)", fontSize: "1.15rem" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0 sv-page-title">Recent RIA</h1>
            <p className="m-0 text-sm" style={{ color: "var(--sv-text-muted)", marginTop: "0.1rem" }}>
              Real Investment Advice — expert investing commentary &amp; portfolio insights
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

      {/* ── Two-column layout ── */}
      <div className="grid">
        {/* ── Main posts column ── */}
        <div className="col-12 lg:col-8 p-1">
          {/* Loading state */}
          {loadingPosts && (
            <div className="grid">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="col-12 md:col-4 p-2">
                  <CardSkeleton />
                </div>
              ))}
            </div>
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
                className="pi pi-inbox"
                style={{
                  fontSize: "3rem",
                  color: "var(--sv-text-muted)",
                  opacity: 0.4,
                  display: "block",
                  marginBottom: "0.875rem",
                }}
              />
              <p
                style={{
                  margin: 0,
                  color: "var(--sv-text-primary)",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                No articles found.
              </p>
            </div>
          )}

          {/* Posts grid */}
          {!loadingPosts && posts.length > 0 && (
            <>
              <div className="grid">
                {posts.map((post) => (
                  <div key={post.id} className="col-12 md:col-4 p-2">
                    <PostCard
                      post={post}
                      placeholderIcon="pi-chart-bar"
                      overlayLabel={getIssueLabel(post.date)}
                      overlayPosition="bottom"
                      metaTag="RIA · Investing"
                      excerptMaxLen={180}
                    />
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
          {/* Popular Posts */}
          <SidebarCard title="Popular Posts" icon="pi-fire">
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

          {/* About */}
          <AboutSidebarCard
            cardTitle="About Recent RIA"
            cardIcon="pi-info-circle"
            badgeIcon="pi-chart-line"
            name="Real Investment Advice"
            description="In-depth analysis on markets, investing strategies, and portfolio management. Written by professional portfolio managers and analysts to help retail investors navigate complex market environments."
            tags={["Portfolio Management", "Market Analysis", "Investing Strategy", "Risk Management", "Asset Allocation"]}
          />
        </div>
      </div>
    </>
  );
};

export default RecentRIAPage;
