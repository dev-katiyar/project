import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { PortfolioService } from '../services/portfolio.service';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'openpositions',
  templateUrl: './openpositions.component.html',
  styleUrls: ['./openpositions.component.css'],
})
export class OpenpositionsComponent implements OnInit {
  selectedSymbol = '';
  userTransactions = [];
  symbolDialogShow = false;
  sellTradeDialogShow = false;
  buyTradeDialogShow = false;
  cashDialogShow = false;
  loading = false;
  @Input() currentCash;
  @Input() startingCash;
  @Input() isAdminUser;
  messageText = '';
  messageColor = 'red';
  public buyTrade = { symbol: '', qty: 1, price: '', side: '', commission: 0 };
  @Input() positions = [];
  @Input() selectedPortfolioId: any;
  @Output() public DataRefresh = new EventEmitter();
  @Output() public onSymbolClicked = new EventEmitter();
  sidesSell = [
    { name: 'Sell', id: 'Sell' },
    { name: 'Buy To Cover', id: 'Buy To Cover' },
  ];
  cashTransactionAmount = 0;
  cols: any[]; // dynamic table needed to enable CSV export feature

  constructor(
    private portfolioService: PortfolioService,
    private messageService: MessageService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1000 });
    this.loading = false;
  }

  ShowSymbolChart(symbol) {
    this.onSymbolClicked.emit({value: symbol});
    this.symbolPopupService.showPopup(symbol);
  }

  refreshTransactionData(data) {
    this.loading = false;
    this.DataRefresh.emit({
      value: '',
    });
  }

  ngOnInit() {
    this.cols = [
      // { field: 'research', header: '' },
      { field: 'symbol', header: 'Symbol' },
      { field: 'name', header: 'Name' },
      { field: 'type', header: 'Type' },
      { field: 'qty', header: '# Shrs' },
      { field: 'price', header: 'Avg Cost' },
      // { field: 'costBasis', header: 'Cost Basis' },
      { field: 'percentageShare', header: '% Acc' },
      { field: 'currentPrice', header: 'Price' },
      { field: 'changePct', header: 'Change' },
      { field: 'currentValue', header: 'Mkt Value' },
      { field: 'pnl', header: 'P&L' },
      { field: 'pnlPercentage', header: 'P&L(%)' },
      { field: 'dividendYield', header: 'Div Yield' },
      { field: 'sector', header: 'Sector' },
    ];
  }

  setMsg(msg) {
    this.messageText = msg;
    this.messageColor = 'green';
    this.loading = false;
  }

  setError(msg) {
    this.messageText = '......';
    this.messageText = msg;
    this.messageColor = 'red';
    this.loading = false;
  }

  clearError() {
    this.messageText = '';
    this.loading = false;
  }

  getMessageColor() {
    let style = {
      color: this.messageColor,
    };
    return style;
  }

  showSymbolDetailDialog(symbol) {
    this.selectedSymbol = symbol;
    this.symbolDialogShow = true;
  }
}
