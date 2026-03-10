import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";
import PostCard, { CardSkeleton, type WpPost } from "@/components/common/PostCard";
import AboutSidebarCard from "@/components/common/AboutSidebarCard";
import PopularPostsSidebarCard, { type PopularPost } from "@/components/common/PopularPostsSidebarCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ID = 902; // WpPostCategories.ProCommentary
const PAGE_SIZE = 6;
const POPULAR_LIMIT = 6;

// ─── RealTimeCommentaryPage ───────────────────────────────────────────────────

const RealTimeCommentaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeYear = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : null;
  const activeMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;

  const [posts, setPosts] = useState<WpPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pageFirst, setPageFirst] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

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

  const handleClearFilter = () => setSearchParams({});

  const activeFilterLabel = useMemo(() => {
    if (activeYear === null || activeMonth === null) return null;
    return new Date(activeYear, activeMonth).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [activeYear, activeMonth]);

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
            <i className="pi pi-bolt" style={{ color: "var(--sv-accent)", fontSize: "1.15rem" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0 sv-page-title">Real-Time Commentary</h1>
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
        {/* ── Main content ── */}
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
                No articles found{activeFilterLabel ? ` for ${activeFilterLabel}` : ""}
              </p>
              {activeFilterLabel ? (
                <button
                  onClick={handleClearFilter}
                  style={{
                    marginTop: "0.75rem",
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
              ) : (
                <p style={{ margin: 0, color: "var(--sv-text-muted)", fontSize: "0.8rem" }}>
                  No commentary available at this time.
                </p>
              )}
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
                      placeholderIcon="pi-bolt"
                      overlayLabel="Pro Commentary"
                      overlayPosition="bottom"
                      metaTag="Commentary"
                      showFreshBadge
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
          {/* Popular posts */}
          <PopularPostsSidebarCard loading={loadingPopular} posts={popularPosts} />

          {/* About Pro Commentary */}
          <AboutSidebarCard
            cardTitle="About Pro Commentary"
            cardIcon="pi-bolt"
            badgeIcon="pi-bolt"
            name="SimpleVisor Pro Commentary"
            description="Real-time market analysis delivered by our professional team throughout the trading day. Actionable insights on macro trends, sector moves, and market-moving events as they happen."
            tags={["Market Commentary", "Real-Time Alerts", "Technical Analysis", "Macro Trends", "Sector Rotation", "Risk Management"]}
          />

        </div>
      </div>
    </>
  );
};

export default RealTimeCommentaryPage;
