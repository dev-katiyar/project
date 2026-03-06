import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "primereact/skeleton";
import axios from "axios";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYLIST_ID = "PLVT8LcWPeAuhi47sn298HrsWYwmg8MV7d"; // RiaPro
const PAGE_SIZE = 6;
const ARCHIVE_MONTHS = 5;
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
      <Skeleton width="100%" height="13px" borderRadius="4px" className="mb-1" />
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

  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
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
        style={{ position: "relative", display: "block", overflow: "hidden", flexShrink: 0 }}
      >
        {/* Aspect ratio wrapper */}
        <div style={{ paddingBottom: "56.25%", position: "relative", background: "var(--sv-bg-surface)" }}>
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
              <i className="pi pi-youtube" style={{ fontSize: "2.5rem", color: "var(--sv-text-muted)", opacity: 0.3 }} />
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
              background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
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
              background: "color-mix(in srgb, var(--sv-accent) 12%, transparent)",
              color: "var(--sv-accent)",
              border: "1px solid color-mix(in srgb, var(--sv-accent) 22%, transparent)",
            }}
          >
            {snippet.videoOwnerChannelTitle || snippet.channelTitle}
          </span>
          <span style={{ color: "var(--sv-text-muted)", fontSize: "0.67rem" }}>
            <i className="pi pi-calendar mr-1" style={{ fontSize: "0.6rem" }} />
            {formatDate(snippet.publishedAt)}
          </span>
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
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sv-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sv-text-primary)")}
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
    <div style={{ padding: "0.875rem" }}>{children}</div>
  </div>
);

// ─── ChannelCard ──────────────────────────────────────────────────────────────

const ChannelCard: React.FC = () => (
  <SidebarCard title="About This Channel" icon="pi-youtube">
    <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--sv-accent-bg)",
          border: "2px solid color-mix(in srgb, var(--sv-accent) 35%, transparent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "0.5rem",
        }}
      >
        <i className="pi pi-video" style={{ color: "var(--sv-accent)", fontSize: "1.4rem" }} />
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.85rem",
          color: "var(--sv-text-primary)",
          marginBottom: "0.2rem",
        }}
      >
        Real Investment Advice
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--sv-text-muted)", lineHeight: 1.55 }}>
        Expert market analysis, portfolio strategies, and weekly video commentary from the SimpleVisor pro team.
      </div>
    </div>
    <a
      href="https://www.youtube.com/channel/UCTpR8UvrqZpbNAjnLXtNjkA"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        width: "100%",
        padding: "0.55rem 0",
        borderRadius: 8,
        background: "var(--sv-accent)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "0.75rem",
        textDecoration: "none",
        letterSpacing: "0.03em",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <i className="pi pi-youtube" style={{ fontSize: "0.8rem" }} />
      Subscribe on YouTube
    </a>
  </SidebarCard>
);

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
        <i className="pi pi-folder-open" style={{ color: "var(--sv-accent)", fontSize: "0.72rem" }} />
        <span style={{ fontSize: "0.77rem", color: "var(--sv-text-secondary)", fontWeight: 500 }}>
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

// ─── PaginationBar ────────────────────────────────────────────────────────────

const PaginationBar: React.FC<{
  prevToken?: string;
  nextToken?: string;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageNum: number;
}> = ({ prevToken, nextToken, loading, onPrev, onNext, pageNum }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.75rem",
      marginTop: "1.25rem",
      padding: "0.6rem 1rem",
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 10,
      boxShadow: "var(--sv-shadow-sm)",
    }}
  >
    <button
      onClick={onPrev}
      disabled={!prevToken || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.45rem 0.9rem",
        borderRadius: 7,
        border: "1px solid var(--sv-border)",
        background: !prevToken || loading ? "var(--sv-bg-surface)" : "var(--sv-bg-card)",
        color: !prevToken || loading ? "var(--sv-text-muted)" : "var(--sv-text-primary)",
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: !prevToken || loading ? "not-allowed" : "pointer",
        transition: "background 0.15s, border-color 0.15s",
        opacity: !prevToken || loading ? 0.5 : 1,
      }}
    >
      <i className="pi pi-angle-left" style={{ fontSize: "0.8rem" }} />
      Prev
    </button>

    <span
      style={{
        fontSize: "0.72rem",
        color: "var(--sv-text-muted)",
        fontWeight: 500,
        padding: "0.3rem 0.6rem",
        background: "var(--sv-accent-bg)",
        borderRadius: 6,
        border: "1px solid color-mix(in srgb, var(--sv-accent) 20%, transparent)",
        color: "var(--sv-accent)",
        fontWeight: 700,
        letterSpacing: "0.03em",
      }}
    >
      Page {pageNum}
    </span>

    <button
      onClick={onNext}
      disabled={!nextToken || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.45rem 0.9rem",
        borderRadius: 7,
        border: "1px solid var(--sv-border)",
        background: !nextToken || loading ? "var(--sv-bg-surface)" : "var(--sv-bg-card)",
        color: !nextToken || loading ? "var(--sv-text-muted)" : "var(--sv-text-primary)",
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: !nextToken || loading ? "not-allowed" : "pointer",
        transition: "background 0.15s, border-color 0.15s",
        opacity: !nextToken || loading ? 0.5 : 1,
      }}
    >
      Next
      <i className="pi pi-angle-right" style={{ fontSize: "0.8rem" }} />
    </button>
  </div>
);

// ─── CommentaryVideosPage ─────────────────────────────────────────────────────

const CommentaryVideosPage: React.FC = () => {
  const [videos, setVideos] = useState<YtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>();
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>();
  const [pageNum, setPageNum] = useState(1);

  const archiveMonths = useMemo<Date[]>(() => {
    const now = new Date();
    return Array.from({ length: ARCHIVE_MONTHS }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - i),
    );
  }, []);

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

  const handleNext = () => {
    setCurrentPageToken(nextPageToken);
    setPageNum((p) => p + 1);
    fetchVideos(nextPageToken);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setCurrentPageToken(prevPageToken);
    setPageNum((p) => Math.max(1, p - 1));
    fetchVideos(prevPageToken);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
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
            <i className="pi pi-youtube" style={{ color: "var(--sv-accent)", fontSize: "1.1rem" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0 sv-page-title">Video Commentary</h1>
            <p className="m-0 text-sm" style={{ color: "var(--sv-text-muted)", marginTop: "0.1rem" }}>
              Market analysis &amp; investment insights — weekly video commentary from Real Investment Advice
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
        {/* ── Main video grid ── */}
        <div className="col-12 lg:col-8 p-1">

          {/* Status bar */}
          {!loading && !error && videos.length > 0 && (
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
                <i className="pi pi-video mr-2" style={{ fontSize: "0.68rem", color: "var(--sv-accent)" }} />
                Showing{" "}
                <strong style={{ color: "var(--sv-text-primary)" }}>{videos.length}</strong> videos
                {pageNum > 1 && (
                  <> — page <strong style={{ color: "var(--sv-text-primary)" }}>{pageNum}</strong></>
                )}
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
                RIA Pro
              </span>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="grid">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="col-12 md:col-6 p-2">
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
              <p style={{ margin: "0 0 0.5rem", color: "var(--sv-text-primary)", fontWeight: 600 }}>
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
                <i className="pi pi-refresh mr-2" style={{ fontSize: "0.7rem" }} />
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
              <p style={{ margin: 0, color: "var(--sv-text-muted)", fontSize: "0.9rem" }}>
                No videos found at this time.
              </p>
            </div>
          )}

          {/* Video grid */}
          {!loading && !error && videos.length > 0 && (
            <>
              <div className="grid">
                {videos.map((item) => (
                  <div key={item.id} className="col-12 md:col-6 p-2">
                    <VideoCard item={item} />
                  </div>
                ))}
              </div>

              <PaginationBar
                prevToken={prevPageToken}
                nextToken={nextPageToken}
                loading={loading}
                onPrev={handlePrev}
                onNext={handleNext}
                pageNum={pageNum}
              />
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="col-12 lg:col-4 p-1">
          {/* Channel info */}
          <ChannelCard />

          {/* Tips card */}
          <SidebarCard title="Investment Topics" icon="pi-tag">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {[
                "Market Analysis",
                "Portfolio Strategy",
                "Risk Management",
                "Technical Analysis",
                "Economic Outlook",
                "Sector Rotation",
                "Asset Allocation",
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    padding: "0.22rem 0.55rem",
                    borderRadius: 4,
                    background: "var(--sv-bg-surface)",
                    color: "var(--sv-text-muted)",
                    border: "1px solid var(--sv-border)",
                    letterSpacing: "0.03em",
                    cursor: "default",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
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
          <SidebarCard title="About Video Commentary" icon="pi-info-circle">
            <p
              style={{
                fontSize: "0.77rem",
                color: "var(--sv-text-secondary)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Weekly video commentary from the Real Investment Advice team covering macro trends,
              market internals, and portfolio positioning — designed to help retail investors make
              better-informed decisions.
            </p>
          </SidebarCard>
        </div>
      </div>
    </>
  );
};

export default CommentaryVideosPage;
