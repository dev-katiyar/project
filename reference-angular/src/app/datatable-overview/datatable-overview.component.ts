import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-datatable-overview',
  templateUrl: './datatable-overview.component.html',
  styleUrls: ['./datatable-overview.component.scss'],
})
export class DatatableOverviewComponent implements OnInit {
  constructor(private symbolPopupService: SymbolPopupService) {}

  ngOnInit() {}

  @Output() public symbolClicked = new EventEmitter();
  @Input() symbolTechnicals: Object;

  displayDialogSymbolDetail = false;
  selectedSymbol = '';
  @Input() rowsPerPage = 10;

  clickSymbol(symbol) {
    this.symbolClicked.emit({ value: symbol });
    this.symbolPopupService.showPopup(symbol);
  }

  showSymbolDetailDialog(symbol) {
    this.selectedSymbol = symbol;
    this.displayDialogSymbolDetail = true;
  }
}
