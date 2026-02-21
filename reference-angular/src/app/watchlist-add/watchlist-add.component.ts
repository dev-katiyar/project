import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-watchlist-add',
  templateUrl: './watchlist-add.component.html',
  styleUrls: ['./watchlist-add.component.scss']
})
export class WatchlistAddComponent implements OnInit, OnChanges {

  @Input('symbol') symbol;
  @Output('closeAddToWatchlist') closeAddToWatchlist = new EventEmitter();
  watchlists = [{ id: 0, name: "" }];
  selectedWatchList: any;
  symbols = [];
  constructor(
    private liveService: LiveService,
    private notificationService: NotificationService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.symbol != null && this.symbol != "") {
      this.loadAllWatchList();
    }
  }

  loadAllWatchList() {
    this.liveService.getUrlData("/userwatchlist").subscribe(d => this.setWatchList(d));
  }

  setWatchList(data) {
    if (data && data.length > 0) {
      this.watchlists = data;
      this.setSelectedWatchList(this.watchlists[0].id);
    }
  }

  setSelectedWatchList(id) {
    let selected = this.watchlists.find(w => w.id == id)
    this.selectedWatchList = selected;
    this.onWatchListChange();
  }

  onWatchListChange() {
    this.symbols = [];
    if (this.selectedWatchList) {
      this.liveService.getUrlData("/userwatchlist/" + this.selectedWatchList.id).subscribe(d => this.setWatchListSymbols(d));
    }
  }

  setWatchListSymbols(symbols) {
    this.symbols = symbols;
  }

  onCancelClick() {
    this.closeAddToWatchlist.emit();
  }

  onAddClick() {
    if (!this.symbolExist(this.symbol)) {
      this.liveService.postRequest(
        "/userwatchlist/" + this.selectedWatchList.id, { action: "add", "symbol": this.symbol }
      ).subscribe(response => this.setAddStatus(response, this.symbol));
    }
    else {
      this.notificationService.showError(`symbol '${this.symbol}' already exist in watchlist '${this.selectedWatchList.name}'`);
    }
  }

  symbolExist(symbol) {
    return this.symbols.includes(symbol);
  }

  setAddStatus(res, symbols) {
    if (res.status == 'success') {
      this.showStatus({ "status": "success", "message": "Valid Symbols has been added sucessfully." });
      this.closeAddToWatchlist.emit();
    }
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
  }
}