import React from "react";
import { Link } from "react-router-dom";
import { Divider } from "primereact/divider";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="sv-footer px-3 py-3">
      <div
        className="sv-layout-wrap flex align-items-center justify-content-between flex-wrap gap-2 mx-auto">
        <span className="text-sm sv-text-muted">
          &copy; {year} RIA Advisors / SimpleVisor. All rights reserved.
        </span>

        <div className="flex align-items-center gap-3">
          <Link
            to="/terms"
            className="text-sm sv-text-muted">
            Terms &amp; Conditions
          </Link>
          {/* <a
            href="/faq"
            className="text-sm sv-text-muted">
            FAQ
          </a> */}
          <a
            href="/contact-us"
            className="text-sm sv-text-muted">
            Contact Us
          </a>
          <a
            href="https://realinvestmentadvice.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm sv-text-muted">
            RIA Advisors
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
