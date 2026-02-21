import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';

type Expiry = { id: number; name: string };

@Component({
  selector: 'app-stock-options',
  templateUrl: './stock-options.component.html',
  styleUrls: ['./stock-options.component.scss'],
})
export class StockOptionsComponent implements OnInit, OnChanges {
  @Input('symbol') symbol = 'AAPL';
  expiryDates: Expiry[];
  selectedExpiryDate: Expiry;
  optionsData: any;
  tableData: any[];
  tableDataFiltered: any[];

  columnsDict = {
    callput: [
      { field: 'contractSymbol', name: 'Symbol' },
      { field: 'strike', name: 'Strike' },
      { field: 'type', name: 'Type' },
      { field: 'volume', name: 'Volume' },
      { field: 'openInterest', name: 'Open Interest' },
      { field: 'bid', name: 'Bid' },
      { field: 'ask', name: 'Ask' },
      { field: 'lastPrice', name: 'Last Price' },
      { field: 'lastTradeDate', name: 'Last Trade Date' },
      { field: 'impliedVolatility', name: 'Implied Volatility' },
    ],
    straddle: [
      // { field: 'contractSymbol', name: 'Symbol' },
      { field: 'lastPrice', name: 'Last Price' },
      { field: 'lastTradeDate', name: 'Last Trade Date' },
      { field: 'volume', name: 'Volume' },
      { field: 'openInterest', name: 'Open Interest' },
      { field: 'impliedVolatility', name: 'Implied Volatility' },
      { field: 'strike', name: 'Strike' },
      // { field: 'put_contractSymbol', name: 'Symbol' },
      { field: 'put_lastPrice', name: 'Last Price' },
      { field: 'put_lastTradeDate', name: 'Last Trade Date' },
      { field: 'put_volume', name: 'Volume' },
      { field: 'put_openInterest', name: 'Open Interest' },
      { field: 'put_impliedVolatility', name: 'Implied Volatility' },
    ],
  };
  selectedColumns: any;

  viewTypes = ['Side by Side', 'Calls', 'Puts'];
  selectedViewType = this.viewTypes[0];

  strikeFilterFrom = 0;
  strikeFilterTo = 1;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.symbol) {
      this.loadExpries();
    }
  }

  loadExpries() {
    this.expiryDates = null;
    this.optionsData = null;
    this.tableData = null;
    this.tableDataFiltered = null;
    this.liveService
      .getSymbolOptionsExpiration('/symbol/option/', this.symbol)
      .subscribe((data: Expiry[]) => {
        this.expiryDates = data;
        if (this.expiryDates && this.expiryDates.length > 0) {
          this.selectedExpiryDate = this.expiryDates[0];
          this.loadOptionsForExpiry();
        }
      });
  }

  loadOptionsForExpiry() {
    this.optionsData = null;
    this.tableData = null;
    this.tableDataFiltered = null;

    this.liveService
      .getSymbolOptions('/symbol/option/', this.symbol, this.selectedExpiryDate.id)
      .subscribe(data => {
        this.selectedColumns = this.columnsDict['callput'];
        if (data) {
          this.optionsData = data;
          this.setMinAndMaxForFilter([...data['calls'], ...data['puts']])
          this.onViewChange(this.selectedViewType);
        }
      });
  }

  onExpiryDateChange() {
    this.loadOptionsForExpiry();
  }

  onViewChange(vType) {
    this.selectedViewType = vType;
    if (this.selectedViewType === 'Calls') {
      this.tableData = this.optionsData['calls'];
      this.filterTableData();
      this.selectedColumns = this.columnsDict['callput'];
    } else if (this.selectedViewType === 'Puts') {
      this.tableData = this.optionsData['puts'];
      this.filterTableData();
      this.selectedColumns = this.columnsDict['callput'];
    } else if (this.selectedViewType === 'Side by Side') {
      this.tableData = this.getCallsPutsStraddle();
      this.filterTableData();
      this.selectedColumns = this.columnsDict['straddle'];
    }
  }

  setMinAndMaxForFilter(allRows) {
    let min = Infinity;
    let max = -Infinity;
    for (let row of allRows) {
      const strike = +row['strike'];
      if (strike < min) {
        min = strike;
      }
      if (strike > max) {
        max = strike;
      }
    }

    this.strikeFilterFrom = min != Infinity ? min : 0;
    this.strikeFilterTo = max != -Infinity ? max : 1;
  }

  filterTableData() {
    this.tableDataFiltered = this.tableData.filter(row => {
      return +row['strike'] >= this.strikeFilterFrom && +row['strike'] <= this.strikeFilterTo;
    });
  }

  getCallsPutsStraddle() {
    const displayData = [];

    // get a strike price dict with call rows
    const calls = this.optionsData['calls'];
    const callsDict = {};
    for (let call of calls) {
      const key = call['strike'];
      callsDict[key] = call;
    }

    const puts = this.optionsData['puts'];
    for (let put of puts) {
      // for each put
      const strikeKey = put['strike'];
      let callRow = {};

      // if a call exits, then good
      if (strikeKey in callsDict) {
        callRow = callsDict[strikeKey];
        delete callsDict[strikeKey];
      } else {
        callRow['strike'] = strikeKey;
      }

      // merge all fields into calls row
      for (let key in put) {
        callRow['put_' + key] = put[key];
      }

      // add it to display data
      displayData.push(callRow);
    }

    for (let leftoverCall in callsDict) {
      displayData.push(callsDict[leftoverCall]);
    }

    return displayData;
  }

  getCellStyle(row, col) {
    const styleObj = {};
    // border and bigger font for 'strike' column
    if (this.selectedViewType === 'Side by Side' && col.field === 'strike') {
      styleObj['border-left'] = '1px solid';
      styleObj['border-right'] = '1px solid';
      styleObj['font-size'] = '1.2rem';
      styleObj['font-weight'] = 'bold';
    }

    if (
      (col.field.includes('put') && row['put_inTheMoney']) ||
      (!col.field.includes('put') && row['inTheMoney'] && !col.field.includes('strike'))
    ) {
      styleObj['background-color'] = '#e5f5fa';
      if(col.field.includes('lastPrice')) {
        styleObj['border-left'] = '4px solid #0198da';
      }
    }
    return styleObj;
  }
}
