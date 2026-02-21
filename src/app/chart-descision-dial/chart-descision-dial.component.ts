import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-chart-descision-dial',
  templateUrl: './chart-descision-dial.component.html',
  styleUrls: ['./chart-descision-dial.component.scss'],
})
export class ChartDescisionDialComponent implements OnInit, OnChanges {
  // default value and expedted format
  @Input() dataPoint = { y: 150, descision: 'Neutral', confidence: 50 };
  @Input() barClass = 'chart-dial-1';

  dscnChart: Chart;

  colorMap = {
    bullish: 'green',
    bearish: 'red',
    neutral: 'black',
  };

  chartConfig: any = {
    chart: {
      type: 'gauge',
      marginTop: 0,
      spacingTop: 0,
    },

    title: {
      text: null,
    },

    pane: {
      startAngle: -90,
      endAngle: 90,
      background: null,
      center: ['50%', '75%'],
      size: '100%',
    },

    // the value axis
    yAxis: {
      min: 0,
      max: 300,
      tickColor: '#FFFFFF',
      tickLength: 40,
      tickWidth: 1,
      minorTickInterval: null,
      labels: {
        enabled: false,
      },
      lineWidth: 0,
      plotBands: [
        {
          from: 0,
          to: 100,
          color: '#DF5353', // red
          thickness: 40,
          label: {
            text: 'Bearish',
            align: 'right',
            textAlign: 'right',
            y: -5,
          },
        },
        {
          from: 100,
          to: 200,
          color: '#DDDF0D', // yellow
          thickness: 40,
          label: {
            text: 'Neutral',
            align: 'right',
            y: -5,
          },
        },
        {
          from: 200,
          to: 300,
          color: '#55BF3B', // green
          thickness: 40,
          label: {
            text: 'Bullish',
            textAlign: 'center',
            y: -5,
          },
        },
      ],
    },

    series: [
      {
        name: 'Decision',
        data: [this.dataPoint],
        dataLabels: {
          //format: '{y}',
          formatter: function () {
            return this.point.descision.toUpperCase() + ' (' + Math.round(this.point.confidence) + '%)';
          },
          borderWidth: 0,
          style: {
            fontSize: '18px',
            color: this.colorMap[this.dataPoint?.descision.toLowerCase()],
          },
        },
        dial: {
          radius: '90%',
          backgroundColor: 'gray',
          baseWidth: 12,
          baseLength: '0%',
          rearLength: '0%',
        },
        pivot: {
          backgroundColor: 'gray',
          radius: 6,
        },
      },
    ],
    exporting: {
      enabled: false,
    },
    credits: {
      enabled: false,
    },
  };

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    this.chartConfig.series[0]['data'] = [this.dataPoint];
    this.chartConfig.series[0]['dataLabels']['style']['color'] = this.colorMap[this.dataPoint?.descision.toLowerCase()];
    this.dscnChart = new Chart(this.chartConfig);
  }
}
