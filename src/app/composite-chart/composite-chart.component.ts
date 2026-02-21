import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-composite-chart',
  templateUrl: './composite-chart.component.html',
  styleUrls: ['./composite-chart.component.scss']
})
export class CompositeChartComponent implements OnInit, OnChanges {

  constructor() { }

  @Input() compositeChartConfig: { 
    dataArray: any[], 
    colsToPlot: {
      xCol: any,
      xColName: any,
      yCol: any,
      yColName: any,
      clickEventCol: any,
      colorPos: any, 
      colorNeg: any, 
      chartTypes: any[]
    } []
  };

  chartTypes;

  selectedColToPlot;
  selectedChartType;
  bubbleChartSeriesConfig = [];
  barChartSeriesConfig = [];
  heatChartSeriesConfig;

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.compositeChartConfig) {
      this.selectedColToPlot = this.compositeChartConfig.colsToPlot[0];
      this.chartTypes = this.compositeChartConfig.colsToPlot[0].chartTypes;
      this.selectedChartType = this.compositeChartConfig.colsToPlot[0].chartTypes[0];
      this.getBubbleChartSeriesConfig();
    }
  }

  onColToPlotChange(event) {
    this.selectedColToPlot = event.value;
    this.loadSelectedChartWithSelectedColumn();
  }

  onChartTypeChanged(chartType) {
    this.selectedChartType = chartType;
    this.loadSelectedChartWithSelectedColumn();
  }

  loadSelectedChartWithSelectedColumn() {
    if(this.selectedChartType == "Bubble"){ // An Enum can be made
      this.getBubbleChartSeriesConfig();
    } else
    if(this.selectedChartType == "Bar") {
      this.getBarChartSeriesConfig();
    } else 
    if(this.selectedChartType == "Heat Map") {
      this.getHeatMapSeriesConfig();
    }
  }

  getBubbleChartSeriesConfig() {
    this.bubbleChartSeriesConfig = [];
    this.bubbleChartSeriesConfig.push({ // can be extended to multiple series, if needed
      seriesName: this.selectedColToPlot.yColName,
      xCol: this.selectedColToPlot.xCol,
      xColName: this.selectedColToPlot.xColName,
      yCol: this.selectedColToPlot.yCol,
      clickEventCol: this.selectedColToPlot.clickEventCol,
      colorPos: this.selectedColToPlot.colorPos,
      colorNeg: this.selectedColToPlot.colorNeg
    });
  }

  getBarChartSeriesConfig() {
    this.barChartSeriesConfig = [];
    this.barChartSeriesConfig.push({  // can be extended to multiple series, if needed
      seriesName: this.selectedColToPlot.yColName, 
      xCol: this.selectedColToPlot.xCol,
      xColName: this.selectedColToPlot.xColName, 
      yCol: this.selectedColToPlot.yCol, 
      clickEventCol: this.selectedColToPlot.clickEventCol, 
      colorPos: this.selectedColToPlot.colorPos,
      colorNeg: this.selectedColToPlot.colorNeg,
      sortByCol: this.selectedColToPlot.yCol, 
    })
  }

  getHeatMapSeriesConfig() {
    this.heatChartSeriesConfig = {
      xCol: this.selectedColToPlot.xCol,
      xColName: this.selectedColToPlot.xColName,
      yCol: this.selectedColToPlot.yCol, 
      clickEventCol: this.selectedColToPlot.clickEventCol
    };
  }

}
