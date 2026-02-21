import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppMainComponent } from './app.main.component';
import { LoginComponent } from './login/login.component';
import { WatchlistComponent } from './watchlist/watchlist.component';
import { AuthGuard } from './_guards';
import { SnpSectorsComponent } from './snp-sectors/snp-sectors.component';
import { ChartsComponent } from './charts/charts.component';
import { UserAlertsComponent } from './user-alerts/user-alerts.component';
import { ProfileComponent } from './profile/profile.component';
import { RegisterAgreementComponent } from './register-agreement/register-agreement.component';
import { FaqComponent } from './faq/faq.component';
import { UpgradeComponent } from './upgrade/upgrade.component';
import { ContactUsDiyComponent } from './contact-us-diy/contact-us-diy.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { OverviewBroadmarketsComponent } from './overview-broadmarkets/overview-broadmarkets.component';
import { OverviewIndicesComponent } from './overview-indices/overview-indices.component';
import { OptionsComponent } from './options/options.component';
import { saritasaRoutes } from './__saritasa/web/modules/saritasa.routes';
// Unused Components as of now
import { NewsRssComponent } from './news-rss/news-rss.component';
import { TestPlaceholderComponent } from './test-placeholder/test-placeholder.component';
import { LandingPageComponent } from './__saritasa/web/components/landing-page/landing-page.component';
import { HomePageComponent } from './__saritasa/web/components/home-page/home-page.component';
import { DefaultHomePageComponent } from './default-home-page/default-home-page.component';
import { TestPriyankaComponent } from './test-priyanka/test-priyanka.component';
import { TestAbhilashComponent } from './test-abhilash/test-abhilash.component';
import { TradeLandingPageComponent } from './trade-landing-page/trade-landing-page.component';
import { AdminComponent } from './admin/admin.component';
import { StrategyIdeasComponent } from './strategy-ideas/strategy-ideas.component';
import { ContactUsMessageComponent } from './contact-us-message/contact-us-message.component';
import { TvChartComponent } from './tv-chart/tv-chart.component';
import { WeeklyReportComponent } from './weekly-report/weekly-report.component';
import { StockAnalysisComponent } from './stock-analysis/stock-analysis.component';
import { AbsoluteAnalysisSectorsComponent } from './absolute-analysis-sectors/absolute-analysis-sectors.component';
import { AdminDataViewComponent } from './admin-data-view/admin-data-view.component';
import { SuperInvestorComponent } from './super-investor/super-investor.component';
import { FactorAnalysisComponent } from './factor-analysis/factor-analysis.component';
import { BacktestingComponent } from './backtesting/backtesting.component';
// import { PlaidContainerComponent } from './plaid-container/plaid-container.component';
import { PlaidIntegrationsComponent } from './plaid-integrations/plaid-integrations.component';
import { LinkedPortfolioComponent } from './linked-portfolio/linked-portfolio.component';
import { InsightsLatestComponent } from './insights-latest/insights-latest.component';
import { PortfolioCombinedComponent } from './portfolio-combined/portfolio-combined.component';
import { ScreensCombinedComponent } from './screens-combined/screens-combined.component';
import { MoversComponent } from './movers/movers.component';
import { HoldingsMapComponent } from './holdings-map/holdings-map.component';
import { StrategyDashboardComponent } from './strategy-dashboard/strategy-dashboard.component';
import { Register2024Component } from './register2024/register2024.component';
import { PasswordResetRequestComponent } from './password-reset-request/password-reset-request.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { AnomalySpyComponent } from './anomaly-spy/anomaly-spy.component';
import { TradeSignalComponent } from './trade-signal/trade-signal.component';
import { RiskRangeReportComponent } from './risk-range-report/risk-range-report.component';
import { PortfilioCombinedAixgbComponent } from './portfilio-combined-aixgb/portfilio-combined-aixgb.component';
import { AiModelsCombinedComponent } from './ai-models-combined/ai-models-combined.component';
import { MacrobondChartComponent } from './macrobond-chart/macrobond-chart.component';
import { MarketInternalsComponent } from './market-internals/market-internals.component';
import { RelativeAbsoluteSectorsComponent } from './relative-absolute-sectors/relative-absolute-sectors.component';
import { SymbolSearchComponent } from './symbol-search/symbol-search.component';
import { AiAgentDecisionsComponent } from './ai-agent-decisions/ai-agent-decisions.component';
import { AiAgentDecisionsDashboardComponent } from './ai-agent-decisions-dashboard/ai-agent-decisions-dashboard.component';
import { InvestingSolutionsInfoComponent } from './investing-solutions-info/investing-solutions-info.component';
import { CreditSpreadReportComponent } from './credit-spread-report/credit-spread-report.component';
import { ContactUsCombinedComponent } from './contact-us-combined/contact-us-combined.component';
import { ThoughtfulMoneyInfoComponent } from './thoughtful-money-info/thoughtful-money-info.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AiRegimeChartsComponent } from './ai-regime-charts/ai-regime-charts.component';

export const routes: Routes = [
  {
    path: '',
    component: AppMainComponent,
    children: [
      {
        path: 'pri-test',
        component: TestPriyankaComponent,
        canActivate: [AuthGuard],
        data: { title: 'Priyanka Test' },
      },
      {
        path: 'testak',
        component: TestAbhilashComponent,
        canActivate: [AuthGuard],
        data: { title: 'Test AK' },
      },
      {
        path: 'wip',
        component: TestPlaceholderComponent,
        canActivate: [AuthGuard],
        data: { title: 'Wrok In Progress' },
      },
      {
        path: 'insights/latest-insights',
        component: InsightsLatestComponent,
        canActivate: [AuthGuard],
        data: { title: 'Latest Insights' },
      },
      {
        path: 'admin-data',
        component: AdminDataViewComponent,
        canActivate: [AuthGuard],
        data: { title: 'Admin Data' },
      },
      {
        path: 'admin-dashboard',
        component: AdminDashboardComponent,
        canActivate: [AuthGuard],
        data: { title: 'Admin Dashboard' },
      },
      {
        path: 'overview',
        component: DefaultHomePageComponent,
        canActivate: [AuthGuard],
        data: { title: 'Home' },
      },
      {
        path: 'strategy-dashboard',
        component: StrategyDashboardComponent,
        canActivate: [AuthGuard],
        data: { title: 'Strategy Builder Dashboard' },
      },
      {
        path: 'sv-ideas',
        component: StrategyIdeasComponent,
        canActivate: [AuthGuard],
        data: { title: 'Strategy Ideas' },
      },
      {
        path: 'trade-landing',
        component: TradeLandingPageComponent,
        canActivate: [AuthGuard],
        data: { title: 'Trade landing Page' },
      },
      {
        path: 'message',
        component: ContactUsMessageComponent,
        data: { title: 'Message' },
      },
      {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: { title: 'Admin Page' },
      },
      {
        path: 'majormarkets',
        component: OverviewIndicesComponent,
        canActivate: [AuthGuard],
        data: { title: 'Major Markets' },
      },
      {
        path: 'snp-sectors',
        component: SnpSectorsComponent,
        canActivate: [AuthGuard],
        data: { title: 'S&P Sectors' },
      },
      {
        path: 'marketinternals',
        component: MarketInternalsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Sentiment' },
      },
      {
        path: 'holdingsmap',
        component: HoldingsMapComponent,
        canActivate: [AuthGuard],
        data: { title: 'Holdings Map' },
      },
      {
        path: 'movers',
        component: MoversComponent,
        canActivate: [AuthGuard],
        data: { title: 'Movers' },
      },
      {
        path: 'markets',
        component: OverviewBroadmarketsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Broad Market' },
      },
      {
        path: 'upgrade/:userId',
        component: UpgradeComponent,
        data: { title: 'Upgrade' },
      },
      {
        path: 'overview-stock',
        component: ChartsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Research - Stock' },
      },
      {
        path: 'tvcharts',
        component: TvChartComponent,
        canActivate: [AuthGuard],
        data: { title: 'Chart' },
      },
      {
        path: 'linkedportfolio',
        component: LinkedPortfolioComponent,
        canActivate: [AuthGuard],
        data: { title: 'Linked Portfolios' },
      },
      {
        path: 'watchlist',
        component: WatchlistComponent,
        canActivate: [AuthGuard],
        data: { title: 'Watchlists' },
      },
      {
        path: 'alerts',
        component: UserAlertsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Alerts' },
      },
      {
        path: 'agreement',
        component: RegisterAgreementComponent,
        data: { title: 'Agreement' },
      },
      {
        path: '',
        component: HomePageComponent,
        data: { title: 'Home' },
      },
      {
        path: 'news-rss',
        component: NewsRssComponent,
        canActivate: [AuthGuard],
        data: { title: 'News' },
      },
      {
        path: 'faq',
        component: FaqComponent,
        data: { title: 'FAQs' },
      },
      {
        path: 'contact-us',
        component: ContactUsDiyComponent,
        data: { title: 'Contact Us' },
      },
      {
        path: 'contact-us-cmb',
        component: ContactUsCombinedComponent,
        data: { title: 'Contact Us' },
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [AuthGuard],
        data: { title: 'My Account' },
      },
      {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        data: { title: 'Reset Password' },
      },
      {
        path: 'options',
        component: OptionsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Options' },
      },
      {
        path: 'landing',
        component: LandingPageComponent,
        canActivate: [AuthGuard],
        data: { title: 'Trade' },
      },
      {
        path: 'relative-absolute-analysis-sectors',
        component: RelativeAbsoluteSectorsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Relative vs. Absolute Analysis - Sectors' },
      },
      {
        path: 'absolute-analysis-sectors',
        component: AbsoluteAnalysisSectorsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Absolute Analysis - Sectors' },
      },
      {
        path: 'stock-analysis',
        component: StockAnalysisComponent,
        canActivate: [AuthGuard],
        data: { title: 'Stock Analysis' },
      },
      {
        path: 'weekly-report',
        component: WeeklyReportComponent,
        data: { title: 'Weekly Report' },
      },
      {
        path: 'super-investor/:code',
        component: SuperInvestorComponent,
        canActivate: [AuthGuard],
        data: { title: 'Super Investor' },
      },
      {
        path: 'super-investor',
        component: SuperInvestorComponent,
        canActivate: [AuthGuard],
        data: { title: 'Super Investor' },
      },
      {
        path: 'factor-analysis',
        component: FactorAnalysisComponent,
        canActivate: [AuthGuard],
        data: { title: 'Factor Analysis' },
      },
      {
        path: 'risk-range-report',
        component: RiskRangeReportComponent,
        canActivate: [AuthGuard],
        data: { title: 'Risk Range Report' },
      },
      {
        path: 'backtesting',
        component: BacktestingComponent,
        canActivate: [AuthGuard],
        data: { title: 'Factor Analysis' },
      },
      {
        path: 'portfolio-integration',
        component: PlaidIntegrationsComponent,
        canActivate: [AuthGuard],
        data: { title: 'Factor Analysis' },
      },
      {
        path: 'portfolioscombined/:selPortType/:selPortId',
        component: PortfolioCombinedComponent,
        canActivate: [AuthGuard],
        data: { title: 'Portfolios' },
      },
      {
        path: 'ai-models/:modelKey',
        component: AiModelsCombinedComponent,
        canActivate: [AuthGuard],
        data: { title: 'AI Models' },
      },
      {
        path: 'portfolioscombined',
        component: PortfolioCombinedComponent,
        canActivate: [AuthGuard],
        data: { title: 'Portfolios' },
      },
      {
        path: 'screenscombined',
        component: ScreensCombinedComponent,
        canActivate: [AuthGuard],
        data: { title: 'Screens' },
      },
      {
        path: 'aixgb-portfolios',
        component: PortfilioCombinedAixgbComponent,
        canActivate: [AuthGuard],
        data: { title: 'AI Portfolios' },
      },
      {
        path: 'anomaly-spy',
        component: AnomalySpyComponent,
        canActivate: [AuthGuard],
        data: { title: 'S&P Anomaly Detection Chart' },
      },
      {
        path: 'trade-signal-spy',
        component: TradeSignalComponent,
        canActivate: [AuthGuard],
        data: { title: 'S&P AI Trade Signals' },
      },
      {
        path: 'symbol-search/:searchText',
        component: SymbolSearchComponent,
        canActivate: [AuthGuard],
        data: { title: 'Symbol Search - Advanced' },
      },
      {
        path: 'investing-solutions-info',
        component: InvestingSolutionsInfoComponent,
        data: { title: 'Investing Solutions - Introduction' },
      },
      {
        path: 'simplevisor-thoughtfulmoney',
        component: ThoughtfulMoneyInfoComponent,
        data: { title: 'SimpleVisor Thoughtful Money - Introduction' },
      },
      {
        path: 'register2024',
        component: Register2024Component,
        data: { title: 'Registeration' },
      },
      {
        path: 'reset-password-request',
        component: PasswordResetRequestComponent,
        data: { title: 'Reset Password Request' },
      },
      {
        path: 'reset-password',
        component: PasswordResetComponent,
        data: { title: 'Reset Password' },
      },
      // {
      //   path: 'macrobond-chart',
      //   component: MacrobondChartComponent,
      //   data: { title: 'MacroBond Charts' },
      // },
      {
        path: 'ai-tools',
        component: AiAgentDecisionsComponent,
        canActivate: [AuthGuard],
        data: { title: 'AI Tools' },
      },
      {
        path: 'ai-tools/:symbol',
        component: AiAgentDecisionsComponent,
        canActivate: [AuthGuard],
        data: { title: 'AI Tools' },
      },
      {
        path: 'ai-dashbaord',
        component: AiAgentDecisionsDashboardComponent,
        canActivate: [AuthGuard],
        data: { title: 'AI Tools' },
      },
      {
        path: 'ai-regime-charts',
        component: AiRegimeChartsComponent,
        canActivate: [AuthGuard],
        data: { title: 'AI Regime Analysis Charts' },
      },
      {
        path: 'credit-spead',
        component: CreditSpreadReportComponent,
        canActivate: [AuthGuard],
        data: { title: 'Credit Spread Report' },
      },

      ...saritasaRoutes,
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
    data: { title: 'Login In' },
  },
  {
    // this link is being used from the automation job. Do not delete
    path: 'weekly-report-print',
    component: WeeklyReportComponent,
    data: { title: 'Weekly Report' },
  },
  {
    path: 'signup',
    component: Register2024Component,
    data: { title: 'Sign Up' },
  },
  {
    path: 'agreement',
    component: RegisterAgreementComponent,
    data: { title: 'Agreement' },
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top', useHash: false })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
