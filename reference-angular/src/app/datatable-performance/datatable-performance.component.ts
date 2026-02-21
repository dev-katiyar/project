import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-datatable-performance',
  templateUrl: './datatable-performance.component.html',
  styleUrls: ['./datatable-performance.component.scss'],
})
export class DatatablePerformanceComponent implements OnInit {
  @Output() public symbolClicked = new EventEmitter();
  @Input() symbolPerformance: Object;
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
