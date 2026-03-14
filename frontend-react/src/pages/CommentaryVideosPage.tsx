import React, { useState, useEffect, useCallback } from "react";
import { Skeleton } from "primereact/skeleton";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import axios from "axios";
import AboutSidebarCard from "@/components/common/AboutSidebarCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYLIST_ID = "PLVT8LcWPeAuhi47sn298HrsWYwmg8MV7d"; // RiaPro
const PAGE_SIZE = 6;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3/playlistItems";
const GAPI_KEY = import.meta.env.VITE_GAPI_KEY as string;

// ─── Types ────────────────────────────────────────────────────────────────────

interface YtThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YtSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default?: YtThumbnail;
    medium?: YtThumbnail;
    high?: YtThumbnail;
    standard?: YtThumbnail;
    maxres?: YtThumbnail;
  };
  channelTitle: string;
  playlistId: string;
  position: number;
  resourceId: { kind: string; videoId: string };
  videoOwnerChannelId: string;
  videoOwnerChannelTitle: string;
}

interface YtItem {
  id: string;
  snippet: YtSnippet;
}

interface YtPageInfo {
  totalResults: number;
  resultsPerPage: number;
}

interface YtResponse {
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: YtPageInfo;
  items: YtItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getBestThumbnail(thumbnails: YtSnippet["thumbnails"]): string {
  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ""
  );
}

function getYtUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

const FRESH_HOURS = 48;

function isRecent(dateStr: string): boolean {
  return (
    Date.now() - new Date(dateStr).getTime() < FRESH_HOURS * 60 * 60 * 1000
  );
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return `${Math.floor(diffMs / (1000 * 60))}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// ─── VideoCardSkeleton ────────────────────────────────────────────────────────

const VideoCardSkeleton: React.FC = () => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 14,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    }}
  >
    <Skeleton width="100%" height="180px" borderRadius="0" />
    <div style={{ padding: "0.875rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
        <Skeleton width="55px" height="18px" borderRadius="4px" />
        <Skeleton width="90px" height="18px" borderRadius="4px" />
      </div>
      <Skeleton width="95%" height="18px" borderRadius="4px" className="mb-1" />
      <Skeleton width="75%" height="18px" borderRadius="4px" className="mb-3" />
      <Skeleton
        width="100%"
        height="13px"
        borderRadius="4px"
        className="mb-1"
      />
      <Skeleton width="85%" height="13px" borderRadius="4px" />
    </div>
  </div>
);

// ─── VideoCard ────────────────────────────────────────────────────────────────

const VideoCard: React.FC<{ item: YtItem }> = ({ item }) => {
  const { snippet } = item;
  const videoId = snippet.resourceId.videoId;
  const url = getYtUrl(videoId);
  const thumb = getBestThumbnail(snippet.thumbnails);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const recent = isRecent(snippet.publishedAt);

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
        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.2s",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail with play overlay */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "relative",
          display: "block",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Aspect ratio wrapper */}
        <div
          style={{
            paddingBottom: "56.25%",
            position: "relative",
            background: "var(--sv-bg-surface)",
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
                className="pi pi-youtube"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--sv-text-muted)",
                  opacity: 0.3,
                }}
              />
            </div>
          )}
          {thumb && (
            <img
              src={thumb}
              alt={snippet.title}
              onLoad={() => setImgLoaded(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.3s, transform 0.3s",
                transform: hovered ? "scale(1.04)" : "scale(1)",
              }}
            />
          )}
          {/* Dark gradient overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
              opacity: hovered ? 1 : 0.6,
              transition: "opacity 0.2s",
            }}
          />
          {/* Play button */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: hovered
                  ? "var(--sv-accent)"
                  : "rgba(255,255,255,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                transition: "background 0.2s, transform 0.2s",
                transform: hovered ? "scale(1.12)" : "scale(1)",
              }}
            >
              <i
                className="pi pi-play"
                style={{
                  color: hovered ? "#fff" : "var(--sv-accent)",
                  fontSize: "1rem",
                  marginLeft: 3, // optical centering
                  transition: "color 0.2s",
                }}
              />
            </div>
          </div>
          {/* Duration / VIDEO badge bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "var(--sv-accent)",
              color: "#fff",
              fontSize: "0.52rem",
              fontWeight: 800,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              padding: "0.18rem 0.45rem",
              borderRadius: 4,
            }}
          >
            Video
          </div>
        </div>
      </a>

      {/* Card content */}
      <div
        style={{
          padding: "0.875rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.45rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              padding: "0.18rem 0.5rem",
              borderRadius: 4,
              background:
                "color-mix(in srgb, var(--sv-accent) 12%, transparent)",
              color: "var(--sv-accent)",
              border:
                "1px solid color-mix(in srgb, var(--sv-accent) 22%, transparent)",
            }}
          >
            {snippet.videoOwnerChannelTitle || snippet.channelTitle}
          </span>
          {recent && (
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.14rem 0.4rem",
                borderRadius: 3,
                background:
                  "color-mix(in srgb, var(--sv-success, #22c55e) 12%, transparent)",
                color: "var(--sv-success, #22c55e)",
                border:
                  "1px solid color-mix(in srgb, var(--sv-success, #22c55e) 25%, transparent)",
              }}
            >
              New
            </span>
          )}
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.67rem" }}>
            <i className="pi pi-calendar mr-1" style={{ fontSize: "0.6rem" }} />
            {formatDate(snippet.publishedAt)}
          </span>
          {recent && (
            <span
              style={{ color: "var(--sv-text-muted)", fontSize: "0.62rem" }}
            >
              · {timeAgo(snippet.publishedAt)}
            </span>
          )}
        </div>

        {/* Title */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--sv-text-primary)",
            fontWeight: 700,
            fontSize: "0.92rem",
            lineHeight: 1.42,
            textDecoration: "none",
            marginBottom: "0.4rem",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--sv-accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--sv-text-primary)")
          }
        >
          {snippet.title}
        </a>

        {/* Description */}
        {snippet.description && (
          <p
            style={{
              color: "var(--sv-text-secondary)",
              fontSize: "0.75rem",
              lineHeight: 1.62,
              margin: "0 0 auto 0",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {truncate(snippet.description, 140)}
          </p>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: "0.75rem",
            paddingTop: "0.6rem",
            borderTop: "1px solid var(--sv-border)",
          }}
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--sv-accent)",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            Watch on YouTube
            <i className="pi pi-external-link" style={{ fontSize: "0.6rem" }} />
          </a>
        </div>
      </div>
    </div>
  );
};

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
        padding: "0.7rem 1rem",
        borderBottom: "1px solid var(--sv-border)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background:
          "color-mix(in srgb, var(--sv-accent) 6%, var(--sv-bg-card))",
      }}
    >
      <i
        className={`pi ${icon}`}
        style={{ color: "var(--sv-accent)", fontSize: "0.875rem" }}
      />
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

// ─── ChannelCard ──────────────────────────────────────────────────────────────

const CHANNELS = [
  {
    name: "Before The Bell",
    description:
      "Pre-market analysis and daily briefings to start your trading day informed.",
    url: "https://www.youtube.com/@BeforeTheBell.",
  },
  {
    name: "The Real Investment Show",
    description:
      "In-depth market commentary, portfolio strategies, and economic insights.",
    url: "https://www.youtube.com/@TheRealInvestmentShow",
  },
];

const ChannelCard: React.FC = () => (
  <SidebarCard title="Our YouTube Channels" icon="pi-youtube">
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {CHANNELS.map((ch) => (
        <div
          key={ch.url}
          style={{
            borderRadius: 10,
            border: "1px solid var(--sv-border)",
            padding: "0.75rem",
            background:
              "color-mix(in srgb, var(--sv-accent) 4%, var(--sv-bg-card))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.35rem",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--sv-accent-bg)",
                border:
                  "1.5px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className="pi pi-youtube"
                style={{ color: "var(--sv-accent)", fontSize: "1rem" }}
              />
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.82rem",
                color: "var(--sv-text-primary)",
              }}
            >
              {ch.name}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--sv-text-muted)",
              lineHeight: 1.55,
              margin: "0 0 0.6rem 0",
            }}
          >
            {ch.description}
          </p>
          <a
            href={ch.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              width: "100%",
              padding: "0.45rem 0",
              borderRadius: 7,
              background: "var(--sv-accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.7rem",
              textDecoration: "none",
              letterSpacing: "0.03em",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <i className="pi pi-youtube" style={{ fontSize: "0.75rem" }} />
            Subscribe
          </a>
        </div>
      ))}
    </div>
  </SidebarCard>
);

// ─── CommentaryVideosPage ─────────────────────────────────────────────────────

const CommentaryVideosPage: React.FC = () => {
  const [videos, setVideos] = useState<YtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>();
  const [currentPageToken, setCurrentPageToken] = useState<
    string | undefined
  >();
  const [pageNum, setPageNum] = useState(1);

  const fetchVideos = useCallback(async (pageToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        part: "snippet",
        playlistId: PLAYLIST_ID,
        maxResults: String(PAGE_SIZE),
        key: GAPI_KEY,
      };
      if (pageToken) params.pageToken = pageToken;

      const { data } = await axios.get<YtResponse>(YT_API_BASE, { params });
      // Filter out items without a valid videoOwnerChannelId (deleted/private)
      const valid = (data.items ?? []).filter(
        (v) => v.snippet?.videoOwnerChannelId,
      );
      setVideos(valid);
      setNextPageToken(data.nextPageToken);
      setPrevPageToken(data.prevPageToken);
    } catch (err: unknown) {
      setError("Unable to load videos. Please try again later.");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(undefined);
  }, [fetchVideos]);

  const handlePageChange = (e: PaginatorPageChangeEvent) => {
    const newPage = e.page + 1;
    if (newPage > pageNum) {
      setCurrentPageToken(nextPageToken);
      setPageNum(newPage);
      fetchVideos(nextPageToken);
    } else {
      setCurrentPageToken(prevPageToken);
      setPageNum(newPage);
      fetchVideos(prevPageToken);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* ── Page header ── */}
      {/* <div className="mb-4">
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
              width: 42,
              height: 42,
              borderRadius: 11,
              background: "var(--sv-accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border:
                "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
              flexShrink: 0,
            }}
          >
            <i
              className="pi pi-youtube"
              style={{ color: "var(--sv-accent)", fontSize: "1.15rem" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0 sv-page-title">
              Video Commentary
            </h1>
            <p
              className="m-0 text-sm"
              style={{ color: "var(--sv-text-muted)", marginTop: "0.1rem" }}
            >
              Market analysis &amp; investment insights — weekly video
              commentary from Real Investment Advice
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
      </div> */}

      {/* ── Two-column layout ── */}
      <div className="grid">
        {/* ── Main video grid ── */}
        <div className="col-12 lg:col-8 p-1">
          {/* Loading skeletons */}
          {loading && (
            <div className="grid">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div
                  key={i}
                  className="col-12 md:col-4 p-2"
                  style={{ display: "flex" }}
                >
                  <VideoCardSkeleton />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
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
                className="pi pi-exclamation-triangle"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--sv-warning, #f59e0b)",
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              />
              <p
                style={{
                  margin: "0 0 0.5rem",
                  color: "var(--sv-text-primary)",
                  fontWeight: 600,
                }}
              >
                {error}
              </p>
              <button
                onClick={() => fetchVideos(currentPageToken)}
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
                <i
                  className="pi pi-refresh mr-2"
                  style={{ fontSize: "0.7rem" }}
                />
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && videos.length === 0 && (
            <div
              style={{
                background: "var(--sv-bg-card)",
                border: "1px solid var(--sv-border)",
                borderRadius: 12,
                padding: "4rem 1rem",
                textAlign: "center",
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
                  margin: 0,
                  color: "var(--sv-text-muted)",
                  fontSize: "0.9rem",
                }}
              >
                No videos found at this time.
              </p>
            </div>
          )}

          {/* Video grid */}
          {!loading && !error && videos.length > 0 && (
            <>
              <div className="grid">
                {videos.map((item) => (
                  <div
                    key={item.id}
                    className="col-12 md:col-4 p-2"
                    style={{ display: "flex" }}
                  >
                    <VideoCard item={item} />
                  </div>
                ))}
              </div>

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
                  first={(pageNum - 1) * PAGE_SIZE}
                  rows={PAGE_SIZE}
                  totalRecords={
                    nextPageToken
                      ? Math.max(pageNum + 4, 5) * PAGE_SIZE
                      : pageNum * PAGE_SIZE
                  }
                  onPageChange={handlePageChange}
                  template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                />
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="col-12 lg:col-4 p-1">
          <ChannelCard />
          <AboutSidebarCard
            cardTitle="Investment Topics"
            cardIcon="pi-tag"
            badgeIcon="pi-tag"
            name="Topics Covered"
            description="Expert commentary spanning a wide range of investment topics to help you navigate complex market environments."
            tags={[
              "Market Analysis",
              "Portfolio Strategy",
              "Risk Management",
              "Technical Analysis",
              "Economic Outlook",
              "Sector Rotation",
              "Asset Allocation",
            ]}
          />
        </div>
      </div>
    </>
  );
};

export default CommentaryVideosPage;
