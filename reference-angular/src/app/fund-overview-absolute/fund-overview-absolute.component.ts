import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-fund-overview-absolute',
  templateUrl: './fund-overview-absolute.component.html',
  styleUrls: ['./fund-overview-absolute.component.scss'],
})
export class FundOverviewAbsoluteComponent implements OnInit {
  @Input('symbol') currentSymbol = '';
  fundOverview: any;
  fundHoldingSymbols = [];
  fundHoldingSymbolNameMapping = {};

  absHoldingsScore = [];      // for holdings heatmap table
  absHoldingSymbols = [];     // to manage chart configs 
  absSelectedSymbol: any;     // to switch symbol in the holdings chart
  absSelectedSymbolName: any;
  absAnaHoldingsData: any;        // to hold absolute analysis data for holding symbols

  absAnaHoldingChartConfigs = {};     // dict to hold all possible chart configs
  absAnaSelectedChartConfig = null;       // selected chart configs
  selectedSymbolScoreStyle = 'background-color: #646464;';  // to highlight selected symbols 
  currentHoldingSymbol = '';  // for showing pop up chart with the clicked symbol 
  symbolDialogShow = false;   // show/hide pop up chart

  constructor(
    private liveService: LiveService
  ) {}

  ngOnInit(): void {
    if (this.currentSymbol) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.currentSymbol) {
      this.loadData();
    }
  }

  loadData() {
    this.fundOverview = null;
    this.absHoldingsScore = null;
    this.absAnaHoldingsData = null;
    if (this.currentSymbol != '') {
      this.liveService
        .getUrlData('/etf/overview/' + this.currentSymbol)
        .subscribe(d => this.setFundOverview(d));
    }
  }

  setFundOverview(d) {
    this.fundOverview = d;
    this.absHoldingsScore = null;
    this.absAnaSelectedChartConfig = null;
    this.fundHoldingSymbols = [];
    this.fundHoldingSymbolNameMapping = {};
    if (this.fundOverview['topHoldings']) {
      for (let item of this.fundOverview['topHoldings']) {
        if (item['symbol'] == 'FB') {
          item['symbol'] = 'META';
        }
        if (item['symbol'] == 'LIN.L') {
          item['symbol'] = 'LIN';
        }

        this.fundHoldingSymbolNameMapping[item['symbol']] = item['name'];
        this.fundHoldingSymbols.push(item['symbol']);
      }
      // this.fundHoldingSymbols.unshift(this.currentSymbol);
      this.liveService
        .postRequest('/absolute-analysis-holdings', this.fundHoldingSymbols)
        .subscribe(d => this.setData(d));
    }
  }

  setData(d) {
    this.absAnaHoldingsData = d;
    this.prepareDataForHeatTable(this.absAnaHoldingsData);
    this.prepareChartConfigs();
  }

  prepareDataForHeatTable(data) {
    if (data && data.length > 0) {
      const length = data.length;
      let lastRow = data[length - 1];

      this.setHeatMapData(lastRow);
    }
  }

  setHeatMapData(lastRow) {
    this.absHoldingsScore = [];
    for (let key of this.fundHoldingSymbols) {
      if (key != 'date') {
        this.absHoldingsScore.push({
          symbol: key,
          name: this.fundHoldingSymbolNameMapping[key],
          score: lastRow[key + '_score'],
        });
      }
    }
    this.absHoldingsScore.sort((a, b) => a['score'] - b['score']);
  }

  prepareChartConfigs() {
    this.absAnaHoldingChartConfigs = {};
    for (const symbol of this.fundHoldingSymbols) {
      this.absAnaHoldingChartConfigs[symbol] = {
        xColKey: 'date',
        yColKey1: symbol,
        multiplier: 1,
      };
    }
  }

  // JS needs special emopty object check (this seems fastest)
  isEmpty(obj) {
    for (let att in obj) {
      return false;
    }
    return true;
  }

  isNA(val) {
    if (typeof val === 'number' || Object.prototype.toString.call(val) === '[object Date]') {
      return false;
    } else {
      return this.isEmpty(val);
    }
  }

  handleHoldingSymbolClick(symbol) {
    if (symbol) {
      this.currentHoldingSymbol = symbol;
      this.symbolDialogShow = true;
    }
  }

  handleHeatMapSymbolClick(event) {
    this.absSelectedSymbol = event.symbol;
    this.absSelectedSymbolName = event.name;
    this.absAnaSelectedChartConfig = this.absAnaHoldingChartConfigs[this.absSelectedSymbol];
  }
}
