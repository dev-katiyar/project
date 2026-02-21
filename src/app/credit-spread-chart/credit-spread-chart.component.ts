import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { LiveService } from '../services/live.service';
import { ChartUtils } from '../utils/chart.utils';

@Component({
  selector: 'app-credit-spread-chart',
  templateUrl: './credit-spread-chart.component.html',
  styleUrls: ['./credit-spread-chart.component.scss'],
})
export class CreditSpreadChartComponent implements OnInit, OnChanges {
  // chart is hanling data fetch by self as of now
  @Input() symbol: any;
  shortSymbol;

  // data from server
  histData;
  histStats;

  // for chart
  barChart: Chart;
  barClass = 'chart-big';
  options;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.symbol && changes.symbol.currentValue) {
      this.clearData();
      this.getSymbolHistoricalData(this.symbol);
    }
  }

  getSymbolHistoricalData(symbol) {
    const period = '20year';
    const url = `/fred_api/oas_data/historical/${symbol}/${period}`;
    this.liveService.getUrlData(url).subscribe(d => {
      if (d) {
        this.histData = d['data'];
        this.histStats = d['stats'];
        this.setSortSymbol();
        this.fillSeriesWithData();
      } else {
        // console.log('Issue in the data fetch..');
      }
    });
  }

  setSortSymbol() {
    const firstRow = this.histData[0];
    this.shortSymbol = firstRow['symbol'];
  }

  fillSeriesWithData() {
    this.histData.sort((a, b) => new Date(a['date']).getTime() - new Date(b['date']).getTime());
    const chartData = ChartUtils.createSeriesData(this.histData, 'spread', 'date', false);
    // this.fillAreaSeries(chartData);
    this.createChart(chartData);
  }

  fillAreaSeries(chartData) {
    // area sharing
    const areaSeries = {
      type: 'area',
      enableMouseTracking: false, // prevent hover tooltips on area
      // data: this.histStats,
      threshold: this.histStats,
      fillColor: {
        linearGradient: [0, 0, 0, 300],
        stops: [
          [0, 'rgba(255,0,0,0.4)'], // red transparent (above mean)
          [1, 'rgba(255,0,0,0.1)'],
        ],
      },
      negativeFillColor: {
        linearGradient: [0, 0, 0, 300],
        stops: [
          [0, 'rgba(0,128,0,0.4)'], // green transparent (below mean)
          [1, 'rgba(0,128,0,0.1)'],
        ],
      },
      marker: { enabled: false },
      showInLegend: false,
      zIndex: 2, // keep behind line
    };

    chartData.series.unshift(areaSeries);
  }

  createChart(chartData) {
    this.options = {
      chart: {
        backgroundColor: 'transparent',
        height: 300,
      },
      title: {
        text: this.shortSymbol + ' Historical Spread (20 Years)',
        align: 'center',
      },
      exporting: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        categories: chartData.categories,
        labels: {
          enabled: true,
          rotation: -45,
          // step: Math.ceil(this.histData.length/20),
        },
        type: 'datetime',
      },
      legend: {
        enabled: false,
      },
      yAxis: [
        {
          title: {
            text: 'Spread Over US Treasury (%)',
          },
          max: this.histStats.max,
          endOnTick: false, // Add this line
          ceiling: this.histStats.max, // Add this line
          plotLines: [
            {
              color: '#000000',
              width: 1,
              value: this.histStats.mean,
              label: {
                text: '20 Year Avg: ' + this.histStats.mean.toFixed(2) + ' %',
                align: 'right',
                x: -10,
              },
            },
          ],
          plotBands: [
            {
              color: {
                linearGradient: [0, 0, 0, 1],
                stops: [
                  [0, 'rgba(255,0,0,0.4)'], // red transparent (above mean)
                  [1, 'rgba(255,0,0,0.1)'],
                ],
              },
              from: this.histStats.mean,
              to: 0,
            },
            {
              color: {
                linearGradient: [0, 0, 0, 1],
                stops: [
                  [0, 'rgba(0,128,0,0.4)'], // green transparent (below mean)
                  [1, 'rgba(0,128,0,0.1)'],
                ],
              },
              from: this.histStats.mean,
              to: this.histStats.max,
            },
          ],
        },
      ],
      tooltip: {
        pointFormat: '{series.name}: <b>{point.y} %</b>',
        valueDecimals: 2,
      },
      series: chartData.series,
      plotOptions: {
        series: {
          turboThreshold: 5000,
          dataLabels: {
            enabled: false,
          },
        },
      },
    };

    this.barChart = new Chart(this.options);
  }

  clearData() {
    this.histData = null;
    this.histStats = null;
    this.barChart = null;
    this.shortSymbol = null;
    this.options = null;
  }
}
