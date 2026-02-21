import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-bubble-chart',
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.scss']
})
export class BubbleChartComponent implements OnInit, OnChanges {

  constructor() { }

  @Input() dataArray: any[]; // This can be merged with seriesConfit Input, in case, we want to have series specific dataArray
  dataArrayBubble: any[];
  @Input() seriesConfig: {seriesName: any, xCol: any, xColName: any, yCol: any, yColFormat: any, clickEventCol: any, colorPos: any, colorNeg: any}[];

  @Output() public symbolClicked = new EventEmitter();

  options;
  series = [];
  bubbleChart: Chart;
  maxY = 1;

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.dataArray.length > 0 && this.seriesConfig) {
      this.series = [];
      
      for (let ser of this.seriesConfig) {          // Once for each series
        this.maxY = 1;
        let tempSeries = { name: ser.seriesName, data: []};
        let formatter = new Intl.NumberFormat('en-US', { style: ser.yColFormat, currency: 'USD' })

        this.limitToTopBottom50(ser.yCol);

        for (let item of this.dataArrayBubble) {          // Once for each point in series
          let val = item[ser.yCol];
          let valAbsolute = Math.abs(val);
          this.maxY = valAbsolute > this.maxY? valAbsolute: this.maxY;
          let col = val >= 0? ser.colorPos: ser.colorNeg;
          val = (ser.yColFormat != 'percent')? formatter.format(item[ser.yCol]): val? val.toFixed(2).toString()+'%': '';
          let tempPoint = { name: item[ser.xColName], value: valAbsolute, valLabel: val, color: col, key: item[ser.clickEventCol] };
          tempSeries.data.push(tempPoint);
        }
        tempSeries["maxY"] = this.maxY;             // supports only one series, might require a relook. 
        this.series.push(tempSeries)
      }

      this.createChart(this.series);
    }
  }

  createChart(series) {
    this.options = {
      chart: {
        type: 'packedbubble',
        height: (9 / 16 * 100) + '%',
        backgroundColor: 'transparent'
      },
      title: {
        text: ''
      },
      credits: {
        enabled: false
      },
      tooltip: {
        useHTML: true,
        pointFormat: '{point.key} <b>{point.valLabel}</b>'
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        bubble: {
          sizeByAbsoluteValue: true
        },
        packedbubble: {
          minSize: '30%',
          maxSize: '180%',
          zMin: 0,
          // zMax: 1000,
          sizeBy: 'width',
          layoutAlgorithm: {
            splitSeries: false,
            gravitationalConstant: 0.02
          },
          dataLabels: {
            enabled: true,
            format: '{point.name}<br/>{point.valLabel}',
            filter: {
              property: 'value',
              operator: '>',
              value: series[0].maxY/9
            },
            style: {
              color: 'black',
              textOutline: 'none',
              fontWeight: 'normal'
            },
            useHtml: true
          }
        },
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: this.onSymbolClick.bind(this)
            }
          }
        }
      },

      series: series // arrray of series objects with name and data []
    }

    this.bubbleChart = new Chart(this.options);
  }

  onSymbolClick(event) {
    this.symbolClicked.emit({ value: event.point.key })
  }

  limitToTopBottom50(yCol) {
    if(this.dataArray.length > 52) {
      this.dataArray.sort((a, b) => (a[yCol] > b[yCol]) ? -1 : 1);
      let len = this.dataArray.length;
      this.dataArrayBubble = this.dataArray.slice(0, 25).concat(this.dataArray.slice(len-25, len));
    } else
    {
      this.dataArrayBubble = this.dataArray;
    }
  }
}
