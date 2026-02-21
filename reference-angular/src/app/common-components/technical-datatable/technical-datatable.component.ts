import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { Table } from 'primeng/table';
import { Observable, Subscription } from 'rxjs';
import { TechnicalService } from '../../services/technical.service';
import { SymbolPopupService } from 'src/app/symbol-popup.service';

@Component({
  selector: 'technical-datatable',
  templateUrl: './technical-datatable.component.html',
  styleUrls: ['./technical-datatable.component.css'],
})
export class TechnicalDataTableComponent implements OnInit, OnDestroy {
  @Input() type = 'datatable';
  @Input() model: any; // UI binded with this
  position = { symbol: '', action: '' };
  @Output() public onSymbolClicked = new EventEmitter();
  @Output() public onSymbolDeleted = new EventEmitter();
  displayDialog = false;
  loading = false;
  displayDialogSymbolDetail = false;
  selectedSymbol = '';
  cols: any[]; // dynamic table needed to enable CSV export feature
  @ViewChild('dt1') table: Table; //reference of DOM table to be used export function
  @Input() exportCSVEvent = new Observable<void>(); // to receive export CSV event from parent
  private exportCSVEventSubscription: Subscription;

  @Input() showChartIcon = false;

  constructor(
    private notificationService: NotificationService,
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit() {
    this.cols = [
      { field: 'watchlist', header: '' },
    //   { field: 'research', header: '' },
      { field: 'symbol', header: 'Symbol' },
      { field: 'alternate_name', header: 'Name' },
      { field: 'price', header: 'Price' },
      { field: 'priceChangePct', header: '1D Change' },
      { field: 'mtd', header: 'MTD' },
      { field: 'ytd', header: 'YTD' },
      { field: 'change_oneyearbeforedate_pct', header: '1Y' },
      { field: '52weeklow', header: '' },
      { field: '52weeklow', header: '52-Wk Range' },
      { field: '52weeklow', header: '' },
      { field: 'rsi', header: 'RSI' },
      { field: 'sma20', header: '20 SMA' },
      { field: 'sma50', header: '50 SMA' },
      { field: 'sma100', header: '100 SMA' },
      { field: 'sma200', header: '200 SMA' },
      { field: 'rating', header: 'Trend Analysis' },
      { field: 'MohanramScore', header: 'Mohanram Score' },
      { field: 'PiotroskiFScore', header: 'Piotroski Score' },
      { field: 'ZacksRank', header: 'SVPro Rank' },
      { field: 'dividendYield', header: 'Yield%' },
      { field: 'macd', header: 'MACD' },
    ];

    this.exportCSVEventSubscription = this.exportCSVEvent.subscribe(() => this.exportToCSV());
  }

  ngOnDestroy() {
    this.exportCSVEventSubscription.unsubscribe();
  }

  checkNotSet(value) {
    return value == null || value == undefined || value == '0' || value == 0;
  }

  checkIfSymbolExist(symbol) {
    let exist = false;
    for (let row of this.model) {
      if (symbol == row['symbol']) {
        exist = true;
        break;
      }
    }
    return exist;
  }

  deletePosition(transaction) {
    this.onSymbolDeleted.emit(transaction);
  }

  onChartClick(symbol) {
    this.onSymbolClicked.emit({
      value: symbol,
    });
  }

  showDialogToAdd() {
    this.displayDialog = true;
  }

  showSymbolDetailDialog(symbol) {
    this.selectedSymbol = symbol;
    this.displayDialogSymbolDetail = true;
  }

  exportToCSV() {
    this.table.exportCSV();
  }

  showSortIcon(col) {
    return !['watchlist', 'research', '52weeklow'].includes(col.field);
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
