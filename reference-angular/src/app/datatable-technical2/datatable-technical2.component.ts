import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { TechnicalService } from '../services/technical.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-datatable-technical2',
  templateUrl: './datatable-technical2.component.html',
  styleUrls: ['./datatable-technical2.component.scss'],
})
export class DatatableTechnical2Component implements OnInit {
  @Output() public symbolClicked = new EventEmitter();
  @Input() symbolTechnicals: any[];

  displayDialogSymbolDetail = false;
  selectedSymbol = '';
  @Input() rowsPerPage = 10;

  @Input('forzenColumns') frozenCols = [{ field: 'symbol', header: 'Symbol' }];

  constructor(private technicalService: TechnicalService, private symbolPopupService: SymbolPopupService) {}

  clickSymbol(symbol) {
    this.symbolClicked.emit({value: symbol,});
    this.symbolPopupService.showPopup(symbol);
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbolTechnicals != null && this.symbolTechnicals.length > 0) {
      // add percentage columns
      this.symbolTechnicals.map(item => {
        const lastPrice = item['price'];
        item['fairVsLast'] = this.getFairValueVsLastPercentage(item['fair_value'], lastPrice);
        item['sma20VsLast'] = this.getValueVsLastPercentage(item['sma20'], lastPrice);
        item['sma50VsLast'] = this.getValueVsLastPercentage(item['sma50'], lastPrice);
        item['sma100VsLast'] = this.getValueVsLastPercentage(item['sma100'], lastPrice);
      });
    }
  }

  showSymbolDetailDialog(symbol) {
    this.selectedSymbol = symbol;
    this.displayDialogSymbolDetail = true;
  }

  getValueVsLastPercentage(value: any, last: any) {
    if (value && last) {
      return (last - value) / value;
    }
  }

  getFairValueVsLastPercentage(value: any, last: any) {
    if (value && last) {
      return (value - last) / value;
    }
  }
}
