import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { SymbolPopupService } from '../symbol-popup.service';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-factor-analysis-view',
  templateUrl: './factor-analysis-view.component.html',
  styleUrls: ['./factor-analysis-view.component.scss'],
})
export class FactorAnalysisViewComponent implements OnInit {
  // gets dict of symbols, its type code and name of the Dict
  @Input() selectedSymbolDictType: any;
  selectedSymbolsDict = {}; // for quick access of symbol dict
  selectedSymbolsArr = []; // for quick access of symbols array

  // holds the response data
  resFactorAnalysis: any;
  loadingMessage = '';

  // Relative to SPY Excess return related
  lookBackPeriods = [5, 20, 20, 20, 60, 60, 60];
  lookBackPeriodsStr = this.lookBackPeriods.join(',');
  editingLookBackPeriods: boolean = true;
  editingLookBackPeriodsErr: string = '';
  relPerformanceCols = [];
  relPerfMin: number;
  relPerfMax: number;

  // Correlation between excess return related
  corrPeriods = [252, 126, 21];
  selectedCorrPeriod = this.corrPeriods[0];
  corrPeriodsStr = this.corrPeriods.join(',');
  editingCorrPeriods: boolean = false;
  editingCorrPeriodsErr: string = '';
  corrDataDict = {};
  selectedCorrDataArr;
  corrMin = -1;
  corrMax = 1;

  // Scores and Rank related
  referncePeriod = 252; // fixed for now
  scorePeriods = [21, 63, 252];
  selectedScorePeriod = this.scorePeriods[0];
  scoreRankDataArr = []; // hold formatted data for table
  scoreRankFields; // to show buttons, dynamically filled each time
  selectedScoreRankField; // selected data
  scoreFieldTypes = [
    { name: 'z-Score', key: 'zscore' },
    { name: '%tile Rank', key: 'rank' },
    // { name: 'Correlation', key: 'corr' },
  ];
  selectedFiledType = this.scoreFieldTypes[0]['key'];
  correlationThreshold = -0.6;
  correlationLessThan: 'less' | 'more' = 'less';
  scoreRankFilteredArr = [];

  // chrart related
  isChartVisible = false;
  zScorePairData;
  chartConfig = {
    height: 400,
    showLegend: true,
    dataLabelsEnabled: false,
    yAxes: [
      {
        title: { text: '21D & 63D z-Score Rank' },
        labels: { format: '{value:.2f}%' },
        opposite: false,
        max: 100,
      },
      {
        title: { text: '21D - 63D Difference' },
        labels: { format: '{value:.2f}%' },
        opposite: true,
        max: 100,
        min: -100,
      },
    ],
  }; // for overall chart configs, series configs below
  seriesConfigs: any = {
    // line/column points specific settings.
    // TODO: fundamental charts have a lot in common, if later needed merged then to generic config
    Price: {
      seriesData: [],
      seriesName: '',
      xCol: 'date',
      xColName: 'Date',
      yCol: '',
      colorPos: 'green',
      colorNeg: 'lightcoral',
      colorSer: 'black',
      barOrColumn: 'line',
      // colPointWidth: this.defaultPointWidth,
      yAxis: 1,
    },
    ShortsOSRatio: {
      seriesData: [],
      seriesName: '',
      xCol: 'date',
      xColName: 'Date',
      yCol: '',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'line',
      colorSer: 'green',
      // colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
  };

  selectedSeriesConfigs;
  selectedTimePeriod = '1year';
  defaultPointWidth = 9;
  selectedPair;

  // for holding symbol info for parent component
  @Output() public etfHoldingIconClicked = new EventEmitter();
  selectedETF = null;
  @Input() isEtfView = false;

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if(changes.selectedSymbolDictType && changes.selectedSymbolDictType.currentValue && changes.selectedSymbolDictType.currentValue !== changes.selectedSymbolDictType.previousValue) {
      this.resFactorAnalysis = null;
      this.selectedSymbolsDict = this.selectedSymbolDictType['dict'];
      this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
      if(!['factor_analysis', 'factor_analysis_sector'].includes(this.selectedSymbolDictType['code'])) {
        this.loadFactorAnalysisData(true);
      } else {
        this.loadFactorAnalysisData(false);
      }
    }
  }

  loadFactorAnalysisData(isReloadLive) {
    this.resFactorAnalysis = undefined;
    this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
    let deepCopyArray = JSON.parse(JSON.stringify(this.lookBackPeriods));
    this.selectedCorrPeriod = this.corrPeriods[0];
    let postData = {
      dictType: this.selectedSymbolDictType['code'],
      tickers: this.selectedSymbolsArr,
      lookBackPeriods: deepCopyArray,
      corrPeriods: this.corrPeriods,
      zScoreInputs: { refPeriod: this.referncePeriod, scorePeriods: this.scorePeriods },
      reloadLiveData: isReloadLive,
    };

    this.loadingMessage = 'Loading Data...';
    this.liveService.postRequest('/factor-analysis/excess-returns', postData).subscribe(data => {
      this.loadingMessage = '';
      if (Object.keys(data).length === 0) {
        this.loadingMessage = 'No Data!';
      } else {
        this.resFactorAnalysis = data;
        this.getExcessReturnTableReady();
        this.getCorrelationTableReady();
        this.getScoreAndRankTableReady();
        this.getScoreAndRankFilterTableReady();
      }
    });
  }

  getExcessReturnTableReady() {
    this.relPerfMin = Infinity;
    this.relPerfMax = -Infinity;

    if (this.resFactorAnalysis) {
      this.relPerformanceCols = [];
      let excessRetData = this.resFactorAnalysis['excess_period_returns'];
      excessRetData = this.sortExcessReturnData(excessRetData);
      if (excessRetData && excessRetData.length > 0) {
        for (let key of Object.keys(excessRetData[0])) {
          if (key !== 'symbol') {
            // dynamic columns from dynamic date range fields
            const splitKeys = key.split('_');
            const headerText = splitKeys[0] + ' to ' + splitKeys[1]; // + ' (' + splitKeys[2] + ' days)';
            this.relPerformanceCols.push({ field: key, header: headerText });
            this.relPerformanceCols.sort((a, b) => (a['field'] >= b['field'] ? -1 : 1));

            let colMin = Infinity;
            let colMax = -Infinity;

            // min max from all the values for color coding
            for (let row of excessRetData) {
              const excessRet = row[key];
              if (excessRet < colMin) {
                colMin = excessRet;
              }
              if (excessRet > colMax) {
                colMax = excessRet;
              }
            }

            // color coding in advance
            for (let row of excessRetData) {
              const excessRet = row[key];
              const color = this.getColor(excessRet, colMin, colMax);
              row[key] = { value: excessRet, color: color };
            }
          }
        }
      }
    }
  }

  getCorrelationTableReady() {
    this.corrDataDict = {};
    this.selectedCorrDataArr = null;

    if (this.resFactorAnalysis) {
      const corrData = this.resFactorAnalysis['corr_matrices'];
      for (let key in corrData) {
        const corrDataValues = corrData[key];
        const corrDataArr = [];
        for (let symbol of this.selectedSymbolsArr) {
          const row = corrDataValues[symbol];
          // turn value into {value, color} object, to make color calc static
          for (let sym of this.selectedSymbolsArr) {
            const val = row[sym];
            if (sym == symbol) {
              row[sym] = { value: null, color: 'white' };
            } else {
              const color = this.getColor(val, this.corrMin, this.corrMax);
              row[sym] = { value: val, color: color };
            }
          }
          // add info cols
          row['symbol'] = symbol;
          row['name'] = this.selectedSymbolsDict[symbol];
          corrDataArr.push(row);
        }
        this.corrDataDict[key] = corrDataArr;
      }

      this.selectedCorrDataArr = this.corrDataDict[this.selectedCorrPeriod];
    }
  }

  getScoreAndRankTableReady() {
    this.resetScoreRankFields();
    this.fillScoreRankData();
    this.handleScorePeriodChange();
  }

  resetScoreRankFields() {
    this.scoreRankFields = [];
    for (let period of this.scorePeriods) {
      this.scoreRankFields.push(period.toString() + '_rank');
      this.scoreRankFields.push(period.toString() + '_zscore');
    }
    this.scoreRankDataArr = [];
  }

  fillScoreRankData() {
    if (this.resFactorAnalysis) {
      const scoreRankData = this.resFactorAnalysis['scores_rank'];
      for (let symbol of this.selectedSymbolsArr) {
        const row = scoreRankData[symbol];
        row['symbol'] = symbol;
        row['name'] = this.selectedSymbolsDict[symbol];
        this.scoreRankDataArr.push(row);
      }
    }
  }

  handleScorePeriodChange() {
    this.selectedScoreRankField =
      this.selectedScorePeriod.toString() + '_' + this.selectedFiledType;
  }

  getScoreAndRankFilterTableReady() {
    this.scoreRankFilteredArr = [];
    if (this.resFactorAnalysis) {
      const scoreRankData = this.resFactorAnalysis['scores_rank'];
      for (let rowSymbol of this.selectedSymbolsArr) {
        const row = scoreRankData[rowSymbol];
        for (let colSymbol of this.selectedSymbolsArr) {
          if (rowSymbol == colSymbol) {
            continue;
          }
          const corr = row[colSymbol]['corr'];
          if (
            (corr && this.correlationLessThan == 'less' && corr < this.correlationThreshold) ||
            (corr && this.correlationLessThan == 'more' && corr > this.correlationThreshold)
          ) {
            const rowFiltered = {
              rowSymbol: rowSymbol,
              colSymbol: colSymbol,
              '21_rank': row[colSymbol]['21_rank'],
              '63_rank': row[colSymbol]['63_rank'],
              '252_rank': row[colSymbol]['252_rank'],
              corr: corr,
            };
            this.scoreRankFilteredArr.push(rowFiltered);
          }
        }
      }
    }
    this.scoreRankFilteredArr.sort((a, b) =>
      this.correlationLessThan === 'less' ? a['corr'] - b['corr'] : b['corr'] - a['corr'],
    );
  }

  saveLookBackPeriods() {
    let newPeriodsArr = [];
    try {
      let periodsArr = this.lookBackPeriodsStr.split(',');
      if (periodsArr.length < 2 || periodsArr.length > 10) {
        throw new Error('At least 2 and at max 10 numbers needed');
      }
      for (let item of periodsArr) {
        let period = Number(item.trim());
        if (isNaN(period) || period <= 0 || period >= 100) {
          throw new Error('Non Numbers are not accepted');
        }
        newPeriodsArr.push(period);
      }
    } catch (error) {
      this.editingLookBackPeriodsErr =
        "Please format the periods with ',' and numbers only, with at least 2 numbers both less than 100";
      return;
    }

    this.lookBackPeriods = newPeriodsArr;
    this.editingLookBackPeriodsErr = '';
    // this.editingLookBackPeriods = false;
    this.handleReload();
  }

  handleReload() {
    if (!['factor_analysis', 'factor_analysis_sector'].includes(this.selectedSymbolDictType['code'])) {
      this.loadFactorAnalysisData(true);
    } else {
      this.loadFactorAnalysisData(false);
    }
  }

  editCorrPeriods() {
    this.editingCorrPeriods = true;
    this.lookBackPeriodsStr = this.lookBackPeriods.join(',');
  }

  saveCorrPeriods() {
    let newPeriodsArr = [];
    try {
      let periodsArr = this.corrPeriodsStr.split(',');
      if (periodsArr.length < 2 || periodsArr.length > 5) {
        throw new Error('More than 2 and less than 5 periods are allowed');
      }
      for (let item of periodsArr) {
        let period = Number(item.trim());
        if (isNaN(period) || period <= 0 || period >= 400) {
          throw new Error('Non Numbers and Number greater than 400 are not accepted');
        }
        newPeriodsArr.push(period);
      }
    } catch (error) {
      this.editingCorrPeriodsErr =
        "Please format beween 2 to 5 periods with ',' and numbers only all less than 400";
      return;
    }

    this.corrPeriods = newPeriodsArr;
    this.editingCorrPeriodsErr = '';
    this.editingCorrPeriods = false;
  }

  handleCorrPeriodChange(event) {
    const selectedPeriod = String(event.value);
    this.selectedCorrDataArr = this.corrDataDict[selectedPeriod];
  }

  handleLiveDataRefresh() {
    this.loadFactorAnalysisData(true);
  }

  onSymbolRowClick(row) {
    this.selectedETF = row;
    if(this.selectedETF) {
      this.etfHoldingIconClicked.emit(this.selectedETF);
    }
  }

  handleScoreClick(sym1, sym2) {
    if (sym1 == sym2) {
      return;
    }
    this.zScorePairData = null;
    this.selectedPair = [sym1, sym2];
    let postData = {
      dictType: this.selectedSymbolDictType['code'],
      tickers: this.selectedPair,
      zScoreInputs: { refPeriod: this.referncePeriod, scorePeriods: this.scorePeriods },
    };
    this.loadingMessage = 'Loading Data...';
    this.liveService
      .postRequest('/factor-analysis/pair-zscores-chart', postData)
      .subscribe(data => {
        this.loadingMessage = '';
        this.zScorePairData = data;
        for (let row of this.zScorePairData['scores']) {
          row['diff'] = row['21_rank'] - row['63_rank'];
        }
        this.selectedSeriesConfigs = [
          {
            seriesData: ['scores'],
            seriesName: '21D-63D Rank Difference',
            xCol: 'date',
            xColName: 'Date',
            yCol: 'diff',
            colorPos: 'mediumspringgreen',
            colorNeg: 'lightcoral',
            barOrColumn: 'column',
            colorSer: 'navy',
            colPointWidth: 3,
            yAxis: 1,
            showInLegend: false,
          },
          {
            seriesData: ['scores'],
            seriesName: sym1 + '/' + sym2 + ' 21 Day Rank',
            xCol: 'date',
            xColName: 'Date',
            yCol: '21_rank',
            colorPos: 'olive',
            colorNeg: 'lightcoral',
            barOrColumn: 'line',
            colorSer: 'olive',
            // colPointWidth: this.defaultPointWidth,
            yAxis: 0,
            showInLegend: true,
          },
          {
            seriesData: ['scores'],
            seriesName: sym1 + '/' + sym2 + ' 63 Day Rank',
            xCol: 'date',
            xColName: 'Date',
            yCol: '63_rank',
            colorPos: 'navy',
            colorNeg: 'lightcoral',
            barOrColumn: 'line',
            colorSer: 'navy',
            // colPointWidth: this.defaultPointWidth,
            yAxis: 0,
            showInLegend: true,
          },
        ];
        this.isChartVisible = true;
      });
  }

  handlePriceChartPeriodChange(event) {
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  getScoreStyleClass(score) {
    return score >= 1 || score <= -1 ? 'score-highlight' : '';
  }

  getPercentileStyleClass(score) {
    return score >= 80 || score <= -80 ? 'score-highlight' : '';
  }

  showHoldingsIcon(symbol) {
    // holding icon is not required in case of custom symbols
    if(this.selectedSymbolDictType &&  !['factor_analysis', 'factor_analysis_sector'].includes(this.selectedSymbolDictType['code'])) {
      return false;
    }
    // hiding holdings analysis for the symbols which do not have supported holding symbols
    return !['EEM', 'EFA', 'GDX', 'VEA'].includes(symbol);
  }

  showHoldingsColumn() {
    // holding icon is not needed in case of ETF holdings view and custom symbols
    if(this.selectedSymbolDictType && !['factor_analysis', 'factor_analysis_sector'].includes(this.selectedSymbolDictType['code'])) {
      return false;
    }

    if(this.isEtfView) {
      return false;
    }

    return true;
  }
  
  // utility functions
  getCuerrentSymbolsArray() {
    const arr = [];
    for (const [key, value] of Object.entries(this.selectedSymbolsDict)) {
      arr.push(key);
    }
    return arr;
  }

  clearAnalysisDataForCustom() {
    this.resFactorAnalysis = null;
    this.loadingMessage = "Add/Remove symbols. Click 'Calculate' once ready.";
  }

  getColor(value, min, max) {
    if (value) {
      // Define the color stops for the gradient
      var colors = [
        { value: min * 1.1, color: [255, 0, 0] }, // red
        { value: 0, color: [0, 0, 0] }, // white
        { value: max * 1.1, color: [0, 255, 0] }, // green
      ];

      // Find the two color stops that the value falls between
      var lowerColor, upperColor;
      lowerColor = colors[0];
      for (var i = 0; i < colors.length; i++) {
        if (value < colors[i].value) {
          upperColor = colors[i];
          break;
        }
        lowerColor = colors[i];
      }

      // Interpolate between the two color stops based on the value
      var t = (value - lowerColor.value) / (upperColor.value - lowerColor.value);
      var color = [
        Math.round((1 - t) * lowerColor.color[0] + t * upperColor.color[0]),
        Math.round((1 - t) * lowerColor.color[1] + t * upperColor.color[1]),
        Math.round((1 - t) * lowerColor.color[2] + t * upperColor.color[2]),
      ];

      // Return the color as an RGB string
      return 'rgb(' + color.join(',') + ')';
    }
  }

  sortExcessReturnData(excessRetData) {
    return excessRetData.sort((a, b) => {
      const indexA = this.selectedSymbolsArr.indexOf(a.symbol);
      const indexB = this.selectedSymbolsArr.indexOf(b.symbol);
      return indexA - indexB;
    });
  }
}
