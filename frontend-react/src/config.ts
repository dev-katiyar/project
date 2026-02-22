/**
 * Environment configuration.
 * Values come from Vite env variables or sensible defaults.
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  wordPressUrl:
    import.meta.env.VITE_WORDPRESS_URL || "https://realinvestmentadvice.com",
  recaptchaSiteKey:
    import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
    "6LeK8_YmAAAAABpMPMbeaT87IA9q0-gF_cXoAYxr",
  isProduction: import.meta.env.PROD,
} as const;
