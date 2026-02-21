import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-live-prices-sectors',
  templateUrl: './live-prices-sectors.component.html',
  styleUrls: ['./live-prices-sectors.component.scss'],
})
export class LivePricesSectorsComponent implements OnInit {
  @Input() listURL = '/sector/liveprices';
  @Input() showChartIcon = false;
  @Output('symbolClicked') symbolClicked = new EventEmitter();

  symbolData;
  clickedSymbol = '';

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {
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
