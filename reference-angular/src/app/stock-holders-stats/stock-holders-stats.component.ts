import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { DateUtils } from '../utils/dateutils'

@Component({
  selector: 'app-stock-holders-stats',
  templateUrl: './stock-holders-stats.component.html',
  styleUrls: ['./stock-holders-stats.component.scss'],
})
export class StockHoldersStatsComponent implements OnInit {
  constructor(private liveService: LiveService) {}

  @Input('symbol') currentSymbol;
  holdersData;
  buySellTrend;
  startYear = 2020;
  barChartSeriesConfig;

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.currentSymbol) {
      this.loadData();
    }
  }

  loadData() {
    this.liveService
      .getUrlData('/eod/insider-transactions/' + this.currentSymbol)
      .subscribe(d => this.setHoldersData(d));
  }

  setHoldersData(data) {
    if(data['insiderTransactions'] && data['insiderTransactions'].length === 0) {
      this.holdersData = undefined;
    } else {
      this.holdersData = data;
      this.prepareMonthlyBuySellData(data);
    }
  }

  prepareMonthlyBuySellData(data) {
    this.buySellTrend = this.getInitialTrendObject();
    let tnxs = data?.insiderTransactions ?? [];
    for (let txn of tnxs) {
      const txnDate = new Date(txn['transactionDate']);
      const monthYear = this.getShortMonthName(txnDate.getMonth()) + ' ' + txnDate.getFullYear();
      const txnQty = txn['transactionAmount'];
      const txnSide = txn['transactionAcquiredDisposed'] == 'A' ? 'buy' : 'sell';
      this.buySellTrend['monthly'].forEach(item => {
        if (item['month'] === monthYear) {
          item[txnSide] += txnQty;
        }
      });
    }
    this.getBarChartSeriesConfig();

  }

  getInitialTrendObject() {
    let template = { monthly: [], quarterly: [] };
    const today = new Date();
    const yearToday = today.getFullYear();
    const monthToday = today.getMonth();
    for (let year = this.startYear; year <= yearToday; year++) {
      for (let month = 0; month < 12; month++) {
        if (year == yearToday && month > monthToday) {
          break;
        }
        template.monthly.push({
          month: this.getShortMonthName(month) + ' ' + year,
          buy: 0,
          sell: 0,
        });
      }
    }

    return template;
  }

  getShortMonthName(monthNumber) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
  
    // Ensure the provided monthNumber is within the valid range
    if (monthNumber >= 0 && monthNumber <= 11) {
      // Subtract 1 from monthNumber since JavaScript months are zero-indexed
      return months[monthNumber];
    } else {
      return 'Invalid Month';
    }
  }

  getBarChartSeriesConfig() {
    this.barChartSeriesConfig = [];
    this.barChartSeriesConfig.push(
      // can be extended to multiple series, if needed
      {
        seriesName: 'BUY',
        xCol: 'month',
        xColName: 'month',
        yCol: 'buy',
        clickEventCol: 'month',
        colorPos: 'green',
        colorNeg: 'red',
        barOrColumn: 'column',
        sortByCol: undefined, 
        colorSer: 'green',
      },
      {
        seriesName: 'SELL',
        xCol: 'month',
        xColName: 'month',
        yCol: 'sell',
        clickEventCol: 'month',
        colorPos: 'red',
        colorNeg: 'green',
        barOrColumn: 'column',
        sortByCol: undefined, 
        colorSer: 'red',
      },
    );
  }
}
