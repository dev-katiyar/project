import { Component, OnInit, Input, SimpleChanges, SimpleChange } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { ChartUtils } from '../../utils/chart.utils';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnInit {

  options: Object;
  barChart: Chart;
  @Input() chartType;
  @Input() symbols;
  @Input() columnToPlot = "priceChangePct";
  @Input() yAxisTitle = "Price Change (%)";
  @Input() title = "";
  @Input() chartData;
  @Input() barClass = "chart";
  @Input() showLegends = false;
  @Input() chartHeight;
  @Input() technicalData;
  @Input() tickPositions;
  
  loading = true;
  text = "";
  constructor(private liveService: LiveService) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.loading = true;
    this.text = "Data Loading....";
    if(changes.technicalData) {
      this.setChartDataFromSymbol();
    }
    if (changes.symbols) {
      if (this.symbols != null && this.symbols.length > 0) {
        this.liveService.getTechnicals(this.symbols).subscribe(d => this.technicalData = d);
      }
      else if (changes.symbols.currentValue === undefined) {

      }
      else {
        this.text = "No Data";
      }
    }
    else if (this.chartData != null) {
      this.setData(this.chartData);
    }
    else {
      this.text = "No Data";
    }
  }

  setChartDataFromSymbol() {
    let shouldSetSeriesColors = true;
    if (this.chartType == "pie") {
      shouldSetSeriesColors = false;
    }

    if(this.technicalData) {
      this.technicalData.sort((a, b) => (a[this.columnToPlot] > b[this.columnToPlot]) ? -1 : 1);
      let chartData = ChartUtils.getSeriesData(this.technicalData, "symbol", this.columnToPlot, shouldSetSeriesColors, null);
      this.setData(chartData);
    }
  }

  setData(chartData) {
    if (chartData != null) {
      if (this.chartType == "pie") {
        this.showLegends = true;
      }
      this.options = {
        chart: {
          type: this.chartType,
          backgroundColor: 'transparent',
          height: this.chartHeight ? this.chartHeight : (10 / 16 * 100) + '%',
          events: {
            load: function (event) {
              event.target.reflow();
            }
          }
        },
        title: {
          text: '',
          x: -200 //center
        },
        exporting: {
          enabled: false
        },
        credits: {
          enabled: false
        },
        xAxis: {
          categories: chartData.categories,
          labels: {
            enabled: true,
            padding: 0
          }
        },
        legend: {
          enabled: this.showLegends
        },
        yAxis: {
          title: {
              text: this.yAxisTitle,
          },
          tickPositions: this.tickPositions, // Fixed tick marks
          labels: {
            enabled: true,
            padding: 0
          },
          plotLines: [{
            value: 0,
            width: 1,
            color: '#808080'
          }]
        },
        tooltip: {
          formatter: function () {
            return '<b>' + this.point.name + '</b>: ' + this.y;
          }
        },
        series: chartData.series,
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: false
            },
            showInLegend: true
          }
        }
      };
      this.barChart = new Chart(this.options);
      this.loading = false;
    }
  }
}
