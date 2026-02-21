import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-absolute-analysis-heatmap',
  templateUrl: './absolute-analysis-heatmap.component.html',
  styleUrls: ['./absolute-analysis-heatmap.component.scss'],
})
export class AbsoluteAnalysisHeatmapComponent implements OnInit {
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
      toottip = toottip + ' is very oversold';
    } else if (score > -0.75 && score <= -0.25) {
      toottip = toottip + ' is moderately oversold';
    } else if (score > -0.25 && score < 0.25) {
      toottip = toottip + ' is neutral';
    } else if (score >= 0.25 && score < 0.75) {
      toottip = toottip + ' is moderately overbought';
    } else if (score >= 0.75) {
      toottip = toottip + ' is very overbought';
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
