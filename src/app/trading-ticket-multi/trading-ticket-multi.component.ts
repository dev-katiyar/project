import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { MessageService } from 'primeng/api';
import { DateUtils } from '../utils/dateutils';
import { LiveService } from '../services/live.service';
import { PortfolioService } from '../services/portfolio.service';
import { HttpClient } from '@angular/common/http';
import * as fileSaver from 'file-saver';
import { GtmService } from '../services/gtm.service';

@Component({
  selector: 'app-trading-ticket-multi',
  templateUrl: './trading-ticket-multi.component.html',
  styleUrls: ['./trading-ticket-multi.component.scss']
})
export class TradingTicketMultiComponent implements OnInit {

  validSides = [];  
  selectedPortfolioDetails = this.portfolioService.getEmptyPortfolioDetails();
  portfolioDetailsLoaded = false;
  isDisabled = false;

  target = "assets/files/template.csv"
  @ViewChild('csvReader', { static: false }) csvReader: any;

  @Input('selectedPortfolioId') selectedPortfolioId: any;     // from input
  
  @Output('cancelClick') cancelClick = new EventEmitter();
  @Output('saveClick') saveClick = new EventEmitter();
  
  constructor(
    private liveService: LiveService,
    private portfolioService: PortfolioService,
    private messageService: MessageService,
    private http: HttpClient,
    private readonly gtmService: GtmService,
  ) { }

  ngOnInit(): void {
    this.validSides = this.portfolioService.getValidSides();
    this.addRow();
    this.getPortfolioDetails();
  }

  getPortfolioDetails() {
    if (this.selectedPortfolioId) {
      this.liveService.getUrlData('/modelportfolio/' + this.selectedPortfolioId).subscribe(d => {
        this.setSelectedPortfolioDetails(d);
        this.portfolioDetailsLoaded = true;
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

  onSymbolSelected(symbol,transaction) {
    transaction.symbol =symbol;
    let date = transaction.dateObj? transaction.dateObj: new Date();
    this.getSymbolPrices(transaction, date);
    this.setNewTransactionAvgCost(transaction);
  }

  getSymbolPrices(transaction, dateObj) {
    let date_formatted = formatDate(dateObj, 'yyyy-MM-dd', 'en-US')
    this.liveService.getUrlData(`/symbol/prices?symbol=${transaction.symbol}&date=${date_formatted}`).subscribe(res =>
      this.setSymbolDetail(res, transaction)
    );
  }

  setSymbolDetail(res, transaction) {
    if (res && transaction.symbol in res) {
      let price_data = res[transaction.symbol];
      if (transaction && price_data) {
        transaction.price = price_data.price;
        transaction.companyname = price_data.companyname;
        this.setNewTransactionHoldings(transaction);
        this.setNewTransactionAvgCost(transaction);
      }
    }
  }

  setNewTransactionHoldings(transaction) {
      transaction.holdings = this.portfolioService.getSymbolHoldings(
      transaction.symbol, transaction.side, this.selectedPortfolioDetails.openPositions
    );
  }

  setNewTransactionAvgCost(transaction) {
      transaction.avgCost = this.portfolioService.getSymbolAvgCost(
      transaction.symbol, transaction.side, this.selectedPortfolioDetails.openPositions
    );
  }

  onDateChangeHandler(transaction) {
    if (transaction.symbol != '') {
      this.getSymbolPrices(transaction, transaction.dateObj);
    }
  }

  deleteTransaction(transaction) {
    if (this.selectedPortfolioDetails.transactions.length > 1) {
      this.selectedPortfolioDetails.transactions.splice(this.selectedPortfolioDetails.transactions.indexOf(transaction), 1);
    }
  }

  onCancelClick() {
    this.cancelClick.emit();
  }

  onSaveClick() {
    this.isDisabled = true;
    let error = "";
    let symbols = [];

    for(let transaction of this.selectedPortfolioDetails.transactions) {
      if(!error) error = this.portfolioService.checkNewTransactionBasicDetails(transaction);
      if(!error) error = this.portfolioService.checkNewTransactionHoldingDetails(transaction);
      if(error) break;
      symbols.push(transaction.symbol);
      transaction["date"] = DateUtils.formatDate(transaction["dateObj"]);
    }

    if(!error) {
      error = this.portfolioService.checkNewTransactionsFundingDetails(this.selectedPortfolioDetails);
    }

    if(error) {
      this.showMessage({ "status": "error", "message": error });
      this.isDisabled = false;
    }
    else {
      this.portfolioService.checkSymbolsValidity({symbols: symbols}).subscribe( (res: any[]) => {
        let status = res["isvalid"];
        if(status == 'valid') {
          this.saveNewTransactions();
        } else {
          this.showMessage({ "status": "error", "message": `'${res["invalidsymbol"]["invalidsymbol"]}' does not seem to be a valid symbol. Remove invalid symbols to upload the other transactions. Feel free to contact support if still facing issues`});
          this.isDisabled = false;
        }
      });
    }
  }

  saveNewTransactions() {
    let portfolioToSave = {
      "name": this.selectedPortfolioDetails.name,
      "id": this.selectedPortfolioDetails.id,
      "startingCash": this.selectedPortfolioDetails.startingCash,
      "newTransactions": this.selectedPortfolioDetails.transactions,
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
    this.messageService.add({ severity: response.status, detail: response.message, life: 3000 });
  }

  addRow() {
    this.selectedPortfolioDetails.transactions.unshift(this.portfolioService.getEmptyTransaction());
  }

  myUploader(event) {

    let file = event.files[0];
    if (this.isValidCSVFile(file)) {
      var reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        let csvData = reader.result;
        let csvRecordsArray = (<string>csvData).split(/\r\n|\n/);
        let headersRow = this.getHeaderArray(csvRecordsArray);
        this.selectedPortfolioDetails.transactions = this.getDataRecordsArrayFromCSVFile(csvRecordsArray, headersRow.length);
      };
    }
    else {
      alert("Please import valid .csv file.");

    }
    this.csvReader.files = [];
  }

  isValidCSVFile(file: any) {
    return file.name.endsWith(".csv");
  }

  getHeaderArray(csvRecordsArr: any) {
    let headers = (<string>csvRecordsArr[0]).split(',');
    let headerArray = [];
    for (let j = 0; j < headers.length; j++) {
      headerArray.push(headers[j]);
    }
    return headerArray;
  }

  getDataRecordsArrayFromCSVFile(csvRecordsArray: any, headerLength: any) {
    let csvArr = [];

    for (let i = 1; i < csvRecordsArray.length; i++) {
      let curruntRecord = (<string>csvRecordsArray[i]).split(',');
      if (curruntRecord.length == headerLength) {
        let tradeDate = curruntRecord[4].trim()
        let transaction = {
          "id": 0, 
          "commission": 0, 
          "symbol": curruntRecord[0].trim().replace(/\"/g, ""), 
          "side": this.getSide(curruntRecord[1]),
          "qty": +curruntRecord[2].trim().replace(/\"/g, ""), 
          "price": +curruntRecord[3].trim().replace(/[$"\s,]/g, ''), 
          "dateObj": new Date(curruntRecord[4].trim().replace(/\"/g, "").replace(/-/g, '\/'))
        };
        csvArr.push(transaction)
      }
    }
    return csvArr;
  }

  getSide(sideText) {
    let sideTextLower = sideText.trim().toLowerCase();
    if (sideTextLower.includes("short")) {
      return "Sell Short";
    }
    else if (sideTextLower.includes("sell")) {
      return "Sell";
    }
    else if (sideTextLower.includes("cover")) {
      return "Buy To Cover";
    }
    else {
      return "Buy";
    }
  }

  downloadSample() {
    this.gtmService.fireGtmEventForApiCalled('downloadSample');
    this.http.get(this.target, { responseType: "blob", headers: { 'Accept': 'application/csv' } })
      .subscribe(response => {
        fileSaver.saveAs(response, 'upload_template.csv');
      },
        error => { this.handleError('error in downloading') }
      );
  }
  handleError(error){
  }

  onSideChange(transaction) {
    this.setNewTransactionHoldings(transaction);
    this.setNewTransactionAvgCost(transaction);
  }

}