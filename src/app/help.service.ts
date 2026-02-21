import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HelpService {
  helpMsgs = {
    // Home Page Widgets
    homeStockHighlightsTop10: "Today's 10 largest percentage gainers.",
    homeStockHighlightsBottom10: "Today's 10 largest percentage losers.",
    homeStockHighlightsMostActive: "Today's 10 most active stocks.",

    homeSectorPerformance: "Daily price change and 1 year trading range for the 11 S&P 500 sectors.",

    homeMarketMap: "The heat map is divided by sector. Each square representing a stock is sized based on its market cap. If you click on a sector, a heat map of the sector appears. At this level you can mouse over each box to get the stock name and the daily price change.",

    homeRSI: "RSI or relative strength index measures the speed and change of the price. An RSI above 70 is considered overbought and below 30 is oversold. RSI can range from 0 to 100.",

    homeMomentum: "Momentum measures a stock or indexes rate of change.",

    homeSvInsights: "Read and watch our latest opinions on markets, the economy and other factors driving the markets.",

    homeLatestNews: "The latest headlines from SeekingAplpha and MarketWatch.",

    homeFearGreed: "Measures market sentiment. 100 is extremly high sentiment and 0 is the worst sentiment. Long term market reversals often occur at high or low sentiment readings.",

    homeTechnical: "This indicator uses many technical measures on the S&P 500 to assess how overbought or oversold the broader market is. Long term market reversals often occur at high or low technical readings.",

    homeSvPortfolios: "This indicator uses many technical measures on the S&P 500 to assess how overbought or oversold the broader market is. Long term market reversals often occur at high or low technical readings.",

    homeMyPortfolios: "This is a summary of the portfolio's that you create in the portfolios tab.",

    // Insights Pages
    insightsLatestInsights: "SimpleVisor Insights is where the RIA Professionals post their latest thougths. Find our latest commentary and videos below. All our past articles and videos are archived in each of the links above.",

    insightsNewsletter: "The Newsletter is a weekly summary of the week's activity.",
    
    insightsCommentary: "The Daily Commentary provides a few current market/economic stories and commentaries along with a technical update.",

    insightsBlogs: "Originals are weekly articles that provide in depth analysis on a stock or investment theme.",

    insightsVideos: "Videos are producef daily.  Before The Bell  is a short market update. The Real Investment Show is a longer podcast spanning current markets, recent market moving events, financial planning advice and much more.  portfolios.",
    
    insightsTradingDiary: "Trade alerts provide information and commentary of the latest trades in the SimpleVisor.",

    // Market Summary Pages
    marketMajorMarkets: "The performance of similar indices, assets or sectors. YTD returns are based on dividend adjusted close price of last day of last year till today's price.",
    marketHoldingsMap: "The heat map is divided by sector. Each square representing a stock is sized based on its market cap. If you click on a sector, a heat map of the sector appears. At this level you can mouse over each box to get the stock name and the daily price change.",
    marketSentimentsSpyMovingAvg: "The percentage of stocks in the S&P 500 trading above three selected moving averages. Market breadth is considered good when a large percentage of stocks are above the moving averages and the market is moving higher. Conversely, breadth is lacking when the percentage of stocks above the moving averages is low yet the market is moving upward.",

    // Portfolio Pages
    portfoliosPortfoliosDashboard: "A Quick Start to Investing: See what the experts at SimpleVisorTM are investing in, the trades they are making and their portfolio performance. Use the portfolio's analysis and research tools to get a deeper understanding of the performance. You can also use the portfolio's holdings as a starting point for your own research or use it as a template for building your own portfolio.", 

    portfoliosPortfoliosSVPortfolios: "This is a summary of the portfolio's that the SimpleVisor team manages on behalf of their clients - click for more details.", 
    portfoliosPortfoliosSVRoboPortfolios: "This is a summary of the portfolio's that combine human expertise with automated precision. Our system continuously monitors and adjusts your investments in response to market conditions and your investment goals. - click for more details.", 
    portfoliosPortfoliosMyPortfolios: "This is a summary of the portfolio's that you have created - click for more details.", 
    portfoliosModelPortfolioResearch: "Technical summary of the stocks in a portfolio.", 
    portfoliosModelPortfolioAlerts: "Alerts that you created in the alerts tab.", 
    portfoliosModelPortfolioClosedPositioins: "Positions that have been sold.", 
    portfoliosSuperInvestors: "Based on the latest SEC filings, the holdings of some of the largest and most well known investors.", 
    portfoliosSuperInvestorsComb: "An aggregation of the holdings of the Super Investors.", 
    portfoliosWatchlist: "Create a list of stocks you are following.", 
    portfoliosAlerts: "Set price triggers to warn you when a stock hits your target for buy or sell. You will be notified via email if the alerts are triggered.", 

    // DIY Research Related 
    dyiReserachPerformanceAnalysisSectors: "This uses SimpleVisors proprietary technical analysis to assign a relative and absolute score. Relative scores are based on the relationship of the price of the sector to the price of the S&P 500. Absolute scores are based on the sectors outright price. The graph charts the movement of the absolute and relative scores over specific time frames. Click in the sector scores for a graph of the scores and the price changes.",

    dyiReserachPerformanceAnalysisFactors: "This uses SimpleVisors proprietary technical analysis to assign a relative and absolute score. Relative scores are based on the relationship of the price of the stock factor to the price of the S&P 500. Absolute scores are based on the stock factor outright price. The graph charts the movement of the absolute and relative scores over specific time frames. Click in the stock factor scores for a graph of the scores and the price changes.",

    dyiReserachScreener: "SimpleVisor Stock Screener: Discover the Market’s Most Compelling Stocks for Your Investing Strategy: This is a great, easy-to-use screener, which enables you to pinpoint the market's most compelling stocks for your specific investing strategy. Filter stocks with Buy/Hold/Sell quant ratings, author recommendations, or sell-side ratings. You can also screen stocks from a range of financial metrics including valuation, momentum, and profitability. Create your screener from scratch or use one of SimpleVisors's preset screeners.",

    dyiReserachStrategyBuilder: "Strategy Builder enables you to define and evaluate well-suited strategies for selecting investment candidates based factors including fundamental, technical and quantitative criteria.",

    // Common
    commonSynopsys: "A brief summary of the technical situation and how it may affect your trading.",
  };

  private subMenuClicked = new Subject<any>();
  subMenuClickObs$ = this.subMenuClicked.asObservable();

  constructor() { }

  getHelp(key) {
    return this.helpMsgs[key];
  }

  hasHelpKey(key) {
    return key in this.helpMsgs;
  }

  subMenuItemClickEmit(item) {
    this.subMenuClicked.next(item);
  }
}
