import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class MenuService {
  private menuSource = new Subject<string>();
  private resetSource = new Subject<void>();
  private menuItems = [
    {
      label: 'Menu',
      items: [
        {
          label: 'Home',
          routerLink: ['/overview'],
          items: [],
        },
        {
          label: 'Insights',
          items: [
            {
              label: 'Latest Insights',
              routerLink: ['/insights/latest-insights'],
              helpKey: 'insightsLatestInsights',
            },
            {
              label: 'Newsletters',
              routerLink: ['/commentary/newsletter'],
              helpKey: 'insightsNewsletter',
            },
            {
              label: 'Commentaries',
              routerLink: ['/commentary/real-time'],
              helpKey: 'insightsCommentary',
            },
            {
              label: 'Latest from RIA Team',
              routerLink: ['/commentary/recent-ria'],
              helpKey: 'riaRecentBlogs',
            },
            { label: 'Videos', routerLink: ['/commentary/videos'], helpKey: 'insightsVideos' },
            {
              label: 'Trade Alerts',
              routerLink: ['/commentary/diary'],
              helpKey: 'insightsTradingDiary',
            },
          ],
        },
        {
          label: 'Markets',
          items: [
            { label: 'Major Markets', routerLink: ['/majormarkets'] },
            { label: 'Asset Classes', routerLink: ['/markets'] },
            { label: 'Holdings Map', routerLink: ['/holdingsmap'] },
            { label: 'Sentiment', routerLink: ['/marketinternals'] },
            { label: 'Leaders & Laggers', routerLink: ['/movers'] },
          ],
        },
        {
          label: 'Portfolios',
          items: [
            {
              label: 'Portfolios',
              routerLink: ['/portfolioscombined'],
              helpKey: 'portfoliosPortfoliosDashboard',
            },
            { label: 'Watchlists', routerLink: ['/watchlist'] },
            { label: 'Alerts', routerLink: ['/alerts'] },
            { label: 'Super Investor Portfolios', routerLink: ['/super-investor'] },
            // { label: 'Linked Portfolios', routerLink: ['/linkedportfolio'] },
          ],
        },
        // {
        //   label: 'AI Models',
        //   items: [
        //     { label: 'Model 1', routerLink: ['/ai-models/model_1'], helpKey: 'aiModel1Dashboard', },
        //     { label: 'Model 2', routerLink: ['/ai-models/model_2'], helpKey: 'aiModel2Dashboard', },
        //     { label: 'Model 3', routerLink: ['/ai-models/model_3'], helpKey: 'aiModel3Dashboard', },
        //   ],
        // },
        {
          label: 'DIY Research',
          items: [
            { label: 'Performance Analysis', routerLink: ['/relative-absolute-analysis-sectors'] },
            { label: 'Factor Analysis', routerLink: ['/factor-analysis'] },
            { label: 'Risk Range', routerLink: ['/risk-range-report'] },
            { label: 'Credit Spreads', routerLink: ['/credit-spead'] },
            { label: 'Screener', routerLink: ['/screenscombined'], helpKey: 'dyiReserachScreener' },
            { label: 'Stock Summary', routerLink: ['/overview-stock'] },
            {
              label: 'Strategy Builder',
              routerLink: ['/strategy-dashboard'],
              helpKey: 'dyiReserachStrategyBuilder',
            },
          ],
        },
        {
          label: 'Charts',
          routerLink: ['/tvcharts'],
          items: [],
        },
        {
          label: 'Simple AI',
          items: [
            { label: 'Agents - Dashboard', routerLink: ['/ai-dashbaord'] },
            { label: 'Agents - Symbol', routerLink: ['/ai-tools'] },
          ],
        },
      ],
    },
  ];

  menuSource$ = this.menuSource.asObservable();
  resetSource$ = this.resetSource.asObservable();

  onMenuStateChange(key: string) {
    this.menuSource.next(key);
  }

  reset() {
    this.resetSource.next(undefined);
  }

  getMenuItems() {
    return this.menuItems;
  }
}
