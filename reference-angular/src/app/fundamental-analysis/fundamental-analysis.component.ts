import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { TechnicalService } from '../services/technical.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-fundamentalAnalysis',
  templateUrl: './fundamental-analysis.component.html',
  styleUrls: ['./fundamental-analysis.component.css'],
})
export class FundamentalAnalysisComponent implements OnInit {
  @Input() fundamentals = [];

  constructor(
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  @Output() public onSymbolClicked = new EventEmitter();

  ngOnInit() {}

  ShowSymbolChart(symbol) {
    this.onSymbolClicked.emit({
      value: symbol,
    });
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
