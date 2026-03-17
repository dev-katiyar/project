import React, { useState, useEffect } from "react";
import { Skeleton } from "primereact/skeleton";
import api from "@/services/api";

interface NewsItem {
  title: string;
  link: string;
  published: string;
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const h = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return "";
  }
}

interface StockNewsTabProps {
  symbol: string;
}

const StockNewsTab: React.FC<StockNewsTabProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNews([]);
    api
      .get<NewsItem[]>("/rss/news")
      .then(({ data }) => setNews(Array.isArray(data) ? data.slice(0, 30) : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex flex-column gap-2 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height="56px" borderRadius="8px" />
        ))}
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="flex flex-column align-items-center justify-content-center gap-2 sv-text-muted" style={{ minHeight: 200 }}>
        <i className="pi pi-newspaper" style={{ fontSize: 36, opacity: 0.3 }} />
        <span className="text-sm">No news available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-2">
      {news.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <div
            className="surface-overlay border-1 surface-border border-round-lg p-3 flex align-items-start gap-3"
            style={{ transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--sv-accent)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--sv-shadow-sm)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <div style={{ width: 3, minHeight: 40, borderRadius: 2, background: "var(--sv-accent)", flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-color" style={{ lineHeight: 1.4 }}>{item.title}</div>
              <div className="flex align-items-center gap-2 mt-1">
                <span className="text-xs sv-text-muted">{timeAgo(item.published)}</span>
                <i className="pi pi-external-link sv-text-muted" style={{ fontSize: 10 }} />
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default StockNewsTab;
