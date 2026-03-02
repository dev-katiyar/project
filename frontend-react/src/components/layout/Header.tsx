import React, { useState, useRef, useCallback, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, ThemeName } from "@/contexts/ThemeContext";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

import logoOnDark from "@/assets/brand/simplevisor-horizontal-light-lg.svg";
import logoOnLight from "@/assets/brand/simplevisor-horizontal-color@3x.png";

const THEME_LOGO: Record<ThemeName, string> = {
  dark: logoOnDark,
  dim: logoOnDark,
  light: logoOnLight,
};

/* ── Menu config ─────────────────────────────────────────────────────────── */
interface SubItem {
  label: string;
  path: string;
}
interface MenuItem {
  label: string;
  path?: string;
  items?: SubItem[];
}

const NAV_ITEMS: MenuItem[] = [
  { label: "Home", path: "/overview" },
  {
    label: "Insights",
    items: [
      { label: "Latest Insights", path: "/insights/latest-insights" },
      { label: "Newsletters", path: "/commentary/newsletter" },
      { label: "Commentaries", path: "/commentary/real-time" },
      { label: "Latest from RIA Team", path: "/commentary/recent-ria" },
      { label: "Videos", path: "/commentary/videos" },
      { label: "Trade Alerts", path: "/commentary/diary" },
    ],
  },
  {
    label: "Markets",
    items: [
      { label: "Major Markets", path: "/majormarkets" },
      { label: "Asset Classes", path: "/markets" },
      { label: "Holdings Map", path: "/holdingsmap" },
      { label: "Sentiment", path: "/marketinternals" },
      { label: "Leaders & Laggers", path: "/movers" },
    ],
  },
  {
    label: "Portfolios",
    items: [
      { label: "Portfolios", path: "/portfolioscombined" },
      { label: "Watchlists", path: "/watchlist" },
      { label: "Alerts", path: "/alerts" },
      { label: "Super Investor Portfolios", path: "/super-investor" },
    ],
  },
  {
    label: "DIY Research",
    items: [
      {
        label: "Performance Analysis",
        path: "/relative-absolute-analysis-sectors",
      },
      { label: "Factor Analysis", path: "/factor-analysis" },
      { label: "Risk Range", path: "/risk-range-report" },
      { label: "Credit Spreads", path: "/credit-spead" },
      { label: "Screener", path: "/screenscombined" },
      { label: "Stock Summary", path: "/overview-stock" },
      { label: "Strategy Builder", path: "/strategy-dashboard" },
    ],
  },
  { label: "Charts", path: "/tvcharts" },
  {
    label: "Simple AI",
    items: [
      { label: "Agents – Dashboard", path: "/ai-dashbaord" },
      { label: "Agents – Symbol", path: "/ai-tools" },
    ],
  },
];

/* ── DesktopNavItem ──────────────────────────────────────────────────────── */
interface DesktopNavItemProps {
  item: MenuItem;
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const DesktopNavItem: React.FC<DesktopNavItemProps> = ({
  item,
  isOpen,
  onMouseEnter,
  onMouseLeave,
}) => {
  const location = useLocation();

  /* Direct link — no dropdown */
  if (!item.items) {
    return (
      <NavLink
        to={item.path!}
        className={({ isActive }) =>
          `sv-nav-link py-2 px-3 border-round text-sm font-medium white-space-nowrap${isActive ? " active" : ""}`
        }
      >
        {item.label}
      </NavLink>
    );
  }

  const hasActiveChild = item.items.some(
    (sub) => location.pathname === sub.path
  );

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Trigger */}
      <button
        className={[
          "sv-dropdown-trigger",
          "flex align-items-center gap-1 py-2 px-3 border-round text-sm font-medium white-space-nowrap",
          hasActiveChild ? "active" : "",
          isOpen ? "open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {item.label}
        <i className="pi pi-chevron-down sv-dropdown-chevron" />
      </button>

      {/* Panel — positioning via sv-dropdown-panel; appearance via PrimeFlex + inline */}
      <div
        className={`sv-dropdown-panel surface-overlay border-round-lg shadow-3 p-1${isOpen ? " open" : ""}`}
        style={{
          border: "1px solid var(--surface-border)",
          borderTop: "2px solid var(--primary-color)",
        }}
      >
        {item.items.map((sub) => (
          <NavLink
            key={sub.path}
            to={sub.path}
            className={({ isActive }) =>
              `sv-dropdown-item flex align-items-center py-2 px-3 border-round text-sm font-medium white-space-nowrap${isActive ? " active" : ""}`
            }
          >
            {sub.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

/* ── MobileMenu ──────────────────────────────────────────────────────────── */
interface MobileMenuProps {
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState("");

  const toggle = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      navigate(`/symbol-search/${encodeURIComponent(searchText.trim())}`);
      setSearchText("");
      onClose();
    }
  };

  return (
    /* sv-mobile-menu handles: fixed position, z-index, max-height, overflow, animation */
    /* PrimeFlex handles: background, border, shadow, padding */
    <div
      className="sv-mobile-menu surface-overlay border-bottom-1 shadow-3 px-3 py-2"
      style={{ borderBottomColor: "var(--surface-border)" }}
    >
      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-3">
        <i
          className="pi pi-search absolute text-xs"
          style={{
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-color-secondary)",
            pointerEvents: "none",
          }}
        />
        <InputText
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search ticker…"
          className="w-full"
          style={{ paddingLeft: "2.25rem" }}
        />
      </form>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        /* Direct link */
        if (!item.items) {
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={({ isActive }) =>
                `sv-mobile-item flex align-items-center py-3 px-3 border-round text-sm font-medium w-full${isActive ? " active" : ""}`
              }
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          );
        }

        const isExpanded = !!expanded[item.label];
        const hasActive = item.items.some(
          (sub) => location.pathname === sub.path
        );

        return (
          <div key={item.label}>
            {/* Group trigger */}
            <button
              className={[
                "sv-mobile-group-trigger",
                "flex align-items-center justify-content-between w-full py-3 px-3 border-round text-sm font-medium",
                hasActive ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => toggle(item.label)}
            >
              <span>{item.label}</span>
              <i
                className={`pi ${isExpanded ? "pi-chevron-up" : "pi-chevron-down"} text-xs opacity-60`}
              />
            </button>

            {/* Sub-items */}
            {isExpanded && (
              <div
                className="pl-3 ml-3 py-1"
                style={{ borderLeft: "2px solid var(--surface-border)" }}
              >
                {item.items.map((sub) => (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    className={({ isActive }) =>
                      `sv-mobile-subitem flex align-items-center py-2 px-3 border-round text-sm w-full${isActive ? " active" : ""}`
                    }
                    onClick={onClose}
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Header ──────────────────────────────────────────────────────────────── */
interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchText, setSearchText] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Close both on route change */
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  /* 150ms delay prevents accidental close when moving mouse from trigger to panel */
  const handleMouseEnter = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(label);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      navigate(`/symbol-search/${encodeURIComponent(searchText.trim())}`);
      setSearchText("");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "?";

  return (
    <>
      <header className="sv-header sticky top-0 flex align-items-center px-3">
        <div
          className="flex align-items-center justify-content-between w-full mx-auto"
          style={{ maxWidth: 1600 }}
        >
          {/* ── Brand ── */}
          <Link
            to={isAuthenticated ? "/overview" : "/"}
            className="flex align-items-center no-underline"
            style={{ flexShrink: 0 }}
          >
            <img
              src={THEME_LOGO[theme]}
              alt="SimpleVisor Pro"
              style={{ height: 32, width: "auto" }}
            />
          </Link>

          {/* ── Desktop nav — hidden on mobile, flex on md+ ── */}
          {isAuthenticated ? (
            <nav className="hidden md:flex align-items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <DesktopNavItem
                  key={item.label}
                  item={item}
                  isOpen={openDropdown === item.label}
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </nav>
          ) : (
            <nav className="hidden md:flex align-items-center gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `sv-nav-link py-2 px-3 border-round text-sm font-medium${isActive ? " active" : ""}`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `sv-nav-link py-2 px-3 border-round text-sm font-medium${isActive ? " active" : ""}`
                }
              >
                Sign In
              </NavLink>
            </nav>
          )}

          {/* ── Actions ── */}
          <div
            className="flex align-items-center gap-2"
            style={{ flexShrink: 0 }}
          >
            {isAuthenticated && (
              <>
                {/* Search — hidden on mobile, flex on md+ */}
                <form
                  onSubmit={handleSearch}
                  className="relative hidden md:flex align-items-center"
                >
                  <i
                    className="pi pi-search absolute text-xs"
                    style={{
                      left: "0.65rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-color-secondary)",
                      pointerEvents: "none",
                    }}
                  />
                  <InputText
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search ticker…"
                    className="sv-search-input"
                  />
                </form>

                {/* Hamburger — md:hidden hides on desktop, visible on mobile */}
                <Button
                  icon={`pi ${mobileOpen ? "pi-times" : "pi-bars"}`}
                  className="p-button-text p-button-rounded md:hidden"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  aria-label="Toggle navigation"
                />
              </>
            )}

            <Button
              icon="pi pi-cog"
              className="p-button-text p-button-rounded"
              onClick={onOpenSettings}
              tooltip="Settings"
              tooltipOptions={{ position: "bottom" }}
            />

            {isAuthenticated ? (
              <Avatar
                label={userInitial}
                shape="circle"
                onClick={handleLogout}
                title={`${user?.username} — click to sign out`}
                className="cursor-pointer"
                style={{
                  background: "var(--sv-accent-gradient)",
                  color: "var(--sv-text-inverse)",
                }}
              />
            ) : (
              <Button
                label="Start Free Trial"
                className="p-button-primary p-button-sm"
                onClick={() => navigate("/signup")}
              />
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu — renders as sibling after the sticky header */}
      {isAuthenticated && mobileOpen && (
        <MobileMenu onClose={() => setMobileOpen(false)} />
      )}
    </>
  );
};

export default Header;
