import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { LiveService } from '../services/live.service';
import { PortfolioService } from '../services/portfolio.service';
import { formatDate } from '@angular/common';
import { MessageService } from 'primeng/api';
import { DateUtils } from '../utils/dateutils';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-import-transaction',
  templateUrl: './import-transaction.component.html',
  styleUrls: ['./import-transaction.component.scss']
})
export class ImportTransactionComponent implements OnInit {

  @Input('symbol') symbol;
  userPortfolios;
  selectedPortfolio;
  transaction = { "id": 0, "symbol": "", "companyname": "", "holdings": 0, "qty": 1, "price": 0, "side": "Buy", "commission": 0, "dateObj": new Date() };
  portfolio = { "name": "", "transactions": [], currentCash: 0, "portfolio_type": [], startingCash: 0 };
  loading = false;
  @Output() public OnValidateSuccess = new EventEmitter();
  selectedPortfolioChangeSubject: Subject<void> = new Subject<void>();

  constructor(
    private liveService: LiveService,
    private portfolioService: PortfolioService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadAllPortfolios();
    this.transaction.symbol = this.symbol;
    this.getsymbolPrices(this.symbol, this.transaction.dateObj, this.transaction);
  }

  loadAllPortfolios() {
    this.liveService.getUrlData("/modelportfolio/all/user").subscribe(d => {
      this.userPortfolios = d;
      if (this.userPortfolios.length > 0) {
        this.selectedPortfolio = this.userPortfolios[0];
        this.portfolioChanged({value: this.selectedPortfolio});
      }
    });
  }

  portfolioChanged(event) {
    this.selectedPortfolioChangeSubject.next(event.value);
    this.selectedPortfolio = event.value;
    this.liveService.getUrlData('/modelportfolio/' + this.selectedPortfolio.id).subscribe(d => this.buildPositions(d));
  }

  buildPositions(data) {
    this.portfolio.transactions = data.transactions;
    this.transaction.holdings = this.portfolio.transactions.reduce((total, transaction) => {
      if (this.transaction.symbol == transaction.symbol) {
        return total + parseInt(transaction.qty);
      } else {
        return total + 0;
      }
    }, 0);

    this.portfolio.transactions.unshift(this.transaction);
  }

  getsymbolPrices(symbol, dateObj, transaction) {
    let date_formatted = formatDate(dateObj, 'yyyy-MM-dd', 'en-US')
    this.liveService.getUrlData(`/symbol/prices?symbol=${symbol}&date=${date_formatted}`).subscribe(res => this.setSymbolDetail(res, symbol, transaction));
  }

  setSymbolDetail(res, symbol, transaction) {
    if (res && symbol in res) {
      let price_data = res[symbol];
      if (transaction && price_data) {
        transaction.price = price_data.price;
        transaction.companyname = price_data.companyname;
      }
    }
  }

  onCancelClick() {
    this.OnValidateSuccess.emit({ "portfolio": '', "type": "cancel" });
  }

  onSaveClick() {
    this.OnValidateSuccess.emit({ "portfolio": '', "type": "save" });
  }

  addSymbolToSelectedPortfolio() {
    this.saveTransactions();
  }

  saveTransactions(): void {
    this.loading = true;
    let error = '';
    error = this.checkBasicDetails(this.transaction);
    
    let startingCash = Number(this.selectedPortfolio["startingCash"]);
    if (error == "") {
      let tradesValue = this.getMarketValue();
      if (tradesValue > startingCash) {
        error = `You don't have sufficient funds. Trade value is :${tradesValue.toFixed(2)} and available Cash :${startingCash.toFixed(2)} . Please increase Starting Cash `;
      }
    }

    if (error == "") {
      this.SaveImportedTransactions();
    }
    else {
      this.showSuccess({ "status": "error", "message": error });
    }
  }

  checkBasicDetails(data) {
    let validSides = ["Buy", "Sell", "Sell Short", "Buy To Cover"]
    if (!data.symbol || data.symbol == "") {
      return `Please enter symbol for transaction`;
    }
    if (isNaN(data.price) || data.price <= 0) {
      return `Please enter price for ${data.symbol}`;
    }
    if (isNaN(data.qty) || data.qty <= 0) {
      return `Please enter # shares for ${data.symbol}`;
    }
    if (!validSides.includes(data.side)) {
      return `Please enter correct Side for ${data.symbol} Valid Sides are Buy ,Sell,Sell Short,Buy To Cover`;
    }
    if (!data.dateObj) {
      return `Please enter transaction date for ${data.symbol}`
    }
    return "";
  }

  getMarketValue() {
    return this.portfolioService.getMarketValue(this.portfolio.transactions);
  }

  SaveImportedTransactions() {
    this.transaction["date"] = DateUtils.formatDate(this.transaction["dateObj"]); 
      
    let portfolioToSave = {
      "name": this.selectedPortfolio.name,
      "id": this.selectedPortfolio.id,
      "startingCash": this.selectedPortfolio.startingCash,
      "newTransactions": [this.transaction],
      "updatedTransactions": [],
      "deletedTransactions": [],
      "action": "add",
      "portfolio_type": "user"
    }
    this.loading = false;
    this.portfolioService.savePortfolio(portfolioToSave).subscribe(data => {
      this.showSuccess({ "status": "success", "message": "Position saved" });
      this.OnValidateSuccess.emit({ "portfolio": '', "type": "save" });
    });
  }

  showSuccess(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 2000 });
    this.loading = false;
  }

  onDateChangeHandler($event, transaction) {
    if (transaction.symbol != '') {
      this.getsymbolPrices(transaction.symbol, transaction.date, transaction);
    }
  }

}
