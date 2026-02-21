import { Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NotificationService } from 'src/app/services/notification.service';

declare const TradingView: any;
@Component({
  selector: 'symbol-details',
  templateUrl: './symbol-details.component.html',
  styleUrls: ['./symbol-details.component.css']
})
export class SymbolDetailsComponent implements OnInit {

  keyStats: any;
  ratio: any;
  fullDividendDetail = 1;
  fullEarningDetail = 1;
  @Input() symbol;
  dialogInputSymbolWatchlist = "";
  dialogInputSymbolPortfolio = "";
  peerSymbols: any;
  newsSymbols = [];
  symbolDetail;
  mobile = false;
  urlSafe: SafeResourceUrl;
  chartView;
  symbolsTechData = [];
  displayAddToPortfolioDialog = false;
  displayAddToWatchlistDialog = false;
  selectedIndex = 0;
  @Input() isModalView = false;

  // to ensure, the right component is shown - etf or stock on overview page
  // this avoids double fetching of details from server
  loading = false;

  asset_type = '';
  visibleTabs = {
    "STOCKS": ["Overview", "AI Signals", "Advanced Chart", "Fundamentals", "Short Interest", "Insider Stats", "Option Chain", "Technical", "News", ],
    "FUNDS": ["Advanced Chart"],
    "INDEXES": ["Advanced Chart"],
    "ETFS": ["Fund Overview", "Advanced Chart", "Technical", "Option Chain"],
    "Crypto": ["Advanced Chart"],
    "FUTURE": ["Advanced Chart"],
  };

  constructor(
    public sanitizer: DomSanitizer, 
    private route: ActivatedRoute,
    private router: Router, 
    private liveService: LiveService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    if (document.body.offsetWidth < 700) { // 768px portrait
      this.mobile = true;
    }
    this.notificationService.selectedSymbol.subscribe(symb => {
      if (this.symbol !== symb) {
        this.symbol = symb;
        this.reloadChart();
      }
    });
  }

  createChartView() {
    this.chartView = new TradingView.widget(
      {
        "width": "100%",
        "height": "100%",
        "symbol": this.symbol,
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "withdateranges": true,
        "details": true,
        "range": "YTD",
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "save_image": false,
        "studies": [
          "MASimple@tv-basicstudies"
        ],
        "container_id": "tradingview_3978b"
      }
    );
  }

  ngAfterViewInit() {
    if(this.mobile) {
      this.createChartView();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbol != null && this.symbol != "") {
      this.reloadChart();
    }
  }

  reloadChart() {
    this.newsSymbols = [];
    this.newsSymbols.push(this.symbol);
    this.liveService.getUrlData("/peer/" + this.symbol).subscribe(d => this.setPeerSymbols(d));
    // this.liveService.getUrlData("/symbol/keystats/" + this.symbol).subscribe(d => this.setKeyStats(d));
    this.loadSymbolDetails();
    this.ngAfterViewInit();
  }

  // setKeyStats(d) {
  //   this.keyStats = {
  //     "Open": d.open,
  //     "Day High": d.dayHigh,
  //     "Day Low": d.dayLow,
  //     "52 Week High": d.fiftyTwoWeekHigh,
  //     "52 Week Low": d.fiftyTwoWeekLow,
  //     "Market Cap": d.marketCap,
  //     "Shares Out": d.sharesOutstanding,
  //     "Dividend (TTM)": d.trailingAnnualDividendRate,
  //     "Dividend Yield (TTM)": d.trailingAnnualDividendYield,
  //     "Beta": d.beta,
  //     "10Day Average Vol": d.averageVolume10days,
  //     "52 Week Change": d['52WeekChange']
  //   };

  //   this.ratio = {
  //     "EPS": d.forwardEps,
  //     "Revenue": d.totalRevenue,
  //     "P/E": d.forwardPE,
  //     "Gross Margin": d.grossMargins,
  //     "Profit Margin": d.profitMargins,
  //     "ROE": d.returnOnEquity,
  //     "EBITDA": d.ebitda,
  //     "Debt to Equity": d.debtToEquity
  //   }
  // }

  setPeerSymbols(d) {
    this.peerSymbols = d;
    this.setSymbolsTechDataTable(this.peerSymbols);
  }

  loadSymbolDetails() {
    this.loading = true;
    this.liveService.getUrlData('/symbol/live/' + this.symbol).subscribe(d => this.setSymbolDetail(d));
  }

  setSymbolDetail(d) {
    this.symbolDetail = d[this.symbol];
    this.loading = false;
  }
  
  setSymbolsTechDataTable(symbols) {
    if (symbols != "") {
      this.liveService.postRequest("/symbol/model/NA", symbols.join(",")).subscribe(d => this.setDataTable(d));
    }
  }

  setDataTable(res) {
    this.symbolsTechData = res;
  }

  onSymbolSelected(event) {
    this.symbol = event.value;
    this.asset_type = event.asset_type;
    this.router.navigate(['/overview-stock']); // TODO: there could be a better way
  }

  onAddToPortfolioClick() {
    this.displayAddToPortfolioDialog = true;
    this.dialogInputSymbolPortfolio = this.symbol;
  }

  onTradingTicketCancelClick() {
    this.displayAddToPortfolioDialog = false;
    this.dialogInputSymbolPortfolio = "";
  }

  onTradingTicketSaveClick() {
    this.displayAddToPortfolioDialog = false;
    this.dialogInputSymbolPortfolio = "";
  }

  onAddToWatchlistClick() {
    this.displayAddToWatchlistDialog = true;
    this.dialogInputSymbolWatchlist = this.symbol;
  }

  onAddToWatchlistDialogClose() {
    this.displayAddToWatchlistDialog = false;
    this.dialogInputSymbolWatchlist = "";
  }

  showTab(tabName) {
    if(this.symbolDetail && this.symbolDetail.asset_type) {
      return this.visibleTabs[this.symbolDetail.asset_type]?.includes(tabName);
    }
  }

}