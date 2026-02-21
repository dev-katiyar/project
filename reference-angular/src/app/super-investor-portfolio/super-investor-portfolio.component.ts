import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-super-investor-portfolio',
  templateUrl: './super-investor-portfolio.component.html',
  styleUrls: ['./super-investor-portfolio.component.scss'],
})
export class SuperInvestorPortfolioComponent implements OnInit, OnChanges {
  @Input() superInvestor: any;

  // data from api
  holdings: any[];
  includedInvestors: any[];

  sectorDistribution: any[];
  isTransactionsPopUpVisible = false;
  transactions: any[];
  displayDialogSymbolDetail = false;
  selectedSymbol = '';
  // for exporting csv, column list is needed for p-table element
  colsHolding: { field: string; header: string }[];
  colsRecTxns: { field: string; header: string }[];

  // report dates dropdown data
  reportDates: any[];
  selectedReportDate: any;

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {
    this.colsHolding = [
      { field: 'rep_symbol', header: 'Symbol' },
      { field: 'sector', header: 'Sector' },
      { field: 'rep_pcnt', header: 'Portfolio Percent' },
      { field: 'rep_qty', header: 'Quantity' },
      { field: 'rep_price', header: 'Reported Cost' },
      { field: 'rep_value', header: 'Reported Value' },
    ];

    this.colsRecTxns = [
      { field: 'name', header: 'Fund Name' },
      { field: 'rep_date', header: 'Reported Date' },
      { field: 'rep_symbol_name', header: 'Symbol Name' },
      { field: 'rep_side', header: 'Buy/Sell' },
      { field: 'rep_qty', header: 'Quantity' },
      { field: 'rep_price', header: 'Reported Cost' },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.clearData();
    if (this.superInvestor) {
      if (this.superInvestor.code == 'all') {
        this.liveService.getUrlData('/holdings/report-dates').subscribe(res => {
          this.reportDates = res as any[];
          this.selectedReportDate = this.reportDates[0]?.rep_date;
          // console.log('Report Dates:', this.reportDates, this.selectedReportDate);
          this.getSuperInveestorHoldings(this.selectedReportDate);
        });
      } else {
        this.getSuperInveestorHoldings(null);
      }
    }
  }

  getSuperInveestorHoldings(selDate) {
    this.liveService.getSuperInvestorHoldings(this.superInvestor.code, selDate).subscribe(res => {
      if (res['status'] == 'ok') {
        this.holdings = res['holdings'] as any[];
        this.includedInvestors = res['investors'] as any[];
        if (this.holdings.length === 0) {
          this.clearData();
          return;
        }
        this.setDataForSectorPieChart();
      } else {
        console.error('Error fetching super investor holdings');
      }
    });
  }

  onReportDateChange(event) {
    this.getSuperInveestorHoldings(this.selectedReportDate);
  }

  setDataForSectorPieChart() {
    this.sectorDistribution = [];
    for (let holding of this.holdings) {
      let sector = holding['sector'];
      let index = this.sectorDistribution.findIndex(dist => dist.sector == sector);
      if (index == -1) {
        this.sectorDistribution.push({
          sector: sector,
          percent: holding['rep_pcnt'],
        });
      } else {
        this.sectorDistribution[index]['percent'] += holding['rep_pcnt'];
      }
    }
  }

  onShowTransactionsClick() {
    this.transactions = [];
    this.liveService.getSuperInvestorRecentTransactions(this.superInvestor.code).subscribe(txns => {
      this.transactions = txns as any[];
      this.isTransactionsPopUpVisible = true;
    });
  }

  showSymbolDetailDialog(symbol) {
    this.selectedSymbol = symbol;
    this.displayDialogSymbolDetail = true;
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  clearData() {
    this.reportDates = [];
    this.includedInvestors = [];
    this.selectedReportDate = null;
    this.holdings = undefined;
    this.sectorDistribution = undefined;
  }
}
