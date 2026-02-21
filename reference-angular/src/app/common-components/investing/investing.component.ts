import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { TechnicalService } from '../../services/technical.service';

@Component({
  selector: 'app-investing',
  templateUrl: './investing.component.html',
  styleUrls: ['./investing.component.css'],
})
export class InvestingComponent implements OnInit {
  @Input() symbol;
  @Input() displayClass = 'p-grid p-fluid scrollable';

  constructor(private liveService: LiveService, private technicalService: TechnicalService) {}

  currentDate = new Date();
  technicals;
  movingAverage;
  pivotPoints;
  maBuys;
  maSells;
  maHolds;
  technicalBuys;
  technicalSells;
  technicalHolds;
  netBuySells = { buy: 1, sell: 4, hold: 4, netBuySell: 'Hold' };

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbol != null && this.symbol != '') {
      this.liveService
        .getUrlData('/investing/technicals/' + this.symbol)
        .subscribe(res => this.setTechnicals(res));
    }
  }

  setTechnicals(res) {
    this.movingAverage = res.movingAverage;
    this.pivotPoints = res.pivotPoints;
    this.technicals = res.technicals;

    this.technicals = this.technicals.map(tech => {
      if (typeof tech.value == 'number') {
        tech.value = tech.value = tech.value.toFixed(2);
      }
      return tech;
    });

    this.technicalBuys = this.technicals
      .filter(t => t.action == 'Buy')
      .reduce(function (accumulator, t) {
        return accumulator + 1;
      }, 0);

    this.technicalHolds = this.technicals
      .filter(t => t.action == 'Hold')
      .reduce(function (accumulator, t) {
        return accumulator + 1;
      }, 0);

    this.technicalSells = this.technicals
      .filter(t => t.action == 'Sell')
      .reduce(function (accumulator, t) {
        return accumulator + 1;
      }, 0);

    this.maBuys = this.movingAverage
      .filter(t => t.action == 'Buy')
      .reduce(function (accumulator, t) {
        return accumulator + 1;
      }, 0);

    this.maSells = this.movingAverage
      .filter(t => t.action == 'Sell')
      .reduce(function (accumulator, t) {
        return accumulator + 1;
      }, 0);

    this.maHolds = this.movingAverage
      .filter(t => t.action == 'Hold')
      .reduce(function (accumulator, t) {
        return accumulator + 1;
      }, 0);

    this.netBuySells = {
      netBuySell: res.score.rating_text,
      buy: this.maBuys + this.technicalBuys,
      sell: this.maSells + this.technicalSells,
      hold: this.technicalHolds + this.maHolds,
    };
  }

  setTrendClass(value) {
    let bullishValues = ['Bullish', 'VeryBullish', 'Oversold'];
    let bearishValues = ['Bearish', 'VeryBearish', 'Overbought'];
    if (bullishValues.includes(value)) {
      return ['bullish'];
    } else if (bearishValues.includes(value)) {
      return ['bearish'];
    } else {
      return ['neutral'];
    }
  }
}
