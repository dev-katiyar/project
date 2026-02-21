import {
  Component,
  OnInit,
  ViewEncapsulation,
  Input,
  SimpleChanges,
  SimpleChange,
} from '@angular/core';
import { LiveService } from '../../services/live.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare const TradingView: any;

@Component({
  selector: 'app-tradingview-chart',
  templateUrl: './tradingview-chart.component.html',
  styleUrls: ['./tradingview-chart.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TradingviewChartComponent implements OnInit {
  @Input() symbol = 'AAPL';
  urlSafe: SafeResourceUrl;
  chartView;

  constructor(public sanitizer: DomSanitizer, private route: ActivatedRoute) {}

  ngOnInit() {
    //this.loadView();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbol != null && this.symbol != '') {
      this.loadView();
    }
  }
  
  loadView() {
    this.chartView = new TradingView.widget({
      container_id: 'tradingview_view2',
      width: '100%',
      height: '100%',
      autosize: true,
      symbol: this.symbol,
      interval: 'D',
      timezone: 'exchange',
      theme: 'light',
      style: '1',
      toolbar_bg: '#f1f3f6',
      withdateranges: true,
      hide_side_toolbar: false,
      studies: [
        {
          id: 'MASimple@tv-basicstudies',
          inputs: {
            length: 200,
          },
        },
        {
          id: 'BB@tv-basicstudies',
          inputs: {
            length: 50,
          },
        },
        {
          id: 'MACD@tv-basicstudies'
        },
      ],
      locale: 'en',
      enable_publishing: false,
      // range: "6M",
    });
  }
}
