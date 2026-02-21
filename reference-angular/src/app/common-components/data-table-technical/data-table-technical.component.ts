import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { TechnicalService } from '../../services/technical.service';
import { SymbolPopupService } from 'src/app/symbol-popup.service';

@Component({
  selector: 'data-table-technical',
  templateUrl: './data-table-technical.component.html',
  styleUrls: ['./data-table-technical.component.css'],
})
export class DataTableTechnicalComponent implements OnInit {
  @Output() public onSymbolClicked = new EventEmitter();
  @Input() symbols;
  @Input() title = '';
  @Input() symbolTechnicals: Object;
  @Input() highlightSymolSelected = false;
  selectedSymbol;

  constructor(private liveService: LiveService, private technicalService: TechnicalService, private symbolPopupService: SymbolPopupService) {}

  clickSymbol(symbol) {
    this.onSymbolClicked.emit({
      value: symbol,
    });
    this.selectedSymbol = symbol;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.symbols != null && this.symbols != null && this.symbols.length > 0) {
      this.liveService.getTechnicals(this.symbols).subscribe(d => this.setTechnicalData(d));
    } else {
      this.symbolTechnicals = [];
    }
  }

  setTechnicalData(d) {
    if (d.length > 0) {
      this.symbolTechnicals = d;
      this.selectedSymbol = this.symbolTechnicals[0]['symbol'];
      this.onSymbolClicked.emit({
        value: this.selectedSymbol,
      });
    } else {
      this.symbolTechnicals = [];
    }
  }

  ngOnInit() {}

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
