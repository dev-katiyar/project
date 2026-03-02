import React, { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";

// --------------- Types ---------------
interface FormState {
  userName: string;
  email: string;
  subject: string;
  body: string;
}

interface FieldError {
  userName?: string;
  email?: string;
  subject?: string;
  body?: string;
}

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

// --------------- Helpers ---------------
function validate(form: FormState): FieldError {
  const errors: FieldError = {};
  if (!form.userName.trim()) errors.userName = "Name is required.";
  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(form.email))
    errors.email = "Please enter a valid email.";
  if (!form.subject.trim()) errors.subject = "Subject is required.";
  else if (form.subject.trim().length < 2)
    errors.subject = "Subject must be at least 2 characters.";
  if (!form.body.trim()) errors.body = "Message is required.";
  else if (form.body.trim().length < 4)
    errors.body = "Message must be at least 4 characters.";
  return errors;
}

// --------------- Sub-components ---------------
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <small className="flex align-items-center gap-1 mt-1 sv-error-text">
      <i className="pi pi-exclamation-circle" /> {msg}
    </small>
  );
}

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex align-items-start gap-3 mb-4">
      <span className="sv-icon-badge flex align-items-center justify-content-center border-round-lg flex-shrink-0">
        <i className={`pi ${icon}`} />
      </span>
      <div>
        <div className="sv-info-label text-xs font-semibold mb-1">{label}</div>
        {children}
      </div>
    </div>
  );
}

// --------------- Page ---------------
const ContactPage: React.FC = () => {
  const toast = useRef<Toast>(null);
  const captchaRef = useRef<ReCAPTCHA>(null);

  const { theme } = useTheme();
  // reCAPTCHA only supports "dark" | "light"; dim counts as dark
  const captchaTheme = theme === "light" ? "light" : "dark";

  const [form, setForm] = useState<FormState>({
    userName: "",
    email: "",
    subject: "",
    body: "",
  });
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    userName: false,
    email: false,
    subject: false,
    body: false,
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Remount the widget (via key) when captchaTheme changes; reset verified state
  useEffect(() => {
    setIsCaptchaVerified(false);
    setCaptchaError("");
  }, [captchaTheme]);

  const handleChange = (field: keyof FormState, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) setErrors(validate(updated));
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(form));
  };

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
    setCaptchaError("Captcha expired. Please verify again.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ userName: true, email: true, subject: true, body: true });
    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    if (!isCaptchaVerified) {
      setCaptchaError("Please complete the reCAPTCHA verification.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post("/contact", { ...form, isCaptchaOK: true });
      if (res.data?.status === "ok") {
        setSubmitted(true);
        toast.current?.show({
          severity: "success",
          summary: "Message Sent!",
          detail: "Thanks for writing to us. We will get back to you ASAP.",
          life: 5000,
        });
        setForm({ userName: "", email: "", subject: "", body: "" });
        setTouched({
          userName: false,
          email: false,
          subject: false,
          body: false,
        });
        setErrors({});
        setIsCaptchaVerified(false);
        captchaRef.current?.reset();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Send Failed",
          detail: res.data?.status || "Something went wrong. Please try again.",
          life: 5000,
        });
      }
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Send Failed",
        detail: "Could not send your message. Please email us directly.",
        life: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("contact@simplevisor.com");
    toast.current?.show({
      severity: "success",
      summary: "Copied",
      detail: "Email address copied to clipboard.",
      life: 2000,
    });
  };

  const isFormValid =
    Object.keys(validate(form)).length === 0 && isCaptchaVerified;

  return (
    <div>
      <Toast ref={toast} position="top-right" />

      {/* ── Hero ── */}
      <div className="sv-hero text-center px-4 py-7 overflow-hidden relative">
        <div className="relative z-1">
          <i
            className="pi pi-envelope block mb-3"
            style={{ fontSize: "2.8rem", color: "rgba(255,255,255,0.9)" }}
          />
          <h1
            className="text-white font-bold mt-0 mb-2"
            style={{ fontSize: "2.25rem", letterSpacing: "-0.5px" }}
          >
            Contact Us
          </h1>
          <p className="mt-0 text-lg" style={{ color: "rgba(255,255,255,0.82)" }}>
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid mx-auto px-3 py-5 align-items-start" style={{ maxWidth: 1100 }}>
        {/* ── Sidebar ── */}
        <div className="col-12 md:col-4 lg:col-3">
          <div className="surface-card border-1 surface-border border-round-xl p-5 shadow-4 sv-sidebar-sticky">
            <h3 className="mt-0 mb-2 font-bold text-lg">Get in Touch</h3>
            <p className="mt-0 mb-0 text-sm text-color-secondary line-height-3">
              Drop us a note and our team will get back to you as soon as
              possible, usually within one business day.
            </p>

            <Divider />

            <InfoItem icon="pi-envelope" label="Email">
              <a
                href="mailto:contact@simplevisor.com?subject=[Simplevisor Support]"
                className="sv-accent-link text-sm"
              >
                contact@simplevisor.com
              </a>
              <button
                type="button"
                className="sv-icon-btn ml-1"
                onClick={copyEmail}
                title="Copy email"
              >
                <i className="pi pi-copy" />
              </button>
            </InfoItem>

            <InfoItem icon="pi-clock" label="Response Time">
              <span className="text-sm text-color-secondary">
                Within 1 business day
              </span>
            </InfoItem>

            <InfoItem icon="pi-shield" label="Support">
              <span className="text-sm text-color-secondary">
                Technical &amp; General Inquiries
              </span>
            </InfoItem>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="col-12 md:col-8 lg:col-9">
          {submitted && (
            <div className="sv-success-banner flex align-items-center gap-3 border-round-xl p-3 mb-3 text-sm">
              <i className="pi pi-check-circle text-xl flex-shrink-0" />
              <span>
                Your message was sent! We'll get back to you soon. You may send
                another message below.
              </span>
            </div>
          )}

          <div className="surface-card border-1 surface-border border-round-xl p-5 shadow-4">
            <h2 className="mt-0 mb-4 font-bold text-xl">Send a Message</h2>

            <form onSubmit={handleSubmit} noValidate>
              {/* Name + Email */}
              <div className="grid mb-0">
                <div className="col-12 md:col-6 mb-3">
                  <label
                    htmlFor="cf-name"
                    className="block font-semibold text-sm text-color-secondary mb-2"
                  >
                    Your Name <span className="sv-required">*</span>
                  </label>
                  <InputText
                    id="cf-name"
                    value={form.userName}
                    onChange={(e) => handleChange("userName", e.target.value)}
                    onBlur={() => handleBlur("userName")}
                    placeholder="John Smith"
                    className={`w-full${errors.userName && touched.userName ? " p-invalid" : ""}`}
                  />
                  <FieldError
                    msg={touched.userName ? errors.userName : undefined}
                  />
                </div>

                <div className="col-12 md:col-6 mb-3">
                  <label
                    htmlFor="cf-email"
                    className="block font-semibold text-sm text-color-secondary mb-2"
                  >
                    Your Email <span className="sv-required">*</span>
                  </label>
                  <InputText
                    id="cf-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    placeholder="john@example.com"
                    className={`w-full${errors.email && touched.email ? " p-invalid" : ""}`}
                  />
                  <FieldError msg={touched.email ? errors.email : undefined} />
                </div>
              </div>

              {/* Subject */}
              <div className="mb-3">
                <label
                  htmlFor="cf-subject"
                  className="block font-semibold text-sm text-color-secondary mb-2"
                >
                  Subject <span className="sv-required">*</span>
                </label>
                <InputText
                  id="cf-subject"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  onBlur={() => handleBlur("subject")}
                  placeholder="How can we help you?"
                  className={`w-full${errors.subject && touched.subject ? " p-invalid" : ""}`}
                />
                <FieldError
                  msg={touched.subject ? errors.subject : undefined}
                />
              </div>

              {/* Message */}
              <div className="mb-3">
                <label
                  htmlFor="cf-body"
                  className="block font-semibold text-sm text-color-secondary mb-2"
                >
                  Message <span className="sv-required">*</span>
                </label>
                <InputTextarea
                  id="cf-body"
                  value={form.body}
                  onChange={(e) => handleChange("body", e.target.value)}
                  onBlur={() => handleBlur("body")}
                  rows={7}
                  placeholder="Tell us more about your question or issue..."
                  className={`w-full${errors.body && touched.body ? " p-invalid" : ""}`}
                  style={{ resize: "vertical" }}
                />
                <div className="text-right text-xs text-color-secondary mt-1">
                  {form.body.length} characters
                </div>
                <FieldError msg={touched.body ? errors.body : undefined} />
              </div>

              {/* reCAPTCHA */}
              <div className="flex flex-column align-items-center gap-1 mb-4">
                <ReCAPTCHA
                  key={captchaTheme}
                  ref={captchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  onExpired={handleCaptchaExpired}
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

              {/* Submit */}
              <Button
                type="submit"
                label={isSubmitting ? "Sending…" : "Send Message"}
                icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-send"}
                iconPos="right"
                disabled={!isFormValid || isSubmitting}
                className="p-button-primary w-full"
              />
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ContactPage;
