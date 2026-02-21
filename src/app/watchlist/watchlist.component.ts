import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';
import { NotificationService } from '../services/notification.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { PortfolioService } from '../services/portfolio.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'watchlist',
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css'],
})
export class WatchlistComponent implements OnInit {
  isManageWatchlistsVisible = false;
  isEditWatchlistVisible = false;
  isCreateWatchlistVisible = false;
  isNoWatchlistsDivVisible = false;
  isAdminUser = 1;
  symbol = '';
  selectedTopSymbols: string[] = [];
  chartSymbols: string[] = [];
  fullDividendDetail = 0;
  fullEarningDetail = 0;
  selectedWatchList: any;
  watchlists: any;
  selectedSymbolList = [];
  watchListData = [];
  symbols: string[] = [];
  watchlistName = '';
  displayAddSymbolsDialog = false;
  displayDeleteWatchlistDialog = false;
  displayDeleteSymbolDialog = false;
  readyToDeleteTransaction: any;
  message = '';
  messageColor = 'red';
  loading = false;
  title = '';
  position = { symbol: '', action: '' };
  exportCSVSubject: Subject<void> = new Subject<void>();

  constructor(
    private liveService: LiveService,
    private notificationService: NotificationService,
    private breadcrumbService: AppBreadcrumbService,
    private portfolioService: PortfolioService,
    private messageService: MessageService,
  ) {
    this.breadcrumbService.setItems([
      { label: 'Portfolios', routerLink: ['/modelportfolio'] },
      { label: 'WatchList', routerLink: ['/watchlist'] },
    ]);
  }

  ngOnInit() {
    this.loadAllWatchList();
  }

  loadAllWatchList() {
    this.watchlists = [];
    this.liveService.getUrlData('/userwatchlist').subscribe(d => this.setWatchList(d));
  }

  setWatchList(data) {
    if (data && data.length > 0) {
      this.watchlists = data;
      this.setSelectedWatchList(this.watchlists[0].id);
      this.onWatchListChange({});
    } else {
      this.isNoWatchlistsDivVisible = true;
    }
  }

  symbolExist(symbol) {
    let positionMatch = this.watchListData.find(p => p.symbol === symbol);
    return positionMatch != null;
  }

  addSymbol() {
    let symbolCheck = this.symbol.trim().split(',');
    let validMsg = this.validatePositions(this.symbol);
    if (symbolCheck.length > 1) {
      this.notificationService.showError(
        `Use +Add Multiple Symbols button to add multiple symbols`,
      );
    } else if (validMsg == '') {
      if (!this.symbolExist(this.symbol)) {
        this.portfolioService
          .checkSymbolsValidity({ symbols: [this.symbol] })
          .subscribe((res: any[]) => {
            let status = res['isvalid'];
            if (status == 'valid') {
              this.liveService
                .postRequest('/userwatchlist/' + this.selectedWatchList.id, {
                  action: 'add',
                  symbol: this.symbol,
                })
                .subscribe(response => this.setAddPosition(response, this.symbol));
            } else {
              this.notificationService.showError(
                `'${this.symbol}' does not seem to be a valid symbol. Please check and/or contact support`,
              );
            }
          });
      } else {
        this.notificationService.showError(`symbol ${this.symbol} already exist in your watchlist`);
      }
    } else {
      this.showStatus({ status: 'error', message: validMsg });
    }
  }

  setAddPosition(res, symbols) {
    if (res.status == 'success') {
      this.showStatus({ status: 'success', message: 'Valid Symbols has been added sucessfully.' });
    }
    this.liveService
      .postRequest('/symbol/model/NA', symbols)
      .subscribe(d => this.addSymbolInWatchList(d));
  }

  addSymbolInWatchList(newWatchListData) {
    this.watchListData = [...newWatchListData, ...this.watchListData];
    this.setSymbols();
  }

  handleSymbolDelete(transaction) {
    this.displayDeleteSymbolDialog = true;
    this.readyToDeleteTransaction = transaction;
  }

  deleteWatchListData(res, transaction) {
    let indexOfSymbol = this.watchListData.indexOf(transaction);
    this.watchListData.splice(indexOfSymbol, 1);
    this.symbols = this.watchListData.map(w => w.symbol);
    this.selectedTopSymbols = this.selectedTopSymbols.filter(s => this.symbols.includes(s));
  }

  onWatchListChange($event) {
    this.watchListData = [];
    this.symbols = [];
    this.selectedTopSymbols = [];
    if (this.selectedWatchList) {
      this.liveService
        .getUrlData('/userwatchlist/' + this.selectedWatchList.id)
        .subscribe(d => this.setWatchListSymbols(d));
    }
  }

  setWatchListSymbols(symbols) {
    if (symbols != '') {
      this.liveService
        .postRequest('/symbol/model/NA', symbols.join(','))
        .subscribe(d => this.setWatchListData(d));
    }
  }

  fetchLivePrice(event) {
    this.symbol = event;
  }

  setWatchListData(res) {
    this.watchListData = res;
    this.setSymbols();
    if (this.selectedTopSymbols.length === 0) {
      this.selectedTopSymbols = this.symbols.slice(0, Math.min(5, this.symbols.length));
      this.chartSymbols = [...this.selectedTopSymbols];
    }
  }

  setSymbols() {
    this.symbol = '';
    this.symbols = this.watchListData.map(w => w.symbol);
  }

  updateChartSymbols() {
    this.chartSymbols = [...this.selectedTopSymbols];
  }

  renameWatchlist() {
    if (this.watchlistName == '') {
      this.notificationService.showError('Please Enter Watchlist Name');
    }
    if (this.watchlistName != '') {
      if (this.watchlists.find(w => w.name === this.watchlistName)) {
        this.notificationService.showError('This watchlist name already exist !');
      } else {
        this.liveService
          .postRequest('/userwatchlist', {
            action: 'update',
            watchlist_id: this.selectedWatchList.id,
            name: this.watchlistName,
          })
          .subscribe(d => this.handleWatchListCrud(d));
      }
    }
  }

  confirmDelete(shouldDelete) {
    this.displayDeleteWatchlistDialog = false;
    if (shouldDelete) {
      this.liveService
        .postRequest('/userwatchlist', {
          action: 'delete',
          watchlist_id: this.selectedWatchList.id,
        })
        .subscribe(d => this.handleWatchListCrud(d));
    }
  }

  confirmSymbolDelete(shouldDelete) {
    this.displayDeleteSymbolDialog = false;
    if (shouldDelete) {
      let deleteReq = { action: 'delete', symbol: this.readyToDeleteTransaction.symbol };
      this.liveService
        .postRequest(`/userwatchlist/${this.selectedWatchList.id}`, deleteReq)
        .subscribe(d => this.deleteWatchListData(d, this.readyToDeleteTransaction));
    }
  }

  showAddSymbolsDialog() {
    this.displayAddSymbolsDialog = true;
    this.position.symbol = '';
  }

  hideAddSymbolsDialog() {
    this.displayAddSymbolsDialog = false;
    this.position.symbol = '';
  }

  createNewWatchList() {
    if (this.watchlistName == '') {
      this.notificationService.showError('Please Enter Watchlist Name !');
    } else if (
      this.watchlists.length > 0 &&
      this.watchlists.find(w => w.name === this.watchlistName)
    ) {
      this.notificationService.showError('This watchlist name already exist !');
    } else {
      this.liveService
        .postRequest('/userwatchlist', { action: 'add', name: this.watchlistName })
        .subscribe(d => this.handleWatchListCrud(d));
    }
  }

  setSelectedWatchList(id) {
    let selected = this.watchlists.find(w => w.id == id);
    this.selectedWatchList = selected;
    this.onWatchListChange({});
  }

  handleWatchListCrud(d) {
    if (d.success == '1') {
      this.notificationService.showError(d.reason);
      if (d.action == 'add') {
        this.watchlists.push({ name: this.watchlistName, id: d.watchlist_id });
        this.setSelectedWatchList(d.watchlist_id);
        this.isCreateWatchlistVisible = false;
      }
      if (d.action == 'delete') {
        this.watchlists = this.watchlists.filter(row => row.id != d.watchlist_id);
        if (this.watchlists.length == 0) {
          this.isManageWatchlistsVisible = false;
          this.isNoWatchlistsDivVisible = true;
        } else {
          this.setSelectedWatchList(this.watchlists[0].id);
        }
      }
      if (d.action == 'update') {
        let updatedWatchList = this.watchlists.find(row => row.id == d.watchlist_id);
        updatedWatchList.name = this.watchlistName;
        this.isManageWatchlistsVisible = true;
        this.isEditWatchlistVisible = false;
        this.setSelectedWatchList(updatedWatchList.id);
      }
    } else {
      this.notificationService.showError(d.reason);
    }
  }

  addNewPositions(): void {
    let validMsg = this.validatePositions(this.position.symbol);
    if (validMsg == '') {
      this.position.symbol = this.position.symbol.trim();
      this.position.action = 'add';

      let newSymbols = this.position.symbol.split(',');
      newSymbols = newSymbols.map(s => s.trim().toUpperCase());
      newSymbols = newSymbols.filter(s => !this.symbols.includes(s));
      this.displayAddSymbolsDialog = false;
      if (newSymbols.length > 0) {
        this.portfolioService
          .checkSymbolsValidity({ symbols: newSymbols })
          .subscribe((res: any[]) => {
            let status = res['isvalid'];
            if (status == 'valid') {
              let joinedSymbols = newSymbols.join(',');
              this.loading = true;
              this.liveService
                .postRequest('/userwatchlist/' + this.selectedWatchList.id, {
                  action: 'add',
                  symbol: joinedSymbols,
                })
                .subscribe(response => {
                  this.setAddPosition(response, joinedSymbols);
                });
            } else {
              this.notificationService.showError(
                `'${res['invalidsymbol']['invalidsymbol']}' does not seem to be a valid symbol. Please check and/or contact support`,
              );
            }
          });
      }
    } else {
      this.showStatus({ status: 'error', message: validMsg });
    }
  }

  validatePositions(pos) {
    if (this.selectedWatchList.id == undefined || this.selectedWatchList.id == 0) {
      return 'Please create a Watchlist first.';
    } else if (pos == '') {
      return 'Please enter valid symbol';
    } else {
      return '';
    }
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1000 });
    this.loading = false;
  }

  techAlertsCount = 0;
  onAlertsLoaded(alertsCount) {
    this.techAlertsCount = alertsCount;
  }

  exportToCSV() {
    this.exportCSVSubject.next();
  }

  onOpenManageWatchlists() {
    this.isManageWatchlistsVisible = true;
  }

  onBackFromManageWatchlishsClick() {
    this.isManageWatchlistsVisible = false;
    if (this.watchlists.length <= 0) {
      this.isNoWatchlistsDivVisible = true;
    }
  }

  onCreateWatchlistClick() {
    this.watchlistName = '';
    this.isCreateWatchlistVisible = true;
    this.isManageWatchlistsVisible = false;
    this.isNoWatchlistsDivVisible = false;
  }

  onCreateWatchlistCancelClick() {
    this.isCreateWatchlistVisible = false;
    this.watchlistName = '';
    if (this.watchlists.length == 0) {
      this.isNoWatchlistsDivVisible = true;
    } else {
      this.isManageWatchlistsVisible = true;
    }
  }

  onDeleteWatchlistClick(watchlist) {
    this.selectedWatchList = watchlist;
    this.displayDeleteWatchlistDialog = true;
  }

  onEditWatchlistClick(watchlist) {
    this.selectedWatchList = watchlist;
    this.isEditWatchlistVisible = true;
    this.isManageWatchlistsVisible = false;
    this.watchlistName = this.selectedWatchList.name;
  }

  onEditWatchlistCancelClick() {
    this.isEditWatchlistVisible = false;
    this.isManageWatchlistsVisible = true;
    this.watchlistName = '';
  }

  onClosePositionsClick(event) {
    // This is not needed, but leaveing at placeholder for now.
  }

  onNameClick(watchlist) {
    this.selectedWatchList = watchlist;
    this.isManageWatchlistsVisible = false;
    this.onWatchListChange(this.selectedWatchList);
  }
}
