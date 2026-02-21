import { Component, OnInit ,Input, OnChanges, SimpleChanges, SimpleChange} from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-stocks-gauge',
  templateUrl: './stocks-gauge.component.html',
  styleUrls: ['./stocks-gauge.component.css']
})
export class StocksGaugeComponent implements OnInit {
  @Input() valueGauge=5;
  @Input() valueText='Neutral';
  @Input() minValue= 0;
  @Input() maxValue= 100;
  @Input() gaugeWidth=180;
  @Input() gaugeClass="chart-gauge";
  @Input() gaugeType="rating";
  @Input() annotations =[];
  @Input() yLabelPosition = 5;
  @Input() yAxisLabelPosition = 16;
  @Input() valueTextPostion = -70;
  options: Object ;
  guageChart: Chart;


  @Input() stops= [
        [0.1, '#DF5353'], // red
        [0.5, '#DDDF0D'], // yellow
        [0.9, '#55BF3B'] // green
   ];

  constructor() {
  }

  ngOnInit() {
     this.ngOnChanges(null);
  }

  ngOnChanges(changes: SimpleChanges) {

    if(changes ==null) {
        return ;
    }

    if(this.gaugeType =="rsi") {
        this.stops= [
            [0.4, '#55BF3B'], // green
            [0.5, '#DDDF0D'], // yellow
            [0.9, '#DF5353'] // red
        ];
     }

    this.options = {
        chart: { type: 'solidgauge' },
        title: 'My Gauge',
        pane: {
            center: ['50%', '85%'],
            size: '100%',
            startAngle: -90,
            endAngle: 90,
            background: {
                innerRadius: '60%',
                outerRadius: '100%',
                shape: 'arc'
            }
        },
        credits: { enabled: false },
        tooltip: { enabled: false },

        // the value axis
        yAxis: {
            stops: this.stops,
            lineWidth: 0,
            minorTickInterval: null,
            tickAmount: 2,
            title: {
                y: this.valueTextPostion,
                text: this.valueText,
                style: {
                    fontSize: '1.5em'
                }
            },
            labels: { y: this.yAxisLabelPosition },
            min: +this.minValue,  // Convert to Number
            max: +this.maxValue   // Convert to Number
        },

        annotations: this.annotations,

        plotOptions: {
            solidgauge: {
                dataLabels: {
                    y: this.yLabelPosition,
                    borderWidth: 0,
                    useHTML: true
                }
            }
        },
        exporting: { enabled: false },
        series: [{
            name: 'RSI',
            data: [{ "y": this.valueGauge, "color": this.valueText} ],
            dataLabels: {
                format: '<div style="text-align:center"><span style="font-size:16px;color:' +
                    ( 'black') + '">{y}</span><br/>' +'<span style="font-size:8px;color:silver"></span></div>'
            },
            tooltip: {
                valueSuffix: ' km/h'
            }
        }]
    };

    this.guageChart = new Chart(this.options);
  }

  getLabel(y){
    return '<div style="text-align:center"><span style="font-size:16px;color:' +
        ( 'black') + '">{y}</span><br/>' + '<span style="font-size:8px;color:silver">{{text}}</span></div>'
  }

}
