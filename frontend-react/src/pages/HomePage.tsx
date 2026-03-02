import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "primereact/button";

/* ── Feature data ─────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    img: "/assets/home/key-1@3x.png",
    title: "Designed by investment professionals for everyday investors",
    desc: "Ensures you have the key data and analysis you need in one place.",
  },
  {
    img: "/assets/home/key-2@3x.png",
    title: "Research a wide range of investments",
    desc: "Over 10,000 mutual funds, 5,000 equities, and 2,000 ETFs and counting.",
  },
  {
    img: "/assets/home/key-3@3x.png",
    title: "Insights from professional investors",
    desc: "See what the RIA Advisors Portfolio Managers invest in and why they invest in it.",
  },
  {
    img: "/assets/home/key-4@3x.png",
    title: "Uncover your own unique insights",
    desc: "Develop customized screens utilizing a wide array of tools and data points.",
  },
  {
    img: "/assets/home/key-5@3x.png",
    title: "Hear from multiple analysts",
    desc: "Access the opinion of other analysts to reinforce your ideas and gain new insights.",
  },
  {
    img: "/assets/home/key-6@3x.png",
    title: "Receive alerts and daily emails",
    desc: "Know key happenings in the markets, your portfolio and your watchlist.",
  },
  {
    img: "/assets/home/key-7@3x.png",
    title: "Gain a comprehensive view",
    desc: "Track your 401(k) plan right in the program for a 360-degree view of your investments.",
  },
  {
    img: "/assets/home/key-8@3x.png",
    title: "30-day risk-free trial",
    desc: "Want to see if Simple Visor is right for you? Try it risk free for 30 days.",
  },
];

/* ── FeatureCard — self-contained hover state ─────────────────────────────── */
interface FeatureItem {
  img: string;
  title: string;
  desc: string;
}

const FeatureCard: React.FC<FeatureItem> = ({ img, title, desc }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="surface-card border-round-xl h-full flex flex-column align-items-center text-center"
      style={{
        border: "1px solid var(--surface-border)",
        padding: "1.5rem 1rem",
        gap: "0.75rem",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        boxShadow: hovered ? "var(--sv-shadow-md)" : "none",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img src={img} alt={title} style={{ height: "4.5rem", objectFit: "contain" }} />
      <h3
        className="m-0 font-semibold"
        style={{ fontSize: "0.9rem", color: "var(--text-color)", lineHeight: 1.4 }}
      >
        {title}
      </h3>
      <p
        className="m-0"
        style={{ fontSize: "0.82rem", color: "var(--text-color-secondary)", lineHeight: 1.5 }}
      >
        {desc}
      </p>
    </div>
  );
};

/* ── HomePage ─────────────────────────────────────────────────────────────── */
const sectionPad: React.CSSProperties = { padding: "4rem 1.5rem" };
const innerWrap: React.CSSProperties = { maxWidth: 1200, margin: "0 auto" };

const HomePage: React.FC = () => (
  <>
    {/* ── Hero ── */}
    <section
      className="surface-overlay"
      style={{ ...sectionPad, borderBottom: "1px solid var(--surface-border)" }}
    >
      <div style={innerWrap}>
        <h1
          className="text-center font-bold"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            lineHeight: 1.2,
            color: "var(--text-color)",
            margin: "0 auto 2.5rem",
            maxWidth: 760,
          }}
        >
          Are You Ready For Investing To Be Made Simple? Finally!
        </h1>

        <div className="grid align-items-center">
          {/* YouTube — left col — 16:9 aspect-ratio wrapper */}
          <div className="col-12 md:col-7">
            <div
              className="relative overflow-hidden border-round-xl"
              style={{ paddingTop: "56.25%", background: "#000", boxShadow: "var(--sv-shadow-md)" }}
            >
              <iframe
                className="absolute"
                style={{ top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                src="https://www.youtube-nocookie.com/embed/pZUDxWWuKIs?si=2Huy8MWq-utQQTMk&controls=0"
                title="Simplevisor Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          {/* Sign-up CTA — right col */}
          <div className="col-12 md:col-5">
            <div className="flex flex-column align-items-center gap-4 py-4">
              <Link to="/signup">
                <Button
                  label="Start Free Trial"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  className="p-button-primary"
                  style={{ minWidth: "11rem", fontSize: "1rem" }}
                />
              </Link>
              <p
                className="text-center m-0"
                style={{ color: "var(--text-color-secondary)", fontSize: "1rem" }}
              >
                Sign up for your{" "}
                <strong style={{ color: "var(--primary-color)" }}>free 30-day trial</strong>{" "}
                of SimpleVisor
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Description ── */}
    <section className="surface-ground" style={sectionPad}>
      <div style={innerWrap}>
        <div
          style={{
            maxWidth: 780,
            margin: "0 auto",
            color: "var(--text-color-secondary)",
            lineHeight: 1.8,
            fontSize: "1rem",
          }}
        >
          <p style={{ margin: "0 0 1rem" }}>
            As an individual investor, you can get access to basic data tools from every online
            broker. However, can you:
          </p>
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.4rem" }}>
              Easily access and compare all the data points you need?
            </li>
            <li style={{ marginBottom: "0.4rem" }}>
              Do these sites help you uncover new information, or do they simply reinforce your
              existing knowledge?
            </li>
            <li style={{ marginBottom: "0.4rem" }}>
              Does the platform offer direct guidance from experienced professional investors?
            </li>
          </ul>
          <p style={{ margin: "0 0 1rem" }}>
            You can get basic data tools at practically every online broker. However, can you easily
            access and compare all the necessary data points?
          </p>
          <p style={{ margin: "0 0 1rem" }}>
            Lastly, do these sites facilitate the discovery of new insights, or do they primarily
            reinforce existing knowledge for informed investors?
          </p>
          <p style={{ margin: "0 0 1rem" }}>
            You need a trusted source for data, insights and tools that are built from the ground up
            to help you become a better investor.
          </p>
          <p style={{ margin: "0 0 1rem" }}>
            <strong style={{ color: "var(--text-color)" }}>
              Introducing Simple Visor, the self-guided investor research site from the Portfolio
              Managers at RIA Advisors.
            </strong>
          </p>
          <p style={{ margin: "0 0 1rem" }}>
            Simple Visor offers the features necessary for a variety of purposes, from day trading to
            supplemental research to long-term investing.
          </p>
          <p style={{ margin: 0 }}>
            As a subscriber, you can contact the pros at Simple Visor to ask questions, get
            assistance and more.
          </p>
        </div>
      </div>
    </section>

    {/* ── Eight Key Features ── */}
    <section className="surface-overlay" style={sectionPad}>
      <div style={innerWrap}>
        <h2
          className="font-bold text-center"
          style={{ color: "var(--text-color)", fontSize: "2rem", margin: "0 0 2.5rem", lineHeight: 1.25 }}
        >
          Eight key features of{" "}
          <span style={{ color: "var(--primary-color)" }}>SimpleVisor</span>
        </h2>

        <div className="grid">
          {FEATURES.map((f) => (
            <div className="col-12 sm:col-6 lg:col-3" key={f.img}>
              <FeatureCard {...f} />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Footer CTA ── */}
    <footer
      className="surface-card text-center"
      style={{ borderTop: "1px solid var(--surface-border)", padding: "3rem 1.5rem" }}
    >
      <div className="mb-4">
        <img src="/assets/home/simplevisor-light.svg" alt="SimpleVisor" style={{ height: "2.5rem" }} />
      </div>
      <h2
        className="font-bold mb-4"
        style={{ color: "var(--text-color)", fontSize: "1.5rem" }}
      >
        Sign up for your free 30-day trial
      </h2>
      <Link to="/signup">
        <Button
          label="Start Free Trial"
          className="p-button-primary"
          style={{ minWidth: "11rem", fontSize: "1rem" }}
        />
      </Link>
    </footer>
  </>
);

export default HomePage;
