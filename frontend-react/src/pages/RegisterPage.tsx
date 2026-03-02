import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown";
import { RadioButton } from "primereact/radiobutton";
import { Checkbox } from "primereact/checkbox";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Divider } from "primereact/divider";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

// --------------- Types ---------------

declare global {
  interface Window {
    Stripe: {
      setPublishableKey: (key: string) => void;
      createToken: (
        card: {
          number: string;
          exp_month: string;
          exp_year: string;
          cvc: string;
        },
        callback: (
          status: number,
          response: {
            id: string;
            error?: {
              message: string;
            };
          },
        ) => void,
      ) => void;
    };
  }
}

interface Plan {
  id: string;
  name: string;
  price?: number;
  price_cents?: number;
  description?: string;
  features?: string[];
  frequency?: string;
}

type AbortStatus = "returning" | "internal" | "error" | null;
type RegStatus =
  | "registered"
  | "error_email"
  | "error_database"
  | "error_server"
  | "error_stripe"
  | null;

// --------------- Static Options ---------------

const AGE_OPTIONS = Array.from({ length: 81 }, (_, i) => ({
  label: `${i + 20}`,
  value: i + 20,
}));

const DEPENDENT_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  label: `${i}`,
  value: i,
}));

const MARITAL_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
];

const FINANCIAL_GOAL_OPTIONS = [
  {
    id: "capital_preservation",
    label: "Capital Preservation",
    description: "Focus on protecting my existing assets with minimal risk",
  },
  {
    id: "income_generation",
    label: "Income Generation",
    description: "Generate regular income through dividends and interest",
  },
  {
    id: "balanced_growth",
    label: "Balanced Growth",
    description: "A mix of growth and income with moderate risk tolerance",
  },
  {
    id: "aggressive_growth",
    label: "Aggressive Growth",
    description: "Maximize long-term returns while accepting higher volatility",
  },
];

const RISK_TOLERANCE_OPTIONS = [
  {
    id: "conservative",
    label: "Conservative",
    description: "Prefer stable returns; avoid significant losses",
  },
  {
    id: "moderate",
    label: "Moderate",
    description: "Accept some risk for potentially better returns",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "Comfortable with high risk for maximum growth potential",
  },
];

const STRENGTH_COLORS = [
  "",
  "var(--sv-danger)",
  "#f97316",
  "#60a5fa",
  "var(--sv-success)",
];
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

function calcStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

// --------------- Step Indicator ---------------

interface StepProps {
  current: number;
  steps: string[];
}

const StepIndicator: React.FC<StepProps> = ({ current, steps }) => (
  <div className="flex align-items-center justify-content-center gap-2 mb-5">
    {steps.map((label, i) => {
      const isComplete = i < current;
      const isActive = i === current;
      const state = isComplete ? "done" : isActive ? "active" : "idle";
      return (
        <React.Fragment key={i}>
          <div className="flex flex-column align-items-center gap-1">
            <div
              className={`sv-step-circle sv-step-circle--lg sv-step-circle--${state} flex align-items-center justify-content-center border-circle font-bold text-sm`}
            >
              {isComplete ? <i className="pi pi-check" /> : i + 1}
            </div>
            <span className={`text-xs font-medium sv-step-label sv-step-label--${state}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`sv-step-connector${isComplete ? " sv-step-connector--done" : ""}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// --------------- Main Component ---------------

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const captchaRef = useRef<ReCAPTCHA>(null);
  const captchaTheme = theme === "light" ? "light" : "dark";

  // ---- Step ----
  const [step, setStep] = useState(0);

  // ---- Abort / final result ----
  const [abortStatus, setAbortStatus] = useState<AbortStatus>(null);
  const [regStatus, setRegStatus] = useState<RegStatus>(null);

  // ---- Step 1: Basic Info ----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step1Error, setStep1Error] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);

  // ---- Step 2: Risk Profile ----
  const [age, setAge] = useState<number | null>(null);
  const [dependents, setDependents] = useState<number | null>(null);
  const [maritalStatus, setMaritalStatus] = useState("");
  const [financialGoal, setFinancialGoal] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("");

  // ---- Step 3: Subscription & Payment ----
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    message: string;
    discountedCents?: number;
    durationMonths?: number;
  } | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [agreed, setAgreed] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState("");

  const [step3Error, setStep3Error] = useState("");
  const [step3Loading, setStep3Loading] = useState(false);

  // Reset captcha state when theme changes
  useEffect(() => {
    setIsCaptchaVerified(false);
    setCaptchaError("");
  }, [captchaTheme]);

  // Load plans when entering step 3
  useEffect(() => {
    if (step === 2 && plans.length === 0) {
      setPlansLoading(true);
      api
        .get("/subscriptions/all")
        .then((res) => {
          const data: Plan[] = Array.isArray(res.data) ? res.data : [];
          setPlans(data);
          if (data.length > 0) setSelectedPlan(data[0]);
        })
        .catch(() => {
          setStep3Error("Could not load subscription plans. Please refresh.");
        })
        .finally(() => setPlansLoading(false));
    }
  }, [step, plans.length]);

  // Initialize Stripe
  useEffect(() => {
    if (window.Stripe) {
      window.Stripe.setPublishableKey(
        import.meta.env.VITE_STRIPE_KEY as string,
      );
    }
  }, []);

  // ---- Captcha handlers ----
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

  const handleCaptchaExpired = () => {
    setIsCaptchaVerified(false);
    setCaptchaError("");
  };

  // ---- Step 1: Submit ----
  const handleStep1 = async () => {
    setStep1Error("");
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setStep1Error("All fields are required.");
      return;
    }
    if (calcStrength(password) < 2) {
      setStep1Error(
        "Please choose a stronger password (at least 8 chars, mixed case or numbers).",
      );
      return;
    }

    setStep1Loading(true);
    try {
      const res = await api.post("/register/usercheck", {
        firstName,
        lastName,
        email,
        password,
      });
      const status = res.data?.status;
      if (status === "new") {
        setStep(1);
      } else if (
        status === "returning" ||
        status === "internal" ||
        status === "error"
      ) {
        setAbortStatus(status as AbortStatus);
      } else {
        setStep1Error("Unexpected response from server. Please try again.");
      }
    } catch {
      setStep1Error("Could not connect to server. Please try again.");
    } finally {
      setStep1Loading(false);
    }
  };

  // ---- Promo code validation ----
  const handlePromoCode = async () => {
    if (!promoCode.trim() || !selectedPlan) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await api.post("/register/validate-promo-code", {
        coupon_code: promoCode,
        plan: selectedPlan.id,
      });
      const status = res.data?.status;
      if (status === "valid") {
        setPromoResult({
          valid: true,
          message: "Promo code applied!",
          discountedCents: res.data?.res?.discounted_price_cents,
          durationMonths: res.data?.res?.coupon_details?.duration_in_months,
        });
      } else {
        setPromoResult({
          valid: false,
          message: "Invalid or expired promo code.",
        });
      }
    } catch {
      setPromoResult({
        valid: false,
        message: "Could not validate promo code.",
      });
    } finally {
      setPromoLoading(false);
    }
  };

  // ---- Step 3: Submit ----
  const handleRegister = () => {
    setStep3Error("");

    if (!selectedPlan) {
      setStep3Error("Please select a subscription plan.");
      return;
    }
    if (!agreed) {
      setStep3Error("Please agree to the Terms of Service.");
      return;
    }
    if (!isCaptchaVerified) {
      setStep3Error("Please complete the captcha verification.");
      return;
    }
    if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvc) {
      setStep3Error("Please fill in all card details.");
      return;
    }

    setStep3Loading(true);

    window.Stripe.createToken(
      {
        number: cardNumber.replace(/\s/g, ""),
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
        cvc: cardCvc,
      },
      async (status, response) => {
        if (status !== 200 || response.error) {
          setStep3Error(
            response.error?.message ||
              "Card tokenization failed. Please check your card details.",
          );
          setStep3Loading(false);
          return;
        }

        const stripeToken = response?.id;
        const cardNum = cardNumber.replace(/\s/g, "");
        let cardType = "unknown";
        if (cardNum.startsWith("4")) cardType = "visa";
        else if (cardNum.startsWith("5")) cardType = "mastercard";
        else if (cardNum.startsWith("3")) cardType = "amex";
        else if (cardNum.startsWith("6")) cardType = "discover";

        const payload = {
          basicInfo: {
            firstName,
            lastName,
            email,
            password,
          },
          riskProfile: {
            age: age ?? "",
            dependents: dependents ?? "",
            maritalStatus,
            financialGoal,
            riskTolerance,
          },
          subscription: {
            subType: selectedPlan.id,
            promoCode: promoResult?.valid ? promoCode : "",
          },
          cardInfo: {
            card_id: stripeToken,
          },
        };

        try {
          const res = await api.post("/register2024", payload);
          const resStatus = res.data?.status as RegStatus;
          setRegStatus(resStatus ?? "error_server");
        } catch {
          setRegStatus("error_server");
        } finally {
          setStep3Loading(false);
        }
      },
    );
  };

  const strength = calcStrength(password);

  // ---- Abort Screen ----
  if (abortStatus) {
    const isReturning = abortStatus === "returning";
    const isInternal = abortStatus === "internal";
    return (
      <div className="flex justify-content-center align-items-center py-8 px-3 sv-page-min-h-60">
        <div className="surface-card border-1 surface-border border-round-2xl shadow-4 p-5 text-center sv-form-wrap">
          <div
            className="sv-state-circle flex align-items-center justify-content-center border-circle mx-auto mb-4"
            style={{ background: isReturning ? "var(--sv-accent)" : "var(--sv-warning, #f97316)" }}
          >
            <i className={`pi ${isReturning ? "pi-user" : "pi-info-circle"} text-white`} />
          </div>
          <h2 className="mt-0 mb-2 font-bold">
            {isReturning
              ? "Account Already Exists"
              : isInternal
                ? "Internal Account Detected"
                : "Registration Error"}
          </h2>
          <p className="mt-0 mb-4 line-height-3 text-color-secondary">
            {isReturning
              ? "We found an existing account with that email address. Please sign in instead."
              : isInternal
                ? "This email is associated with an internal SimpleVisor account. Please contact support."
                : "Something went wrong during account validation. Please try again or contact support."}
          </p>
          <div className="flex gap-2 justify-content-center flex-wrap">
            {isReturning && (
              <Button
                label="Sign In"
                className="p-button-primary"
                onClick={() => navigate("/login")}
              />
            )}
            <Button
              label="Try Again"
              className="p-button-outlined"
              onClick={() => setAbortStatus(null)}
            />
            <Button
              label="Contact Us"
              className="p-button-text"
              onClick={() => navigate("/contact-us")}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- Registration Result Screen ----
  if (regStatus) {
    const isSuccess = regStatus === "registered";
    return (
      <div className="flex justify-content-center align-items-center py-8 px-3 sv-page-min-h-60">
        <div className="surface-card border-1 surface-border border-round-2xl shadow-4 p-5 text-center sv-form-wrap">
          <div
            className="sv-state-circle flex align-items-center justify-content-center border-circle mx-auto mb-4"
            style={{ background: isSuccess ? "var(--sv-success)" : "var(--sv-danger)" }}
          >
            <i className={`pi ${isSuccess ? "pi-check" : "pi-times"} text-white`} />
          </div>
          <h2 className="mt-0 mb-2 font-bold">
            {isSuccess ? "Welcome to SimpleVisor Pro!" : "Registration Failed"}
          </h2>
          <p className="mt-0 mb-4 line-height-3 text-color-secondary">
            {isSuccess
              ? "Your account has been created successfully. Check your inbox for a confirmation email, then sign in to get started."
              : regStatus === "error_email"
                ? "Your account was created but we couldn't send the confirmation email. Please contact support."
                : regStatus === "error_stripe"
                  ? "There was a problem processing your payment. Please verify your card details and try again."
                  : "Something went wrong during registration. Please contact support at contact@simplevisor.com."}
          </p>
          <div className="flex gap-2 justify-content-center flex-wrap">
            {isSuccess ? (
              <Button
                label="Sign In"
                className="p-button-primary"
                onClick={() => navigate("/login")}
              />
            ) : (
              <>
                <Button
                  label="Try Again"
                  className="p-button-primary"
                  onClick={() => setRegStatus(null)}
                />
                <Button
                  label="Contact Us"
                  className="p-button-outlined"
                  onClick={() => navigate("/contact-us")}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Main Wizard ----
  return (
    <>
      <style>{`
        .sv-register-outer { max-width: 960px; }
        .sv-register-hero {
          background: var(--sv-accent-gradient, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%));
          border-radius: 16px 0 0 16px;
          padding: 2.5rem 2rem;
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 280px;
          max-width: 320px;
          flex: 0 0 300px;
        }
        .sv-register-hero .p-divider-horizontal:before { border-top-color: rgba(255,255,255,0.2); }
        .sv-register-wrap { border-radius: 0 16px 16px 0; }
        @media (max-width: 767px) {
          .sv-register-outer { flex-direction: column; }
          .sv-register-hero {
            order: 2;
            border-radius: 0 0 16px 16px;
            min-width: unset !important;
            max-width: unset !important;
            flex: unset !important;
            padding: 1.5rem;
            justify-content: flex-start;
          }
          .sv-register-wrap { order: 1; border-radius: 16px 16px 0 0 !important; }
          .sv-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
          .sv-feature-item { margin-bottom: 0; }
        }
        .sv-feature-item { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1rem; }
        .sv-feature-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.875rem;
        }
        .sv-hero-brand-icon { font-size: 1.75rem; }
        .sv-hero-desc       { opacity: 0.85; }
        .sv-hero-feat-desc  { opacity: 0.8; }
        .sv-hero-legal      { opacity: 0.7; }
        .sv-trial-banner {
          background: rgba(var(--sv-accent-rgb, 59,130,246), 0.08);
          border: 1px solid rgba(var(--sv-accent-rgb, 59,130,246), 0.25);
        }
        .sv-gift-icon { color: var(--sv-accent); font-size: 1.125rem; flex-shrink: 0; }
        .sv-lock-icon { font-size: 0.6875rem; }
        .sv-strength-segment { flex: 1; height: 4px; border-radius: 2px; transition: background 0.3s; }
        .sv-step-connector {
          flex: 1;
          height: 2px;
          min-width: 24px;
          max-width: 64px;
          margin-bottom: 20px;
          background: var(--surface-border);
          transition: background 0.3s;
        }
        .sv-step-connector--done { background: var(--sv-success); }
        .sv-plan-card {
          cursor: pointer;
          border-radius: 12px;
          border: 2px solid var(--surface-border);
          padding: 1rem 1.25rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sv-plan-card:hover { border-color: var(--sv-accent); }
        .sv-plan-card.selected {
          border-color: var(--sv-accent);
          box-shadow: 0 0 0 3px rgba(var(--sv-accent-rgb, 59,130,246), 0.15);
        }
        .sv-grad-btn {
          background: var(--sv-accent-gradient, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%));
          border: none;
          color: #fff;
          border-radius: 8px;
          font-weight: 600;
        }
        .sv-grad-btn:hover {
          opacity: 0.9;
          background: var(--sv-accent-gradient, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)) !important;
          border: none !important;
        }
        .sv-risk-option {
          border: 2px solid var(--surface-border);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .sv-risk-option.selected {
          border-color: var(--sv-accent);
          background: rgba(var(--sv-accent-rgb, 59,130,246), 0.06);
        }
        .sv-risk-option:hover { border-color: var(--sv-accent); }
        .sv-card-field {
          background: var(--surface-ground);
          border: 1px solid var(--surface-border);
          border-radius: 8px;
          padding: 0.625rem 0.875rem;
          color: var(--text-color);
          font-size: 0.9rem;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .sv-card-field:focus { border-color: var(--sv-accent); }
      `}</style>

      <div className="flex justify-content-center py-6 px-2">
        <div className="sv-register-outer w-full shadow-5 border-round-2xl overflow-hidden flex">
          {/* ---- Left: Marketing Sidebar ---- */}
          <div className="sv-register-hero">
            <div className="mb-4">
              <div className="flex align-items-center gap-2 mb-3">
                <i className="pi pi-chart-line sv-hero-brand-icon" />
                <span className="font-bold text-xl">SimpleVisor Pro</span>
              </div>
              <p className="mt-0 mb-4 line-height-3 text-sm sv-hero-desc">
                Professional-grade financial analysis and portfolio tools for
                serious investors.
              </p>
            </div>

            <div className="sv-feature-grid mb-4">
              {[
                {
                  icon: "pi-globe",
                  title: "Global Markets",
                  desc: "Real-time data across 50+ exchanges",
                },
                {
                  icon: "pi-chart-bar",
                  title: "AI-Powered Insights",
                  desc: "ML-driven market regime detection",
                },
                {
                  icon: "pi-shield",
                  title: "Risk Analytics",
                  desc: "Advanced portfolio risk metrics",
                },
                {
                  icon: "pi-bell",
                  title: "Smart Alerts",
                  desc: "Custom notifications for your watchlist",
                },
                {
                  icon: "pi-users",
                  title: "Super Investor",
                  desc: "Track legendary investors' portfolios",
                },
              ].map((f) => (
                <div className="sv-feature-item" key={f.icon}>
                  <div className="sv-feature-icon">
                    <i className={`pi ${f.icon}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1">{f.title}</div>
                    <div className="text-xs line-height-2 sv-hero-feat-desc">
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Divider />
            <p className="text-xs mt-3 mb-0 line-height-3 sv-hero-legal">
              Trusted by thousands of investors. Your data is encrypted and
              never shared.
            </p>
          </div>

          {/* ---- Right: Form ---- */}
          <div className="sv-register-wrap surface-card flex-1 p-5">
            <h2 className="mt-0 mb-1 font-bold">Create your account</h2>
            <p className="mt-0 mb-4 text-sm text-color-secondary">
              Already have an account?{" "}
              <Link to="/login" className="sv-text-accent">Sign in</Link>
            </p>

            <StepIndicator
              current={step}
              steps={["Basic Info", "Risk Profile", "Subscription"]}
            />

            {/* ============ STEP 1: Basic Info ============ */}
            {step === 0 && (
              <div>
                <div className="grid">
                  <div className="col-12 md:col-6">
                    <label className="block text-sm font-medium mb-1">
                      First Name <span className="sv-required">*</span>
                    </label>
                    <InputText
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full"
                      autoFocus
                    />
                  </div>
                  <div className="col-12 md:col-6">
                    <label className="block text-sm font-medium mb-1">
                      Last Name <span className="sv-required">*</span>
                    </label>
                    <InputText
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    Email Address <span className="sv-required">*</span>
                  </label>
                  <InputText
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    Password <span className="sv-required">*</span>
                  </label>
                  <Password
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    toggleMask
                    feedback={false}
                    className="w-full"
                    inputClassName="w-full"
                    placeholder="Choose a strong password"
                  />
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((s) => (
                          <div
                            key={s}
                            className="sv-strength-segment"
                            style={{ background: strength >= s ? STRENGTH_COLORS[strength] : "var(--surface-border)" }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: STRENGTH_COLORS[strength] }}
                      >
                        {STRENGTH_LABELS[strength]}
                      </span>
                      <span className="text-xs ml-2 sv-text-muted">
                        Use 8+ chars, uppercase, numbers, and symbols
                      </span>
                    </div>
                  )}
                </div>

                {step1Error && (
                  <Message
                    severity="error"
                    text={step1Error}
                    className="w-full mb-3"
                  />
                )}

                <Button
                  label={step1Loading ? "Checking..." : "Continue"}
                  icon={step1Loading ? undefined : "pi pi-arrow-right"}
                  iconPos="right"
                  className="sv-grad-btn w-full mt-2"
                  loading={step1Loading}
                  onClick={handleStep1}
                />
              </div>
            )}

            {/* ============ STEP 2: Risk Profile ============ */}
            {step === 1 && (
              <div>
                <p className="mt-0 mb-4 text-sm line-height-3 text-color-secondary">
                  Help us personalize your experience. All fields are optional —
                  you can update these anytime from your profile.
                </p>

                <div className="grid mb-3">
                  <div className="col-12 md:col-4">
                    <label className="block text-sm font-medium mb-1">
                      Age
                    </label>
                    <Dropdown
                      value={age}
                      options={AGE_OPTIONS}
                      onChange={(e) => setAge(e.value)}
                      placeholder="Select age"
                      className="w-full"
                    />
                  </div>
                  <div className="col-12 md:col-4">
                    <label className="block text-sm font-medium mb-1">
                      Dependents
                    </label>
                    <Dropdown
                      value={dependents}
                      options={DEPENDENT_OPTIONS}
                      onChange={(e) => setDependents(e.value)}
                      placeholder="Select"
                      className="w-full"
                    />
                  </div>
                  <div className="col-12 md:col-4">
                    <label className="block text-sm font-medium mb-1">
                      Marital Status
                    </label>
                    <Dropdown
                      value={maritalStatus}
                      options={MARITAL_OPTIONS}
                      onChange={(e) => setMaritalStatus(e.value)}
                      placeholder="Select"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    Financial Goal
                  </label>
                  <div className="flex flex-column gap-2">
                    {FINANCIAL_GOAL_OPTIONS.map((opt) => (
                      <div
                        key={opt.id}
                        className={`sv-risk-option ${financialGoal === opt.id ? "selected" : ""}`}
                        onClick={() => setFinancialGoal(opt.id)}
                      >
                        <div className="flex align-items-center gap-2">
                          <RadioButton
                            inputId={`goal-${opt.id}`}
                            value={opt.id}
                            onChange={(e) => setFinancialGoal(e.value)}
                            checked={financialGoal === opt.id}
                          />
                          <div>
                            <div className="font-semibold text-sm">
                              {opt.label}
                            </div>
                            <div className="text-xs mt-1 sv-text-muted">
                              {opt.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    Risk Tolerance
                  </label>
                  <div className="flex flex-column gap-2">
                    {RISK_TOLERANCE_OPTIONS.map((opt) => (
                      <div
                        key={opt.id}
                        className={`sv-risk-option ${riskTolerance === opt.id ? "selected" : ""}`}
                        onClick={() => setRiskTolerance(opt.id)}
                      >
                        <div className="flex align-items-center gap-2">
                          <RadioButton
                            inputId={`risk-${opt.id}`}
                            value={opt.id}
                            onChange={(e) => setRiskTolerance(e.value)}
                            checked={riskTolerance === opt.id}
                          />
                          <div>
                            <div className="font-semibold text-sm">
                              {opt.label}
                            </div>
                            <div className="text-xs mt-1 sv-text-muted">
                              {opt.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    label="Back"
                    icon="pi pi-arrow-left"
                    className="p-button-outlined flex-1"
                    onClick={() => setStep(0)}
                  />
                  <Button
                    label="Continue"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    className="sv-grad-btn flex-1"
                    onClick={() => setStep(2)}
                  />
                </div>
              </div>
            )}

            {/* ============ STEP 3: Subscription & Payment ============ */}
            {step === 2 && (
              <div>
                {/* 30-day trial banner */}
                <div className="flex align-items-start gap-3 border-round-xl p-3 mb-4 sv-trial-banner">
                  <i className="pi pi-gift mt-1 sv-gift-icon" />
                  <div>
                    <div className="font-semibold text-sm mb-1 sv-text-accent">
                      30-Day Free Trial — No Charge Today
                    </div>
                    <p className="text-xs line-height-3 m-0 text-color-secondary">
                      Your card is required to secure your plan but{" "}
                      <strong>will not be charged</strong> until your 30-day
                      free trial ends. You can cancel anytime before the trial
                      expires and you will never be billed.
                    </p>
                  </div>
                </div>

                {/* Plans */}
                {plansLoading ? (
                  <div className="flex justify-content-center py-4">
                    <ProgressSpinner
                      style={{ width: 40, height: 40 }}
                      strokeWidth="4"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">
                      Choose Plan <span className="sv-required">*</span>
                    </label>
                    <div className="flex flex-column gap-2">
                      {plans.map((plan) => {
                        const priceDollars =
                          plan.price_cents != null
                            ? (plan.price_cents / 100).toFixed(2)
                            : plan.price != null
                              ? plan.price.toFixed(2)
                              : "0.00";
                        return (
                          <div
                            key={plan.id}
                            className={`sv-plan-card ${selectedPlan?.id === plan.id ? "selected" : ""}`}
                            onClick={() => {
                              setSelectedPlan(plan);
                              setPromoResult(null);
                              setPromoCode("");
                            }}
                          >
                            <div className="flex align-items-center justify-content-between gap-3">
                              <div className="flex align-items-center gap-2 flex-1">
                                <RadioButton
                                  inputId={`plan-${plan.id}`}
                                  value={plan.id}
                                  onChange={() => {
                                    setSelectedPlan(plan);
                                    setPromoResult(null);
                                    setPromoCode("");
                                  }}
                                  checked={selectedPlan?.id === plan.id}
                                />
                                <div>
                                  <div className="font-semibold text-sm">
                                    {plan.name || plan.id}
                                  </div>
                                  {plan.description && (
                                    <div className="text-xs mt-1 sv-text-muted">
                                      {plan.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs font-semibold mb-1 sv-text-gain">
                                  Free for 30 days
                                </div>
                                <div className="text-xs sv-text-muted">
                                  then{" "}
                                  <span className="font-bold text-color">
                                    ${priceDollars}
                                  </span>
                                  {plan.frequency && `/${plan.frequency}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Promo Code */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Promo Code (optional)
                  </label>
                  <div className="flex gap-2">
                    <InputText
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoResult(null);
                      }}
                      placeholder="Enter promo code"
                      className="flex-1"
                    />
                    <Button
                      label={promoLoading ? "Checking..." : "Apply"}
                      className="p-button-outlined"
                      loading={promoLoading}
                      disabled={!promoCode.trim() || !selectedPlan}
                      onClick={handlePromoCode}
                    />
                  </div>
                  {promoResult && (
                    <div className="mt-2">
                      <Message
                        severity={promoResult.valid ? "success" : "error"}
                        text={
                          promoResult.valid &&
                          promoResult.discountedCents != null
                            ? `${promoResult.message} Discounted price: $${(promoResult.discountedCents / 100).toFixed(2)}${promoResult.durationMonths ? ` for ${promoResult.durationMonths} month(s)` : ""}`
                            : promoResult.message
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <Divider />

                {/* Card Details */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    Payment Details <span className="sv-required">*</span>
                  </label>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1 text-color-secondary">
                      Card Number
                    </label>
                    <input
                      type="text"
                      className="sv-card-field"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      maxLength={19}
                      onChange={(e) => {
                        const raw = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 16);
                        setCardNumber(raw.replace(/(.{4})/g, "$1 ").trim());
                      }}
                    />
                  </div>
                  <div className="grid">
                    <div className="col-4">
                      <label
                        className="block text-xs font-medium mb-1 text-color-secondary"
                      >
                        Exp Month
                      </label>
                      <input
                        type="text"
                        className="sv-card-field"
                        placeholder="MM"
                        value={cardExpMonth}
                        maxLength={2}
                        onChange={(e) =>
                          setCardExpMonth(
                            e.target.value.replace(/\D/g, "").slice(0, 2),
                          )
                        }
                      />
                    </div>
                    <div className="col-4">
                      <label
                        className="block text-xs font-medium mb-1 text-color-secondary"
                      >
                        Exp Year
                      </label>
                      <input
                        type="text"
                        className="sv-card-field"
                        placeholder="YYYY"
                        value={cardExpYear}
                        maxLength={4}
                        onChange={(e) =>
                          setCardExpYear(
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                          )
                        }
                      />
                    </div>
                    <div className="col-4">
                      <label
                        className="block text-xs font-medium mb-1 text-color-secondary"
                      >
                        CVC
                      </label>
                      <input
                        type="text"
                        className="sv-card-field"
                        placeholder="123"
                        value={cardCvc}
                        maxLength={4}
                        onChange={(e) =>
                          setCardCvc(
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                          )
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs mt-2 mb-0 flex align-items-center gap-1 sv-text-muted">
                    <i className="pi pi-lock sv-lock-icon" />
                    Your payment info is encrypted and processed securely via
                    Stripe.
                  </p>
                </div>

                <Divider />

                {/* Agreement */}
                <div className="mb-3 flex align-items-start gap-2">
                  <Checkbox
                    inputId="agree"
                    checked={agreed}
                    onChange={(e) => setAgreed(!!e.checked)}
                  />
                  <label
                    htmlFor="agree"
                    className="text-sm line-height-3 cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link to="/terms" className="sv-text-accent" target="_blank">
                      Terms of Service
                    </Link>
                  </label>
                </div>

                {/* Captcha */}
                <div className="mb-3 flex justify-content-center">
                  <ReCAPTCHA
                    ref={captchaRef}
                    key={captchaTheme}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY as string}
                    theme={captchaTheme}
                    onChange={handleCaptchaChange}
                    onExpired={handleCaptchaExpired}
                  />
                  {captchaError && (
                    <p className="text-xs mt-1 mb-0 sv-error-text">
                      {captchaError}
                    </p>
                  )}
                </div>

                {step3Error && (
                  <Message
                    severity="error"
                    text={step3Error}
                    className="w-full mb-3"
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    label="Back"
                    icon="pi pi-arrow-left"
                    className="p-button-outlined"
                    onClick={() => setStep(1)}
                    disabled={step3Loading}
                  />
                  <Button
                    label={
                      step3Loading ? "Creating account..." : "Create Account"
                    }
                    icon={step3Loading ? undefined : "pi pi-check"}
                    iconPos="right"
                    className="sv-grad-btn flex-1"
                    loading={step3Loading}
                    disabled={!agreed || !isCaptchaVerified}
                    onClick={handleRegister}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
