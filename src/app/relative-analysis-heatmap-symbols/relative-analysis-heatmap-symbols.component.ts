import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TechnicalService } from '../services/technical.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-relative-analysis-heatmap-symbols',
  templateUrl: './relative-analysis-heatmap-symbols.component.html',
  styleUrls: ['./relative-analysis-heatmap-symbols.component.scss'],
})
export class RelativeAnalysisHeatmapSymbolsComponent implements OnInit {
  @Input() tableData = null;
  @Input() symbolsDict = null;
  @Input() raHoldingsData = null;
  @Input() raHoldingChartConfigs = {};
  raSelectedChartConfig = null;
  sortedKeys = null;
  constructor(
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit(): void {
    this.createTable();
  }

  createTable() {
    if (this.tableData) {   
      let keys = Object.keys(this.tableData);
      this.sortedKeys = keys.sort(
        (a, b) => Object.keys(this.tableData[a]).length - Object.keys(this.tableData[b]).length,
      );
    }
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

  getTooltipText(rowKey, colKey) {
    let score = this.tableData[rowKey][colKey];
    let toottip = colKey;
    if (score <= -0.75) {
      toottip = toottip + ' very oversold against ' + rowKey;
    } else if (score > -0.75 && score <= -0.25) {
      toottip = toottip + ' moderately oversold against ' + rowKey;
    } else if (score > -0.25 && score < 0.25) {
      toottip = toottip + ' neutral against ' + rowKey;
    } else if (score >= 0.25 && score < 0.75) {
      toottip = toottip + ' moderately overbought against ' + rowKey;
    } else if (score >= 0.75) {
      toottip = toottip + ' very overbought against ' + rowKey;
    }

    return toottip;
  }

  onHeatMapPairClick(rowSym, colSym) {
    let raSelectedPair = colSym + '_' + rowSym;
    this.raSelectedChartConfig = this.raHoldingChartConfigs[raSelectedPair];
  }

  getScoreStyle(value) {
    const scoreStyle = {
      'font-size': '1rem',
      'min-width': '6rem',
      cursor: 'pointer',
    };

    let startColor;
    let endColor;

    // green
    if (value <= 0) {
      startColor = [0, 10, 0];
      endColor = [0, 255, 0];
    }

    // red
    if (value > 0) {
      startColor = [10, 0, 0];
      endColor = [255, 0, 0];
    }

    const gradColor = this.technicalService.getRGBColorPercentage(
      startColor,
      endColor,
      Math.abs(value),
    );

    scoreStyle['background-color'] = gradColor;
    return scoreStyle;
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
