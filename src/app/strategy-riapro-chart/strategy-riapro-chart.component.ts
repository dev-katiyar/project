import { Component, OnInit, Input } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-strategy-riapro-chart',
  templateUrl: './strategy-riapro-chart.component.html',
  styleUrls: ['./strategy-riapro-chart.component.css'],
})
export class StrategyRiaproChartComponent implements OnInit {
  // HIGH-CHART SPECIFIC OPTIONS FROM 'chartData' INPUT ARRAY
  options = {};
  barClass = 'chart-big';
  chart: Chart;
  @Input('chartData') chartData: any;

  constructor() {}

  ngOnInit() {
    if (this.chartData != null) {
      this.setChartData(this.chartData);
    }
  }

  setChartData(chartData) {
    let chartInputs = this.prepareChartInputs(chartData);
    this.setChartOptions(chartInputs);
  }

  prepareChartInputs(chartData) {
    // X-AXIS SERIES TEMPLATE
    let categoryLine = 'date';
    let categories = []; // TO FILLED FROM 'chartData'

    // Y-AXIS ALL SERIES TEMPLATE
    let series = [];

    // Y-AXIS 'LINE' SERIES TEMPLATES
    let lines_series = [];
    lines_series.push(
      {
        id: 'close',
        name: 'Close Price',
        yAxis: 0,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#000000',
        tooltip: { valueDecimals: 2 },
      },
      {
        id: 'ria',
        name: 'SV MF Ind',
        yAxis: 1,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#006400',
        tooltip: { valueDecimals: 2 },
        zIndex: 2, // Layering Order
      },
      {
        id: 'ria_trigger',
        name: 'SV MF Signal',
        yAxis: 1,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#3366ff',
        tooltip: { valueDecimals: 2 },
        zIndex: 3, // Layering Order
      },
      {
        id: 'macd',
        name: 'MACD',
        yAxis: 3,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#001a66',
        tooltip: { valueDecimals: 2 },
        zIndex: 2, // Layering Order
      },
      {
        id: 'macd_trigger',
        name: 'MACD Signal',
        yAxis: 3,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#3385ff',
        tooltip: { valueDecimals: 2 },
        zIndex: 3, // Layering Order
      },
      {
        id: 'stoch',
        name: 'Stochastic',
        yAxis: 7,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#802000',
        tooltip: { valueDecimals: 2 },
        zIndex: 2, // Layering Order
      },
      {
        id: 'stoch_trigger',
        name: 'Stochastic Signal',
        yAxis: 7,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#ff6633',
        tooltip: { valueDecimals: 2 },
        zIndex: 3, // Layering Order
      },
    );

    // Y-AXIS 'COLUMN' SERIES TEMPLATES
    let columns_series = [];
    columns_series.push(
      {
        id: 'ria_diff',
        name: 'SV MF Diff',
        yAxis: 2,
        type: 'column',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#cc9900',
        tooltip: { valueDecimals: 2 },
        zIndex: 1, // Layering Order
      },
      {
        id: 'macd_diff',
        name: 'MACD Diff',
        yAxis: 4,
        type: 'column',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#802000',
        tooltip: { valueDecimals: 2 },
        zIndex: 1, // Layering Order
      },
      {
        id: 'cmf',
        name: 'Money Flow',
        yAxis: 5,
        type: 'column',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#006666',
        tooltip: { valueDecimals: 2 },
        zIndex: 1, // Layering Order
      },
      {
        id: 'stoch_diff',
        name: 'Stochastic Diff',
        yAxis: 8,
        type: 'column',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#cc9900',
        tooltip: { valueDecimals: 2 },
        zIndex: 1, // Layering Order
      },
    );

    // Y-AXIS 'FLAG' SERIES TEMPLATES
    let flags_series = [];
    flags_series.push(
      {
        id: 'buy_rating',
        name: 'Buy Rating',
        type: 'flags',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillColor: 'rgba(21, 203, 36, 0.05)',
        y: -50,
        onSeries: lines_series[0].id, // On 'Close Price' line
        shape: 'squarepin',
        color: '#15CB24',
        showInLegend: false,
        clip: false,
      },
      {
        id: 'sell_rating',
        name: 'Sell Rating',
        type: 'flags',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillColor: 'rgba(203, 21, 21, 0.05)',
        y: 30,
        onSeries: lines_series[0].id, // On 'Close Price' line
        shape: 'squarepin',
        color: '#CB1515',
        showInLegend: false,
        clip: false,
      },
    );

    // FILL SERIES TEMPLATES DATA POINTS FROM 'chartData' OBJECT ARRAY
    let k = 0;
    for (let rowObj of chartData) {
      // For each row object of dataframe

      categories.push(Date.parse(rowObj[categoryLine])); // Fill X-Axis Series Customized Points

      for (let line_series of lines_series) {
        // Fill Y-Axis 'Lines' Series
        let pointValue = rowObj[line_series['id']];

        let point = { y: pointValue };
        line_series['data'].push(point);
      }

      for (let column_series of columns_series) {
        // Fill Y-Axis 'Columns' Series
        let pointValue = rowObj[column_series['id']];
        let pointColor = pointValue > 0 ? 'rgb(51, 157, 51)' : 'rgba(255, 0, 0, 0.9)';

        let point = { y: pointValue, color: pointColor };
        column_series['data'].push(point);
      }

      let buy_rating = rowObj['buy_rating']; // Fill Y-Axis 'Flags' Series - BUY
      if (buy_rating == 2) {
        flags_series[0]['data'].push({ x: k, title: 'B' }); // Note Index 0
      }
      // if (buy_rating == 1) {
      //   flags_series[0]['data'].push({ x: k, title: 'HOLD' }); // Note Index 0
      // }
      // if (buy_rating != 0) {
      //   let flag = { x: k, title: 'Weak Buy' };
      //   if (buy_rating > 0.74) {
      //     flag.title = 'Buy';
      //   }
      //   if (buy_rating == 1) {
      //     flag.title = 'Strong Buy';
      //   }

      //   flags_series[0]['data'].push(flag); // Note Index 0
      // }

      let sell_rating = rowObj['sell_rating']; // Fill Y-Axis 'Flags' Series - SELL
      if (sell_rating == 2) {
        flags_series[1]['data'].push({ x: k, title: 'S' }); // Note Index 0
      }
      // if (sell_rating == 1) {
      //   flags_series[1]['data'].push({ x: k, title: 'HOLD' }); // Note Index 0
      // }
      // if (sell_rating != 0) {
      //   let flag = { x: k, title: 'Weak Sell' };
      //   if (sell_rating > 0.74) {
      //     flag.title = 'Sell';
      //   }
      //   if (sell_rating == 1) {
      //     flag.title = 'Strong Sell';
      //   }

      //   flags_series[1]['data'].push(flag); // Note Index 1
      // }

      k = k + 1;
    }

    series = lines_series.concat(columns_series, flags_series);

    let chartInputs = { series: series, categories: categories, symbol: chartData[0].symbol };

    return chartInputs;
  }

  setChartOptions(chartInputs) {
    this.options = {
      chart: { backgroundColor: 'transparent' },
      exporting: { enabled: false },
      credits: { enabled: false },
      title: { text: 'MoneyFlow Indicator ( ' + chartInputs.symbol + ' )'},
      subtitle: { text: '', x: 200 },
      xAxis: { type: 'datetime', categories: chartInputs.categories, labels: { format: '{value:%b %d, %Y}', enabled: true } },
      yAxis: [
        /* Y-Axis [0] */
        {
          title: { text: 'Close Price', offset: 0, x: -37 },
          labels: { offset: 0, x: -5 },
          top: '0%',
          height: '32%', // Chart Pane [0]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var positions = [],
              tick = Math.floor(this.dataMin),
              increment = Math.ceil((this.dataMax - this.dataMin) / 6);

            if (this.dataMax !== null && this.dataMin !== null) {
              for (tick; tick - increment <= this.dataMax; tick += increment) {
                positions.push(tick);
              }
            }
            return positions;
          },
        },

        /* Y-Axis [1] */
        {
          title: { text: 'SV MF & Signal', offset: 0, x: -37 },
          labels: { offset: 0, x: -5 },
          top: '34%',
          height: '15%', // Chart Pane [1]
          offset: 0,
          lineWidth: 2,
          tickPositions: [0, 20, 50, 80, 100], // Limits and Ticks
        },

        /* Y-Axis [2] */
        {
          title: { text: 'SV MF Diff', offset: 0, x: 35 },
          labels: { offset: 0, x: 5 },
          top: '34%',
          height: '15%', // Chart Pane [1]
          offset: 0,
          lineWidth: 2,
          opposite: true,
          tickPositions: [-50, 0, 50], // Limits and Ticks
        },

        /* Y-Axis [3] */
        {
          title: { text: 'MACD & Signal', offset: 0, x: -37 },
          labels: { offset: 0, x: -5 },
          top: '51%',
          height: '15%', // Chart Pane [2]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(0);
            var maxInt = Number(max);
            return [-maxInt, 0, maxInt];
          },
        },

        /* Y-Axis [4] */
        {
          title: { text: 'MACD Diff', offset: 0, x: 35 },
          labels: { offset: 0, x: 5 },
          top: '51%',
          height: '15%', // Chart Pane [2]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(0);
            var maxInt = Number(max);
            return [-maxInt, 0, maxInt];
          },
          opposite: true,
        },

        /* Y-Axis [5] */
        {
          title: { text: 'Money Flow', offset: 0, x: -37 },
          labels: { offset: 0, x: -5 },
          top: '68%',
          height: '15%', // Chart Pane [3]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
            return [-max, -0.05, 0, 0.05, max];
          },
        },

        /* Y-Axis [6] */
        {
          title: { text: '', offset: 0, x: 35 },
          labels: { offset: 0, x: 5 },
          top: '68%',
          height: '15%', // Chart Pane [3]
          offset: 0,
          lineWidth: 2,
          //                 tickPositions: [0, 50, 100],                        // Limits and Ticks
          opposite: true,
        },

        /* Y-Axis [7] */
        {
          title: { text: 'Stoch & Signal', offset: 0, x: -37 },
          labels: { offset: 0, x: -5 },
          top: '85%',
          height: '15%', // Chart Pane [4]
          offset: 0,
          lineWidth: 2,
          tickPositions: [0, 50, 100], // Limits and Ticks
        },

        /* Y-Axis [8] */
        {
          title: { text: 'Stochastic Diff', offset: 0, x: 35 },
          labels: { offset: 0, x: 5 },
          top: '85%',
          height: '15%', // Chart Pane [4]
          offset: 0,
          lineWidth: 2,
          tickPositions: [-50, 0, 50], // Limits and Ticks
          opposite: true,
        },
      ],

      tooltip: {
        crosshairs: { color: 'green', dashStyle: 'solid', width: 1 },
        backgroundColor: 'rgba(90, 135, 230, 0.1)',
        borderWidth: 0,
        shadow: false,
        padding: 2,
        split: true,
        xDateFormat: '%b %d, %Y',
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
        labels: [{
            point: {
              x: 0,
              y: 15
            },
            text: 'Stock Price'
          },
          {
            point: {
              x: 0,
              y: 284
            },
            text: 'SV MoneyFlow Indicators'
          },
          {
            point: {
              x: 0,
              y: 406
            },
            text: 'MACD Indicators'
          },
          {
            point: {
              x: 0,
              y: 528
            },
            text: 'Money Flow Indicator'
          },
          {
            point: {
              x: 50,
              y: 650
            },
            text: 'Stochastic Indicators'
          }
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

      series: chartInputs.series,
    };
    this.chart = new Chart(this.options);
  }
}
