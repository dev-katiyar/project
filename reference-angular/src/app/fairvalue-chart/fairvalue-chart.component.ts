import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-fairvalue-chart',
  templateUrl: './fairvalue-chart.component.html',
  styleUrls: ['./fairvalue-chart.component.scss'],
})
export class FairvalueChartComponent implements OnInit, OnChanges {
  @Input() symbol: string = '';
  fairValueData: any;

  options: any;
  barChart: Chart;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    this.fairValueData = undefined;
    this.liveService.getFairValueForSymbol(this.symbol).subscribe(d => this.setFairValueData(d));
  }

  setFairValueData(data) {
    if (data['symbol']) {
      this.fairValueData = data;
      this.setChartData();
    } else {
      this.fairValueData = undefined;
    }
  }

  getPlotBands() {
    let underVal = this.fairValueData['fair_value'] * 0.8;
    let overVal = this.fairValueData['fair_value'] * 1.2;
    let maxVal = Math.max(this.fairValueData['fair_value'], this.fairValueData['last_price']) * 2;
    let plotBands = [
      {
        color: 'rgba(0, 255, 0, .3)',
        from: 0,
        to: underVal,
        zIndex: 3,
        label: {
          text: '20% Below Fair',
          style: { color: 'black', fontWeight: 'bold' },
          y: 145,
          rotation: 320,
          align: 'right',
        },
      },
      {
        color: 'rgba(240, 255, 0, .3)',
        from: underVal,
        to: overVal,
        label: {
          text: 'Fair',
          style: { color: 'black', fontWeight: 'bold' },
          y: 145,
          rotation: 320,
          align: 'center',
          textAlign: 'right',
        },
        zIndex: 3,
      },
      {
        color: 'rgba(255, 0, 0, .3)',
        from: overVal,
        to: maxVal,
        label: {
          text: '20% Over Fair',
          style: { color: 'black', fontWeight: 'bold' },
          y: 145,
          rotation: 320,
          align: 'left',
          textAlign: 'right',
        },
        zIndex: 3,
      },
    ];
    return plotBands;
  }

  setChartData() {
    this.options = {
      chart: {
        type: 'bar',
        height: 300,
        backgroundColor: 'rgba(10,10,10,0.05)',
        marginBottom: 100,
      },
      title: {
        text: 'Average Fair Value',
        align: 'left',
      },
      subtitle: {
        text: 'Average of Benjamin Dodd, Peter Lynch and DSM valuation methods',
        align: 'left',
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        enabled: false,
      },
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
            color: 'white',
            align: 'right',
            format:
              '<span style="font-size: 15px">{x}</span> <br/><b><span style="font-size:13px">${y}</span></b>',
          },
          borderColor: '#777777',
          borderWidth: 2,
        },
      },
      xAxis: {
        categories: ['Avg Fair Value', 'Current Price'],
        labels: {
          enabled: false,
        },
      },
      yAxis: [
        {
          plotBands: this.getPlotBands(),
          max: Math.max(this.fairValueData['fair_value'], this.fairValueData['last_price']) * 1.5,
          labels: {
            enabled: false,
          },
          title: {
            enabled: false,
          },
          gridLineWidth: 0,
        },
      ],
      series: [
        {
          data: [
            { y: this.fairValueData['fair_value'], color: 'rgba(71, 142, 44, 1)', pointWidth: 55 },
            { y: this.fairValueData['last_price'], color: 'rgba(40, 80, 46, 1)', pointWidth: 55 },
          ],
          name: 'Price',
        },
      ],
      credits: {
        enabled: false,
      },
    };
    this.barChart = new Chart(this.options);
  }
}
