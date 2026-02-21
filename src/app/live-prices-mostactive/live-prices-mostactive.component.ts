import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-live-prices-mostactive',
  templateUrl: './live-prices-mostactive.component.html',
  styleUrls: ['./live-prices-mostactive.component.scss']
})
export class LivePricesMostActiveComponent implements OnInit, OnChanges {
  @Input() listURL = '';
  @Input() showChartIcon = false;
  @Output('symbolClicked') symbolClicked = new EventEmitter();
  clickedSymbol = '';
  symbolData;

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.liveService.getUrlData(this.listURL).subscribe(d => this.symbolData = d);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.loadData();
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  onChartClick(symbol) {
    this.clickedSymbol = symbol;
    this.symbolClicked.emit(symbol);
  }
}
