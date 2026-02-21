import { Component, Input, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { ChartUtils } from '../utils/chart.utils';

@Component({
  selector: 'app-strategy-chart',
  templateUrl: './strategy-chart.component.html',
  styleUrls: ['./strategy-chart.component.scss']
})
export class StrategyChartComponent implements OnInit {

  options = {};
  barClass = 'chart-big';
  chart: Chart;
  @Input('chartData') chartData: any;
  @Input('chartSettings') chartSettings: any;

  chartInputs = {
    symbol: '',
    categories: [],
    lines_series: [],
    columns_series: [],
    flags_series: [],
    yAxes: [],
  };
  chartHeight = 'height: 300px';

  constructor() { }

  ngOnInit(): void {
    if (this.chartData != null) {
      this.setChartData(this.chartData);
    }
  }

  setChartData(chartData) {
    this.getSeriesTemplateAndYAxes(this.chartSettings);
    this.fillSeriesWithData(this.chartInputs, this.chartData, this.chartSettings);
    this.setChartWithOptions(this.chartInputs);
  }

  getSeriesTemplateAndYAxes(chartSettings) {
    let series = chartSettings['series'];
    for (let ser of series) {
      if (ser['type'] == 'line') {
        this.chartInputs.lines_series.push(this.getLineSeriesTemplate(ser));
      }
      if (ser['type'] == 'column') {
        this.chartInputs.columns_series.push(this.getColumnSeriesTemplate(ser));
      }
      this.updateYAxes(ser);
    }

    this.chartInputs.flags_series.push(this.getBuyFlagSeriesTemplate(chartSettings['buy_flag_series']));
    this.chartInputs.flags_series.push(this.getSellFlagSeriesTemplate(chartSettings['sell_flag_series']));
  }

  getLineSeriesTemplate(line) {
    return {
      id: line['id'],
      name: line['name'],
      yAxis: line['yAxis'],
      type: 'line',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillOpacity: 0.8,
      marker: { enabled: false },
      tooltip: { valueDecimals: 4 },
      zIndex: 1, // Layering Order
      color: line['color'] ? line['color'] : undefined,
    };
  }

  getColumnSeriesTemplate(col) {
    return {
      id: col['id'],
      name: col['name'],
      yAxis: col['yAxis'],
      type: 'column',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillOpacity: 0.8,
      marker: { enabled: false },
      color: '#802000',
      tooltip: { valueDecimals: 4 },
      zIndex: 0, // Layering Order
    }
  }

  getBuyFlagSeriesTemplate(flag){
    return {
      id: flag['id'],
      name: flag['name'],
      type: 'flags',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillColor: 'rgba(21, 203, 36, 0.05)',
      y: -50,
      onSeries: this.chartInputs.lines_series[0].id, // On 'Close Price' line
      shape: 'squarepin',
      color: '#15CB24',
      showInLegend: false,
      clip: false,
    }
  }

  getSellFlagSeriesTemplate(flag){
    return {
      id: flag['id'],
      name: flag['name'],
      type: 'flags',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillColor: 'rgba(203, 21, 21, 0.05)',
      y: 30,
      onSeries: this.chartInputs.lines_series[0].id, // On 'Close Price' line
      shape: 'squarepin',
      color: '#CB1515',
      showInLegend: false,
      clip: false,
    }
  }

  updateYAxes(line) {
     let pane = line['pane'];
     let yAxis = line['yAxis'];
     if(!this.chartInputs.yAxes[yAxis]) {
       this.chartInputs.yAxes.push(this.getYAxisSettings(line, yAxis, pane));
       this.chartHeight = 'height: ' + (35 + (pane + 1) * 210 + 127).toString() + 'px';
     }
  }

  getYAxisSettings(line, yAxis, pane) {
    return  {
      title: { text: line['yAixsTitle'] ? line['yAixsTitle'] : line['name'], offset: 0, x: line['opposite']? 25: -35 },
      labels: { offset: 0, x: line['opposite']? 5 :-5},
      top: 35 + pane * 210,    // Position from top
      height: 200, // Height of the pane
      offset: 0,
      lineWidth: 2,
      tickPositions: line['tickPositions']? line['tickPositions']: undefined, // Limits and Ticks
      tickPositioner: line['tickPositioner']? line['tickPositioner']: undefined, // Limits and Ticks
      opposite: line['opposite']  // If true, Y-Axis on right side
    }
  }

  fillSeriesWithData(chartInputs, chartData, chartSettings) {
    // FILL SERIES TEMPLATES DATA POINTS FROM 'chartData' OBJECT ARRAY
    let k = 0;
    let buy_operator = chartSettings.buy_flag_series['selected_condition'];
    let sell_operator = chartSettings.sell_flag_series['selected_condition'];
    for (let rowObj of chartData) {
      // For each row object of dataframe

      chartInputs.categories.push(Date.parse(rowObj[chartSettings.categoryLine])); // Fill X-Axis Series Customized Points

      for (let line_series of chartInputs.lines_series) {
        // Fill Y-Axis 'Lines' Series
        let pointValue = rowObj[line_series['id']];
        line_series['data'].push({ y: pointValue });
      }

      for (let column_series of chartInputs.columns_series) {
        // Fill Y-Axis 'Columns' Series
        let pointValue = rowObj[column_series['id']];
        let pointColor = pointValue > 0 ? 'rgb(51, 157, 51)' : 'rgba(255, 0, 0, 0.9)';

        let point = { y: pointValue, color: pointColor };
        column_series['data'].push(point);
      }

      let buy_score = rowObj[chartSettings.buy_flag_series.id]; // Fill Y-Axis 'Flags' Series - BUY
      if(buy_operator == 'and') {
        if (buy_score == 1) {
          chartInputs.flags_series[0]['data'].push({ x: k, title: 'B' }); // Note Index 0
        }
      } else {
        if (buy_score > 0) {
          chartInputs.flags_series[0]['data'].push({ x: k, title: 'B' }); // Note Index 0
        }
      }
      

      let sell_score = rowObj[chartSettings.sell_flag_series.id]; // Fill Y-Axis 'Flags' Series - SELL
      if(sell_operator == 'and') {
        if (sell_score == 1) {
          chartInputs.flags_series[1]['data'].push({ x: k, title: 'S' }); // Note Index 0
        }
      } else {
        if (sell_score > 0) {
          chartInputs.flags_series[1]['data'].push({ x: k, title: 'S' }); // Note Index 0
        }
      }
      

      k = k + 1;
    }
  }

  setChartWithOptions(chartInputs) {
    this.options = {
      chart: { backgroundColor: 'transparent' },
      exporting: { enabled: false },
      credits: { enabled: false },
      title: { text: this.chartSettings.chartTitle ? this.chartSettings.chartTitle : 'Strategy Builder'},
      subtitle: { text: '', x: 200 },
      xAxis: { 
        type: 'datetime', 
        categories: chartInputs.categories, 
        labels: { 
          format: '{value:%b %d, %Y}', 
          enabled: true ,
        } 
      },
      yAxis: chartInputs['yAxes'],

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

      series: chartInputs.lines_series.concat(chartInputs.columns_series, chartInputs.flags_series),
    };

    this.chart = new Chart(this.options);
  }

}
