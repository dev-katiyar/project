import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ChartUtils } from '../utils/chart.utils';
import { Subject } from 'rxjs';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'model-history-chart',
  templateUrl: './model-portfolio-history-chart.component.html',
  styleUrls: ['./model-portfolio-history-chart.component.css'],
})
export class ModelPortfolioHistoryChartComponent implements OnInit {
  options;
  chartData;
  @Input() changing: Subject<boolean>;

  @Input() modelPortfolio;
  @Input() barClass = 'chart';
  @Input() yAxisText = 'Price Change %';
  period = '1year';
  lineChart: Chart;
  indexKey = '';

  constructor(private liveService: LiveService) {}

  ngOnChanges(changes: SimpleChanges) {
    this.options = {};
    this.options.title = 'No data';
  }

  periodChanged(event) {
    this.period = event;
    this.checkDataReady({ status: 1 });
  }

  modelPortfolioRequest() {
    this.liveService
      .getUrlData('/modelportfolio/dataready/' + this.modelPortfolio.id)
      .subscribe(res => this.checkDataReady(res));
  }

  checkDataReady(res) {
    if (res.status == 1) {
      this.liveService
        .postRequest('/modelportfolio/historical', {
          portfolio: this.modelPortfolio.id,
          period: this.period,
        })
        .subscribe(res => {
          this.createDataForSymbols(res);
        });
    } else {
      this.updatePortfolioOnChange();
    }
  }

  createDataForSymbols(data) {
    if (!data || data.length < 1) {
      return;
    }
    let allSymbols = [];
    let row = data[0];
    let keys = Object.keys(row);
    for (let key of keys) {
      if (key != 'date') {
        if (allSymbols.lastIndexOf(key) == -1) {
          allSymbols.push(key);
        }
      }
    }

    let series = [];
    let portfolioKey = this.modelPortfolio.name;
    this.indexKey = [1409, 1410, 1411, 1412].includes(this.modelPortfolio.id)? 'S&P500': '60/40 Index';
    for (let symbol of allSymbols) {
      let temp1 = { name: symbol, data: [], color: '', lineWidth: 2, marker: { enabled: false }, yAxis: 0 };
      if (allSymbols.length == 3) {
        temp1.color = 'green';
        temp1.lineWidth = 3;
      }
      if (symbol.includes('Portfolio')) {
      }
      if (symbol == 'S&P500' || symbol == 'SPY') {
        temp1.color = 'steelblue';
        temp1.lineWidth = 2;
      } else if (symbol.includes('Index')) {
        temp1.color = 'lightcoral';
        temp1.lineWidth = 2;
        // indexKey = symbol;
      }
      //60/40 Index
      series.push(temp1);
    }

    let column_diff_series = {
      name: 'Portfolio - Index Diff',
      type: 'column',
      data: [],
      lineWidth: 2,
      fillOpacity: 0.8,
      marker: { enabled: false },
      color: 'black',
      tooltip: { valueDecimals: 2 },
      zIndex: -2, // Layering Order,
      yAxis: 1
    };

    if (portfolioKey !== '' && this.indexKey !== '') {
      for (let row of data) {
        let pointValue = row[portfolioKey] - row[this.indexKey];
        let pointColor = pointValue > 0 ? 'rgb(51, 157, 51)' : 'rgba(255, 0, 0, 0.9)';

        let point = { y: pointValue, color: pointColor };
        column_diff_series['data'].push(point);
      }
    }

    let dataTable = { data: data, series: series, categoryColumn: 'date' };
    let chartData = ChartUtils.getAllSeriesData(
      dataTable['data'],
      dataTable['series'],
      dataTable['categoryColumn'],
      false,
    );
    chartData.series.push(column_diff_series);
    this.chartData = chartData;
    this.setData();
  }

  setData() {
    // date time set data type
    this.chartData.categories = this.chartData.categories.map(d => Date.parse(d));
    
    // set chart
    this.options = {
      chart: {
        backgroundColor: 'transparent',
      },
      exporting: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
      title: {
        text: '',
        x: -200, //center
      },
      subtitle: {
        text: '',
        x: 200,
      },
      plotOptions: {
        series: {
          turboThreshold: 0,
        },
      },
      xAxis: {
        type: 'datetime',
        categories: this.chartData.categories,
        labels: {
          format: '{value:%b %d, %Y}',
        },
      },
      yAxis: [
        {
          top: '0%',
          height: '65%', // Chart Pane [0]
          title: { text: this.yAxisText },
          offset: 0,
          plotLines: [{ value: 0, width: 1, olor: '#808080' }],
        },
        {
          top: '70%',
          height: '30%', // Chart Pane [1]
          offset: 0,
          title: { text: 'Relative Performance vs Benchmark(%)' },
          plotLines: [{ value: 0, width: 1, color: '#808080' }],
        },
      ],
      tooltip: {
        shared: true,
      },
      series: this.chartData.series,
    };
    this.lineChart = new Chart(this.options);
  }

  ngOnInit() {
    this.changing.subscribe(v => {
      this.updatePortfolioOnChange();
    });
    this.updatePortfolioOnChange();
  }

  ngOnDestroy() {
    if (this.changing) {
      //this.changing.unsubscribe();
    }
  }

  updatePortfolioOnChange() {
    setTimeout(() => {
      if (this.modelPortfolio.id != null && this.modelPortfolio.id != 0) {
        this.modelPortfolioRequest();
      }
    }, 100);
  }
}
