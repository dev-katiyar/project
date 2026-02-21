import { Component, Input, OnInit } from '@angular/core';
import { RelativeAnalysisService } from '../services/relative-analysis.service';
import { MessageService } from 'primeng/api';
import { Chart } from 'angular-highcharts';
import { TechnicalService } from '../services/technical.service';
import { AbsoluteAnalysisService } from '../services/absolute-analysis.service';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-relative-absolute-etf',
  templateUrl: './relative-absolute-etf.component.html',
  styleUrls: ['./relative-absolute-etf.component.scss'],
})
export class RelativeAbsoluteEtfComponent implements OnInit {
  @Input() symbolData;
  dictHoldings;
  relAbsOutput;
  relAbsLatest;
  chartData;
  visibleLines;
  showAllLines = true;
  show_tail_len = 3;
  show_tail = true;
  bubbleChart: Chart;
  chartOptions;

  // PRESENTATION - Abs Line Chart
  absChartDataInputs = {
    symbol1: 'SPY',
  };
  absChartData;
  absChartConfig;

  // PRESENTATION - Abs Line Chart
  relChartDataInputs = {
    symbol1: 'XLC',
    symbol2: 'SPY',
  };
  relChartData;
  relChartConfig;

  // HOLDING HEATMAP REL ABS
  raHoldingsScore: any;
  raHoldingsData: any;
  raHoldingPairs = [];
  raHoldingChartConfigs = {};
  raSelectedPair: any;
  raSelectedChartConfig = null;

  constructor(
    private relativeAnalysisService: RelativeAnalysisService,
    private messageService: MessageService,
    private technicalService: TechnicalService,
    private absoluteAnalysisService: AbsoluteAnalysisService,
    private liveService: LiveService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit(): void {
    this.relativeAnalysisService.getEtfHoldings(this.symbolData.symbol).subscribe((data: any[]) => {
      if (data.length) {
        this.dictHoldings = {};
        for (let item of data) {
          this.dictHoldings[item['symbol']] = item;
        }

        this.getRelativeAbsoluteAnalyisDataAllSectors();
        this.loadHoldingHeatMapData();
      } else {
        this.messageService.add({
          severity: 'Alert',
          detail: 'No holdings found for ' + this.symbolData.symbol,
          life: 1000,
        });
      }
    });
  }

  loadHoldingHeatMapData() {
    this.raHoldingsScore = null;
    this.raHoldingsData = null;
    this.raSelectedChartConfig = null;
    const holdingSymbols = Object.keys(this.dictHoldings);
    holdingSymbols.unshift(this.symbolData.symbol);
    this.liveService
      .postRequest('/relative-analysis-holdings', holdingSymbols)
      .subscribe(d => this.setHeatMapData(d));
  }

  setHeatMapData(holdingRelData) {
    this.raHoldingsData = holdingRelData;
    this.prepareDataForHeatTable(this.raHoldingsData);
    this.prepareChartConfigs();
  }

  prepareDataForHeatTable(data) {
    if (data && data.length > 0) {
      const length = data.length;
      let lastRow = data[length - 1];
      let allKeys = Object.keys(lastRow);
      let specialSymbol = undefined;
      this.raHoldingPairs = [];

      let raTableData = {};

      for (let [key, value] of Object.entries(lastRow)) {
        if (key.includes('score')) {
          let [sym1, sym2] = key.split('_');
          if (!this.raHoldingPairs.includes(sym1 + '_' + sym2)) {
            this.raHoldingPairs.push(sym1 + '_' + sym2);
          }
          if (!Object.keys(raTableData).includes(sym1)) {
            raTableData[sym1] = {};
            raTableData[sym1][sym1] = 0;
          }
          if (!Object.keys(raTableData).includes(sym2)) {
            raTableData[sym2] = {};
            raTableData[sym2][sym2] = 0;
          }
          raTableData[sym1][sym2] = -value;
          raTableData[sym2][sym1] = value;
        }
      }

      // this.fundHoldingSymbols.forEach(item => {
      //   if (!allKeys.some(key => key.startsWith('item' + '_'))) {
      //     specialSymbol = item;
      //   }
      // });
      // raTableData[specialSymbol] = {};
      // for (let key of Object.keys(raTableData)) {
      //   raTableData[key][key] = 0;
      // }

      this.raHoldingsScore = raTableData;
    }
  }

  prepareChartConfigs() {
    this.raHoldingChartConfigs = {};
    for (const pair of this.raHoldingPairs) {
      const [sym1, sym2] = pair.split('_');
      this.raHoldingChartConfigs[pair] = {
        xColKey: 'date',
        yColKey1: sym1,
        yColKey2: sym2,
        multiplier: 1,
      };
      this.raHoldingChartConfigs[sym2 + '_' + sym1] = {
        xColKey: 'date',
        yColKey1: sym2,
        yColKey2: sym1,
        multiplier: -1,
      };
      this.relativeAnalysisService.addDiffColumn(this.raHoldingsData, sym1, sym2);
    }
  }

  // DATA PREPERATION - SERVER
  getRelativeAbsoluteAnalyisDataAllSectors() {
    this.relAbsOutput = null;
    this.relAbsLatest = null;
    this.chartData = [];
    this.visibleLines = [];

    this.relativeAnalysisService
      .getRelativeAbsoluteAnalysisForAllSectors({
        tickers: Object.keys(this.dictHoldings),
        tail_len: 95,
      })
      .subscribe(d => this.setRelativeAbsoluteAnalysisDataAllSectors(d));
  }

  // DATA PRESENTATION
  setRelativeAbsoluteAnalysisDataAllSectors(scores) {
    if (scores) {
      this.relAbsOutput = scores;
      this.prepareDataForTable();
      this.prepareDataForBubbleChart();
      this.createChart();
    }
  }

  prepareDataForTable() {
    // first row at index has the lastest data
    this.relAbsLatest = [];

    for (let symbol in this.relAbsOutput) {
      if(symbol in this.dictHoldings) {
        this.relAbsLatest.push({
          ...this.relAbsOutput[symbol][0],
          isInChart: false,
          name: this.dictHoldings[symbol]['name'],
          holdingPercent: this.dictHoldings[symbol]['holdingPercent'],
        });
      }
    }

    // set first two items as visible by default
    this.visibleLines = [];
    if (this.relAbsLatest?.length >= 2) {
      this.visibleLines.push(this.relAbsLatest[0].symbol);
      this.visibleLines.push(this.relAbsLatest[1].symbol);
      this.relAbsLatest[0].isInChart = true;
      this.relAbsLatest[1].isInChart = true;
    }
  }

  onChartSelectToggle(event, row) {
    if (event.checked) {
      this.visibleLines.push(row.symbol);
    } else {
      this.visibleLines = this.visibleLines.filter(item => item != row.symbol);
    }
    this.prepareDataForBubbleChart();
    this.createChart();
  }

  showAllSwitchHandler(event) {
    if (this.showAllLines) {
      // storig was to show the last time selectd lines
      for (let row of this.relAbsLatest) {
        this.visibleLines.push(row.symbol);
        row.isInChart = true;
      }
    } else {
      this.visibleLines = [];
      for (let row of this.relAbsLatest) {
        row.isInChart = false;
      }
    }
    this.prepareDataForBubbleChart();
    this.createChart();
  }

  prepareDataForBubbleChart() {
    this.chartData = [];
    // all selected symbols
    let visible_count = 2;
    for (let key of Object.keys(this.relAbsOutput)) {
      let chartLine = {
        name: key,
        data: [],
        color: '',
        lineWidth: 2,
        visible: this.visibleLines.includes(key),
        marker: { enabled: false },
      };
      const dataPoints = this.relAbsOutput[key];
      const totalLength = dataPoints.length;
      const tailLength = this.show_tail ? this.show_tail_len * 5 : 1;
      for (var i = 0; i < tailLength; i++) {
        const dataPoint = dataPoints[i];
        if (i == 0) {
          const chartPoint = {
            x: dataPoint['absolute_score'],
            y: dataPoint['relative_score'],
            name: dataPoint['date'],
            dataLabels: {
              enabled: true,
              formatter: function () {
                return '<b>' + this.series.name + '</b>: ' + this.y.toFixed(2);
              },
              // align: 'left',
              style: {
                fontWeight: 'bold',
                fontSize: '1.3em',
              },
            },
            marker: { enabled: true, radius: 5, fillColor: '#c00' },
          };
          chartLine['data'].push(chartPoint);
        } else {
          const chartPoint = {
            x: dataPoint['absolute_score'],
            y: dataPoint['relative_score'],
            name: dataPoint['date'],
          };
          chartLine['data'].push(chartPoint);
        }
      }
      this.chartData.push(chartLine);
      visible_count = visible_count - 1;
    }
  }

  createChart() {
    this.chartOptions = {
      chart: {
        type: 'line',
        plotBorderWidth: 1,
        zoomType: 'xy',
        height: 560,
      },

      credits: {
        enabled: false,
      },

      legend: {
        enabled: false,
      },

      title: {
        text: '',
        floating: true,
      },

      accessibility: {
        point: {
          valueDescriptionFormat:
            '{index}. {point.symbol}, Absolute Score: {point.x}, Relative Score: {point.y}',
        },
      },

      xAxis: {
        backgroundColor: {
          linearGradient: { x1: 0, x2: 1, y1: 1, y2: 0 },
          stops: [
            [0, 'lightgreen'], // start
            [0.5, 'lightyellow'], // middle
            [1, '#a84432'], // end
          ],
        },
        min: -1,
        max: 1,
        gridLineWidth: 1,
        title: {
          text: '<span style="color:green;"><--- Oversold</span>&nbsp&nbsp&nbsp&nbsp&nbsp<strong style="font-size:13px;">Absolute Score</strong>&nbsp&nbsp&nbsp&nbsp&nbsp<span style="color:red;">Overbought ---></span>',
          useHTML: true,
        },
        plotBands: [
          {
            // mark the weekend
            color: {
              linearGradient: { x1: 0, x2: 1, y1: 1, y2: 0 },
              stops: [
                [0, 'lightgreen'], // start
                [0.5, 'lightyellow'], // middle
                [1, '#a84432'], // end
              ],
            },
            from: -1,
            to: 1,
          },
        ],
        plotLines: [
          {
            color: 'black',
            dashStyle: 'solid',
            width: 2,
            value: 0,
            zIndex: 3,
          },
        ],
      },

      yAxis: {
        min: -1,
        max: 1,
        startOnTick: false,
        endOnTick: false,
        title: {
          text: '<span style="color:green;"><--- Oversold</span>&nbsp&nbsp&nbsp&nbsp&nbsp<strong style="font-size:13px;">Relative Score (vs SPY)</strong>&nbsp&nbsp&nbsp&nbsp&nbsp<span style="color:red;">Overbought ---></span>',
          useHTML: true,
        },
        labels: {
          format: '{value:.2f}',
        },
        maxPadding: 0.2,

        plotLines: [
          {
            color: 'black',
            dashStyle: 'solid',
            width: 2,
            value: 0,
            zIndex: 3,
          },
        ],
      },

      tooltip: {
        useHTML: true,
        headerFormat: '<table>',
        pointFormat:
          '<tr><th colspan="2"><h5>{point.name}: {series.name}</h5></th></tr>' +
          '<tr><th>Absolute Score:</th><td>{point.x}</td></tr>' +
          '<tr><th>Relative Score:</th><td>{point.y}</td></tr>',
        footerFormat: '</table>',
        followPointer: true,
      },

      plotOptions: {
        bubble: {
          maxSize: 5,
        },
      },

      series: this.chartData,
    };
    this.bubbleChart = new Chart(this.chartOptions);
  }

  onShowHideTailClick() {
    this.chartData = [];
    this.prepareDataForBubbleChart();
    this.createChart();
  }

  onTailLengthChange() {
    if (this.show_tail) {
      this.chartData = [];
      this.prepareDataForBubbleChart();
      this.createChart();
    }
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

  // Absolute Analysis Overly Panel Chart
  onSymbolAbsoluteClick(row) {
    this.absChartDataInputs['symbol1'] = row.symbol;
    this.absChartConfig = {};
    this.absChartData = null;

    this.absoluteAnalysisService
      .getAbsoluteAnalysisForSymbol(this.absChartDataInputs)
      .subscribe(d => this.setAbsoluteAnalysisData(d));
  }

  setAbsoluteAnalysisData(analysis_output) {
    this.absChartData = analysis_output;

    if (this.absChartData) {
      this.setAbsChartData();
    }
  }

  setAbsChartData() {
    this.absChartConfig = {
      xColKey: 'date',
      yColKey1: this.absChartDataInputs.symbol1,
      multiplier: 1,
    };
  }

  // Relative Analysis Overly Panel Chart
  onSymbolRelativeClick(row) {
    this.relChartDataInputs['symbol1'] = row.symbol;
    this.relChartDataInputs['symbol2'] = 'SPY';
    this.relChartConfig = {};
    this.relChartData = null;

    this.relativeAnalysisService
      .getRelativeAnalysisForPair(this.relChartDataInputs)
      .subscribe(d => this.setRelativeAnalysisData(d));
  }

  setRelativeAnalysisData(analysis_output) {
    this.relChartData = analysis_output;

    if (this.relChartData) {
      this.setRelChartData();
    }
  }

  setRelChartData() {
    this.relChartConfig = {
      xColKey: 'date',
      yColKey1: this.relChartDataInputs.symbol1,
      yColKey2: this.relChartDataInputs.symbol2,
      multiplier: 1,
    };
    this.relativeAnalysisService.addDiffColumn(
      this.relChartData,
      this.relChartDataInputs.symbol1,
      this.relChartDataInputs.symbol2,
    );
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
