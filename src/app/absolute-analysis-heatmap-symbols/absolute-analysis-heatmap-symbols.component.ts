import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-absolute-analysis-heatmap-symbols',
  templateUrl: './absolute-analysis-heatmap-symbols.component.html',
  styleUrls: ['./absolute-analysis-heatmap-symbols.component.scss'],
})
export class AbsoluteAnalysisHeatmapSymbolsComponent implements OnInit {
  @Input() tableData = null;
  @Output() public heatMapSymbolClicked = new EventEmitter();
  // sortedKeys = null;
  constructor() {}

  ngOnInit(): void {
    this.createTable();
  }

  createTable() {
    // if (this.tableData) {
    //   let keys = Object.keys(this.tableData);
    //   this.sortedKeys = keys.sort(
    //     (a, b) => Object.keys(this.tableData[a]).length - Object.keys(this.tableData[b]).length,
    //   );
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
    let score = row['score'];
    let toottip = row['symbol'];
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

  onHeatMapSymbolClick(row) {
    this.heatMapSymbolClicked.emit(row);
  }

  getDisplayData(row) {
    return (
      '<div class="heatX">' +
      row['name'] +
      ' (' +
      row['symbol'] +
      ')' +
      '</div>' +
      '<div class="heatY">' +
      this.getFormattedY(row) +
      '</div>'
    );
  }

  getFormattedY(row) {
    let value = row['score'];
    if (value == undefined) return NaN;
    return value.toFixed(2).toString();
  }
}
