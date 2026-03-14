import React, { useState, useEffect, useCallback } from "react";
import { Skeleton } from "primereact/skeleton";
import { Link } from "react-router-dom";
import api from "@/services/api";
import axios from "axios";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_NEWSLETTER = 12340;
const CAT_COMMENTARY = 12335;
const CAT_RECENT_RIA = 256;
const CAT_TRADE_ALERTS = 12338;
const TRADE_ALERT_LIMIT = 7;

const PLAYLIST_ID = "PLVT8LcWPeAuhi47sn298HrsWYwmg8MV7d";
const YT_API_BASE = "https://www.googleapis.com/youtube/v3/playlistItems";
const GAPI_KEY = import.meta.env.VITE_GAPI_KEY as string;
const VIDEO_LIMIT = 8;

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

interface VideoItem {
  id: string;
  title: string;
  date: string;
  thumbnail: string;
  videoId: string;
  channelTitle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

function stripTradeAlertPrefix(title: string): string {
  return title.replace(/^Portfolio Trade Alert\s*[–—-]\s*/i, "").trim();
}

async function fetchCategoryPost(
  categoryId: number,
  count = 1,
): Promise<WpPost[]> {
  const { data } = await api.get("/wp-json/wp/v2/posts", {
    params: { categories: categoryId, per_page: count, offset: 0 },
  });
  return Array.isArray(data) ? data : [];
}

async function fetchYouTubeVideos(): Promise<VideoItem[]> {
  const { data } = await axios.get(YT_API_BASE, {
    params: {
      part: "snippet",
      playlistId: PLAYLIST_ID,
      maxResults: VIDEO_LIMIT,
      key: GAPI_KEY,
    },
  });
  const items = data?.items ?? [];
  return items
    .filter((item: any) => item.snippet?.videoOwnerChannelId)
    .map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      date: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.high?.url ??
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        "",
      videoId: item.snippet.resourceId?.videoId ?? "",
      channelTitle: item.snippet.channelTitle ?? "",
    }));
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  morePath?: string;
  moreLabel?: string;
}> = ({ icon, title, morePath, moreLabel = "View all" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1rem",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--sv-accent-bg)",
          border:
            "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i
          className={`pi ${icon}`}
          style={{ color: "var(--sv-accent)", fontSize: "0.8rem" }}
        />
      </span>
      <span
        style={{
          fontWeight: 800,
          fontSize: "0.85rem",
          color: "var(--sv-text-primary)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
    {morePath && (
      <Link
        to={morePath}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--sv-accent)",
          textDecoration: "none",
          letterSpacing: "0.04em",
          padding: "0.25rem 0.65rem",
          borderRadius: 6,
          border:
            "1px solid color-mix(in srgb, var(--sv-accent) 25%, transparent)",
          background: "var(--sv-accent-bg)",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {moreLabel}
        <i className="pi pi-arrow-right" style={{ fontSize: "0.58rem" }} />
      </Link>
    )}
  </div>
);

const Divider: React.FC = () => (
  <div
    style={{
      height: 1,
      background:
        "linear-gradient(to right, var(--sv-accent), color-mix(in srgb, var(--sv-accent) 10%, transparent))",
      margin: "2rem 0",
      borderRadius: 1,
      opacity: 0.4,
    }}
  />
);

// ─── HeroArticleCard ──────────────────────────────────────────────────────────

interface HeroCardProps {
  post: WpPost;
  badge: string;
  badgeIcon: string;
}

const HeroArticleCard: React.FC<HeroCardProps> = ({
  post,
  badge,
  badgeIcon,
}) => {
  const title = stripHtml(post.title.rendered);
  const author = getAuthor(post);
  const imageUrl = getImageUrl(post);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <a
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", flexShrink: 0, position: "relative" }}
      >
        <div
          style={{
            width: "100%",
            paddingBottom: "54%",
            position: "relative",
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
                className={`pi ${badgeIcon}`}
                style={{
                  fontSize: "2.5rem",
                  color: "var(--sv-accent)",
                  opacity: 0.15,
                }}
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
                transition: "opacity 0.3s, transform 0.4s",
                transform: hovered ? "scale(1.04)" : "scale(1)",
              }}
            />
          )}
          {/* Bottom gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
            }}
          />
          {/* Badge overlaid on image */}
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <span
              style={{
                background: "var(--sv-accent)",
                color: "#fff",
                fontSize: "0.52rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.22rem 0.65rem",
                borderRadius: 5,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <i className={`pi ${badgeIcon}`} style={{ fontSize: "0.5rem" }} />
              {badge}
            </span>
          </div>
          {/* Date bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 12,
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <i className="pi pi-calendar" style={{ fontSize: "0.55rem" }} />
            {formatDateShort(post.date)}
          </div>
        </div>
      </a>

      {/* Body */}
      <div
        style={{
          padding: "1rem 1.1rem 1.1rem",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* Title */}
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "var(--sv-text-primary)",
            fontWeight: 800,
            fontSize: "0.95rem",
            lineHeight: 1.45,
            textDecoration: "none",
            marginBottom: "0.55rem",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--sv-accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--sv-text-primary)")
          }
        >
          {title}
        </a>

        {/* Excerpt */}
        <p
          style={{
            color: "var(--sv-text-secondary)",
            fontSize: "0.75rem",
            lineHeight: 1.7,
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
            marginTop: "0.875rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--sv-border)",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              color: "var(--sv-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <i
              className="pi pi-user"
              style={{ fontSize: "0.58rem", color: "var(--sv-accent)" }}
            />
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
              padding: "0.3rem 0.75rem",
              borderRadius: 6,
              background: hovered ? "var(--sv-accent)" : "var(--sv-accent-bg)",
              color: hovered ? "#fff" : "var(--sv-accent)",
              fontWeight: 700,
              fontSize: "0.68rem",
              textDecoration: "none",
              border:
                "1px solid color-mix(in srgb, var(--sv-accent) 30%, transparent)",
              transition: "background 0.2s, color 0.2s",
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

const HeroArticleSkeleton: React.FC = () => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 16,
      overflow: "hidden",
      height: "100%",
    }}
  >
    <Skeleton width="100%" height="200px" borderRadius="0" />
    <div style={{ padding: "1rem 1.1rem" }}>
      <Skeleton
        width="60px"
        height="18px"
        borderRadius="4px"
        className="mb-3"
      />
      <Skeleton width="95%" height="16px" borderRadius="4px" className="mb-1" />
      <Skeleton width="80%" height="16px" borderRadius="4px" className="mb-3" />
      <Skeleton
        width="100%"
        height="12px"
        borderRadius="4px"
        className="mb-1"
      />
      <Skeleton width="85%" height="12px" borderRadius="4px" className="mb-1" />
      <Skeleton width="70%" height="12px" borderRadius="4px" />
    </div>
  </div>
);

// ─── VideoCard ────────────────────────────────────────────────────────────────

const VideoCard: React.FC<{ video: VideoItem }> = ({ video }) => {
  const [hovered, setHovered] = useState(false);
  const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  return (
    <div
      style={{
        background: "var(--sv-bg-card)",
        border: `1px solid ${hovered ? "var(--sv-accent)" : "var(--sv-border)"}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "var(--sv-shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href={ytUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", position: "relative" }}
      >
        <div
          style={{
            width: "100%",
            paddingBottom: "56.25%",
            position: "relative",
            background: "#0f0f0f",
            overflow: "hidden",
          }}
        >
          {video.thumbnail && (
            <img
              src={video.thumbnail}
              alt={video.title}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.4s, opacity 0.2s",
                transform: hovered ? "scale(1.05)" : "scale(1)",
                opacity: hovered ? 0.88 : 1,
              }}
            />
          )}
          {/* Dark gradient overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)",
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
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: hovered ? "#ff0000" : "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.2s",
                transform: hovered ? "scale(1.12)" : "scale(1)",
                backdropFilter: "blur(4px)",
                border: "2px solid rgba(255,255,255,0.25)",
              }}
            >
              <i
                className="pi pi-play"
                style={{
                  fontSize: "0.9rem",
                  color: "#fff",
                  marginLeft: 3,
                }}
              />
            </div>
          </div>
          {/* Date bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              fontSize: "0.57rem",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <i className="pi pi-calendar" style={{ fontSize: "0.52rem" }} />
            {formatDateShort(video.date)}
          </div>
        </div>
      </a>

      <div style={{ padding: "0.7rem 0.85rem 0.85rem" }}>
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--sv-text-primary)",
            lineHeight: 1.45,
            textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--sv-accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--sv-text-primary)")
          }
        >
          {video.title}
        </a>
        <div
          style={{
            marginTop: "0.4rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            style={{
              fontSize: "0.57rem",
              fontWeight: 700,
              padding: "0.15rem 0.45rem",
              borderRadius: 4,
              background: "color-mix(in srgb, #ff0000 10%, transparent)",
              color: "#cc0000",
              border: "1px solid color-mix(in srgb, #ff0000 20%, transparent)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            YouTube
          </span>
          <span
            style={{
              fontSize: "0.6rem",
              color: "var(--sv-text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {video.channelTitle}
          </span>
        </div>
      </div>
    </div>
  );
};

const VideoCardSkeleton: React.FC = () => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 12,
      overflow: "hidden",
    }}
  >
    <Skeleton width="100%" height="140px" borderRadius="0" />
    <div style={{ padding: "0.7rem 0.85rem" }}>
      <Skeleton
        width="100%"
        height="13px"
        borderRadius="4px"
        className="mb-1"
      />
      <Skeleton width="70%" height="13px" borderRadius="4px" className="mb-2" />
      <Skeleton width="90px" height="16px" borderRadius="4px" />
    </div>
  </div>
);

// ─── TradeAlertRow ────────────────────────────────────────────────────────────

const TradeAlertRow: React.FC<{ post: WpPost; idx: number }> = ({
  post,
  idx,
}) => {
  const [hovered, setHovered] = useState(false);
  const title = stripTradeAlertPrefix(stripHtml(post.title.rendered));

  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.65rem",
        padding: "0.6rem 0.5rem",
        borderRadius: 8,
        textDecoration: "none",
        background: hovered ? "var(--sv-bg-surface)" : "transparent",
        borderBottom: idx > 0 ? "1px solid var(--sv-border)" : "none",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Index badge */}
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background:
            idx < 3
              ? "var(--sv-accent)"
              : "color-mix(in srgb, var(--sv-accent) 12%, var(--sv-bg-surface))",
          color: idx < 3 ? "#fff" : "var(--sv-accent)",
          fontSize: "0.58rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          flexGrow: 0,
        }}
      >
        {idx + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.78rem",
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
        <div
          style={{
            fontSize: "0.62rem",
            color: "var(--sv-text-muted)",
            marginTop: "0.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <i className="pi pi-calendar" style={{ fontSize: "0.55rem" }} />
          {formatDateShort(post.date)}
        </div>
      </div>
      <i
        className="pi pi-external-link"
        style={{
          fontSize: "0.65rem",
          color: "var(--sv-text-muted)",
          flexShrink: 0,
          marginTop: 3,
          opacity: hovered ? 1 : 0.4,
          transition: "opacity 0.15s",
        }}
      />
    </a>
  );
};

const TradeAlertSkeleton: React.FC = () => (
  <div
    style={{
      display: "flex",
      gap: "0.65rem",
      padding: "0.6rem 0.5rem",
      alignItems: "center",
    }}
  >
    <Skeleton width="22px" height="22px" borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <Skeleton
        width="100%"
        height="13px"
        borderRadius="4px"
        className="mb-1"
      />
      <Skeleton width="60%" height="11px" borderRadius="4px" />
    </div>
  </div>
);

// ─── Panel wrapper ────────────────────────────────────────────────────────────

const Panel: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 14,
      boxShadow: "var(--sv-shadow-sm)",
      padding: "0.5rem 0.5rem",
      // height: "100%",
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── LatestInsightsPage ───────────────────────────────────────────────────────

const LatestInsightsPage: React.FC = () => {
  const [newsletter, setNewsletter] = useState<WpPost | null>(null);
  const [commentary, setCommentary] = useState<WpPost | null>(null);
  const [recentRia, setRecentRia] = useState<WpPost | null>(null);
  const [tradeAlerts, setTradeAlerts] = useState<WpPost[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);

  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const load = useCallback(async () => {
    setLoadingArticles(true);
    setLoadingVideos(true);

    // Fetch all in parallel
    const [nlResult, comResult, riaResult, alertResult, vidResult] =
      await Promise.allSettled([
        fetchCategoryPost(CAT_NEWSLETTER, 1),
        fetchCategoryPost(CAT_COMMENTARY, 1),
        fetchCategoryPost(CAT_RECENT_RIA, 1),
        fetchCategoryPost(CAT_TRADE_ALERTS, TRADE_ALERT_LIMIT),
        fetchYouTubeVideos(),
      ]);

    if (nlResult.status === "fulfilled")
      setNewsletter(nlResult.value[0] ?? null);
    if (comResult.status === "fulfilled")
      setCommentary(comResult.value[0] ?? null);
    if (riaResult.status === "fulfilled")
      setRecentRia(riaResult.value[0] ?? null);
    if (alertResult.status === "fulfilled") setTradeAlerts(alertResult.value);

    setLoadingArticles(false);

    if (vidResult.status === "fulfilled") setVideos(vidResult.value);
    setLoadingVideos(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      {/* ── Hero articles row ── */}
      <div className="grid">
        <div className="col-12">
          <div className="grid mb-2">
            {/* Newsletter */}
            <div className="col-12 md:col-4 p-2" style={{ display: "flex" }}>
              <div style={{ width: "100%" }}>
                <SectionHeader
                  icon="pi-envelope"
                  title="Newsletter"
                  morePath="/commentary/newsletter"
                />
                {loadingArticles ? (
                  <HeroArticleSkeleton />
                ) : newsletter ? (
                  <HeroArticleCard
                    post={newsletter}
                    badge="Pro Newsletter"
                    badgeIcon="pi-envelope"
                  />
                ) : (
                  <EmptyCard message="No newsletter available" />
                )}
              </div>
            </div>

            {/* Daily Commentary */}
            <div className="col-12 md:col-4 p-2" style={{ display: "flex" }}>
              <div style={{ width: "100%" }}>
                <SectionHeader
                  icon="pi-comment"
                  title="Daily Commentary"
                  morePath="/commentary/real-time"
                />
                {loadingArticles ? (
                  <HeroArticleSkeleton />
                ) : commentary ? (
                  <HeroArticleCard
                    post={commentary}
                    badge="Daily Commentary"
                    badgeIcon="pi-comment"
                  />
                ) : (
                  <EmptyCard message="No commentary available" />
                )}
              </div>
            </div>

            {/* Latest from RIA Team */}
            <div className="col-12 md:col-4 p-2" style={{ display: "flex" }}>
              <div style={{ width: "100%" }}>
                <SectionHeader
                  icon="pi-globe"
                  title="Latest from RIA"
                  morePath="/commentary/recent-ria"
                />
                {loadingArticles ? (
                  <HeroArticleSkeleton />
                ) : recentRia ? (
                  <HeroArticleCard
                    post={recentRia}
                    badge="RIA Team"
                    badgeIcon="pi-globe"
                  />
                ) : (
                  <EmptyCard message="No RIA content available" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          {/* ── Videos + Trade Alerts row ── */}
          <div className="grid mt-4">
            {/* Videos */}
            <div className="col-12 lg:col-9 p-2">
              <SectionHeader
                icon="pi-youtube"
                title="Latest Videos"
                morePath="/commentary/videos"
                moreLabel="All videos"
              />
              <div className="grid">
                {loadingVideos ? (
                  Array.from({ length: VIDEO_LIMIT }).map((_, i) => (
                    <div key={i} className="col-12 sm:col-6 md:col-3 p-1">
                      <VideoCardSkeleton />
                    </div>
                  ))
                ) : videos.length === 0 ? (
                  <div className="col-12">
                    <EmptyCard
                      message="No videos available"
                      icon="pi-youtube"
                    />
                  </div>
                ) : (
                  videos.map((v) => (
                    <div key={v.id} className="col-12 sm:col-6 md:col-3 p-1">
                      <VideoCard video={v} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trade Alerts */}
            <div className="col-12 lg:col-3 p-2">
              <SectionHeader
                icon="pi-bell"
                title="Trade Alerts"
                morePath="/commentary/diary"
                moreLabel="All alerts"
              />
              <Panel>
                {loadingArticles ? (
                  Array.from({ length: TRADE_ALERT_LIMIT }).map((_, i) => (
                    <TradeAlertSkeleton key={i} />
                  ))
                ) : tradeAlerts.length === 0 ? (
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--sv-text-muted)",
                      margin: 0,
                    }}
                  >
                    No trade alerts available.
                  </p>
                ) : (
                  <div>
                    {tradeAlerts.map((post, i) => (
                      <TradeAlertRow key={post.id} post={post} idx={i} />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── EmptyCard ────────────────────────────────────────────────────────────────

const EmptyCard: React.FC<{ message: string; icon?: string }> = ({
  message,
  icon = "pi-file",
}) => (
  <div
    style={{
      background: "var(--sv-bg-card)",
      border: "1px solid var(--sv-border)",
      borderRadius: 14,
      padding: "3rem 1rem",
      textAlign: "center",
      boxShadow: "var(--sv-shadow-sm)",
    }}
  >
    <i
      className={`pi ${icon}`}
      style={{
        fontSize: "2rem",
        color: "var(--sv-accent)",
        opacity: 0.2,
        display: "block",
        marginBottom: "0.5rem",
      }}
    />
    <p
      style={{ margin: 0, fontSize: "0.78rem", color: "var(--sv-text-muted)" }}
    >
      {message}
    </p>
  </div>
);

export default LatestInsightsPage;
