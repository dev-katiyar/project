import React, { useState, useEffect, useCallback } from "react";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import api from "@/services/api";
import PostCard, { CardSkeleton, getIssueLabel, type WpPost } from "@/components/common/PostCard";
import AboutSidebarCard from "@/components/common/AboutSidebarCard";
import PopularPostsSidebarCard, { type PopularPost } from "@/components/common/PopularPostsSidebarCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ID = 12340; // WpPostCategories.ProNewsletter
const PAGE_SIZE = 6;
const POPULAR_LIMIT = 6;

// ─── NewsletterPage ───────────────────────────────────────────────────────────

const NewsletterPage: React.FC = () => {
  // State
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pageFirst, setPageFirst] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Load posts
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

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  useEffect(() => {
    loadPopularPosts();
  }, [loadPopularPosts]);

  // Pagination
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
              <p style={{ margin: 0, color: "var(--sv-text-muted)", fontSize: "0.8rem" }}>
                No newsletter issues available at this time.
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
                      placeholderIcon="pi-envelope"
                      overlayLabel={getIssueLabel(post.date)}
                      overlayPosition="bottom"
                      metaTag="Newsletter"
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

          {/* Newsletter info */}
          <AboutSidebarCard
            cardTitle="About Pro Newsletter"
            cardIcon="pi-envelope"
            badgeIcon="pi-send"
            name="SimpleVisor Pro Newsletter"
            description="Weekly in-depth market analysis, portfolio positioning, economic commentary, and actionable insights tailored for retail investors."
            tags={["Market Outlook", "Portfolio Strategy", "Economic Data", "Risk Management", "Technical Analysis", "Macro Trends"]}
          />
        </div>
      </div>
    </>
  );
};

export default NewsletterPage;
