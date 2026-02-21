import {
  Component,
  OnInit,
  Input,
  SimpleChanges,
  SimpleChange,
  Output,
  EventEmitter,
} from '@angular/core';
import { LiveService } from '../../services/live.service';
import { ChartUtils } from '../../utils/chart.utils';
import { Subject } from 'rxjs';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css'],
})
export class LineChartComponent implements OnInit {
  options;
  chartData;
  @Input() symbols;
  @Input() portfolio;
  @Input() changing: Subject<boolean>;
  @Input() dataTable;
  @Input() barClass = 'chart';
  @Input() yAxisText = 'Price Change (%)';
  @Input() period = '1year';
  @Input() yAxisMin;
  @Input() yAxisMax;
  type = 'symbols';
  @Output() public onPeriodChanged = new EventEmitter();
  @Output() public symbolClicked = new EventEmitter();
  loading = true;
  text = '';
  lineChart: Chart;
  @Input() isPeriodBarVisible = true;
  @Input() inputPlotBands;
  @Input() isOneSymbolPriceData = false;
  @Input() chartHeight;

  constructor(private liveService: LiveService) {}

  ngOnChanges(changes: SimpleChanges) {
    this.options = {};
    this.options.title = 'No data';
    this.loading = true;
    this.text = 'Data Loading....';
    if (changes.symbols != null) {
      this.type = 'symbols';

      if (this.symbols != null && this.symbols.length > 0) {
        this.symbolsRequest();
      } else if (changes.symbols.currentValue === undefined) {
      } else {
        this.text = 'No Data';
      }
    } else if (changes.portfolio != null && this.portfolio != null && this.portfolio != 0) {
      this.loading = true;
      this.type = 'portfolio';
      this.portfolioRequest();
    } else if (changes.dataTable != null && this.dataTable != null) {
      this.type = 'datatable';
      let chartData = ChartUtils.getAllSeriesData(
        this.dataTable['data'],
        this.dataTable['series'],
        this.dataTable['categoryColumn'],
        false,
      );
      this.chartData = chartData;
      if (this.dataTable.yAxes) this.chartData['yAxes'] = this.dataTable.yAxes;
      this.setData();
    } else {
      this.text = '';
    }
  }

  periodChanged(event) {
    this.period = event;
    if (this.type == 'symbols') {
      this.symbolsRequest();
    } else if (this.type == 'portfolio') {
      this.portfolioRequest();
    }
    this.onPeriodChanged.emit(this.period);
  }

  portfolioRequest() {
    this.liveService
      .postRequest('/userPortfolio/historical', {
        portfolio: this.portfolio,
        period: this.period,
      })
      .subscribe(res => this.createDataForSymbols(res));
  }

  symbolsRequest() {
    let allSymbols = Object.assign([], this.symbols);
    if (!this.isOneSymbolPriceData) {
      allSymbols.push('^GSPC');
    }
    let symbolsJoined = allSymbols.join(',');
    let url = '/symbol/historical';
    if (this.isOneSymbolPriceData) {
      url = '/symbol/historicalprice';
    }
    this.liveService
      .postRequest(url, {
        symbols: symbolsJoined,
        period: this.period,
      })
      .subscribe(res => this.createDataForSymbols(res));
  }

  createDataForSymbols(data) {
    if (data.length < 2) {
      this.text = 'No Data';
      return;
    }
    let allSymbols = [];
    for (let row of data) {
      let keys = Object.keys(row);
      for (let key of keys) {
        if (key != 'date') {
          if (allSymbols.lastIndexOf(key) == -1) {
            allSymbols.push(key);
          }
        }
      }
    }

    let series = [];
    for (let symbol of allSymbols) {
      let temp1 = { name: symbol, data: [], color: '', lineWidth: 2, marker: { enabled: false } };
      if (allSymbols.length == 2) {
        temp1.color = 'green';
      }
      if (symbol == 'S&P500' || symbol == 'SPY' || symbol.includes('Index')) {
        temp1.color = 'gray';
      }
      series.push(temp1);
    }

    let dataTable = { data: data, series: series, categoryColumn: 'date' };
    let chartData = ChartUtils.getAllSeriesData(
      dataTable['data'],
      dataTable['series'],
      dataTable['categoryColumn'],
      false,
    );
    this.chartData = chartData;
    this.setData();
  }

  setData() {
    this.chartData.categories = this.chartData.categories.map(d => Date.parse(d));
    this.loading = false;
    // set chart
    this.options = {
      legend: {
        symbolHeight: 12,
        symbolWidth: 12,
        symbolRadius: 1,
        itemHiddenStyle: {
          color: 'lightgrey',
        },
      },
      chart: {
        backgroundColor: 'transparent',
        events: {
          load: function (event) {
            event.target.reflow();
            window.dispatchEvent(new Event('resize'));
          },
        },
        height:
          this.chartHeight && this.chartHeight === 'proportional'
            ? (10 / 16) * 100 + '%'
            : this.chartHeight,
      },
      exporting: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
      title: {
        text: '',
        x: -200, //center
      },
      subtitle: {
        text: '',
        x: 200,
      },
      xAxis: {
        type: 'datetime',
        categories: this.chartData.categories,
        labels: {
          format: '{value:%b %d, %Y}',
        },
        tickWidth: 1, // ticks are hidden by default in the new highcharts
        tickLength: 8,
        tickmarkPlacement: 'on', // default is between, which does not look nice foe line chart
        tickPositioner: function () {
          var positions = [],
            tick = Math.floor(this.dataMin),
            tickAmount = this.width / 40,
            increment = Math.ceil((this.dataMax - this.dataMin) / tickAmount);

          if (this.dataMax !== null && this.dataMin !== null) {
            for (tick; tick <= this.dataMax; tick += increment) {
              positions.push(tick);
            }
            if (!positions.includes(this.dataMax)) {
              if (this.dataMax - positions[positions.length - 1] < increment / 3) {
                positions[positions.length - 1] = this.dataMax;
              } else {
                positions.push(this.dataMax);
              }
            }
          }
          return positions;
        },
      },
      yAxis: this.chartData.yAxes
        ? this.chartData.yAxes
        : {
            title: {
              text: this.yAxisText,
            },
            plotLines: [
              {
                value: 0,
                width: 1,
                color: '#808080',
              },
            ],
            min: this.yAxisMin,
            max: this.yAxisMax,
            plotBands: this.inputPlotBands,
            endOnTick: false,
          },
      tooltip: {
        shared: true,
      },
      plotOptions: {
        series: {
          point: {
            events: {
              click: this.onSymbolClick.bind(this),
            },
          },
          connectNulls: true,
          cursor: 'pointer',
          pointInterval: undefined,
          pointStart: undefined,
        },
      },

      series: this.chartData.series,
    };
    this.lineChart = new Chart(this.options);
  }

  ngOnInit() {
    if (this.changing) {
      this.changing.subscribe(v => {
        this.portfolioRequest();
      });
    }
  }

  onSymbolClick(event) {
    this.symbolClicked.emit({ value: event.point.category });
  }
}
