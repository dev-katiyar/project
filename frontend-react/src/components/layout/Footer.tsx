import React from "react";
import { Link } from "react-router-dom";
import { Divider } from "primereact/divider";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="px-3 py-3"
      style={{
        background: "var(--sv-bg-header)",
        borderTop: "1px solid var(--sv-border)",
      }}
    >
      <div
        className="flex align-items-center justify-content-between flex-wrap gap-2 mx-auto"
        style={{ maxWidth: 1600 }}
      >
        <span className="text-sm" style={{ color: "var(--sv-text-muted)" }}>
          &copy; {year} RIA Advisors / SimpleVisor. All rights reserved.
        </span>

        <div className="flex align-items-center gap-3">
          <Link
            to="/terms"
            className="text-sm"
            style={{ color: "var(--sv-text-muted)" }}
          >
            Terms &amp; Conditions
          </Link>
          <a
            href="/faq"
            className="text-sm"
            style={{ color: "var(--sv-text-muted)" }}
          >
            FAQ
          </a>
          <a
            href="/contact-us"
            className="text-sm"
            style={{ color: "var(--sv-text-muted)" }}
          >
            Contact Us
          </a>
          <a
            href="https://realinvestmentadvice.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: "var(--sv-text-muted)" }}
          >
            RIA Advisors
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
