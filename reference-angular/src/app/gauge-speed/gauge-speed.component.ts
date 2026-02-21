import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-gauge-speed',
  templateUrl: './gauge-speed.component.html',
  styleUrls: ['./gauge-speed.component.scss'],
})
export class GaugeSpeedComponent implements OnInit {
  @Input() minValue = 0;
  @Input() maxValue = 100;
  @Input() valueGauge = 0;
  @Input() valueText = '';
  @Input() titleText = '';
  @Input() gaugeClass = 'chart-gauge';

  options: Object;
  guageChart: Chart;

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes == null) {
      return;
    }

    this.options = {
      chart: {
        type: 'gauge',
        plotBackgroundColor: null,
        plotBackgroundImage: null,
        plotBorderWidth: 0,
        plotShadow: false,
        height: '80%',
      },

      title: {
        text: this.titleText,
      },

      pane: {
        startAngle: -90,
        endAngle: 89.9,
        background: null,
        center: ['50%', '75%'],
        size: '110%',
      },

      // the value axis
      yAxis: {
        min: this.minValue,
        max: this.maxValue,
        // tickPixelInterval: 72,
        tickPosition: 'inside',
        tickPositions: [0, 25, 40, 60, 75, 100],
        tickColor: '#FFFFFF',
        tickLength: 20,
        tickWidth: 2,
        minorTickInterval: null,
        labels: {
          distance: 20,
          style: {
            fontSize: '14px',
          },
        },
        lineWidth: 0,
        plotBands: [
          {
            from: 0,
            to: 25,
            color: '#55BF3B', // green
            thickness: 20,
          },
          {
            from: 25,
            to: 40,
            color: '#00E600', // light green
            thickness: 20,
          },
          {
            from: 40,
            to: 60,
            color: '#DDDF0D', // yellow
            thickness: 20,
          },
          {
            from: 60,
            to: 75,
            color: '#FF4D4D', // light red
            thickness: 20,
          },
          {
            from: 75,
            to: 100,
            color: '#DF5353', // red
            thickness: 20,
          },
        ],
      },

      series: [
        {
          name: 'Score',
          data: [this.valueGauge],
          tooltip: {
            valueSuffix: '',
          },
          dataLabels: {
            format: '{y}',
            borderWidth: 0,
            color: '#333333',
            style: {
              fontSize: '16px',
            },
          },
          dial: {
            radius: '80%',
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
      credits: { enabled: false },
    };

    this.guageChart = new Chart(this.options);
  }
}
