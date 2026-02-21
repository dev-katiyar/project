import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-relative-analysis-heatmap',
  templateUrl: './relative-analysis-heatmap.component.html',
  styleUrls: ['./relative-analysis-heatmap.component.scss'],
})
export class RelativeAnalysisHeatmapComponent implements OnInit {
  constructor() {}

  @Input() dataArray = [];
  @Input() seriesConfig: {
    xCol: any;
    xColName: any;
    yCol: any;
    yColFormat: any;
    clickEventCol: any;
  };
  @Output() public symbolClicked = new EventEmitter();
  selectedSymbol: any;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    // if (this.dataArray && this.seriesConfig) {
    //   let sortByCol = this.seriesConfig.yCol;
    //   this.dataArray.sort((a, b) => (a[sortByCol] > b[sortByCol] ? 1 : -1));
    // }
  }

  getHeatCls(chgField) {
    let classes = {
      'heat-green': chgField <= -0.75,
      'heat-light-green': chgField > -0.75 && chgField <= -0.25,
      'heat-grey': chgField > -0.25 && chgField < 0.25,
      'heat-light-red': chgField >= 0.25 && chgField < 0.75,
      'heat-red': chgField >= 0.75,
    };
    return classes;
  }

  getTooltipText(row) {
    let score = row[this.seriesConfig.yCol];
    let toottip = row[this.seriesConfig.xCol];
    if (score <= -0.75) {
      toottip = toottip + ' very oversold against SPY';
    } else if (score > -0.75 && score <= -0.25) {
      toottip = toottip + ' moderately oversold against SPY';
    } else if (score > -0.25 && score < 0.25) {
      toottip = toottip + ' neutral against SPY';
    } else if (score >= 0.25 && score < 0.75) {
      toottip = toottip + ' moderately overbought against SPY';
    } else if (score >= 0.75) {
      toottip = toottip + ' very overbought against SPY';
    }

    return toottip;
  }

  getDisplayData(row) {
    return (
      '<div class="heatX">' +
      row[this.seriesConfig.xColName] +
      ' (' +
      row[this.seriesConfig.xCol] +
      ')' +
      '</div>' +
      '<div class="heatY">' +
      this.getFormattedY(row) +
      '</div>'
    );
  }

  getFormattedY(row) {
    let value = row[this.seriesConfig.yCol];
    if (value == undefined) return NaN;
    return value.toFixed(2).toString();
  }

  symbolClick(row) {
    this.selectedSymbol = row[this.seriesConfig.clickEventCol];
    this.symbolClicked.emit({
      value: this.selectedSymbol,
      score: row[this.seriesConfig.yCol],
    });
  }
}
