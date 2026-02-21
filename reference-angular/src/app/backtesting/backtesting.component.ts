import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-backtesting',
  templateUrl: './backtesting.component.html',
  styleUrls: ['./backtesting.component.scss']
})
export class BacktestingComponent implements OnInit {

  symbol = 'AAPL';
  bt_output;

  constructor(private liveService: LiveService) { }

  ngOnInit(): void {
  }

  onSymbolSelected1(event) {
    this.symbol = event.value;
  }

  getBackTest() {
    this.liveService.postRequest('/backtest-basic', {'symbols': [this.symbol]}).subscribe((data) => {
      this.bt_output = data;
    })
  }

}
