import { Component, OnInit,Input, SimpleChanges, SimpleChange } from '@angular/core';
import {ChartUtils} from '../../utils/chart.utils';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-chart-two-d',
  templateUrl: './chart-two-d.component.html',
  styleUrls: ['./chart-two-d.component.css']
})
export class ChartTwoDComponent implements OnInit {

  options: Object;
  @Input() chartType;
  @Input() width=400;
  @Input() xColumn ="symbol";
  @Input() yColumn ="priceChange";
  @Input() yAxisTitle="Price Change(%)";
  @Input() title="";
  @Input() technicalData:Object;
  @Input() barClass ="chart";
  twoDChart: Chart;

  constructor() {
  }

  ngOnInit() {

  }
  ngOnChanges(changes: SimpleChanges) {

      this.setData();
  }


    setData() {
        let shouldSetSeriesColors = true;
        if(this.chartType=="pie") {
            shouldSetSeriesColors =false;
        }

        if(this.technicalData !=null) {
            let chartData = ChartUtils.getSeriesData(this.technicalData,this.xColumn,this.yColumn,shouldSetSeriesColors,"color");

            if(chartData != null) {
                  let showLegends = true;
                  this.options = {
                        chart: {
                            type: this.chartType,
                            backgroundColor: 'transparent'
                        },
                        exporting: { enabled: false },
                        credits: { enabled: false },
                        title: {
                            text: '',
                            x: -200 //center
                        },
                        xAxis: {
                            categories: chartData.categories,
                            labels:{ enabled: true }
                        },
                        legend:{ enabled: false },
                        yAxis: {
                        title: {
                          text: this.yAxisTitle
                        },
                        plotLines: [{
                          value: 0,
                          width: 1,
                          color: '#808080'
                        }]
                        },
                        tooltip: {
                            formatter: function() {
                                return '<b>'+ this.point.name +'</b>: '+ this.y;
                            }
                        },
                        series: chartData.series,
                        plotOptions: {
                            pie: {
                                allowPointSelect: false,
                                cursor: 'pointer',
                                dataLabels: {
                                    enabled: showLegends,
                                    format: '<b>{point.name}</b>:{point.percentage:.1f} %'
                                },
                                showInLegend: false
                            }
                        }
                  };
                  this.twoDChart = new Chart(this.options);
            }
        }

    }

}
