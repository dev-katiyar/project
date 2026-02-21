import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-chart-fundamentals',
  templateUrl: './chart-fundamentals.component.html',
  styleUrls: ['./chart-fundamentals.component.scss'],
})
export class ChartFundamentalsComponent implements OnInit {
  @Input() fundamentalData: any;
  @Input() chartConfig = {  // default settings
    height: 400,
    showLegend: false,
    dataLabelsEnabled: false,
    yAxes: []
  };
  @Input() seriesConfig: {
    seriesData: any;
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
    colPointWidth: number,
    yAxis: number,
    showInLegend: boolean,
  }[];
  @Input() yAxisTitle: string = 'Shares';
  @Output() public symbolClicked = new EventEmitter();

  @Input() trendLinesChecksAvailable = true;

  options;
  series = [];
  categories = [];
  barChart: Chart;
  loading = true;
  @Input() isPeriodBarVisible = true;
  barClass = 'chart-big';
  startDate: string ;

  // Time Period Buttons
  periodMap = {
    '1year': 1,
    '3year': 3,
    '10year': 10,
    '20year': 20
  };
  @Input() period = '10year';
  @Output() public onPeriodChanged = new EventEmitter();

  // Frequecy (Quarter/Year) Buttons
  frequencyMap = {
    'annual': { name: 'Annual', code: 'annual' },
    'quarterly': { name: 'Quarterly', code: 'quarterly' } 
  };
  frequency = this.frequencyMap['quarterly'];
  @Output() public onFrequncyChanged = new EventEmitter();

  // Trendline Select Button
  trendLineVisible: boolean = false;
  @Output() public trendLinesSelected = new EventEmitter();

  // Growth Trendline Select Button
  growthTrendLineVisible: boolean = false;
  @Output() public growthTrendLinesSelected = new EventEmitter();

  constructor() {}

  ngOnInit(): void {
    this.ngOnChanges({});
  }

  setStartDate(period) {
    const years = this.periodMap[period];
    let startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    this.startDate = startDate.toISOString().split('T')[0];
  }

  periodChanged(period: string) {
    this.period = period;
    // this.setStartDate(this.period);
    this.onPeriodChanged.emit(this.period);
  }

  frequencyChanged(freq) {
    this.frequency = this.frequencyMap[freq];
    this.onFrequncyChanged.emit(this.frequency);
  }

  onTrendLineCheck() {
    this.trendLinesSelected.emit(this.trendLineVisible);
  }

  onGrowthTrendLineCheck() {
    this.growthTrendLinesSelected.emit(this.growthTrendLineVisible);
  }


  ngOnChanges(changes: SimpleChanges) {
    if (this.fundamentalData && this.seriesConfig && !changes['period']) {
      this.loading = false;
      this.series = [];
      this.setStartDate(this.period);

      for (let i = 0; i < this.seriesConfig.length; i++) {
        const ser = this.seriesConfig[i];
        let seriesData = [];
        let temp = this.fundamentalData;
        for (let key of ser.seriesData) {
          // get data relevant to series
          if (temp[key]) {
            temp = temp[key];
          }
        }
        seriesData = temp;
        let sortByCol = ser.sortByCol; // sort the data, as needed
        if (sortByCol) {
          // seriesData.sort((a, b) => (a[sortByCol] < b[sortByCol] ? -1 : 1));
        }

        let tempSeries = {
          // template for the series
          name: ser.seriesName,
          data: [],
          type: ser.barOrColumn,
          color: ser.colorSer,
          yAxis: ser.yAxis,
          pointWidth: ser.colPointWidth,
          showInLegend: ser.showInLegend,
        };
        for (let item of seriesData) {
          if(item[ser.xCol] < this.startDate) {
            continue;
          }
          // Once for each point in series
          this.categories.push(item[ser.xCol]);
          let yVal = +item[ser.yCol];
          let col = yVal >= 0 ? ser.colorPos : ser.colorNeg;
          let tempPoint = {
            name: item[ser.xColName],
            x: Date.parse(item[ser.xCol]),
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
        backgroundColor: 'transparent',
        height: this.chartConfig.height,
        // events: {
        //   load: function (event) {
        //     event.target.reflow();
        //   },
        // },
      },
      title: {
        text: '',
        align: 'right',
      },
      // exporting: {
      //   enabled: false,
      // },
      credits: {
        enabled: false,
      },
      xAxis: {
        // categories: this.categories,
        labels: {
          enabled: true,
          // autoRotation: [-10, -20, -30, -40, -50, -60, -70, -80, -90],
        },
        type: 'datetime',
      },
      legend: {
        enabled: this.chartConfig.showLegend,
        // layout: 'vertical',
        // align: 'right',
        // verticalAlign: 'top',
        // x: -10,
        // y: 100,
      },
      yAxis: this.chartConfig.yAxes,
      // [
      //   {
      //     title: {
      //       text: this.yAxisTitle,
      //     },
      //   },
      //   {
      //     title: {
      //       text: this.yAxisTitle,
      //     },
      //     opposite: true,
      //   },
      // ],
      tooltip: {
        pointFormat: '{series.name}: <b>{point.y}</b>',
        valueDecimals: 2,
        // formatter: function () {
        //   return '<b>' + this.series.name + '</b>: ' + this.y.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        // },
      },
      series: this.series,
      plotOptions: {
        series: {
          // cursor: 'pointer',
          // point: {
          //   events: {
          //     click: this.onSymbolClick.bind(this),
          //   },
          // },
          dataLabels: {
            enabled: this.chartConfig.dataLabelsEnabled,
          },
        },
        // column: {
        //   pointWidth: undefined,
        // },
      },
    };

    this.barChart = new Chart(this.options);
    // this.barChart.ref.yAxis[0].setTitle({
    //   text: 'One'
    // });
    // this.barChart.ref.yAxis[1].setTitle({
    //   text: 'two'
    // });
  }

  onSymbolClick(event) {
    this.symbolClicked.emit({ value: event.point.category });
  }
}
