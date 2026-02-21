import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-heat-chart',
  templateUrl: './heat-chart.component.html',
  styleUrls: ['./heat-chart.component.scss']
})
export class HeatChartComponent implements OnInit, OnChanges {

  constructor() { }

  @Input() dataArray: any[]; // This can be merged with seriesConfit Input, in case, we want to have series specific dataArray
  @Input() seriesConfig: {xCol: any, xColName: any, yCol: any, yColFormat: any, clickEventCol: any};

  @Output() public symbolClicked = new EventEmitter();

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.dataArray && this.seriesConfig) {
      let sortByCol = this.seriesConfig.yCol;
      this.dataArray.sort((a, b) => (a[sortByCol] > b[sortByCol]) ? -1 : 1);
    }
  }

  getHeatCls(chgField) {
    let classes = {
      'heat-green': chgField > 1.0,
      'heat-light-green': chgField > 0 && chgField <= 1.0,
      'heat-red': chgField <= -2.0,
      'heat-light-red': chgField <= -0.4 && chgField > -2.0,
      'heat-grey': chgField <= 0 && chgField > -0.4
    };
    return classes;
  }

  getDisplayData(row) {
    return  '<div class="heatX">' + row[this.seriesConfig.xCol] + '</div>' +
            '<div class="heatY">' + this.getFormattedY(row)  + '</div>';
  }

  getFormattedY(row) {
    let value = row[this.seriesConfig.yCol];
    if (!value) return NaN; 
    
    let format = this.seriesConfig.yColFormat;
    let formatter = new Intl.NumberFormat('en-US', { style: format, currency: 'USD' });
    let formattedVal = (format != 'percent')? formatter.format(value) : value? value.toFixed(2).toString()+'%': '';
    
    return formattedVal;
  }

  symbolClick(symbol) {
    this.symbolClicked.emit({
      value: symbol
    })
  }

}
