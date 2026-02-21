import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-absolute-analysis-chart',
  templateUrl: './absolute-analysis-chart.component.html',
  styleUrls: ['./absolute-analysis-chart.component.scss']
})
export class AbsoluteAnalysisChartComponent implements OnInit,OnChanges {

  options = {};
  barClass = 'chart-big';
  chart: Chart;
  @Input('chartData') chartData: any;
  @Input('chartConfig') chartConfig: any;
  plotBands = [
    { 
      color: { 
        linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1 },
        stops: [
          [0, '#ff9980'], // start
          [1, '#ececec'] // end
        ]
      },
      from: 0.25,
      to: 1,
      label: {text: 'Overbought', style: {color: 'black', fontWeight: 'bold'}},
      // zIndex: 3,
    },
    { // mark the weekend
      color: '#ececec',
      from: -0.25,
      to: 0.25,
      label: {text: 'Neutral', style: {color: 'black', fontWeight: 'bold'}, y: -3},
      // zIndex: 3,
    },
    { // mark the weekend
      color: {
        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
        stops: [
          [0, '#ececec'], // start
          [1, '#80ff80'] // end
        ]
      },
      from: -1,
      to: -0.25,
      label: {text: 'Oversold', style: {color: 'black', fontWeight: 'bold'}},
      // zIndex: 3,
    }
    // { color: 'green', from: -1.0, to: -0.75, label: {text: 'Very Oversold', style: {color: 'black', fontWeight: 'bold'}}, zIndex: 3 },
    // { color: '#80dd91', from: -0.75, to: -0.25, label: {text: 'Moderately Oversold', style: {color: 'black', fontWeight: 'bold'}}, zIndex: 3 },
    // { color: '#ececec', from: -0.25, to: 0.25, label: {text: 'Neutral', style: {color: 'black', fontWeight: 'bold'}}, zIndex: 3 },
    // { color: '#f57656', from: 0.25, to: 0.75, label: {text: 'Moderately Overbought', style: {color: 'black', fontWeight: 'bold'}}, zIndex: 3 },
    // { color: '#b82a1f', from: 0.75, to: 1.0, label: {text: 'Very Overbought', style: {color: 'black', fontWeight: 'bold'}}, zIndex: 3 },
  ];

  constructor() { }

  ngOnInit(): void {
    if (this.chartData != null) {
      this.setChartData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chartData != null) {
      this.setChartData();
    }
  }

  setChartData() {
    let chartSeries = this.prepareChartSeriesData(this.chartData);
    this.setChartOptions(chartSeries);
  }

  prepareChartSeriesData(chartData) {
    // X-AXIS SERIES TEMPLATE
    let categoryLine = this.chartConfig.xColKey;
    let categories = []; // TO FILLED FROM 'chartData'

    // Y-AXIS ALL SERIES TEMPLATE
    let combinedKey = this.chartConfig.yColKey1;

    let score_line_series = [
      {
        id: combinedKey + '_score',
        name: 'Abs Score',
        yAxis: 0,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#336600',
        tooltip: { valueDecimals: 2 },
        // zIndex: 1,
      },
    ];
    let lines_series = [
      {
        id: this.chartConfig.yColKey1,
        name: this.chartConfig.yColKey1,
        yAxis: 1,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#4144f2',
        tooltip: { valueDecimals: 2 },
        // zIndex: 2,
      },
      // {
      //   id: this.chartConfig.yColKey2,
      //   name: this.chartConfig.yColKey2,
      //   yAxis: 1,
      //   type: 'line',
      //   data: [], // TO FILLED FROM 'chartData
      //   lineWidth: 2,
      //   fillOpacity: 0.8,
      //   marker: { enabled: false },
      //   color: 'black',
      //   tooltip: { valueDecimals: 2 },
      //   zIndex: 3,
      // },
    ];

    // let columns_series = [];
    // columns_series.push(
    //   {
    //     id: combinedKey + '_diff',
    //     name: this.chartConfig.yColKey1 + ' - ' + this.chartConfig.yColKey2,
    //     yAxis: 2,
    //     type: 'column',
    //     data: [], // TO FILLED FROM 'chartData
    //     lineWidth: 2,
    //     fillOpacity: 0.8,
    //     marker: { enabled: false },
    //     color: '#cc9900',
    //     tooltip: { valueDecimals: 2 },
    //     zIndex: 0, // Layering Order
    //   }
    // );

    // FILL SERIES TEMPLATES DATA POINTS FROM 'chartData' OBJECT ARRAY
    let k = 0;
    for (let rowObj of chartData) {
      // For each row object of dataframe
      categories.push(rowObj[categoryLine]); // Fill X-Axis Series Customized Points

      for (let score_series of score_line_series) {  // Fill Y-Axis 'Lines' Series - Score
        let pointValue = rowObj[score_series['id']] * this.chartConfig.multiplier;
        let point = { y: pointValue };
        score_series['data'].push(point);
      }

      for (let line_series of lines_series) {  // Fill Y-Axis 'Lines' Series
        let pointValue = rowObj[line_series['id']];
        let point = { y: pointValue };
        line_series['data'].push(point);
      }

      // for (let column_series of columns_series) {  // Fill Y-Axis 'Columns' Series
      //   let pointValue = rowObj[column_series['id']] * this.chartConfig.multiplier;
      //   let pointColor =  pointValue > 0 ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
  
      //   let point = { y: pointValue, color: pointColor };
      //   column_series['data'].push(point);
      // }

      k = k + 1;
    }

    let all_series = lines_series.concat(score_line_series);

    let chartSeries = { series: all_series, categories: categories};
    return chartSeries;
  }

  setChartOptions(chartSeries) {
    this.options = {
      chart: { backgroundColor: 'transparent' },
      exporting: { enabled: false },
      credits: { enabled: false },
      title: '',
      subtitle: '',
      xAxis: { categories: chartSeries.categories, labels: { enabled: true } },
      yAxis: [
        /* Y-Axis [0] */
        {
          title: { text: 'Abs Score', offset: 0, x: -35 },
          labels: { offset: 0, x: -5 },
          top: '0%',
          height: '49%', // Chart Pane [0]
          offset: 0,
          lineWidth: 2,
          tickPositions: [-1, -0.25, -0.75, 0, 0.25, 0.75, 1], // Limits and Ticks
          plotBands: this.plotBands,
          gridLineColor: '#d9d9d9'
          // zIndex: 10,
        },

        /* Y-Axis [1] */
        {
          title: { text: 'Price Change(%)', offset: 0, x: -35 },
          labels: { offset: 0, x: -5 },
          top: '51%',
          height: '49%', // Chart Pane [1]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
            return [-max, 0, +max];
          },
        },
       
        // /* Y-Axis [2] */
        // {
        //   title: { text: 'Diff (%)', offset: 0, x: 25 },
        //   labels: { offset: 0, x: 5 },
        //   top: '51%',
        //   height: '49%', // Chart Pane [1]
        //   offset: 0,
        //   lineWidth: 2,
        //   opposite: true,
        //   tickPositioner: function () {
        //     // Limits and Ticks
        //     var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
        //     return [-max, 0, +max];
        //   },
        // },
      ],

      tooltip: {
        crosshairs: { color: 'green', dashStyle: 'solid', width: 1 },
        backgroundColor: 'rgba(90, 135, 230, 0.1)',
        borderWidth: 0,
        shadow: false,
        padding: 2,
        split: true,
      },

      plotOptions: {
        series: {
          connectNulls: true,
          cursor: 'pointer',
          pointInterval: undefined,
          pointStart: undefined,
        },
      },

      annotations: [{
        draggable: 'x',
        labels: [
          // {
          //   point: {
          //     x: 100,
          //     y: 15
          //   },
          //   text: 'Relative Analysis'
          // },
          {
            point: {
              x: 0,
              y: 227
            },
            text: 'Price Chart'
          },
        ],
        labelOptions: {
          borderRadius: 5,
          backgroundColor: 'rgba(252, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: '#AAA',
          style: {
            fontSize: '12px',
            fontWeight: 'bold'
          },
          shape: 'rect',
          shadow: {
            color: 'gray',
            offsetX: -0.3,
            opacity: 0.3
          }
        }
      }],

      series: chartSeries.series,
    };
    this.chart = new Chart(this.options);
  }

}
