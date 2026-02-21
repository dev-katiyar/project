import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';

@Component({
  selector: 'market-internals',
  templateUrl: './market-internals.component.html',
  styleUrls: ['./market-internals.component.css']
})
export class MarketInternalsComponent implements OnInit {

  movAvg;
  obos;
  sentimentData;
  buySellRatio;
  fearGreed;
  technicalMeasure;
  constructor(private liveService: LiveService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['overview'] },
      { label: 'Sentiment', routerLink: ['/marketinternals'] }
    ]);
  }

  ngOnInit() {
    this.movingAvgPeriodChanged("3year");
    this.obosPeriodChanged("3year");
    this.sentimentPeriodChanged("3year");
    this.buySellPeriodChanged("3year");
    this.fearGreedPeriodChanged("3year");
    this.technicalMeasurePeriodChanged("3year");
  }

  setMovAvgData(data) {
    let series = [{ name: "movavg150", data: [], color: 'red', legend: '150 SMA' }, { name: "movavg75", data: [], color: 'green', legend: '75 SMA' }, { name: "movavg50", data: [], color: 'blue', legend: '50 SMA' }];
    this.movAvg = { "data": data, "series": series, "categoryColumn": "rating_date" };
  }

  setObOsData(data) {
    let series = [{ name: "Overbought", data: [], color: 'red', legend: 'Overbought' }, { name: "Oversold", data: [], color: 'green', legend: 'Oversold' }];
    this.obos = { "data": data, "series": series, "categoryColumn": "date" };
  }

  setSentiment(data) {
    let series = [{ name: "meter_score", data: [], color: 'green', legend: 'Meter Score' }];
    this.sentimentData = { "data": data, "series": series, "categoryColumn": "date" };
  }

  setBuySellRatio(data) {
    let series = [{ name: "StrongSell", data: [], color: 'red', legend: 'Strong Sell' }, { name: "StrongBuy", data: [], color: 'green', legend: 'Strong Buy' }];
    this.buySellRatio = { "data": data, "series": series, "categoryColumn": "date" };
  }

  buySellPeriodChanged(event) {
    this.liveService.getUrlData("/symbol/technicalHistory/buySellRatio/" + event)
      .subscribe(d => this.setBuySellRatio(d));
  }

  obosPeriodChanged(event) {
    this.liveService.getUrlData("/symbol/technicalHistory/obos/" + event)
      .subscribe(d => this.setObOsData(d));
  }

  sentimentPeriodChanged(event) {
    this.liveService.getUrlData("/symbol/technicalHistory/sentiment/" + event)
      .subscribe(d => this.setSentiment(d));
  }

  movingAvgPeriodChanged(event) {
    this.liveService.getUrlData("/symbol/indtechnicalHistory/movAvg/" + event)
      .subscribe(d => this.setMovAvgData(d));
  }

  fearGreedPeriodChanged(event) {
    this.liveService.getUrlData("/symbol/technicalHistory/fear_greed_price/" + event + '/SPY')
      .subscribe(d => this.setFearGreedRatio(d));
  }

  setFearGreedRatio(data) {
    let series = [
      { name: "fear_greed", data: [], color: 'red', legend: 'Fear/Greed' },
      { name: "SPY", data: [], color: 'black', legend: 'SPY', yAxis: 1 }
    ];
    this.fearGreed = { 
      "data": data, 
      "series": series, 
      "categoryColumn": "date",
      "yAxes": [
        {title: { text: 'Fear/Greed'}, min: 0, max: 100},
        {title: { text: 'SPY'}, opposite: true},
      ]
    };
  }

  technicalMeasurePeriodChanged(event) {
    this.liveService.getUrlData("/symbol/technicalHistory/fear_greed_price/" + event + '/SPY')
      .subscribe(d => this.setTechnicalMeasure(d));
  }

  setTechnicalMeasure(data) {
    let series = [
      { name: "technical", data: [], color: 'green', legend: 'Technical', yAxis: 0 }, 
      { name: "SPY", data: [], color: 'black', legend: 'SPY', yAxis: 1 }
    ];
    this.technicalMeasure = { 
      "data": data, 
      "series": series, 
      "categoryColumn": "date", 
      "yAxes": [
        {title: { text: 'Technical'}, min: 0, max: 100},
        {title: { text: 'SPY'}, opposite: true},
      ]
    };
  }
}
