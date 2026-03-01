import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");

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
    <header className="sv-header sticky top-0 flex align-items-center px-3">
      <div
        className="flex align-items-center justify-content-between w-full mx-auto"
        style={{ maxWidth: 1600 }}
      >
        {/* Brand */}
        <Link
          to={isAuthenticated ? "/overview" : "/"}
          className="flex align-items-center gap-2 no-underline"
        >
          <div
            className="flex align-items-center justify-content-center border-round font-bold text-white text-xs"
            style={{
              width: 36,
              height: 36,
              background: "var(--sv-accent-gradient)",
            }}
          >
            RIA
          </div>
          <span
            className="font-bold text-lg"
            style={{
              color: "var(--sv-text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Simple<span style={{ color: "var(--sv-accent)" }}>Visor</span> Pro
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex align-items-center gap-1">
          {isAuthenticated ? (
            <>
              <NavLink to="/overview" className="sv-nav-link">
                Home
              </NavLink>
              <NavLink to="/markets" className="sv-nav-link">
                Markets
              </NavLink>
              <NavLink to="/portfolioscombined" className="sv-nav-link">
                Portfolios
              </NavLink>
              <NavLink to="/overview-stock" className="sv-nav-link">
                Research
              </NavLink>
              <NavLink to="/ai-tools" className="sv-nav-link">
                AI Tools
              </NavLink>
              <NavLink to="/tvcharts" className="sv-nav-link">
                Charts
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className="sv-nav-link">
                Home
              </NavLink>
              <NavLink to="/login" className="sv-nav-link">
                Sign In
              </NavLink>
              <NavLink to="/signup" className="sv-nav-link">
                Register
              </NavLink>
            </>
          )}
        </nav>

        {/* Actions */}
        <div className="flex align-items-center gap-2">
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="relative">
              <i
                className="pi pi-search absolute text-sm"
                style={{
                  left: "0.65rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--sv-text-muted)",
                  pointerEvents: "none",
                }}
              />
              <InputText
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search ticker..."
                className="sv-search-input"
              />
            </form>
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
              title={user?.username}
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
              onClick={() => navigate("/login")}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
