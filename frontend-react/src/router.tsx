import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { ProgressSpinner } from "primereact/progressspinner";

// --------------- Lazy-loaded pages ---------------
const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const AiDashboardPage = lazy(() => import("@/pages/AiDashboardPage"));
const AiToolsPage = lazy(() => import("@/pages/AiToolsPage"));
const TvChartsPage = lazy(() => import("@/pages/TvChartsPage"));
const RelativeAbsoluteSectorsPage = lazy(() => import("@/pages/RelativeAbsoluteSectorsPage"));
const FactorAnalysisPage = lazy(() => import("@/pages/FactorAnalysisPage"));
const RiskRangeReportPage = lazy(() => import("@/pages/RiskRangeReportPage"));
const CreditSpreadReportPage = lazy(() => import("@/pages/CreditSpreadReportPage"));
const ScreensCombinedPage = lazy(() => import("@/pages/ScreensCombinedPage"));

// --------------- Loading fallback ---------------
const PageLoader: React.FC = () => (
  <div
    className="flex justify-content-center align-items-center"
    style={{ minHeight: "40vh" }}
  >
    <ProgressSpinner style={{ width: 50, height: 50 }} strokeWidth="3" />
  </div>
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const withProtection = (element: React.ReactNode) => (
  <ProtectedRoute>{withSuspense(element)}</ProtectedRoute>
);

// --------------- Router ---------------
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      // -------- Public routes --------
      { index: true, element: withSuspense(<HomePage />) },
      { path: "login", element: withSuspense(<LoginPage />) },
      { path: "signup", element: withSuspense(<RegisterPage />) },
      {
        path: "forgot-password",
        element: withSuspense(<ForgotPasswordPage />),
      },
      { path: "reset-password", element: withSuspense(<ResetPasswordPage />) },
      { path: "faq", element: withSuspense(<NotFoundPage />) }, // TODO
      { path: "contact-us", element: withSuspense(<ContactPage />) },
      { path: "terms", element: withSuspense(<TermsPage />) },
      { path: "weekly-report", element: withSuspense(<NotFoundPage />) }, // TODO

      // -------- Authenticated routes --------
      { path: "overview", element: withSuspense(<DashboardPage />) },
      { path: "majormarkets", element: withProtection(<DashboardPage />) }, // TODO
      { path: "markets", element: withProtection(<DashboardPage />) }, // TODO
      { path: "snp-sectors", element: withProtection(<NotFoundPage />) },
      { path: "marketinternals", element: withProtection(<NotFoundPage />) },
      { path: "holdingsmap", element: withProtection(<NotFoundPage />) },
      { path: "movers", element: withProtection(<NotFoundPage />) },
      { path: "overview-stock", element: withProtection(<NotFoundPage />) },
      { path: "tvcharts", element: withProtection(<TvChartsPage />) },
      { path: "stock-analysis", element: withProtection(<NotFoundPage />) },
      { path: "watchlist", element: withProtection(<NotFoundPage />) },
      { path: "alerts", element: withProtection(<NotFoundPage />) },
      { path: "portfolioscombined", element: withProtection(<NotFoundPage />) },
      {
        path: "portfolioscombined/:selPortType/:selPortId",
        element: withProtection(<NotFoundPage />),
      },
      { path: "aixgb-portfolios", element: withProtection(<NotFoundPage />) },
      { path: "linkedportfolio", element: withProtection(<NotFoundPage />) },
      { path: "screenscombined", element: withProtection(<ScreensCombinedPage />) },
      { path: "options", element: withProtection(<NotFoundPage />) },
      { path: "super-investor", element: withProtection(<NotFoundPage />) },
      {
        path: "super-investor/:code",
        element: withProtection(<NotFoundPage />),
      },
      { path: "factor-analysis", element: withProtection(<FactorAnalysisPage />) },
      { path: "risk-range-report", element: withProtection(<RiskRangeReportPage />) },
      { path: "credit-spead", element: withProtection(<CreditSpreadReportPage />) },
      { path: "backtesting", element: withProtection(<NotFoundPage />) },
      {
        path: "relative-absolute-analysis-sectors",
        element: withProtection(<RelativeAbsoluteSectorsPage />),
      },
      {
        path: "absolute-analysis-sectors",
        element: withProtection(<NotFoundPage />),
      },
      { path: "anomaly-spy", element: withProtection(<NotFoundPage />) },
      { path: "trade-signal-spy", element: withProtection(<NotFoundPage />) },
      { path: "ai-tools", element: withProtection(<AiToolsPage />) },
      { path: "ai-tools/:symbol", element: withProtection(<AiToolsPage />) },
      { path: "ai-dashbaord", element: withProtection(<AiDashboardPage />) },
      {
        path: "ai-models/:modelKey",
        element: withProtection(<NotFoundPage />),
      },
      { path: "ai-regime-charts", element: withProtection(<NotFoundPage />) },
      { path: "strategy-dashboard", element: withProtection(<NotFoundPage />) },
      { path: "sv-ideas", element: withProtection(<NotFoundPage />) },
      {
        path: "symbol-search/:searchText",
        element: withProtection(<NotFoundPage />),
      },
      { path: "profile", element: withProtection(<NotFoundPage />) },
      {
        path: "portfolio-integration",
        element: withProtection(<NotFoundPage />),
      },
      {
        path: "insights/latest-insights",
        element: withProtection(<NotFoundPage />),
      },
      { path: "news-rss", element: withProtection(<NotFoundPage />) },
      { path: "admin", element: withProtection(<NotFoundPage />) },
      { path: "admin-data", element: withProtection(<NotFoundPage />) },
      { path: "admin-dashboard", element: withProtection(<NotFoundPage />) },

      // -------- Catch-all --------
      { path: "*", element: withSuspense(<NotFoundPage />) },
    ],
  },
]);

export default router;
