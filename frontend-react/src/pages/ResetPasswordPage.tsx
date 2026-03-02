import React, { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { ProgressSpinner } from "primereact/progressspinner";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

// --------------- Password strength ---------------
function calcStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0–4
}
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "",
  "var(--sv-danger)",
  "var(--sv-warning)",
  "#60a5fa",
  "var(--sv-success)",
];

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
        className={`sv-step-circle sv-step-circle--${state} flex align-items-center justify-content-center border-round-full font-bold`}
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
type VerifyState = "verifying" | "invalid" | "form" | "success";

const ResetPasswordPage: React.FC = () => {
  const { theme } = useTheme();
  const captchaTheme = theme === "light" ? "light" : "dark";
  const captchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [verifyState, setVerifyState] = useState<VerifyState>("verifying");
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwTouched, setPwTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reset captcha widget on theme change
  useEffect(() => {
    setIsCaptchaVerified(false);
    setCaptchaError("");
  }, [captchaTheme]);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifyState("invalid");
      setTokenError(
        "No reset token found in the URL. Please request a new password reset link."
      );
      return;
    }
    api
      .post("/register/reset-password/verify-token", { token })
      .then((res) => {
        if (res.data?.status === "ok") {
          setVerifyState("form");
        } else {
          setVerifyState("invalid");
          setTokenError(
            res.data?.status || "The reset link is invalid or has expired."
          );
        }
      })
      .catch(() => {
        setVerifyState("invalid");
        setTokenError(
          "Could not verify the reset link. Please try again or request a new one."
        );
      });
  }, [token]);

  const pwError = !newPassword
    ? "Password is required."
    : newPassword.length < 6
      ? "Password must be at least 6 characters."
      : "";

  const confirmError = !confirmPassword
    ? "Please confirm your password."
    : confirmPassword !== newPassword
      ? "Passwords do not match."
      : "";

  const strength = calcStrength(newPassword);

  const handleCaptchaChange = async (captchaToken: string | null) => {
    if (!captchaToken) {
      setIsCaptchaVerified(false);
      return;
    }
    try {
      const res = await api.post("/user/validate-captcha", {
        token: captchaToken,
      });
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
    setPwTouched(true);
    setConfirmTouched(true);
    if (pwError || confirmError) return;
    if (!isCaptchaVerified) {
      setCaptchaError("Please complete the reCAPTCHA verification.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await api.post("/register/reset-password", {
        token,
        new_password: newPassword,
      });
      if (res.data?.status === "ok") {
        setVerifyState("success");
      } else {
        setErrorMsg(
          res.data?.status || "Something went wrong. Please try again."
        );
      }
    } catch {
      setErrorMsg(
        "Something went wrong. Please contact us at contact@simplevisor.com."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const allDone = verifyState === "success";

  return (
    <div className="flex justify-content-center align-items-start py-8 px-2 sv-page-min-h">
      <div className="w-full sv-form-wrap">
        {/* Gradient icon badge */}
        <div className="flex justify-content-center mb-4">
          <div className="sv-pw-badge flex align-items-center justify-content-center border-round-2xl">
            <i className={`pi ${allDone ? "pi-check" : "pi-lock"}`} />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex justify-content-center align-items-center gap-2 mb-5">
          <StepPill n={1} label="Enter Email" done />
          <div className="sv-step-line" />
          <StepPill n={2} label="Check Inbox" done />
          <div className="sv-step-line" />
          <StepPill
            n={3}
            label="Set Password"
            active={verifyState === "form" || verifyState === "verifying"}
            done={verifyState === "success"}
          />
        </div>

        <div className="surface-card border-1 surface-border border-round-xl shadow-4 p-5">

          {/* ── Verifying ── */}
          {verifyState === "verifying" && (
            <div className="flex flex-column align-items-center py-6 gap-3">
              <ProgressSpinner
                style={{ width: 48, height: 48 }}
                strokeWidth="3"
              />
              <p className="mt-0 text-sm text-color-secondary">
                Verifying your reset link…
              </p>
            </div>
          )}

          {/* ── Invalid token ── */}
          {verifyState === "invalid" && (
            <>
              <div className="flex justify-content-center mb-3">
                <div className="sv-status-circle sv-status-circle--err flex align-items-center justify-content-center border-round-full">
                  <i className="pi pi-times" style={{ fontSize: "1.4rem" }} />
                </div>
              </div>
              <h2 className="mt-0 mb-2 font-bold text-xl text-center">
                Link Expired or Invalid
              </h2>
              <p className="mt-0 mb-4 text-sm text-color-secondary text-center line-height-3">
                {tokenError}
              </p>
              <Link to="/forgot-password">
                <Button
                  label="Request New Reset Link"
                  icon="pi pi-refresh"
                  className="p-button-primary w-full mb-3"
                />
              </Link>
              <div className="text-center text-sm">
                <Link to="/login">
                  <i className="pi pi-arrow-left text-xs mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}

          {/* ── Reset form ── */}
          {verifyState === "form" && (
            <>
              <h2 className="mt-0 mb-1 font-bold text-xl">Set New Password</h2>
              <p className="mt-0 mb-4 text-sm text-color-secondary line-height-3">
                Choose a strong password. If you need help,{" "}
                <Link to="/contact-us">contact us</Link>
                .
              </p>

              {errorMsg && (
                <div className="sv-alert-error flex align-items-start gap-2 border-round-lg p-3 mb-4 text-sm">
                  <i className="pi pi-exclamation-circle mt-1 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* New password */}
                <div className="mb-3">
                  <label
                    htmlFor="rp-new"
                    className="block font-semibold text-sm text-color-secondary mb-2"
                  >
                    New Password <span className="sv-required">*</span>
                  </label>
                  <Password
                    inputId="rp-new"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => setPwTouched(true)}
                    toggleMask
                    feedback={false}
                    placeholder="Enter new password"
                    className={`w-full${pwError && pwTouched ? " p-invalid" : ""}`}
                    inputClassName="w-full"
                  />

                  {/* Strength meter */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="sv-strength-track border-round-full overflow-hidden mb-1">
                        <div
                          className="sv-strength-bar border-round-full"
                          style={{
                            width: `${(strength / 4) * 100}%`,
                            background: STRENGTH_COLORS[strength],
                          }}
                        />
                      </div>
                      <div className="flex justify-content-between align-items-center">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: STRENGTH_COLORS[strength] }}
                        >
                          {STRENGTH_LABELS[strength]}
                        </span>
                        <span className="text-xs text-color-secondary">
                          Use uppercase, numbers &amp; symbols for a stronger password
                        </span>
                      </div>
                    </div>
                  )}

                  {pwError && pwTouched && (
                    <small className="flex align-items-center gap-1 mt-1 sv-error-text">
                      <i className="pi pi-exclamation-circle" /> {pwError}
                    </small>
                  )}
                </div>

                {/* Confirm password */}
                <div className="mb-4">
                  <label
                    htmlFor="rp-confirm"
                    className="block font-semibold text-sm text-color-secondary mb-2"
                  >
                    Confirm Password <span className="sv-required">*</span>
                  </label>
                  <Password
                    inputId="rp-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    toggleMask
                    feedback={false}
                    placeholder="Confirm new password"
                    className={`w-full${confirmError && confirmTouched ? " p-invalid" : ""}`}
                    inputClassName="w-full"
                  />
                  {confirmError && confirmTouched && (
                    <small className="flex align-items-center gap-1 mt-1 sv-error-text">
                      <i className="pi pi-exclamation-circle" /> {confirmError}
                    </small>
                  )}
                  {confirmPassword && !confirmError && (
                    <small className="flex align-items-center gap-1 mt-1 sv-status-ok">
                      <i className="pi pi-check-circle" /> Passwords match
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
                  label={isSubmitting ? "Saving…" : "Set New Password"}
                  icon={
                    isSubmitting
                      ? "pi pi-spin pi-spinner"
                      : "pi pi-check-circle"
                  }
                  iconPos="right"
                  disabled={isSubmitting || !isCaptchaVerified}
                  className="p-button-primary w-full"
                />
              </form>
            </>
          )}

          {/* ── Success ── */}
          {verifyState === "success" && (
            <>
              <div className="flex justify-content-center mb-3">
                <div className="sv-status-circle sv-status-circle--ok flex align-items-center justify-content-center border-round-full">
                  <i className="pi pi-check" style={{ fontSize: "1.6rem" }} />
                </div>
              </div>
              <h2 className="mt-0 mb-2 font-bold text-xl text-center">
                Password Reset!
              </h2>
              <p className="mt-0 mb-5 text-sm text-color-secondary text-center line-height-3">
                Your password has been updated successfully. You can now sign in
                with your new password.
              </p>
              <Button
                label="Go to Sign In"
                icon="pi pi-sign-in"
                iconPos="right"
                onClick={() => navigate("/login")}
                className="p-button-primary w-full"
              />
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default ResetPasswordPage;
