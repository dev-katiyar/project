import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Chart } from 'angular-highcharts';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-bar-chart2',
  templateUrl: './bar-chart2.component.html',
  styleUrls: ['./bar-chart2.component.scss'],
})
export class BarChart2Component implements OnInit, OnChanges {
  constructor() {}

  @Input() dataArray: any[]; // This can be merged with seriesConfit Input, in case, we want to have series specific dataArray
  @Input() seriesConfig: {
    seriesName: any;
    xCol: any;
    xColName: any;
    yCol: any;
    clickEventCol: any;
    colorPos: any;
    colorNeg: any;
    barOrColumn: any;
    sortByCol: any;
    colorSer: any;
  }[];
  @Input() stacked = false;
  @Input() height: number = undefined;
  @Input() showLegend: boolean = false;
  @Input() yAxisTitle: string = '';
  @Output() public symbolClicked = new EventEmitter();
  @Input() dataLabelsEnabled = true;

  options;
  series = [];
  categories = [];
  barChart: Chart;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (this.dataArray && this.seriesConfig) {
      this.series = [];
      this.categories = [];

      for (let ser of this.seriesConfig) {
        // Once for each series
        let sortByCol = ser.sortByCol;
        if (sortByCol) {
          this.dataArray.sort((a, b) => (a[sortByCol] > b[sortByCol] ? -1 : 1));
        }

        let tempSeries = {
          name: ser.seriesName,
          data: [],
          type: ser.barOrColumn,
          color: ser.colorSer,
          dataLabels: {
            formatter: function () {
              // Use Highcharts.numberFormat to format labels with commas
              return this.y != 0 ? Highcharts.numberFormat(this.y, 2, '.', ',') : '';
            },
          },
        };
        for (let item of this.dataArray) {
          // Once for each point in series
          this.categories.push(item[ser.xCol]);
          let yVal = item[ser.yCol];
          let col = yVal >= 0 ? ser.colorPos : ser.colorNeg;
          let tempPoint = {
            name: item[ser.xColName],
            y: yVal,
            color: col,
            key: item[ser.clickEventCol],
          };
          tempSeries.data.push(tempPoint);
        }
        this.series.push(tempSeries);
      }

      this.createChart(this.series);
    }
  }

  createChart(series) {
    this.options = {
      chart: {
        // type: 'bar',
        backgroundColor: 'transparent',
        height: this.height ? this.height : (9 / 16) * 100 + '%',
        events: {
          load: function (event) {
            event.target.reflow();
          },
        },
      },
      title: {
        text: '',
      },
      exporting: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        categories: this.categories,
        labels: {
          enabled: true,
        },
      },
      legend: {
        enabled: this.showLegend,
      },
      yAxis: {
        title: {
          text: this.yAxisTitle,
        },
        plotLines: [
          {
            value: 0,
            width: 1,
            color: '#808080',
          },
        ],
      },
      tooltip: {
        formatter: function () {
          return '<b>' + this.point.name + '</b>: ' + this.y.toFixed(2);
        },
      },
      series: this.series,
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: false,
          },
          showInLegend: true,
        },
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: this.onSymbolClick.bind(this),
            },
          },
          dataLabels: {
            enabled: this.dataLabelsEnabled,
            formatter: function () {
              // Hide the label if the corresponding value is zero
              return this.y != 0 ? this.y : '';
            },
            // inside: false,
            verticalAlign: 'middle',
          },
        },
        column: this.stacked
          ? {
              stacking: 'normal',
              dataLabels: {
                enabled: true,
              },
            }
          : {
            },
      },
    };

    this.barChart = new Chart(this.options);
  }

  onSymbolClick(event) {
    this.symbolClicked.emit({ value: event.point.category });
  }
}
