import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { LiveService } from '../services/live.service';
import { PortfolioService } from '../services/portfolio.service';

@Component({
  selector: 'app-import-transactions',
  templateUrl: './import-transactions.component.html',
  styleUrls: ['./import-transactions.component.css']
})
export class ImportTransactionsComponent implements OnInit {

  loading = false;
  sidesBuy = this.portfolioService.getValidSides();

  @Input() portfolio: any;
  @Input() portfoliosNames = [];
  @Input('component-title') title = 'Edit a Portfolio';
  @Output() public OnValidateSuccess = new EventEmitter();
  
  constructor(
    private portfolioService: PortfolioService, 
    private messageService: MessageService,
    private liveService: LiveService) {   
  }
  
  ngOnInit() {
  }

  showMessage(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1000 });
    this.loading = false;
  }

  getMarketValue() {
    return this.portfolioService.getMarketValue(this.portfolio.transactions);
  }

  checkBasicDetails(data, keys) {
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
    if (data.side == "Sell" && data.qty > data.holdings) {
      return `Sell quantity ${data.qty} for the ${data.symbol} is more than current held quantity: ${data.holdings}`;
    }
    if (!validSides.includes(data.side)) {
      return `Please enter correct Side for ${data.symbol} Valid Sides are Buy ,Sell,Sell Short,Buy To Cover`;
    }
    if (!data.date) {
      return `Please enter transaction date for ${data.symbol}`
    }

    return "";
  }

  validateName() {
    let name = this.portfolio["name"];
    let startingCash = this.portfolio["startingCash"];
    if (name == "") {
      return "Please enter Portfolio Name !";
    }
    if (startingCash == 0 || isNaN(startingCash) || startingCash <=0 ) {
      return "Please enter valid Starting Cash !";
    }
    if (this.portfoliosNames.includes(name)) {
      return "You already have portfolio with same name !";
    }
    return "";
  }

  saveTransactions(): void {
    this.loading = true;
    let error = this.validateName();
    if (error != "") {
      this.showMessage({ "status": "error", "message": error });
    }
    else {
      let startingCash = Number(this.portfolio["startingCash"]);
      for (let transaction of this.portfolio.transactions) {
        error = this.checkBasicDetails(transaction, ["symbol", "qty", "price", "date"]);
        if (error != "") {
          break;
        }
      }
      if (error == "") {
        let tradesValue = this.getMarketValue();
        if (tradesValue > startingCash) {
          error = `You don't have sufficient funds. Trade value is :${tradesValue.toFixed(2)} and available Cash :${startingCash.toFixed(2)} . Please increase Starting Cash `;
        }
      }

      if (error == "") {
        this.showMessage({ "status": "success", "message": "Saving Portfolio..." });
        this.OnValidateSuccess.emit({ "portfolio": this.portfolio, "type": "save" });
      }
      else {
        this.showMessage({ "status": "error", "message": error });
      }
    }
  }

  handleCancel() {
    this.OnValidateSuccess.emit({ "portfolio": this.portfolio, "type": "cancel" });
  }

  deleteTransaction(transaction) {
    this.portfolio.transactions.splice(this.portfolio.transactions.indexOf(transaction), 1);
  }

}
