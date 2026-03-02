import React from "react";
import { Link } from "react-router-dom";
import { Button } from "primereact/button";
import "./HomePage.css";

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

const HomePage: React.FC = () => (
  <>
    {/* ── Hero ── */}
    <section className="hp-section hp-hero">
      <div className="hp-inner">
        {/* Page title */}
        <h1
          className="text-center font-bold mb-6"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            lineHeight: 1.2,
            color: "var(--sv-text-primary)",
            margin: "0 auto 2.5rem",
            maxWidth: 760,
          }}
        >
          Are You Ready For Investing To Be Made Simple? Finally!
        </h1>

        {/* Video + CTA side-by-side */}
        <div className="grid align-items-center">
          {/* YouTube video — left col */}
          <div className="col-12 md:col-7">
            <div className="hp-video-wrap">
              <iframe
                src="https://www.youtube-nocookie.com/embed/pZUDxWWuKIs?si=2Huy8MWq-utQQTMk&controls=0"
                title="Simplevisor Introduction"
                style={{ border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          {/* Sign up CTA — right col */}
          <div className="col-12 md:col-5">
            <div className="flex flex-column align-items-center gap-4 py-4">
              <Link to="/signup">
                <Button
                  label="Start Free Trial"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  className="p-button-primary hp-signup-btn"
                />
              </Link>
              <p
                className="text-center m-0"
                style={{ color: "var(--sv-text-secondary)", fontSize: "1rem" }}
              >
                Sign up for your{" "}
                <strong style={{ color: "var(--sv-accent)" }}>
                  free 30-day trial
                </strong>{" "}
                of SimpleVisor
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Description ── */}
    <section className="hp-section hp-desc">
      <div className="hp-inner">
        <div className="hp-prose">
          <p>
            As an individual investor, you can get access to basic data tools
            from every online broker. However, can you:
          </p>
          <ul>
            <li>Easily access and compare all the data points you need?</li>
            <li>
              Do these sites help you uncover new information, or do they simply
              reinforce your existing knowledge?
            </li>
            <li>
              Does the platform offer direct guidance from experienced
              professional investors?
            </li>
          </ul>
          <p>
            You can get basic data tools at practically every online broker.
            However, can you easily access and compare all the necessary data
            points?
          </p>
          <p>
            Lastly, do these sites facilitate the discovery of new insights, or
            do they primarily reinforce existing knowledge for informed
            investors?
          </p>
          <p>
            You need a trusted source for data, insights and tools that are
            built from the ground up to help you become a better investor.
          </p>
          <p>
            <strong>
              Introducing Simple Visor, the self-guided investor research site
              from the Portfolio Managers at RIA Advisors.
            </strong>
          </p>
          <p>
            Simple Visor offers the features necessary for a variety of
            purposes, from day trading to supplemental research to long-term
            investing.
          </p>
          <p>
            As a subscriber, you can contact the pros at Simple Visor to ask
            questions, get assistance and more.
          </p>
        </div>
      </div>
    </section>

    {/* ── Eight Key Features ── */}
    <section className="hp-section hp-features">
      <div className="hp-inner">
        <h2 className="hp-section-title">
          Eight key features of <span>SimpleVisor</span>
        </h2>

        <div className="grid">
          {FEATURES.map((f) => (
            <div className="col-12 sm:col-6 lg:col-3" key={f.img}>
              <div className="hp-feature-card">
                <img src={f.img} alt={f.title} />
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Footer ── */}
    <footer className="hp-footer-section">
      <div className="mb-4">
        <img
          src="/assets/home/simplevisor-light.svg"
          alt="SimpleVisor"
          style={{ height: "2.5rem" }}
        />
      </div>
      <h2
        className="font-bold mb-4"
        style={{ color: "var(--sv-text-primary)", fontSize: "1.5rem" }}
      >
        Sign up for your free 30-day trial
      </h2>
      <Link to="/signup">
        <Button
          label="Start Free Trial"
          className="p-button-primary hp-signup-btn"
        />
      </Link>
    </footer>
  </>
);

export default HomePage;
