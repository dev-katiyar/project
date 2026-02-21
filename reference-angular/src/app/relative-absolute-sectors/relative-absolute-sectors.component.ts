import { Component, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { MessageService } from 'primeng/api';
import { RelativeAnalysisService } from '../services/relative-analysis.service';
import { TechnicalService } from '../services/technical.service';
import { AbsoluteAnalysisService } from '../services/absolute-analysis.service';
import { SymbolPopupService } from '../symbol-popup.service';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-relative-absolute-sectors',
  templateUrl: './relative-absolute-sectors.component.html',
  styleUrls: ['./relative-absolute-sectors.component.scss'],
})
export class RelativeAbsoluteSectorsComponent implements OnInit {
  constructor(
    private relativeAnalysisService: RelativeAnalysisService,
    private messageService: MessageService,
    private liveService: LiveService,
    private technicalService: TechnicalService,
    private absoluteAnalysisService: AbsoluteAnalysisService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  // INPUTS
  symbolDictTypes = [];
  selectedSymbolDictType: any;
  selectedSymbolsArr = [];
  isEtf = true;

  // OUTPUT FROM THE SERVER
  relAbsOutput = null;

  // PRESENTATION - Tail Chart
  chartData = [];
  bubbleChart: Chart;
  chartOptions;
  newSymbol: string;
  isAddButtonDisabled: boolean = true;
  chartTitle = '';
  show_tail_len = 3;
  show_tail = true;

  visibleLines = [];
  showAllLines = true;

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

  // PRESENTATION - Table
  relAbsLatest = null;

  // ETF ANALYSIS RELATED
  selectedETF;

  helpKey = 'dyiReserachPerformanceAnalysisSectors';

  ngOnInit(): void {
    this.liveService
      .postRequest('/get-symbols', { categories: ['Sector', 'Factor'] })
      .subscribe(res => {
        if ((res['status'] = 'ok')) {
          const category_data = res['data'];
          this.symbolDictTypes = [
            {
              code: 'sectorSymbolsDict',
              name: 'Sectors',
              helpKey: 'dyiReserachPerformanceAnalysisSectors',
              dict: category_data['Sector'],
            },
            {
              code: 'facctorSymbolsDict',
              name: 'Factors',
              helpKey: 'dyiReserachPerformanceAnalysisFactors',
              dict: category_data['Factor'],
            },
          ];
          this.selectedSymbolDictType = this.symbolDictTypes[0];
          this.chartTitle =
            'Relative vs Absolute Analysis of ' + this.selectedSymbolDictType['name'];
          this.getCuerrentSymbolsArray();
          this.getRelativeAbsoluteAnalyisDataAllSectors();
        } else {
          console.error(res['data']);
        }
      });
  }

  onSymbolDictChange(symbolDict) {
    this.chartTitle = 'Relative vs Absolute Analysis of ' + this.selectedSymbolDictType['name'];
    this.isEtf = true;
    this.helpKey = this.selectedSymbolDictType['helpKey'];
    this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
    this.getRelativeAbsoluteAnalyisDataAllSectors();
  }

  // DATA PREPERATION - SERVER
  getRelativeAbsoluteAnalyisDataAllSectors() {
    this.relAbsOutput = null;
    this.relAbsLatest = null;
    this.chartData = [];
    this.visibleLines = [];
    this.relativeAnalysisService
      .getRelativeAbsoluteAnalysisForAllSectors({
        tickers: Object.keys(this.selectedSymbolDictType['dict']),
        tail_len: 95,
      })
      .subscribe(d => this.setRelativeAbsoluteAnalysisDataAllSectors(d));
  }

  // DATA PRESENTATION
  setRelativeAbsoluteAnalysisDataAllSectors(analysis_all_sectors) {
    if (analysis_all_sectors) {
      this.relAbsOutput = analysis_all_sectors;
      this.prepareDataForTable();
      this.prepareDataForBubbleChart();
      this.createChart();
    }
  }

  prepareDataForTable() {
    // first row at index has the lastest data
    this.relAbsLatest = [];

    for (let symbol in this.relAbsOutput) {
      this.relAbsLatest.push({
        ...this.relAbsOutput[symbol][0],
        isInChart: false,
        name: this.selectedSymbolDictType['dict'][symbol],
      });
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
              // x: 3,
              // verticalAlign: 'middle',
              // overflow: true,
              // crop: false,
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
      // const dataPoint = {
      //   x: this.relAbsOutput[key + '_score'], // absolute score
      //   y: this.relAbsOutput[key + '_SPY_score'], // relative score
      //   z: 0, // can be some number, maybe average of x and y
      //   symbol: key,
      //   name: this.selectedSymbolDictType["dict"][key],
      // };
      // this.addPointToChartData(dataPoint);
    }

    // // SPY - unique case
    // const spyDataPoint = {
    //   x: this.relAbsOutput['SPY_score'],
    //   y: 0,
    //   z: 0,
    //   symbol: 'SPY',
    //   name: 'S&P 500',
    // };
    // this.addPointToChartData(spyDataPoint);
  }

  addPointToChartData(dataPoint) {
    this.chartData.push(dataPoint);
  }

  createChart() {
    this.chartOptions = {
      chart: {
        type: 'line',
        plotBorderWidth: 1,
        zoomType: 'xy',
        height: 560,
        // width: 700,
      },

      credits: {
        enabled: false,
      },

      legend: {
        enabled: false,
        // align: 'center',
        // verticalAlign: 'top',
        // layout: 'horizontal',
      },

      title: {
        text: '',
        floating: true,
      },

      // subtitle: {
      //   text: '(Relative Scores are vs SPY. Click symbols to show/hide. Drag select to zoom.)',
      // },

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
        // labels: {
        //   format: '{value:.2f}',
        // },
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
            // label: {
            //   rotation: 0,
            //   y: 15,
            //   style: {
            //     fontStyle: 'italic',
            //   },
            //   text: 'Very Overbought (> 0.75)',
            // },
            zIndex: 3,
          },
          // {
          //   color: 'black',
          //   dashStyle: 'dot',
          //   width: 2,
          //   value: -0.75,
          //   label: {
          //     rotation: 0,
          //     y: 15,
          //     style: {
          //       fontStyle: 'italic',
          //     },
          //     text: 'Very Oversold (< -0.75)',
          //   },
          //   zIndex: 3,
          // },
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
            // label: {
            //   align: 'right',
            //   style: {
            //     fontStyle: 'italic',
            //   },
            //   text: 'Very Overbought (> 0.75)',
            //   x: -10,
            // },
            zIndex: 3,
          },
          // {
          //   color: 'black',
          //   dashStyle: 'dot',
          //   width: 2,
          //   value: -0.75,
          //   label: {
          //     align: 'right',
          //     style: {
          //       fontStyle: 'italic',
          //     },
          //     text: 'Very Oversold (< -0.75)',
          //     x: -10,
          //   },
          //   zIndex: 3,
          // },
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
        series: {
          // events: {
          //   legendItemClick: this.onLegendItemClickHandler.bind(this),
          // },
          // dataLabels: {
          //   enabled: true,
          //   format: '{point.symbol}',
          //   padding: 0,
          //   allowOverlap: true,
          //   color: 'black',
          // },
        },
      },

      series: this.chartData,
    };
    this.bubbleChart = new Chart(this.chartOptions);
  }

  // onLegendItemClickHandler(event) {
  //   const clickedSeries = event.target;
  //   if (!clickedSeries.visible) {
  //     this.visibleLines.push(clickedSeries.name);
  //   } else {
  //     this.visibleLines = this.visibleLines.filter(item => item != clickedSeries.name);
  //   }
  // }

  onSymbolSelectedHandler(event) {
    this.newSymbol = event.value;
    this.isAddButtonDisabled = false;
  }

  onSymbolAddHandler() {
    this.isAddButtonDisabled = true;
    this.relativeAnalysisService
      .getRelativeAbsoluteAnalysisForAllSectors([this.newSymbol])
      .subscribe(d => {
        if (d) {
          const newDataPoint = {
            x: d[this.newSymbol + '_score'],
            y: d[this.newSymbol + '_SPY_score'],
            z: 1,
            symbol: this.newSymbol,
            name: this.newSymbol,
            dataLabels: {
              color: 'red',
            },
          };
          this.addPointToChartData(newDataPoint);
          this.createChart();
        }
      });
  }

  getCuerrentSymbolsArray() {
    const arr = [];
    for (const [key, value] of Object.entries(this.selectedSymbolDictType['dict'])) {
      arr.push([key, value]);
    }
    return arr;
  }

  onSymbolRowClick(row) {
    this.selectedETF = row;
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

  handleCloseETFTab(event) {
    this.selectedETF = null;
  }

  // Absolute Analysis Overly Panel Chart
  onETFAbsoluteClick(row) {
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
  onETFRelativeClick(row) {
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

  showHoldingsIcon(symbol) {
    // hiding holdings analysis for the symbols which do not have supported holding symbols
    return !['EEM', 'EFA', 'GDX', 'VEA'].includes(symbol);
  }
}
