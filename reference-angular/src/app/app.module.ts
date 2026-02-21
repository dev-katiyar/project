import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { BadgeModule } from 'primeng/badge';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DataViewModule } from 'primeng/dataview';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { InplaceModule } from 'primeng/inplace';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputMaskModule } from 'primeng/inputmask';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { KnobModule } from 'primeng/knob';
import { ListboxModule } from 'primeng/listbox';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { OrderListModule } from 'primeng/orderlist';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { PanelMenuModule } from 'primeng/panelmenu';
import { PasswordModule } from 'primeng/password';
import { PickListModule } from 'primeng/picklist';
import { ProgressBarModule } from 'primeng/progressbar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ScrollTopModule } from 'primeng/scrolltop';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { SliderModule } from 'primeng/slider';
import { SplitButtonModule } from 'primeng/splitbutton';
import { SplitterModule } from 'primeng/splitter';
import { StepsModule } from 'primeng/steps';
import { TabMenuModule } from 'primeng/tabmenu';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { TerminalModule } from 'primeng/terminal';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';
import { AppCodeModule } from './app.code.component';
import { AppComponent } from './app.component';
import { AppMainComponent } from './app.main.component';
import { AppConfigComponent } from './app.config.component';
import { MenuComponent } from './menu/menu.component';
import { MenuItemComponent } from './menu/menu-item/menu-item.component';
import { AppTopBarComponent } from './app.topbar.component';
import { AppFooterComponent } from './app.footer.component';
import { AppBreadcrumbService } from './app.breadcrumb.service';
import { MenuService } from './app.menu.service';
import { LoginComponent } from './login/login.component';
import { JwtInterceptor, LoaderInterceptor } from './_helpers/index';
import { LoaderService } from './services/loader.service';
import { AuthGuard } from './_guards/index';
import { AuthenticationService, UserService } from './_services/index';
import { LiveService } from './services/live.service';
import { UserTypeService } from './services/user-type.service';
import { ZachService } from './services/zach.service';
import { PortfolioService } from './services/portfolio.service';
import { TechnicalService } from './services/technical.service';
import { HighchartsService } from './services/highcharts.service';
import { PlaidService } from './services/plaid.service';

import { AlertService } from './services/alert.service';
import { NewsService } from './services/news.service';
import { NotificationService } from './services/notification.service';
import { WatchlistComponent } from './watchlist/watchlist.component';
import { TechnicalDataTableComponent } from './common-components/technical-datatable/technical-datatable.component';
import { StocksAutocompleteComponent } from './common-components/stocks-autocomplete/stocks-autocomplete.component';
import { TechAlertsComponent } from './common-components/tech-alerts/tech-alerts.component';
import { DividendHistoryComponent } from './common-components/dividend-history/dividend-history.component';
import { MessageService } from 'primeng/api';
import { ChartModule } from 'primeng/chart';
import { ChartModule as HighChartModule, HIGHCHARTS_MODULES } from 'angular-highcharts';
import * as highstock from 'highcharts/modules/stock.src';
import * as more from 'highcharts/highcharts-more.src';
import * as solidgauge from 'highcharts/modules/solid-gauge';
import * as annotations from 'highcharts/modules/annotations';
import * as treemap from 'highcharts/modules/treemap';

import { TestAbhilashComponent } from './test-abhilash/test-abhilash.component';
import { BarChartComponent } from './common-components/bar-chart/bar-chart.component';
import { NewsTableComponent } from './common-components/news-table/news-table.component';
import { ChartFullViewComponent } from './chart-full-view/chart-full-view.component';
import { LineChartComponent } from './common-components/line-chart/line-chart.component';
import { ChartSectorHeatmapComponent } from './chart-sector-heatmap/chart-sector-heatmap.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { SynopsisComponent } from './common-components/synopsis/synopsis.component';
import { ChartTwoDComponent } from './common-components/chart-two-d/chart-two-d.component';
import { StocksGaugeComponent } from './common-components/stocks-gauge/stocks-gauge.component';
import { EarningHistoryComponent } from './common-components/earning-history/earning-history.component';
import { DataTableTrendsComponent } from './common-components/data-table-trends/data-table-trends.component';
import { StocksTreemapComponent } from './common-components/stocks-treemap/stocks-treemap.component';
import { OverviewIndicesComponent } from './overview-indices/overview-indices.component';
import { OverviewBroadmarketsComponent } from './overview-broadmarkets/overview-broadmarkets.component';
import { DataTableTechnicalComponent } from './common-components/data-table-technical/data-table-technical.component';
import { ScripthackComponent } from './common-components/scripthack/scripthack.component';
import { TradingviewChartComponent } from './common-components/tradingview-chart/tradingview-chart.component';
import { MarketInternalsComponent } from './market-internals/market-internals.component';
import { SnpSectorsComponent } from './snp-sectors/snp-sectors.component';
import { SnpSectorsRsComponent } from './snp-sectors-rs/snp-sectors-rs.component';
import { SnpSectorsMomentumComponent } from './snp-sectors-momentum/snp-sectors-momentum.component';
import { MomentumComponent } from './common-components/momentum/momentum.component';
import { SnpSectorsHomeComponent } from './snp-sectors-home/snp-sectors-home.component';
import { SectorHeatmapComponent } from './sector-heatmap/sector-heatmap.component';
import { EtfRelativeStrengthComponent } from './etf-relative-strength/etf-relative-strength.component';
import { GaugeBarCombinedComponent } from './common-components/gauge-bar-combined/gauge-bar-combined.component';
import { ChartsComponent } from './charts/charts.component';
import { SymbolDetailsComponent } from './common-components/symbol-details/symbol-details.component';
import { InvestingComponent } from './common-components/investing/investing.component';
import { TechnicalAnalysisComponent } from './common-components/technical-analysis/technical-analysis.component';
import { FundamentalComponent } from './common-components/fundamental/fundamental.component';
import { AnalystComponent } from './common-components/analyst/analyst.component';
import { ClassPipe } from './pipes/class.pipe';
import { PercentPipe } from './pipes/percent.pipe';
import { NewsRssComponent } from './news-rss/news-rss.component';
import { UpgradeComponent } from './upgrade/upgrade.component';
import { TabComponent } from './tab/tab.component';
import { TabsComponent } from './tabs/tabs.component';
import { UserAlertsComponent } from './user-alerts/user-alerts.component';
import { OpenpositionsComponent } from './openpositions/openpositions.component';
import { ModelPortfolioHistoryChartComponent } from './model-portfolio-history-chart/model-portfolio-history-chart.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { ClosedpositionsComponent } from './closedpositions/closedpositions.component';
import { FundamentalAnalysisComponent } from './fundamental-analysis/fundamental-analysis.component';
import { FundamentalDatatableComponent } from './fundamental-datatable/fundamental-datatable.component';
import { ImportTransactionsComponent } from './import-transactions/import-transactions.component';
import { ClosetransactionsComponent } from './closetransactions/closetransactions.component';
import { TestPriyankaComponent } from './test-priyanka/test-priyanka.component';
import { ProfileComponent } from './profile/profile.component';
import { RegisterAgreementComponent } from './register-agreement/register-agreement.component';
import { FaqComponent } from './faq/faq.component';
import { ContactUsDiyComponent } from './contact-us-diy/contact-us-diy.component';
import { SymbolDetailModalComponent } from './common-components/symbol-detail-modal/symbol-detail-modal.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LivePricesComponent } from './live-prices/live-prices.component';
import { TechAlertsListComponent } from './common-components/tech-alerts-list/tech-alerts-list.component';
import { ManagePortfoliosComponent } from './manage-portfolios/manage-portfolios.component';
import { ConfirmationService } from 'primeng/api';
import { KeystatsComponent } from './keystats/keystats.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { PaymentComponent } from './payment/payment.component';
import { ImportTransactionComponent } from './import-transaction/import-transaction.component';
import { WatchlistAddComponent } from './watchlist-add/watchlist-add.component';
import { OptionsComponent } from './options/options.component';
import { TradingTicketComponent } from './trading-ticket/trading-ticket.component';
import { MatIconModule } from '@angular/material/icon';
import { SaritasaModule } from './__saritasa/web/saritasa.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SymbolLiveComponent } from './symbol-live/symbol-live.component';
import { TradingTicketMultiComponent } from './trading-ticket-multi/trading-ticket-multi.component';
import { EmailsComponent } from './emails/emails.component';
import { FuturesComponent } from './futures/futures.component';
import { UpDownColorPipe } from './up-down-color.pipe';
import { InsiderDatatableComponent } from './insider-datatable/insider-datatable.component';
import { StrategyRiaproChartComponent } from './strategy-riapro-chart/strategy-riapro-chart.component';
import { RatingBarComponent } from './rating-bar/rating-bar.component';
import { SectorPerformanceComponent } from './sector-performance/sector-performance.component';
import { BubbleChartComponent } from './bubble-chart/bubble-chart.component';
import { CompositeChartComponent } from './composite-chart/composite-chart.component';
import { BarChart2Component } from './bar-chart2/bar-chart2.component';
import { HeatChartComponent } from './heat-chart/heat-chart.component';
import { DatatableTechnical2Component } from './datatable-technical2/datatable-technical2.component';
import { CompositeChartTableComponent } from './composite-chart-table/composite-chart-table.component';
import { NewsTable2Component } from './news-table2/news-table2.component';
import { DatatableFundamentalsComponent } from './datatable-fundamentals/datatable-fundamentals.component';
import { ShortNumberPipe } from './pipes/short-number.pipe';
import { KeyObjectPipe } from './pipes/keyobject.pipe';
import { DefaultHomePageComponent } from './default-home-page/default-home-page.component';
import { DatatablePerformanceComponent } from './datatable-performance/datatable-performance.component';
import { DatatableOverviewComponent } from './datatable-overview/datatable-overview.component';
import { EditSnapshotPortfolioComponent } from './edit-snapshot-portfolio/edit-snapshot-portfolio.component';
import { DynamicTableComponent } from './dynamic-table/dynamic-table.component';
import { TradeLandingPageComponent } from './trade-landing-page/trade-landing-page.component';
import { AdminComponent } from './admin/admin.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminAddSymbolsComponent } from './admin-add-symbols/admin-add-symbols.component';
import { StrategyBuilderComponent } from './strategy-builder/strategy-builder.component';
import { StrategySettingsComponent } from './strategy-settings/strategy-settings.component';
import { SvStrategyItemComponent } from './sv-strategy-item/sv-strategy-item.component';
import { SvIndicatorsComponent } from './sv-indicators/sv-indicators.component';
import { StrategyIdeasComponent } from './strategy-ideas/strategy-ideas.component';
import { StrategyChartComponent } from './strategy-chart/strategy-chart.component';
import { ContactUsMessageComponent } from './contact-us-message/contact-us-message.component';
import { StockOverviewComponent } from './stock-overview/stock-overview.component';
import { TvChartContainerComponent } from './tv-chart-container/tv-chart-container.component';
import { TvChartComponent } from './tv-chart/tv-chart.component';
import { RelativeAnalysisHeatmapComponent } from './relative-analysis-heatmap/relative-analysis-heatmap.component';
import { FundDetailsComponent } from './fund-details/fund-details.component';
import { FundOverviewComponent } from './fund-overview/fund-overview.component';
import { RelativeAnalysisChartComponent } from './relative-analysis-chart/relative-analysis-chart.component';
import { RelativeAnalysisHeatmapSymbolsComponent } from './relative-analysis-heatmap-symbols/relative-analysis-heatmap-symbols.component';
import { EmailNotificationPreferenceComponent } from './email-notification-preference/email-notification-preference.component';
import { WeeklyReportComponent } from './weekly-report/weekly-report.component';
import { StockHoldersStatsComponent } from './stock-holders-stats/stock-holders-stats.component';
import { StockAnalysisComponent } from './stock-analysis/stock-analysis.component';
import { OverviewNotablemovesEtfComponent } from './overview-notablemoves-etf/overview-notablemoves-etf.component';
import { AbsoluteAnalysisChartComponent } from './absolute-analysis-chart/absolute-analysis-chart.component';
import { AbsoluteAnalysisSectorsComponent } from './absolute-analysis-sectors/absolute-analysis-sectors.component';
import { AbsoluteAnalysisHeatmapComponent } from './absolute-analysis-heatmap/absolute-analysis-heatmap.component';
import { FundOverviewAbsoluteComponent } from './fund-overview-absolute/fund-overview-absolute.component';
import { AbsoluteAnalysisHeatmapSymbolsComponent } from './absolute-analysis-heatmap-symbols/absolute-analysis-heatmap-symbols.component';
import { TableChartFundamentalsComponent } from './table-chart-fundamentals/table-chart-fundamentals.component';
import { ChartFundamentalsComponent } from './chart-fundamentals/chart-fundamentals.component';
import { FairvalueChartComponent } from './fairvalue-chart/fairvalue-chart.component';
import { AdminDataViewComponent } from './admin-data-view/admin-data-view.component';
import * as Highcharts from 'highcharts';
import { SuperInvestorComponent } from './super-investor/super-investor.component';
import { SuperInvestorPortfolioComponent } from './super-investor-portfolio/super-investor-portfolio.component';
import { FactorAnalysisComponent } from './factor-analysis/factor-analysis.component';
import { ShortInterestComponent } from './short-interest/short-interest.component';
import { StockOptionsComponent } from './stock-options/stock-options.component';
import { SmsNotificationPrreferenceComponent } from './sms-notification-prreference/sms-notification-prreference.component';
import { BacktestingComponent } from './backtesting/backtesting.component';
import { PlaidContainerComponent } from './plaid-container/plaid-container.component';
import { PlaidIntegrationsComponent } from './plaid-integrations/plaid-integrations.component';
import { LinkedPortfolioComponent } from './linked-portfolio/linked-portfolio.component';
import { LivePricesBondsComponent } from './live-prices-bonds/live-prices-bonds.component';
import { LivePricesMostActiveComponent } from './live-prices-mostactive/live-prices-mostactive.component';
import { LivePrices2Component } from './live-prices2/live-prices2.component';
import { LivePricesSectorsComponent } from './live-prices-sectors/live-prices-sectors.component';
import { StocksMapComponent } from './stocks-map/stocks-map.component';
import { LivePricesRsiComponent } from './live-prices-rsi/live-prices-rsi.component';
import { LivePricesMacdmomComponent } from './live-prices-macdmom/live-prices-macdmom.component';
import { LivePricesRsComponent } from './live-prices-rs/live-prices-rs.component';
import { GaugeSpeedComponent } from './gauge-speed/gauge-speed.component';
import { PortfolioSummaryComponent } from './portfolio-summary/portfolio-summary.component';
import { LatestInsightsHorizontalComponent } from './latest-insights-horizontal/latest-insights-horizontal.component';
import { InsightsLatestComponent } from './insights-latest/insights-latest.component';
import { PortfolioCombinedComponent } from './portfolio-combined/portfolio-combined.component';
import { PortfolioSummary2Component } from './portfolio-summary2/portfolio-summary2.component';
import { ModelPortfolio2023Component } from './model-portfolio2023/model-portfolio2023.component';
import { EditTransactionsComponent } from './edit-transactions/edit-transactions.component';
import { RelativeAbsoluteEtfComponent } from './relative-absolute-etf/relative-absolute-etf.component';
import { StrategyChart2024Component } from './strategy-chart2024/strategy-chart2024.component';
import { ScreensCombinedComponent } from './screens-combined/screens-combined.component';
import { ScreensSummaryComponent } from './screens-summary/screens-summary.component';
import { ScreenFilter2024Component } from './screen-filter2024/screen-filter2024.component';
import { StockFundamentalsComponent } from './stock-fundamentals/stock-fundamentals.component';
import { TechnicalStrengthComponent } from './technical-strength/technical-strength.component';
import { TechnnicalRatingComponent } from './technnical-rating/technnical-rating.component';
import { RsiRatingComponent } from './rsi-rating/rsi-rating.component';
import { MoversComponent } from './movers/movers.component';
import { HoldingsMapComponent } from './holdings-map/holdings-map.component';
import { StrategyDashboardComponent } from './strategy-dashboard/strategy-dashboard.component';
import { SvMoneyflow2Component } from './sv-moneyflow2/sv-moneyflow2.component';
import { SvMoneyflow1Component } from './sv-moneyflow1/sv-moneyflow1.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { NotificationPrefSwitchComponent } from './notification-pref-switch/notification-pref-switch.component';
import { NewTableRssComponent } from './new-table-rss/new-table-rss.component';
import { HelpIconComponent } from './help-icon/help-icon.component';
import { SvMoneyflow3Component } from './sv-moneyflow3/sv-moneyflow3.component';
import { RelativeAbsoluteScoreMeterComponent } from './relative-absolute-score-meter/relative-absolute-score-meter.component';
import { EtfYheodOverviewComponent } from './etf-yheod-overview/etf-yheod-overview.component';
import { Register2024Component } from './register2024/register2024.component';
import { SvIntroVideoComponent } from './sv-intro-video/sv-intro-video.component';
import { PasswordResetRequestComponent } from './password-reset-request/password-reset-request.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { AnomalySpyComponent } from './anomaly-spy/anomaly-spy.component';
import { UserRiskProfileComponent } from './user-risk-profile/user-risk-profile.component';
import { TradeSignalComponent } from './trade-signal/trade-signal.component';
import { RiskRangeReportComponent } from './risk-range-report/risk-range-report.component';
import { MarketSummaryWidgetComponent } from './market-summary-widget/market-summary-widget.component';
import { PortfilioCombinedAixgbComponent } from './portfilio-combined-aixgb/portfilio-combined-aixgb.component';
import { AiModelsCombinedComponent } from './ai-models-combined/ai-models-combined.component';
import { AiModelDetailsComponent } from './ai-model-details/ai-model-details.component';
import { FactorAnalysisViewComponent } from './factor-analysis-view/factor-analysis-view.component';
import { MacrobondChartComponent } from './macrobond-chart/macrobond-chart.component';
import { RiskRangeReportViewComponent } from './risk-range-report-view/risk-range-report-view.component';
import { RelativeAbsoluteSectorsComponent } from './relative-absolute-sectors/relative-absolute-sectors.component';
import { SymbolSearchComponent } from './symbol-search/symbol-search.component';
import { AiAgentDecisionsComponent } from './ai-agent-decisions/ai-agent-decisions.component';
import { ChartDescisionDialComponent } from './chart-descision-dial/chart-descision-dial.component';
import { AiAgentDecisionsDashboardComponent } from './ai-agent-decisions-dashboard/ai-agent-decisions-dashboard.component';
import { InvestingSolutionsInfoComponent } from './investing-solutions-info/investing-solutions-info.component';
import { AiAgentDecisionsHelptextComponent } from './ai-agent-decisions-helptext/ai-agent-decisions-helptext.component';
import { CardComponent } from './card/card.component';
import { CreditSpreadReportComponent } from './credit-spread-report/credit-spread-report.component';
import { CreditSpreadChartComponent } from './credit-spread-chart/credit-spread-chart.component';
import { ContactUsInvestingComponent } from './contact-us-investing/contact-us-investing.component';
import { ContactUsCombinedComponent } from './contact-us-combined/contact-us-combined.component';
import { RecaptchaModule } from 'ng-recaptcha-2';
import { ThoughtfulMoneyInfoComponent } from './thoughtful-money-info/thoughtful-money-info.component';
import { AnnouncementBannerComponent } from './announcement-banner/announcement-banner.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminUserExitFeedbackComponent } from './admin-user-exit-feedback/admin-user-exit-feedback.component';
import { AiRegimeChartsComponent } from './ai-regime-charts/ai-regime-charts.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';

Highcharts.setOptions({
  lang: {
    numericSymbols: [' k', ' mn', ' bn', ' tn'],
    thousandsSep: ',',
  },
});

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  declarations: [
    AppComponent,
    AppMainComponent,
    MenuComponent,
    MenuItemComponent,
    AppConfigComponent,
    AppTopBarComponent,
    AppFooterComponent,
    LoginComponent,
    WatchlistComponent,
    TechnicalDataTableComponent,
    StocksAutocompleteComponent,
    TechAlertsComponent,
    DividendHistoryComponent,
    TestAbhilashComponent,
    BarChartComponent,
    NewsTableComponent,
    ChartFullViewComponent,
    LineChartComponent,
    ChartSectorHeatmapComponent,
    SynopsisComponent,
    ChartTwoDComponent,
    StocksGaugeComponent,
    EarningHistoryComponent,
    SpinnerComponent,
    DataTableTrendsComponent,
    StocksTreemapComponent,
    OverviewIndicesComponent,
    OverviewBroadmarketsComponent,
    DataTableTechnicalComponent,
    ScripthackComponent,
    TradingviewChartComponent,
    MarketInternalsComponent,
    SnpSectorsComponent,
    SnpSectorsRsComponent,
    SnpSectorsMomentumComponent,
    MomentumComponent,
    SnpSectorsHomeComponent,
    SectorHeatmapComponent,
    EtfRelativeStrengthComponent,
    GaugeBarCombinedComponent,
    ClassPipe,
    PercentPipe,
    ChartsComponent,
    SymbolDetailsComponent,
    InvestingComponent,
    TechnicalAnalysisComponent,
    FundamentalComponent,
    AnalystComponent,
    NewsRssComponent,
    UpgradeComponent,
    TabComponent,
    TabsComponent,
    UserAlertsComponent,
    OpenpositionsComponent,
    ModelPortfolioHistoryChartComponent,
    TransactionsComponent,
    ClosedpositionsComponent,
    FundamentalAnalysisComponent,
    FundamentalDatatableComponent,
    ImportTransactionsComponent,
    ClosetransactionsComponent,
    TestPriyankaComponent,
    RegisterAgreementComponent,
    FaqComponent,
    ContactUsDiyComponent,
    SymbolDetailModalComponent,
    ForgotPasswordComponent,
    DashboardComponent,
    LivePricesComponent,
    TechAlertsListComponent,
    ManagePortfoliosComponent,
    KeystatsComponent,
    ProfileComponent,
    SubscriptionComponent,
    PaymentComponent,
    ImportTransactionComponent,
    WatchlistAddComponent,
    OptionsComponent,
    TradingTicketComponent,
    TradingTicketMultiComponent,
    FuturesComponent,
    SymbolLiveComponent,
    TradingTicketMultiComponent,
    EmailsComponent,
    UpDownColorPipe,
    InsiderDatatableComponent,
    StrategyRiaproChartComponent,
    RatingBarComponent,
    SectorPerformanceComponent,
    BubbleChartComponent,
    CompositeChartComponent,
    BarChart2Component,
    HeatChartComponent,
    DatatableTechnical2Component,
    CompositeChartTableComponent,
    NewsTable2Component,
    DatatableFundamentalsComponent,
    ShortNumberPipe,
    KeyObjectPipe,
    DefaultHomePageComponent,
    DatatablePerformanceComponent,
    DatatableOverviewComponent,
    EditSnapshotPortfolioComponent,
    DynamicTableComponent,
    TradeLandingPageComponent,
    AdminComponent,
    AdminUsersComponent,
    AdminAddSymbolsComponent,
    AdminDashboardComponent,
    ContactUsMessageComponent,
    StrategyBuilderComponent,
    StrategySettingsComponent,
    SvStrategyItemComponent,
    SvIndicatorsComponent,
    StrategyIdeasComponent,
    StrategyChartComponent,
    StockOverviewComponent,
    TvChartContainerComponent,
    TvChartComponent,
    RelativeAnalysisHeatmapComponent,
    FundDetailsComponent,
    FundOverviewComponent,
    RelativeAnalysisChartComponent,
    RelativeAnalysisHeatmapSymbolsComponent,
    EmailNotificationPreferenceComponent,
    WeeklyReportComponent,
    StockHoldersStatsComponent,
    StockAnalysisComponent,
    OverviewNotablemovesEtfComponent,
    AbsoluteAnalysisChartComponent,
    AbsoluteAnalysisSectorsComponent,
    AbsoluteAnalysisHeatmapComponent,
    FundOverviewAbsoluteComponent,
    AbsoluteAnalysisHeatmapSymbolsComponent,
    RelativeAbsoluteSectorsComponent,
    TableChartFundamentalsComponent,
    ChartFundamentalsComponent,
    FairvalueChartComponent,
    AdminDataViewComponent,
    SuperInvestorComponent,
    SuperInvestorPortfolioComponent,
    FactorAnalysisComponent,
    ShortInterestComponent,
    StockOptionsComponent,
    SmsNotificationPrreferenceComponent,
    BacktestingComponent,
    PlaidContainerComponent,
    PlaidIntegrationsComponent,
    LinkedPortfolioComponent,
    LivePricesBondsComponent,
    LivePricesMostActiveComponent,
    LivePrices2Component,
    LivePricesSectorsComponent,
    StocksMapComponent,
    LivePricesRsiComponent,
    LivePricesMacdmomComponent,
    LivePricesRsComponent,
    GaugeSpeedComponent,
    PortfolioSummaryComponent,
    LatestInsightsHorizontalComponent,
    InsightsLatestComponent,
    PortfolioCombinedComponent,
    PortfolioSummary2Component,
    ModelPortfolio2023Component,
    EditTransactionsComponent,
    RelativeAbsoluteEtfComponent,
    StrategyChart2024Component,
    ScreensCombinedComponent,
    ScreensSummaryComponent,
    ScreenFilter2024Component,
    StockFundamentalsComponent,
    TechnicalStrengthComponent,
    TechnnicalRatingComponent,
    RsiRatingComponent,
    MoversComponent,
    HoldingsMapComponent,
    StrategyDashboardComponent,
    SvMoneyflow2Component,
    SvMoneyflow1Component,
    UserProfileComponent,
    NotificationPrefSwitchComponent,
    NewTableRssComponent,
    HelpIconComponent,
    SvMoneyflow3Component,
    RelativeAbsoluteScoreMeterComponent,
    EtfYheodOverviewComponent,
    Register2024Component,
    SvIntroVideoComponent,
    PasswordResetRequestComponent,
    PasswordResetComponent,
    AnomalySpyComponent,
    UserRiskProfileComponent,
    TradeSignalComponent,
    RiskRangeReportComponent,
    MarketSummaryWidgetComponent,
    PortfilioCombinedAixgbComponent,
    AiModelsCombinedComponent,
    AiModelDetailsComponent,
    FactorAnalysisViewComponent,
    MacrobondChartComponent,
    RiskRangeReportViewComponent,
    SymbolSearchComponent,
    AiAgentDecisionsComponent,
    ChartDescisionDialComponent,
    AiAgentDecisionsDashboardComponent,
    InvestingSolutionsInfoComponent,
    AiAgentDecisionsHelptextComponent,
    CardComponent,
    CreditSpreadReportComponent,
    CreditSpreadChartComponent,
    ContactUsInvestingComponent,
    ContactUsCombinedComponent,
    ThoughtfulMoneyInfoComponent,
    AnnouncementBannerComponent,
    AdminUserExitFeedbackComponent,
    AiRegimeChartsComponent,
    AdminSettingsComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    AccordionModule,
    AutoCompleteModule,
    AvatarModule,
    AvatarGroupModule,
    BadgeModule,
    BreadcrumbModule,
    ButtonModule,
    CalendarModule,
    CardModule,
    CarouselModule,
    CascadeSelectModule,
    ProgressSpinnerModule,
    ChartModule,
    CheckboxModule,
    ChipModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    ColorPickerModule,
    ContextMenuModule,
    DataViewModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    FieldsetModule,
    FileUploadModule,
    GalleriaModule,
    InplaceModule,
    InputNumberModule,
    InputMaskModule,
    InputSwitchModule,
    InputTextModule,
    InputTextareaModule,
    KnobModule,
    ListboxModule,
    MegaMenuModule,
    MenuModule,
    MenubarModule,
    MessageModule,
    MessagesModule,
    MultiSelectModule,
    OrderListModule,
    OrganizationChartModule,
    OverlayPanelModule,
    PaginatorModule,
    PanelModule,
    PanelMenuModule,
    PasswordModule,
    PickListModule,
    ProgressBarModule,
    RadioButtonModule,
    RatingModule,
    RippleModule,
    ScrollPanelModule,
    ScrollTopModule,
    SelectButtonModule,
    SidebarModule,
    SkeletonModule,
    SliderModule,
    SplitButtonModule,
    SplitterModule,
    StepsModule,
    TableModule,
    TabMenuModule,
    TabViewModule,
    TagModule,
    TerminalModule,
    TimelineModule,
    TieredMenuModule,
    ToastModule,
    ToggleButtonModule,
    ToolbarModule,
    TooltipModule,
    TreeModule,
    TreeTableModule,
    RecaptchaModule,
    AppCodeModule,
    HighChartModule,
    MatIconModule,
    PasswordModule,
    SaritasaModule,
    FontAwesomeModule,
  ],
  providers: [
    { provide: LocationStrategy, useClass: PathLocationStrategy },
    MenuService,
    AppBreadcrumbService,
    AuthenticationService,
    MessageService,
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true },
    UserService,
    LiveService,
    UserTypeService,
    AlertService,
    NewsService,
    UserService,
    NotificationService,
    LoaderService,
    PortfolioService,
    TechnicalService,
    ZachService,
    {
      provide: HIGHCHARTS_MODULES,
      useFactory: () => [highstock, more, solidgauge, treemap, annotations],
    },
    ConfirmationService,
    HighchartsService,
    PlaidService,
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {}
