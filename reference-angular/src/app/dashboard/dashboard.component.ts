import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ChartUtils } from '../utils/chart.utils';
import { ZachService } from '../services/zach.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { WpPostApiService } from '../__saritasa/common/core/services/api/wp-post-api.service';
import { YouTubeApiService } from '../__saritasa/common/core/services/api/youtube-api.service';
import { WpMediaApiService } from '../__saritasa/common/core/services/api/wp-media-api.service';
import { map, switchMap } from 'rxjs/operators';
import { WpPostCategories } from '../__saritasa/common/core/enums/wp-post-categories';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  snpData = {
    meter_score: 0,
    percentage_ob: 1,
    percentage_os: 1,
    percentage_50day_sma: 1,
    percentage_200day_sma: 1,
    current_status: '',
  };
  selectedSymbol = []; //because line chart takes an array
  videos;
  daily;
  commentary;
  alerts;
  //charts;
  greedRotation;
  technicalRotation;
  riskRotation;
  // portfolioSymbols;
  allocationRotation;
  fullEarningDetail;
  fullDividendDetail;
  snpTopSymbols;
  snpBottomSymbols;
  topMacdSymbols: Object;
  bottomMacdSymbols: Object;
  indicesSymbols;
  cryptoSymbols;
  sentimentHistorical;
  assetSymbols: Object;
  sectorSymbols: Object;
  bondSymbols: Object;
  commoditySymbols: Object;
  portfolios: any;
  isChanged = true;
  openPositions = [];
  cash_transactions = [];
  closedPositions = [];
  basicDetails = [];
  fundamentalDetails = [];
  allSymbols = [];
  techAlerts = {};
  portfolio_type = 'user';
  portfolioDetails = {
    composition_by_asset: [],
    composition_by_sector: [],
    pnl: 0,
    dailyPnl: 0,
    dailyPnlPercentage: 0,
    pnlPercent: 0,
    portfolioValue: 0,
    interest: 0,
    dividend: 0,
    startingCash: 0,
    currentCash: 0,
  };
  selectedPortfolio = {
    id: 0,
    name: '',
    transactions: [],
    currentCash: 0,
    portfolio_type: [],
    startingCash: 0,
  };

  gaugeParams = { greed: 83.4, technical: 91.67, risk: 120, allocation: 90.5 };

  compositeChartConfig;

  // indices dropdown values 
  indices = [
    {
      id: 1, 
      name: "S&P 500", 
      urls:  {
        topActive: '/symbol/list_type2/40',
        top10: '/symbol/list_type2/41',
        bottom10: '/symbol/list_type2/42',
        rsiOverSold10: '/symbol/list_type2/47',
        rsiOverBought10: '/symbol/list_type2/49',
        momIncrease10: '/symbol/list_type2/51',
        momDecrease10: '/symbol/list_type2/53',
        rsOutperformers: '/symbol/list_type2/55',
        rsUnderperformers: '/symbol/list_type2/57',
      }
    },
    {
      id: 2, 
      name: "Nasdaq 100",
      urls:  {
        topActive: '/symbol/list_type2/44',
        top10: '/symbol/list_type2/45',
        bottom10: '/symbol/list_type2/46',
        rsiOverSold10: '/symbol/list_type2/48',
        rsiOverBought10: '/symbol/list_type2/50',
        momIncrease10: '/symbol/list_type2/52',
        momDecrease10: '/symbol/list_type2/54',
        rsOutperformers: '/symbol/list_type2/56',
        rsUnderperformers: '/symbol/list_type2/58',
      }
    },
  ]
  selectedIndex = this.indices[0];
  selectedMarketMapIndex = this.indices[0];
  marketMapData;

  yAxisTextAssetClassChart = "Price ($)";

  /** List of commentaryPost$ */
  public readonly commentaryPost$ = this.postService
    .getPostsLists({ categories: [WpPostCategories.ProCommentary] }, 1)
    .pipe(switchMap(posts => this.mediaService.getPostListMedia(posts)));

  /** List of tradingPost */
  public readonly tradingPost$ = this.postService
    .getPostsLists({ categories: [WpPostCategories.ProTrading] }, 1)
    .pipe(switchMap(posts => this.mediaService.getPostListMedia(posts)));

  /** List of recentPosts */
  public readonly recentPosts$ = this.postService.recentPosts$;

 /** List of recentMessages */
  public readonly recentMessages$ = this.postService.recentMessages$;

  /** List of videos */
  public readonly videos$ = this.youtubeService
    .getVideosFromPlaylist()
    .pipe(map(list => list.items));

  constructor(
    private liveService: LiveService,
    private zachService: ZachService,
    private breadcrumbService: AppBreadcrumbService,

    /** Saritasa services */
    private readonly postService: WpPostApiService,
    private readonly youtubeService: YouTubeApiService,
    private readonly mediaService: WpMediaApiService,
  ) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['overview'] },
      { label: 'Overview', routerLink: ['overview'] },
    ]);
  }

  size;
  fearGreedTechnical;

  ngOnInit() {
    this.loadAllPortfolios();
    this.onMarketMapDropdownChange();
    this.liveService.getUrlData('/symbol/list_type/4').subscribe(d => (this.sectorSymbols = d));
    this.liveService.getUrlData('/symbol/list_type/5').subscribe(d => (this.assetSymbols = d));
    this.liveService.getUrlData('/symbol/technicalHistory/sentiment/20Day').subscribe(d => this.setSentiment(d));
    this.liveService.getUrlData('/spy/technical').subscribe((d: any) => (this.snpData = d));
    // this.liveService.getUrlData('/userportfolio_watchlist/symbol').subscribe(d => this.portfolioSymbols = d);
    this.liveService.getUrlData('/symbol/list_type/1').subscribe(d => (this.snpTopSymbols = d));
    this.liveService.getUrlData('/symbol/list_type/2').subscribe(d => (this.snpBottomSymbols = d));
    this.liveService.getUrlData('/symbol/list_type/17').subscribe(d => (this.topMacdSymbols = d));
    this.liveService.getUrlData('/symbol/list_type/18').subscribe(d => (this.bottomMacdSymbols = d));
    this.liveService.getUrlData('/symbol/list_type2/8').subscribe(d => (this.indicesSymbols = d));
    this.liveService.getUrlData('/symbol/list_type2/39').subscribe(d => (this.cryptoSymbols = d));
    this.liveService.getUrlData('/symbol/list_type2/24').subscribe(d => (this.bondSymbols = d));
    this.liveService.getUrlData('/symbol/list_type2/22').subscribe(d => (this.commoditySymbols = d));
    this.liveService.getUrlData('/symbol/technical-fear-greed').subscribe(d => this.fearGreedTechnical = d);
  }

  portfolioChanged(event) {
    this.selectedPortfolio = event.value;
    this.getPortfolioDetails();
    this.isChanged = true;
  }

  getPortfolioDetails() {
    this.liveService
      .getUrlData('/modelportfolio/' + this.selectedPortfolio.id)
      .subscribe(d => this.buildPositions(d));
  }

  loadAllPortfolios() {
    this.liveService.getUrlData('/modelportfolio/all/' + this.portfolio_type).subscribe(d => {
      this.portfolios = d;
      this.selectFirst();
    });
  }

  selectFirst() {
    if (this.portfolios.length > 0) {
      this.selectedPortfolio = this.portfolios[0];
      this.portfolioChanged({ value: this.selectedPortfolio });
    }
  }

  buildPositions(data) {
    this.isChanged = true;
    this.techAlerts = data.techAlerts;
    this.portfolioDetails = data.portfolioDetails;

    let mktValue = 0;
    this.openPositions = data.openPositions;
    this.selectedPortfolio.transactions = data.transactions;
    this.cash_transactions = data.cash_transactions;
    this.closedPositions = data.closedPositions;
    this.basicDetails = data.basicDetails;

    for (let position of this.openPositions) {
      let basic = this.basicDetails[position['symbol']];
      if (basic != undefined) {
        position['name'] = basic['name'];
        position['sector'] = basic['sector'];
        position['industry'] = basic['industry'];
      }
      if (position['side'] == 'Buy') {
        position['type'] = 'Long';
      } else {
        position['type'] = 'Short';
      }
    }

    for (let position of this.openPositions) {
      position['percentageShare'] =
        (100 * position['currentValue']) / this.portfolioDetails.portfolioValue;
    }
    this.setSymbols();
    if (this.allSymbols != null && this.allSymbols.length > 0) {
      this.zachService.getZach(this.allSymbols).subscribe(d => this.fillFundamentalDetails(d));
    }
    for (let position of this.selectedPortfolio.transactions) {
      let basic = this.basicDetails[position['symbol']];
      this.fillBasicDetails(position);
    }
    for (let position of this.closedPositions) {
      let basic = this.basicDetails[position['symbol']];
      if (basic != undefined) {
        position['name'] = basic['name'];
      }
    }
    this.selectedPortfolio.startingCash = this.portfolioDetails.startingCash;
    this.selectedPortfolio.currentCash = this.portfolioDetails.currentCash;
  }

  fillFundamentalDetails(d) {
    this.fundamentalDetails = d;
    for (let pos of this.openPositions) {
      let modelDetail = this.fundamentalDetails.filter(t => t.symbol === pos.symbol);
      if (modelDetail.length > 0) {
        pos.dividendYield = modelDetail[0].dividendYield;
      }
    }
    for (let fundamental of this.fundamentalDetails) {
      this.fillBasicDetails(fundamental);
      let position = this.openPositions.filter(p => p.symbol === fundamental.symbol);
      if (position.length > 0) {
        fundamental['currentValue'] = position[0]['currentValue'];
      }
    }
  }

  fillBasicDetails(obj) {
    let symbol = obj['symbol'];
    let basic = this.basicDetails[symbol];
    if (basic != undefined) {
      obj['name'] = basic['name'];
      obj['sector'] = basic['sector'];
      obj['industry'] = basic['industry'];
      obj['currentPrice'] = basic['currentPrice'];
      obj['priceChange'] = basic['priceChange'];
      obj['changePct'] = basic['changePct'];
    }
  }

  setSymbols() {
    this.openPositions.sort((l, r): number => {
      if (l.sector == 'FixedIncome') return 1;
      if (r.sector == 'FixedIncome') return -1;
      // percentageShare
      if (l.percentageShare < r.percentageShare) return 1;
      if (l.percentageShare > r.percentageShare) return -1;
      return 0;
    });

    let listSymbols = [];

    for (let position of this.openPositions) {
      listSymbols.push(position.symbol);
    }

    //this.topSymbols = topSymbols;
    this.allSymbols = listSymbols;
  }

  setSentiment(data) {
    this.sentimentHistorical = ChartUtils.createSeriesData(
      data,
      'meter_score',
      'date',
      true,
    );
  }

  setDashBoadParams(res) {
    this.gaugeParams = res;
    this.greedRotation = this.getRotation(this.gaugeParams.greed);
    this.technicalRotation = this.getRotation(this.gaugeParams.technical);
    this.riskRotation = this.getRotation(this.gaugeParams.risk);
    this.allocationRotation = this.getRotation(this.gaugeParams.allocation);
  }
  getRotation(value) {
    let factor = 1.79;
    let rotation = value * factor;
    if (rotation > 180) {
      rotation = 180;
    }
    return rotation;
  }

  loadArticle(event) {
    this.size = event.value;
  }
  ngAfterViewInit(): void {}
  loadTweets() {
    (<any>window).twttr = (function (d, s, id) {
      let js: any,
        fjs = d.getElementsByTagName(s)[0],
        t = (<any>window).twttr || {};
      if (d.getElementById(id)) return t;
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://platform.twitter.com/widgets.js';
      fjs.parentNode.insertBefore(js, fjs);

      t._e = [];
      t.ready = function (f: any) {
        t._e.push(f);
      };

      return t;
    })(document, 'script', 'twitter-wjs');

    if ((<any>window).twttr.ready()) (<any>window).twttr.widgets.load();
  }
  ngOnDestroy() {}

  onSymbolClicked(symbol) {
    this.selectedSymbol = [symbol];
  }

  onAssetClassTabChange(event) {
    if(event.index == 1) {
      this.yAxisTextAssetClassChart = 'Yield (%)';
    } else {
      this.yAxisTextAssetClassChart = "Price ($)";
    }
  }

  getGuageLabel(value) {
    return value.toFixed(0).toString()+'%';
  }

  clickedSymbol;
  onCompositeSymbolClicked(event) {
    this.clickedSymbol = event.value;
  }

  onMarketMapDropdownChange() {
    this.marketMapData = null;
    if (this.selectedMarketMapIndex.name == 'S&P 500') {
      this.getSPYData();
    }

    if (this.selectedMarketMapIndex.name == 'Nasdaq 100') {
      this.getNasdaqData();
    }
  }

  getSPYData() {
    this.liveService.getUrlData('/symbol/spytreemap').subscribe(res => {
      if(res) {
        const spyData = {};
        spyData['rawData'] = res;
        spyData['nameColumn'] = 'symbol';
        spyData['valColumn'] = 'priceChangePct';
        spyData['parentColumn'] = 'sectorName';
        spyData['sizeColumn'] = 'marketCap';
        this.marketMapData = spyData;
      }
    });
  }

  getNasdaqData() {
    this.liveService.getUrlData('/symbol/nasdaqtreemap').subscribe(res => {
      if(res) {
        const nasdaqData = {};
        nasdaqData['rawData'] = res;
        nasdaqData['nameColumn'] = 'symbol';
        nasdaqData['valColumn'] = 'priceChangePct';
        nasdaqData['parentColumn'] = 'sectorName';
        nasdaqData['sizeColumn'] = 'marketCap';
        this.marketMapData = nasdaqData;
      }
    });
  }
}
