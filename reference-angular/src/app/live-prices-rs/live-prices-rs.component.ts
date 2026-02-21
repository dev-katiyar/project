import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-live-prices-rs',
  templateUrl: './live-prices-rs.component.html',
  styleUrls: ['./live-prices-rs.component.scss'],
})
export class LivePricesRsComponent implements OnInit, OnChanges {
  @Input() listURL = '';
  @Input() showChartIcon = false;
  @Output('symbolClicked') symbolClicked = new EventEmitter();

  symbolData;
  clickedSymbol = '';

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
   this.loadData(); 
  }

  loadData() {
    this.liveService.getUrlData(this.listURL).subscribe(d => (this.symbolData = d));
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  onChartClick(symbol) {
    this.clickedSymbol = symbol;
    this.symbolClicked.emit(symbol);
  }
}
