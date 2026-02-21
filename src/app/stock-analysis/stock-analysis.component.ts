import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-stock-analysis',
  templateUrl: './stock-analysis.component.html',
  styleUrls: ['./stock-analysis.component.scss'],
})
export class StockAnalysisComponent implements OnInit {
  constructor(private liveService: LiveService) {}
  symbol;

  ngOnInit(): void {
    if (this.symbol) {
      this.loadData();
    }
  }

  loadData() {
    this.liveService
      .getUrlData('/eod/fundamentals/' + this.symbol)
      .subscribe(d => this.setFundamentalsData(d));
  }

  setFundamentalsData(d) {
    // console.log(d);
  }

  onSymbolSelected(event) {
    this.symbol = event.value;
    this.loadData();
  }
}
