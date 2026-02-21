import { Component, OnInit, Input, SimpleChanges, SimpleChange } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { SymbolPopupService } from 'src/app/symbol-popup.service';

@Component({
  selector: 'app-dividend-history',
  templateUrl: './dividend-history.component.html',
  styleUrls: ['./dividend-history.component.css'],
})
export class DividendHistoryComponent implements OnInit {
  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  @Input() upcoming = false;
  @Input() fullDividendDetail;
  @Input() symbol;
  dividendHistory: any;

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    let requestSymbol = this.symbol;
    if (this.symbol != null) {
      if (this.symbol instanceof Array) {
        requestSymbol = this.symbol.join(',');
      }
    }
    if (requestSymbol != '') {
      let url = `/dividend/history?symbols=${requestSymbol}&upcoming=${this.upcoming}`;
      this.liveService.getUrlData(url).subscribe(d => this.setDividendData(d));
    }
  }

  setDividendData(d) {
    this.dividendHistory = d;
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
