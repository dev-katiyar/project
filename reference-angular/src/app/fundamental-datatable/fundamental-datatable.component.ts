import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { TechnicalService } from '../services/technical.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-fundamental-datatable',
  templateUrl: './fundamental-datatable.component.html',
  styleUrls: ['./fundamental-datatable.component.css'],
})
export class FundamentalDatatableComponent implements OnInit {
  @Input() alerts = [];
  @Output() public onSymbolClicked = new EventEmitter();

  ShowSymbolChart(symbol) {
    this.onSymbolClicked.emit({
      value: symbol,
    });
  }

  constructor(
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit() {}

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
