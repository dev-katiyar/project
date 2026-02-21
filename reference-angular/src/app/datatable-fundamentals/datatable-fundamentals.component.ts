import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-datatable-fundamentals',
  templateUrl: './datatable-fundamentals.component.html',
  styleUrls: ['./datatable-fundamentals.component.scss'],
})
export class DatatableFundamentalsComponent implements OnInit {
  @Output() public symbolClicked = new EventEmitter();
  @Input() symbolFundamentals: Object;
  @Input() rowsPerPage = 10;

  displayDialogSymbolDetail = false;
  selectedSymbol = '';

  constructor(private symbolPopupService: SymbolPopupService) {}

  clickSymbol(symbol) {
    this.symbolClicked.emit({ value: symbol });
    this.symbolPopupService.showPopup(symbol);
  }

  showSymbolDetailDialog(symbol) {
    this.selectedSymbol = symbol;
    this.displayDialogSymbolDetail = true;
  }

  ngOnInit(): void {}
}
