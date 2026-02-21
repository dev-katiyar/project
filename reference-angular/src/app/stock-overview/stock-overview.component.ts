import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { NotificationService } from '../services/notification.service';
import { ChartUtils } from '../utils/chart.utils';
import { TechnicalService } from '../services/technical.service';

@Component({
  selector: 'app-stock-overview',
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss'],
})
export class StockOverviewComponent implements OnInit, OnChanges {
  stockOverview: any;
  barChartDataRev;
  revAnnaulChartData;
  revQuarterlyChartDataRev;
  frequency = 'quarterly';

  barChartDataEPS;
  @Input('symbol') currentSymbol = 'AAPL';
  symbolsTechData;

  showShortDesciption: boolean = true;

  newsSymbols = [];

  // to color code the return tiles
  maxAbsReturn = 0;

  // no data
  isServerResonseNull = false;

  constructor(private liveService: LiveService, private technicalService: TechnicalService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.currentSymbol) {
      this.loadData();
    }
  }

  loadData() {
    this.isServerResonseNull = false;
    this.symbolsTechData = null;
    this.stockOverview = null;
    if (this.currentSymbol != '') {
      this.liveService
        .postRequest('/symbol/model/NA', this.currentSymbol)
        .subscribe(d => this.setOverviewData(d));
    }
  }

  setOverviewData(d) {
    this.symbolsTechData = d;
    this.liveService
      .getUrlData('/symbol/overview/' + this.currentSymbol)
      .subscribe(d => this.setStockOverview(d));
  }

  setStockOverview(d) {
    try {
      if ('regularMarketTime' in d && !this.isNA(d['regularMarketTime'])) {
        // coverting time stamp to js date time
        d['regularMarketTime'] = new Date(d['regularMarketTime'] * 1000);
      }

      if ('sharesShortDate' in d && !this.isNA(d['sharesShortDate'])) {
        // coverting time stamp to js date time
        d['sharesShortDate'] = new Date(d['sharesShortDate'] * 1000);
      }

      if ('sharesShortPriorMonthDate' in d && !this.isNA(d['sharesShortPriorMonthDate'])) {
        // coverting time stamp to js date time
        d['sharesShortPriorMonthDate'] = new Date(d['sharesShortPriorMonthDate'] * 1000);
      }

      if ('lastDividendDate' in d && !this.isNA(d['lastDividendDate'])) {
        // coverting time stamp to js date time
        d['lastDividendDate'] = new Date(d['lastDividendDate'] * 1000);
      }

      if ('lastSplitDate' in d && !this.isNA(d['lastSplitDate'])) {
        // coverting time stamp to js date time
        d['lastSplitDate'] = new Date(d['lastSplitDate'] * 1000);
      }

      let selectedSymbolTechData = this.symbolsTechData.find(
        item => item.symbol == this.currentSymbol,
      );

      if (selectedSymbolTechData) {
        // adding gains data from caclulated technicals
        const returnsArr = [];
        d['wtd'] = selectedSymbolTechData['wtd'];
        returnsArr.push(selectedSymbolTechData['wtd']);

        d['mtd'] = selectedSymbolTechData['mtd'];
        returnsArr.push(selectedSymbolTechData['mtd']);

        d['qtd'] = selectedSymbolTechData['qtd'];
        returnsArr.push(selectedSymbolTechData['qtd']);

        d['ytd'] = selectedSymbolTechData['ytd'];
        returnsArr.push(selectedSymbolTechData['ytd']);

        d['change_oneyearbeforedate_pct'] = selectedSymbolTechData['change_oneyearbeforedate_pct'];
        returnsArr.push(selectedSymbolTechData['change_oneyearbeforedate_pct']);

        d['priceChange2Year'] = selectedSymbolTechData['priceChange2Year'];
        returnsArr.push(selectedSymbolTechData['priceChange2Year']);

        d['priceChange3Year'] = selectedSymbolTechData['priceChange3Year'];
        returnsArr.push(selectedSymbolTechData['priceChange3Year']);

        const minReturn = Math.min(...returnsArr);
        const maxReturn = Math.max(...returnsArr);

        this.maxAbsReturn = Math.max(Math.abs(minReturn), Math.abs(maxReturn));
      }

      this.stockOverview = d;

      if (this.stockOverview) {
        this.revAnnaulChartData = ChartUtils.getAllSeriesData(
          this.stockOverview.revEarningAnnual,
          this.getSeries(['revenue', 'earnings']),
          'date',
          false,
        );
        this.revQuarterlyChartDataRev = ChartUtils.getAllSeriesData(
          this.stockOverview.revEarningQuarterly,
          this.getSeries(['revenue', 'earnings']),
          'date',
          false,
        );
        this.frequencyChangedRev(this.frequency);

        this.barChartDataEPS = ChartUtils.getAllSeriesData(
          this.stockOverview.epsQuarterly,
          [{ name: 'epsActual', data: [], legend: 'EPS' }],
          'date',
          false,
        );
      }

      this.newsSymbols = [this.currentSymbol];
    } catch (error) {
      this.isServerResonseNull = true;
    }
  }

  getTileStyle(value) {
    const scoreStyle = {};

    let startColor;
    let endColor;

    // green
    if (value >= 0) {
      startColor = [0, 10, 0];
      endColor = [0, 255, 0];
    }

    // red
    if (value < 0) {
      startColor = [10, 0, 0];
      endColor = [255, 0, 0];
    }

    const gradColor = this.technicalService.getRGBColorPercentage(
      startColor,
      endColor,
      Math.abs(value / this.maxAbsReturn),
    );

    scoreStyle['background-color'] = gradColor;
    return scoreStyle;
  }

  frequencyChangedRev(frequency) {
    this.frequency = frequency;
    if (frequency === 'yearly') {
      this.barChartDataRev = this.revAnnaulChartData;
    }
    if (frequency === 'quarterly') {
      this.barChartDataRev = this.revQuarterlyChartDataRev;
    }
  }

  getSeries(names) {
    let series = [];
    for (let name of names) {
      series.push({ name: name, data: [] });
    }
    return series;
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

  alterDescriptionText() {
    this.showShortDesciption = !this.showShortDesciption;
  }
}
