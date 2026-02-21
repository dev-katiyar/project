import { Component, Input, OnInit, Output, SimpleChanges, EventEmitter } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-live-prices-bonds',
  templateUrl: './live-prices-bonds.component.html',
  styleUrls: ['./live-prices-bonds.component.scss'],
})
export class LivePricesBondsComponent implements OnInit {
  @Input() symbolsDataArr;
  @Input() showChartIcon = false;
  @Output('symbolClicked') symbolClicked = new EventEmitter();
  clickedSymbol = '';
  technicals;

  symbols = [];
  symbolNameDict = {};

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbolsDataArr != null && this.symbolsDataArr.length > 0) {
      this.symbolsDataArr.forEach(item => {
        const sym = item['symbol'];
        this.symbols.push(sym);
        this.symbolNameDict[sym] = item['name'];
      });
      this.liveService.getTechnicals(this.symbols).subscribe(d => {
        this.technicals = d;
        this.sortTechnicals();
        this.clickedSymbol = d[0].symbol;
        this.symbolClicked.emit(this.clickedSymbol);
      });
    }
  }

  sortTechnicals() {
    if (this.technicals) {
      this.technicals.sort(
        (a, b) => this.symbols.indexOf(a.symbol) - this.symbols.indexOf(b.symbol),
      );
    }
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  onChartClick(symbol) {
    this.clickedSymbol = symbol;
    this.symbolClicked.emit(symbol);
  }
}
