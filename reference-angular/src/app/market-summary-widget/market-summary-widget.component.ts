import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-market-summary-widget',
  templateUrl: './market-summary-widget.component.html',
  styleUrls: ['./market-summary-widget.component.scss'],
})
export class MarketSummaryWidgetComponent implements OnInit {
  summData = {};
  selPxKey = 'priceChangePct'; // today's Change
  minChg = 0;
  maxChg = 0.5;
  colOrder = ['VALUE', 'CORE', 'GROWTH'];

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/symbol/market-summary').subscribe(res => {
      this.summData = res;
      this.periodChanged('priceChangePct')
    });
  }

  // Method to determine class based on stock value
  getStockClass(value: number): string {
    if (value > 0) {
      // Gain: Return a green class based on value
      return `gain-${Math.abs(Math.floor(this.scaleToRange(value)))}`; // Cap to 4 for classes
    } else if (value < 0) {
      // Loss: Return a red class based on value
      return `loss-${Math.abs(Math.floor(this.scaleToRange(value)))}`; // Cap to 4 for classes
    }
    return 'no-change'; // No class for neutral
  }

  periodChanged(key) {
    this.selPxKey = key;
    this.setMinMax();
  }

  setMinMax() {
    this.minChg = 0;
    this.maxChg = 0.5;
    for(let rowObj of Object.values(this.summData)) {
      for(let colObj of Object.values(rowObj)) {
        const val = Math.abs(colObj[this.selPxKey]);
        this.minChg = val < this.minChg ? val : this.minChg;
        this.maxChg = val > this.maxChg ? val : this.maxChg;
      }
    }
  }

  scaleToRange(x) {
    const newMin = 0;
    const newMax = 5;

    // Check if x is within the original range
    if (x < this.minChg) return newMin; // Scale down to the minimum if below min
    if (x > this.maxChg) return newMax; // Scale up to the maximum if above max

    // Scaling formula
    return ((x - this.minChg) / (this.maxChg - this.minChg)) * (newMax - newMin) + newMin;
  }
}
