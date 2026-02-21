import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-admin-data-view',
  templateUrl: './admin-data-view.component.html',
  styleUrls: ['./admin-data-view.component.scss'],
})
export class AdminDataViewComponent implements OnInit {
  isAdminUser = 0;
  symbol = 'AAPL';
  periods = [
    { name: 'YTD', code: 'ytd' },
    { name: '20D', code: '20Day' },
    { name: '1M', code: '1month' },
    { name: '3M', code: '3month' },
    { name: '6M', code: '6month' },
    { name: '1Y', code: '1year' },
    { name: '3Y', code: '3year' },
    { name: '10Y', code: '10year' },
    { name: '20Y', code: '20year' },
  ];
  selectedPeriod = { name: '1Y', code: '1year' };

  frequencies = [
    { name: 'Daily', code: 'd' },
    { name: 'Weekly', code: 'w' },
    { name: 'Monthly', code: 'm' },
  ];
  selectedFrequncy = { name: 'Daily', code: 'd' };

  tableData = [];
  selectedCols = [];

  colsPrice = [
    { field: 'date', header: 'Date' },
    { field: 'open', header: 'Open' },
    { field: 'high', header: 'High' },
    { field: 'low', header: 'Low' },
    { field: 'close', header: 'Close' },
    { field: 'adjusted_close', header: 'Adj Close' },
  ];

  keySymbols = [
    { name: 'S&P500', code: 'GSPC.INDX' },
    { name: 'NASDAQ100', code: 'NDX.INDX' },
    { name: 'DowJones', code: 'DJI.INDX' },
    { name: 'Russel2000', code: 'RUT.INDX' },
    { name: 'CBOE VIX', code: 'VIX.INDX' },
  ];
  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/user/isAdmin').subscribe(d => (this.isAdminUser = d['userType']));
  }

  onSymbolSelected(event) {
    this.symbol = event.value;
    this.fetchData();
  }

  onSymbolClick(symbol) {
    this.symbol = symbol.code;
    this.fetchData();
  }

  onPeriodChanged(period) {
    this.selectedPeriod = period;
    this.fetchData();
  }

  onFrequncyChanged(freq) {
    this.selectedFrequncy = freq;
    this.fetchData();
  }

  fetchData() {
    this.tableData = [];
    this.selectedCols = [];
    this.liveService
      .getSymbolPriceDataFreq(this.symbol, this.selectedPeriod.code, this.selectedFrequncy.code)
      .subscribe(data => this.setData(data));
  }

  setData(data) {
    this.tableData = data;
    this.selectedCols = this.colsPrice;
  }
}
