import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-short-interest',
  templateUrl: './short-interest.component.html',
  styleUrls: ['./short-interest.component.scss'],
})
export class ShortInterestComponent implements OnInit {
  @Input('symbol') symbol = 'AAPL';
  allData;
  selectedTimePeriod = '1year';
  error = '';
  defaultPointWidth = 9;

  chartConfig = {
    height: 400,
    showLegend: true,
    dataLabelsEnabled: false,
    yAxes: [],
  }; // for overall chart configs, series configs below

  seriesConfigs: any = {
    // line/column points specific settings.
    // TODO: fundamental charts have a lot in common, if later needed merged then to generic config
    Price: {
      seriesData: ['priceData'],
      seriesName: 'Price($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'adjusted_close',
      colorPos: 'green',
      colorNeg: 'lightcoral',
      colorSer: 'black',
      barOrColumn: 'line',
      colPointWidth: this.defaultPointWidth,
      yAxis: 1,
    },
    ShortsOSRatio: {
      seriesData: ['shortData'],
      seriesName: 'Short Interest Ratio',
      xCol: 'rep_date',
      xColName: 'Date',
      yCol: 'short_os_ratio',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'line',
      colorSer: 'green',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
  };

  selectedSeriesConfigs = this.seriesConfigs[0];

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.symbol) {
      this.loadData();
    }
  }

  loadData() {
    forkJoin({
      shortData: this.liveService.getDataInArray('/symbol/short-interest/' + this.symbol),
      priceData: this.liveService.getSymbolPriceData(this.symbol, this.selectedTimePeriod),
    }).subscribe(data => {
      this.allData = data;
      if ('error' in data.shortData) {
        this.error = 'No Short data for ' + this.symbol;
      } else {
        this.error = '';
      }
      this.setDataForChart();
    });
  }

  setDataForChart() {
    // 1. PRICE Series
    const priceConfig = this.seriesConfigs['Price'];

    // 2. SELECTED Fundamental Series
    const dataSerieConfig = this.seriesConfigs['ShortsOSRatio'];

    // Chart Configs for 1. and 2. above
    this.chartConfig.yAxes = [
      { title: { text: dataSerieConfig.seriesName }, labels: { format: '{value:.2f}%' }, opposite: false },
      { title: { text: priceConfig.seriesName }, opposite: true },
    ];
    this.selectedSeriesConfigs = [dataSerieConfig, priceConfig];
  }
}
