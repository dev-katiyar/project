import React, { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;
const COOLDOWN_SECONDS = 300;

// --------------- Step indicator ---------------
function StepPill({
  n,
  label,
  active = false,
  done = false,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  const state = done ? "done" : active ? "active" : "idle";
  return (
    <div className="flex flex-column align-items-center gap-1">
      <div
        className={`sv-step-circle flex align-items-center justify-content-center border-round-full font-bold sv-step-circle--${state}`}
      >
        {done ? <i className="pi pi-check" /> : n}
      </div>
      <span className={`sv-step-label sv-step-label--${state}`}>
        {label}
      </span>
    </div>
  );
}

// --------------- Page ---------------
type PageState = "idle" | "loading" | "sent";

const ForgotPasswordPage: React.FC = () => {
  const { theme } = useTheme();
  const captchaTheme = theme === "light" ? "light" : "dark";
  const captchaRef = useRef<ReCAPTCHA>(null);

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Reset captcha widget on theme change
  useEffect(() => {
    setIsCaptchaVerified(false);
    setCaptchaError("");
  }, [captchaTheme]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const emailError = !email.trim()
    ? "Email is required."
    : !EMAIL_PATTERN.test(email)
      ? "Please enter a valid email."
      : "";

  const handleCaptchaChange = async (token: string | null) => {
    if (!token) {
      setIsCaptchaVerified(false);
      return;
    }
    try {
      const res = await api.post("/user/validate-captcha", { token });
      if (res.data?.success) {
        setIsCaptchaVerified(true);
        setCaptchaError("");
      } else {
        setIsCaptchaVerified(false);
        setCaptchaError("Captcha verification failed. Please try again.");
        captchaRef.current?.reset();
      }
    } catch {
      setIsCaptchaVerified(false);
      setCaptchaError("Captcha verification failed. Please try again.");
      captchaRef.current?.reset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (emailError) return;
    if (!isCaptchaVerified) {
      setCaptchaError("Please complete the reCAPTCHA verification.");
      return;
    }
    setPageState("loading");
    setErrorMsg("");
    try {
      await api.post("/register/reset-password-request", { userEmail: email });
      setPageState("sent");
      setCountdown(COOLDOWN_SECONDS);
    } catch {
      setPageState("idle");
      setErrorMsg(
        "Something went wrong. Please contact us at contact@simplevisor.com."
      );
    }
  };

  const handleTryAgain = () => {
    setPageState("idle");
    setCountdown(0);
    setIsCaptchaVerified(false);
    setCaptchaError("");
    setErrorMsg("");
    setEmailTouched(false);
  };

  const canTryAgain = countdown <= 0;
  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");
  const progress = Math.round((countdown / COOLDOWN_SECONDS) * 100);

  return (
    <div className="flex justify-content-center align-items-start py-8 px-2 sv-page-min-h">
      <div className="w-full sv-form-wrap">
        {/* Gradient icon badge */}
        <div className="flex justify-content-center mb-4">
          <div className="sv-pw-badge flex align-items-center justify-content-center border-round-2xl">
            <i className="pi pi-lock-open" />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex justify-content-center align-items-center gap-2 mb-5">
          <StepPill
            n={1}
            label="Enter Email"
            active={pageState !== "sent"}
            done={pageState === "sent"}
          />
          <div className="sv-step-line" />
          <StepPill n={2} label="Check Inbox" active={pageState === "sent"} />
          <div className="sv-step-line" />
          <StepPill n={3} label="Set Password" />
        </div>

        <div className="surface-card border-1 surface-border border-round-xl shadow-4 p-5">
          {/* ── Form state ── */}
          {pageState !== "sent" ? (
            <>
              <h2 className="mt-0 mb-1 font-bold text-xl">Forgot Password?</h2>
              <p className="mt-0 mb-4 text-sm text-color-secondary line-height-3">
                Enter your registered email. We'll send a reset link that
                expires in 15 minutes. Can't find it?{" "}
                <Link to="/contact-us">Contact us.</Link>
              </p>

              {errorMsg && (
                <div className="sv-alert-error flex align-items-start gap-2 border-round-lg p-3 mb-4 text-sm">
                  <i className="pi pi-exclamation-circle mt-1 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label
                    htmlFor="fp-email"
                    className="block font-semibold text-sm text-color-secondary mb-2"
                  >
                    Email Address <span className="sv-required">*</span>
                  </label>
                  <InputText
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@example.com"
                    autoFocus
                    className={`w-full${emailError && emailTouched ? " p-invalid" : ""}`}
                  />
                  {emailError && emailTouched && (
                    <small className="flex align-items-center gap-1 mt-1 sv-error-text">
                      <i className="pi pi-exclamation-circle" /> {emailError}
                    </small>
                  )}
                </div>

                {/* reCAPTCHA */}
                <div className="flex flex-column align-items-center gap-1 mb-4">
                  <ReCAPTCHA
                    key={captchaTheme}
                    ref={captchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={handleCaptchaChange}
                    onExpired={() => {
                      setIsCaptchaVerified(false);
                    setCaptchaError("Captcha expired. Please verify again.");
                    }}
                    theme={captchaTheme}
                  />
                  {captchaError && (
                    <small className="flex align-items-center gap-1 mt-1 sv-error-text">
                      <i className="pi pi-exclamation-circle" /> {captchaError}
                    </small>
                  )}
                  {isCaptchaVerified && (
                    <small className="flex align-items-center gap-1 mt-1 sv-status-ok">
                      <i className="pi pi-check-circle" /> Verified
                    </small>
                  )}
                </div>

                <Button
                  type="submit"
                  label={pageState === "loading" ? "Sending…" : "Send Reset Link"}
                  icon={
                    pageState === "loading"
                      ? "pi pi-spin pi-spinner"
                      : "pi pi-send"
                  }
                  iconPos="right"
                  disabled={pageState === "loading" || !isCaptchaVerified}
                  className="p-button-primary w-full"
                />
              </form>

              <div className="text-center mt-4 text-sm">
                <Link to="/login">
                  <i className="pi pi-arrow-left text-xs mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            /* ── Sent state ── */
            <>
              <div className="flex justify-content-center mb-3">
                <div className="sv-status-circle sv-status-circle--ok flex align-items-center justify-content-center border-round-full">
                  <i className="pi pi-envelope" />
                </div>
              </div>

              <h2 className="mt-0 mb-2 font-bold text-xl text-center">
                Check Your Inbox
              </h2>
              <p className="mt-0 mb-4 text-sm text-color-secondary text-center line-height-3">
                A reset link was sent to{" "}
                <strong className="text-color">{email}</strong>
                . Click the link in the email to set your new password. The
                link expires in 15 minutes.
              </p>

              {/* Countdown bar */}
              <div className="mb-4">
                <div className="flex justify-content-between align-items-center text-xs text-color-secondary mb-2">
                  <span>
                    {canTryAgain ? "You can resend now" : "Resend available in"}
                  </span>
                  {!canTryAgain && (
                    <span className="font-bold sv-text-accent">{mins}:{secs}</span>
                  )}
                </div>
                <div className="sv-countdown-track border-round-full overflow-hidden">
                  <div
                    className="sv-countdown-bar border-round-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Button
                label={canTryAgain ? "Try Again" : `Wait ${mins}:${secs}`}
                icon={canTryAgain ? "pi pi-refresh" : "pi pi-clock"}
                disabled={!canTryAgain}
                onClick={handleTryAgain}
                className="p-button-primary w-full mb-3"
              />
              <div className="text-center text-sm">
                <Link to="/login">
                  <i className="pi pi-arrow-left text-xs mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
