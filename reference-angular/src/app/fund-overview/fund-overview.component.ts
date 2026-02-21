import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { RelativeAnalysisService } from '../services/relative-analysis.service';

@Component({
  selector: 'app-fund-overview',
  templateUrl: './fund-overview.component.html',
  styleUrls: ['./fund-overview.component.scss'],
})
export class FundOverviewComponent implements OnInit, OnChanges {
  @Input('symbol') currentSymbol = '';
  fundOverview: any;
  fundHoldingSymbols = [];
  raHoldingsScore: any;
  raHoldingPairs = [];
  raSelectedPair: any;
  raHoldingsData: any;
  raHoldingChartConfigs = {};
  raSelectedChartConfig = null;
  selectedSymbolScoreStyle = 'background-color: #646464;';
  currentHoldingSymbol = '';
  symbolDialogShow = false;

  constructor(
    private liveService: LiveService,
    private relativeAnalysisService: RelativeAnalysisService
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
    this.raHoldingsScore = null;
    this.raHoldingsData = null;
    this.raSelectedChartConfig = null;
    if (this.currentSymbol != '') {
      this.liveService
        .getUrlData('/etf/overview/' + this.currentSymbol)
        .subscribe(d => this.setFundOverview(d));
    }
  }

  setFundOverview(d) {
    this.fundOverview = d;
    this.raHoldingsScore = null;
    if (this.fundOverview['topHoldings']) {
      this.fundHoldingSymbols = this.fundOverview['topHoldings'].map(item => {
        if (item['symbol'] == 'FB') {
          item['symbol'] = 'META';
        }
        if (item['symbol'] == 'LIN.L') {
          item['symbol'] = 'LIN';
        }
        return item['symbol'];
      });
      this.fundHoldingSymbols.unshift(this.currentSymbol);
      this.liveService
        .postRequest('/relative-analysis-holdings', this.fundHoldingSymbols)
        .subscribe(d => this.setData(d));
    }
  }

  setData(d) {
    this.raHoldingsData = d;
    this.prepareDataForHeatTable(this.raHoldingsData);
    this.prepareChartConfigs();
  }

  prepareDataForHeatTable(data) {
    if (data && data.length > 0) {
      const length = data.length;
      let lastRow = data[length - 1];
      let allKeys = Object.keys(lastRow);
      let specialSymbol = undefined;
      this.raHoldingPairs = [];

      let raTableData = {};

      for (let [key, value] of Object.entries(lastRow)) {
        if (key.includes('score')) {
          let [sym1, sym2] = key.split('_');
          if (!this.raHoldingPairs.includes(sym1 + '_' + sym2)) {
            this.raHoldingPairs.push(sym1 + '_' + sym2);
          }
          if (!Object.keys(raTableData).includes(sym1)) {
            raTableData[sym1] = {};
            raTableData[sym1][sym1] = 0;
          }
          if (!Object.keys(raTableData).includes(sym2)) {
            raTableData[sym2] = {};
            raTableData[sym2][sym2] = 0;
          }
          raTableData[sym1][sym2] = -value;
          raTableData[sym2][sym1] = value;
        }
      }

      // this.fundHoldingSymbols.forEach(item => {
      //   if (!allKeys.some(key => key.startsWith('item' + '_'))) {
      //     specialSymbol = item;
      //   }
      // });
      // raTableData[specialSymbol] = {};
      // for (let key of Object.keys(raTableData)) {
      //   raTableData[key][key] = 0;
      // }

      this.raHoldingsScore = raTableData;
    }
  }

  prepareChartConfigs() {
    this.raHoldingChartConfigs = {};
    for (const pair of this.raHoldingPairs) {
      const [sym1, sym2] = pair.split('_');
      this.raHoldingChartConfigs[pair] = {
        xColKey: 'date',
        yColKey1: sym1,
        yColKey2: sym2,
        multiplier: 1,
      };
      this.raHoldingChartConfigs[sym2 + '_' + sym1] = {
        xColKey: 'date',
        yColKey1: sym2,
        yColKey2: sym1,
        multiplier: -1,
      };
      this.relativeAnalysisService.addDiffColumn(this.raHoldingsData, sym1, sym2);
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

  handleHeatMapSymbolPairClick(event) {
    this.raSelectedPair = event.colSym + '_' + event.rowSym;
    this.raSelectedChartConfig = this.raHoldingChartConfigs[this.raSelectedPair];
  }
}
