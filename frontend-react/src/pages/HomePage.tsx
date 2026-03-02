import React from "react";
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

/* ── FeatureCard — hover handled via CSS (.sv-feature-card:hover) ─────────── */
interface FeatureItem {
  img: string;
  title: string;
  desc: string;
}

const FeatureCard: React.FC<FeatureItem> = ({ img, title, desc }) => (
  <div className="sv-feature-card surface-card border-round-xl h-full flex flex-column align-items-center text-center">
    <img src={img} alt={title} />
    <h3 className="font-semibold">{title}</h3>
    <p>{desc}</p>
  </div>
);

/* ── HomePage ─────────────────────────────────────────────────────────────── */
const HomePage: React.FC = () => (
  <>
    {/* ── Hero ── */}
    <section className="sv-section surface-overlay border-bottom-1 surface-border">
      <div className="sv-content-wrap">
        <h1 className="text-center font-bold text-color sv-hero-title">
          Are You Ready For Investing To Be Made Simple? Finally!
        </h1>

        <div className="grid align-items-center">
          {/* YouTube — left col — 16:9 aspect-ratio wrapper */}
          <div className="col-12 md:col-7">
            <div className="sv-video-16x9 border-round-xl shadow-4">
              <iframe
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
                  className="p-button-primary sv-cta-btn"
                />
              </Link>
              <p className="text-center m-0 text-color-secondary">
                Sign up for your{" "}
                <strong className="sv-text-accent">free 30-day trial</strong> of
                SimpleVisor
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Description ── */}
    <section className="sv-section surface-ground">
      <div className="sv-content-wrap">
        <div className="text-color-secondary sv-desc-wrap">
          <p className="mt-0 mb-3">
            As an individual investor, you can get access to basic data tools
            from every online broker. However, can you:
          </p>
          <ul className="mt-0 mb-3 pl-6">
            <li className="mb-1">
              Easily access and compare all the data points you need?
            </li>
            <li className="mb-1">
              Do these sites help you uncover new information, or do they simply
              reinforce your existing knowledge?
            </li>
            <li className="mb-1">
              Does the platform offer direct guidance from experienced
              professional investors?
            </li>
          </ul>
          <p className="mt-0 mb-3">
            You can get basic data tools at practically every online broker.
            However, can you easily access and compare all the necessary data
            points?
          </p>
          <p className="mt-0 mb-3">
            Lastly, do these sites facilitate the discovery of new insights, or
            do they primarily reinforce existing knowledge for informed
            investors?
          </p>
          <p className="mt-0 mb-3">
            You need a trusted source for data, insights and tools that are
            built from the ground up to help you become a better investor.
          </p>
          <p className="mt-0 mb-3">
            <strong className="text-color">
              Introducing Simple Visor, the self-guided investor research site
              from the Portfolio Managers at RIA Advisors.
            </strong>
          </p>
          <p className="mt-0 mb-3">
            Simple Visor offers the features necessary for a variety of
            purposes, from day trading to supplemental research to long-term
            investing.
          </p>
          <p className="m-0">
            As a subscriber, you can contact the pros at Simple Visor to ask
            questions, get assistance and more.
          </p>
        </div>
      </div>
    </section>

    {/* ── Eight Key Features ── */}
    <section className="sv-section surface-overlay">
      <div className="sv-content-wrap">
        <h2 className="font-bold text-center text-color sv-section-title">
          Eight key features of{" "}
          <span className="sv-text-accent">SimpleVisor</span>
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
    <footer className="surface-card text-center border-top-1 surface-border sv-footer-cta">
      <div className="mb-4">
        <img
          src="/assets/home/simplevisor-light.svg"
          alt="SimpleVisor"
          className="sv-footer-logo"
        />
      </div>
      <h2 className="font-bold mb-4 text-color text-2xl">
        Sign up for your free 30-day trial
      </h2>
      <Link to="/signup">
        <Button
          label="Start Free Trial"
          className="p-button-primary sv-cta-btn"
        />
      </Link>
    </footer>
  </>
);

export default HomePage;
