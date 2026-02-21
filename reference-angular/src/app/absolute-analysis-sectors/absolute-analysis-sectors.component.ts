import { Component, OnInit } from '@angular/core';
import { AbsoluteAnalysisService } from '../services/absolute-analysis.service';

@Component({
  selector: 'app-absolute-analysis-sectors',
  templateUrl: './absolute-analysis-sectors.component.html',
  styleUrls: ['./absolute-analysis-sectors.component.scss']
})
export class AbsoluteAnalysisSectorsComponent implements OnInit {

  constructor(private absoluteAnalysisService: AbsoluteAnalysisService) {}

  // INPUTS
  sectorSymbolsDict = {
    XLP: 'Consumer Staples',
    XLB: 'Materials',
    XLRE: 'Real Estate',
    XLE: 'Energy',
    XLU: 'Utilities',
    XLV: 'Health Care',
    XTN: 'Transportation',
    XLI: 'Industrials',
    XLK: 'Technology',
    XLF: 'Financial',
    XLY: 'Consumer Discretionary',
    XLC: 'Communication Services',
  };

  // OUTPUT FROM THE SERVER
  absAnaOutput = null;

  // DATA PRESENTATION
  absChartConfig = null;
  absHeatMapData = null;
  absHeatMapConfig = {
    xCol: 'sectorSymbol',
    yCol: 'score',
    xColName: 'sectorName',
    yColFormat: 'decimal',
    clickEventCol: 'sectorSymbol',
  };

  // Dig Sector Deeper related
  selectedSymbol = null;
  selectedChartConfig = null;
  selectedSymbolScore = 0;
  selectedSymbolScoreStyle = 'background-color: #646464;';

  ngOnInit(): void {
    this.getAbsoluteAnalyisDataAllSectors();
  }

  // DATA PREPERATION - SERVER
  getAbsoluteAnalyisDataAllSectors() {
    this.absAnaOutput = null;
    this.absoluteAnalysisService
      .getAbsoluteAnalysisForAllSectors(Object.keys(this.sectorSymbolsDict))
      .subscribe(d => this.setAbsoluteAnalysisDataAllSectors(d));
  }

  // DATA PRESENTATION
  setAbsoluteAnalysisDataAllSectors(abs_all_sectors) {
    if (abs_all_sectors && abs_all_sectors.length > 0) {
      this.absAnaOutput = abs_all_sectors;
      this.setHeatMapData(this.absAnaOutput[this.absAnaOutput.length - 1]);
      let sortedSymbols = [];
      this.absHeatMapData.forEach(element => {
        sortedSymbols.push(element['sectorSymbol']);
      });
      this.setChartData(this.absAnaOutput, sortedSymbols);
    }
  }

  setChartData(raData, sortedSymbols) {
    this.absChartConfig = {};
    for (const sym of sortedSymbols) {
      this.absChartConfig[sym] = {
        xColKey: 'date',
        yColKey1: sym,
        yColKey2: 'SPY',
        multiplier: 1,
      };
    }
  }

  setHeatMapData(lastRow) {
    this.absHeatMapData = [];
    for (let key in this.sectorSymbolsDict) {
      if (key != 'date') {
        this.absHeatMapData.push({
          sectorSymbol: key,
          sectorName: this.sectorSymbolsDict[key],
          score: lastRow[key + '_score'],
        });
      }
    }
    this.absHeatMapData.sort((a, b) => a['score'] - b['score']);
  }

  handleHeatMapSymbolClick(event) {
    this.selectedSymbol = { symbol: event.value, name: this.sectorSymbolsDict[event.value] };
    this.selectedChartConfig = this.absChartConfig[this.selectedSymbol.symbol];
    this.selectedSymbolScore = event.score;
    this.selectedSymbolScoreStyle = this.getScoreStyle(this.selectedSymbolScore);
  }

  getScoreStyle(score) {
    let style = 'background-color: ';
    if (score <= -0.75) {
      style = style + 'green;';
    } else if (score > -0.75 && score <= -0.25) {
      style = style + '#80dd91;';
    } else if (score >= 0.25 && score < 0.75) {
      style = style + '#f57656;';
    } else if (score >= 0.75) {
      style = style + '#b82a1f;';
    } else {
      style = style + '#646464;';
    }

    return style;
  }

}
