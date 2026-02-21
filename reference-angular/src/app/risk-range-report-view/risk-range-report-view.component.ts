import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-risk-range-report-view',
  templateUrl: './risk-range-report-view.component.html',
  styleUrls: ['./risk-range-report-view.component.scss'],
})
export class RiskRangeReportViewComponent implements OnInit {
  @Input() riskRangeSymArr;

  // input related
  symbolsDict = {};
  symbolArr = [];

  // UI error display
  error = '';

  // UI related
  updateDate;
  tblData = [];

  rowGroupMetadata = {};
  minChg = 0;
  maxChg = 0.5;

  // Holings related
  @Input() isEtfView = false;
  selectedETF = null;
  @Output() public etfHoldingIconClicked = new EventEmitter(); // for parent to know ETF

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {}

  ngOnChanges(changes) {
    if (changes.riskRangeSymArr && changes.riskRangeSymArr.currentValue.length) {
      this.symbolArr = this.setSymbolArrayAndDict(this.riskRangeSymArr);
      this.loadRiskRangeAnalysis(this.isEtfView);
    }
  }

  setSymbolArrayAndDict(symArr) {
    let symbols = [];
    for (let row of symArr) {
      const sym = row['symbol'];
      this.symbolsDict[sym] = row;
      symbols.push(sym);
    }
    return symbols;
  }

  loadRiskRangeAnalysis(isReloadLive) {
    const postData = {
      tickers: this.symbolArr,
      reloadLiveData: isReloadLive,
    };
    this.error = 'preparing/fetching risk range report...';
    let url = '/riskrange-analysis';
    if (this.isEtfView) {
      url = '/riskrange-analysis-etf';
    }
    this.liveService.postRequest(url, postData).subscribe(res => {
      if (res['status'] == 'ok') {
        const riskRangeData = Object.values(res['data']);
        this.setTableData(riskRangeData);
        this.updateDate = res['update_date'];
      }
    });
  }

  setTableData(riskRangeData) {
    for (let row of riskRangeData) {
      const sym = row['symbol'];
      const symCatRow = this.symbolsDict[sym];
      row['name'] = symCatRow['name'];
      row['subCategory'] = symCatRow['subCategory'];
      row['sortOrder'] = symCatRow['sortOrder'];
      this.tblData.push(row);
    }

    this.tblData.sort((a, b) => a.sortOrder - b.sortOrder);
    this.updateRowGroupMetaData();
    // this.setMinMax();
  }

  updateRowGroupMetaData() {
    this.rowGroupMetadata = {};

    if (this.tblData) {
      for (let i = 0; i < this.tblData.length; i++) {
        let rowData = this.tblData[i];
        let catName = rowData.subCategory;

        if (i == 0) {
          this.rowGroupMetadata[catName] = { index: 0, size: 1 };
        } else {
          let previousRowData = this.tblData[i - 1];
          let previousRowGroup = previousRowData.subCategory;
          if (catName === previousRowGroup) this.rowGroupMetadata[catName].size++;
          else this.rowGroupMetadata[catName] = { index: i, size: 1 };
        }
      }
    }
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  handleLiveDataRefresh() {
    this.loadRiskRangeAnalysis(true);
  }

  resetObjs() {
    this.symbolsDict = {};
    this.symbolArr = [];
    this.tblData = [];
    this.updateDate = '';
    this.error = '';
  }

  // Method to determine class based on stock value
  getStockClass(value: number, rowIndex: number): string {
    if (rowIndex == 0) return;

    if (value > 0) {
      // Gain: Return a green class based on value
      return `gain-${this.scaleToRange(value)}`; // Cap to 4 for classes
    } else if (value < 0) {
      // Loss: Return a red class based on value
      return `loss-${this.scaleToRange(value)}`; // Cap to 4 for classes
    }
    return ''; // No class for neutral
  }

  scaleToRange(x) {
    x = x / 5; // put buckets 5 point apart
    x = Math.floor(Math.abs(x * 100)); // decimal to integer
    x = x > 5 ? 5 : x; // but limit to 5

    return x;
  }

  // Holding Risk Range Related 
  showHoldingsIcon(symbol) {
    // hiding holdings analysis for the symbols which do not have supported holding symbols
    return !['EEM', 'EFA', 'GDX', 'VEA'].includes(symbol);
  }

  // Send EFT Symbol to Parent Component
  onSymbolRowClick(row) {
    this.selectedETF = row;
    if(this.selectedETF) {
      this.etfHoldingIconClicked.emit(this.selectedETF);
    }
  }
}
