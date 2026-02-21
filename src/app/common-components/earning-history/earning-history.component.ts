import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { TechnicalService } from '../../services/technical.service';
import { SymbolPopupService } from 'src/app/symbol-popup.service';

@Component({
  selector: 'app-earning-history',
  templateUrl: './earning-history.component.html',
  styleUrls: ['./earning-history.component.css'],
})
export class EarningHistoryComponent implements OnInit {
  constructor(
    private liveService: LiveService,
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  @Input() upcoming = false;
  @Input() symbol;
  @Input() fullEarningDetail;
  earningHistory = [];

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    let requestSymbol = this.symbol;
    if (this.symbol != null) {
      if (this.symbol instanceof Array) {
        requestSymbol = this.symbol.join(',');
      }
      if (requestSymbol != '') {
        let url = `/earning/history?symbols=${requestSymbol}&upcoming=${this.upcoming}`;
        this.liveService.getUrlData(url).subscribe(d => this.setEarningData(d));
      }
    }
  }

  setEarningData(d) {
    this.earningHistory = d;
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
