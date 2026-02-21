import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css'],
})
export class TransactionsComponent implements OnInit {
  @Input() transactionsData = [];
  @Output() public onSymbolClicked = new EventEmitter();
  @Output() public DataRefresh = new EventEmitter();
  @Input() isAdminUser;
  loading = false;
  @Input() selectedPortfolioId: any;
  // list of columns used by export CSV function
  cols: { field: string; header: string }[];  
  ShowSymbolChart(symbol) {
    this.onSymbolClicked.emit({
      value: symbol,
    });
  }

  constructor() {}

  ngOnInit() {
    this.cols = [
      { field: 'symbol', header: 'Symbol' },
      { field: 'side', header: 'Buy/Sell' },
      { field: 'qty', header: '# Shrs' },
      { field: 'price', header: 'Cost Basis' },
      { field: 'date', header: 'Transaction Date' },
      // { field: 'commission', header: 'Commission' },
      // { field: 'name', header: 'Name' },
    ];
  }

  refresh() {
    this.loading = false;
    this.DataRefresh.emit({
      value: '',
    });
  }

  getCommission(transaction) {
    return transaction.commission * transaction.qty;
  }

  getCloseLabel(transaction) {
    if (transaction.side == 'Buy') {
      return 'Sell';
    } else if (transaction.side == 'Sell Short') {
      return 'Buy To Cover';
    } else {
      return '';
    }
  }
}
