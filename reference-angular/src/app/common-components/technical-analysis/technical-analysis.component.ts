import { Component, OnInit, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-technical-analysis',
  templateUrl: './technical-analysis.component.html',
  styleUrls: ['./technical-analysis.component.css'],
})
export class TechnicalAnalysisComponent implements OnInit {
  @Input() title = 'Summary';
  @Input() netBuySellValues = { buy: 0, sell: 0, hold: 1, netBuySell: 'Hold' };
  constructor() {}

  ngOnInit() {}
  ngOnChanges(changes: SimpleChanges) {
    this.calculateRatings();
  }
  calculateRatings() {
    let netRating = 0;
  }

  calculateSemiCircleClasses() {
    let tempCls = `semicircle${this.netBuySellValues.netBuySell}`;
    return [tempCls, 'semicircle'];
  }

  calculateArrowClasses() {
    let tempCls = `arrowTo${this.netBuySellValues.netBuySell}`;
    return [tempCls, 'arrow'];
  }

  calculateBuySellClasses() {
    if(this.netBuySellValues.netBuySell.includes('Sell')) {
      return 'sellColor';
    }

    if(this.netBuySellValues.netBuySell.includes('Buy')) {
      return 'buyColor';
    }

    return '';
  }

  getTextFromSignal() {
    return this.netBuySellValues.netBuySell.split(/(?=[A-Z])/).join(' ');
  }
}
