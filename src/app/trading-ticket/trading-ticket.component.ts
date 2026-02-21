import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { formatDate } from '@angular/common';
import { MessageService } from 'primeng/api';
import { DateUtils } from '../utils/dateutils';
import { LiveService } from '../services/live.service';
import { PortfolioService } from '../services/portfolio.service';

@Component({
  selector: 'app-trading-ticket',
  templateUrl: './trading-ticket.component.html',
  styleUrls: ['./trading-ticket.component.scss']
})
export class TradingTicketComponent implements OnInit, OnChanges { 

  constructor(
    private liveService: LiveService,
    private portfolioService: PortfolioService,
    private messageService: MessageService
  ) { }

  @Input('symbol') symbol = "";
  @Input('selectedPortfolioId') selectedPortfolioId: any;     // from dropdown or from input

  @Input('isSideEditable') isSideEditable = false;
  @Input('isSymbolEditable') isSymbolEditable = false;
  @Input('isPortfolioNameEditable') isPortfolioNameEditable = true;

  @Output('cancelClick') cancelClick = new EventEmitter();
  @Output('saveClick') saveClick = new EventEmitter();

  portfolios: any;                                        // for dropdown items
  validSides = this.portfolioService.getValidSides();     // from portfolio service for sides dropdown
  transaction = this.portfolioService.getEmptyTransaction();
  selectedPortfolioDetails = this.portfolioService.getEmptyPortfolioDetails();

  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.symbol != null && this.symbol != "") {
      this.transaction.symbol = this.symbol;
      this.getSymbolPrices(this.symbol, this.transaction.dateObj);
      if (this.isPortfolioNameEditable) {
        this.loadAllPortfolios();
      } else {
        this.getPortfolioDetails();
      }
    }
  }

  loadAllPortfolios() {
    this.portfolioService.getAllPortfolios("user").subscribe(d => {
      this.portfolios = d;
      if (this.portfolios.length > 0) {
        this.selectedPortfolioId = this.portfolios[0].id;
        this.getPortfolioDetails();
      }
    });
  }

  onPortfolioChanged() {
    this.getPortfolioDetails();
  }

  getPortfolioDetails() {
    if (this.selectedPortfolioId) {
      this.liveService.getUrlData('/modelportfolio/' + this.selectedPortfolioId).subscribe(d => {
        this.setSelectedPortfolioDetails(d);
        this.setNewTransactionHoldings();
        this.setNewTransactionAvgCost();
      });
    }
  }

  setSelectedPortfolioDetails(data) {
    this.selectedPortfolioDetails.id = data.portfolioDetails.portfolioid;
    this.selectedPortfolioDetails.name = data.portfolioDetails.name;
    this.selectedPortfolioDetails.currentCash = data.portfolioDetails.currentCash;
    this.selectedPortfolioDetails.startingCash = data.portfolioDetails.startingCash;
    this.selectedPortfolioDetails.openPositions = data.openPositions;
  }

  setNewTransactionHoldings() {
    this.transaction.holdings = this.portfolioService.getSymbolHoldings(
      this.transaction.symbol, this.transaction.side, this.selectedPortfolioDetails.openPositions
    );
  }

  setNewTransactionAvgCost() {
    this.transaction.avgCost = this.portfolioService.getSymbolAvgCost(
      this.transaction.symbol, this.transaction.side, this.selectedPortfolioDetails.openPositions
    );
  }

  onDateChangeHandler() {
    if (this.transaction.symbol != '') {
      this.getSymbolPrices(this.transaction.symbol, this.transaction.dateObj);
    }
  }

  getSymbolPrices(symbol, dateObj) {
    let date_formatted = formatDate(dateObj, 'yyyy-MM-dd', 'en-US')
    this.liveService.getUrlData(`/symbol/prices?symbol=${symbol}&date=${date_formatted}`).subscribe(res =>
      this.setSymbolDetail(res, symbol)
    );
  }

  setSymbolDetail(res, symbol) {
    if (res && symbol in res) {
      let price_data = res[symbol];
      if (this.transaction.symbol ==price_data.symbol) {
        this.transaction.symbol = price_data.symbol;
        this.transaction.price = price_data.price;
        this.transaction.companyname = price_data.companyname;
        this.setNewTransactionHoldings();
        this.setNewTransactionAvgCost();
      }
    }
  }

  onCancelClick() {
    this.cancelClick.emit();
  }

  onSaveClick() {
    let error = "";

    if(!error) error = this.portfolioService.checkNewTransactionBasicDetails(this.transaction);
    if(!error) error = this.portfolioService.checkNewTransactionHoldingDetails(this.transaction);
    if(!error) error = this.portfolioService.checkNewTransactionFundingDetails(this.transaction, this.selectedPortfolioDetails.currentCash);

    if(error) {
      this.showMessage({ "status": "error", "message": error });
    } else {
      let symbols = {symbols: [this.transaction.symbol]}

      this.portfolioService.checkSymbolsValidity(symbols).subscribe( (res: any[]) => {
        let status = res["isvalid"];
        if(status == 'valid') {
          this.saveNewTransaction();
        } else {
          this.showMessage({ "status": "error", "message": `'${this.transaction.symbol}' does not seem to be a valid symbol. Please check and/or contact support`});
        }
      });

    }
  }

  saveNewTransaction() {
    this.transaction["date"] = DateUtils.formatDate(this.transaction["dateObj"]);

    let portfolioToSave = {
      "name": this.selectedPortfolioDetails.name,
      "id": this.selectedPortfolioDetails.id,
      "startingCash": this.selectedPortfolioDetails.startingCash,
      "newTransactions": [this.transaction],
      "updatedTransactions": [],
      "deletedTransactions": [],
      "action": "add",
      "portfolio_type": "user"
    }
    this.portfolioService.savePortfolio(portfolioToSave).subscribe(data => {
      this.showMessage({ "status": "success", "message": "Position saved" });
      this.saveClick.emit();
    });
  }

  showMessage(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
  }

  onSymbolSelected(symbol) {
    let date = this.transaction.dateObj? this.transaction.dateObj: new Date();
    this.getSymbolPrices(symbol, date);
  }

  onSideChange() {
    this.setNewTransactionHoldings();
    this.setNewTransactionAvgCost();
  }
}