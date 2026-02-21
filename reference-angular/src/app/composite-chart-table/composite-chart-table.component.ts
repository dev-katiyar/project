import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { LiveService } from '../services/live.service';
import { TechnicalService } from '../services/technical.service';

@Component({
  selector: 'app-composite-chart-table',
  templateUrl: './composite-chart-table.component.html',
  styleUrls: ['./composite-chart-table.component.scss'],
})
export class CompositeChartTableComponent implements OnInit, OnChanges {
  constructor(private liveService: LiveService, private technicalService: TechnicalService) {}

  @Input() title = '';
  @Input() symbols;
  @Input() rowsPerPage = 10;
  @Input() showChartTableDropdown = true;
  // @Input() showPerformanceChart = false;
  @Output() public symbolClicked = new EventEmitter();

  compositeChartConfig: {
    dataArray: any[];
    colsToPlot: {
      xCol: any;
      xColName: any;
      yCol: any;
      yColName: any;
      yColFormat: any;
      clickEventCol: any;
      colorPos: any;
      colorNeg: any;
      chartTypes: any[];
    }[];
  } = {
    dataArray: [],
    colsToPlot: [
      // Format can be 'decimal', 'currency', 'percent'
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'mom',
        yColName: 'Momentum',
        yColFormat: 'decimal',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'priceChangePct',
        yColName: 'Day Chg (%)',
        yColFormat: 'percent',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'mtd',
        yColName: 'MTD (%)',
        yColFormat: 'percent',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'qtd',
        yColName: 'QTD (%)',
        yColFormat: 'percent',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'ytd',
        yColName: 'YTD (%)',
        yColFormat: 'percent',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'change_oneMonth_pct',
        yColName: '1 Month (%)',
        yColFormat: 'percent',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
      {
        xCol: 'symbol',
        xColName: 'symbol',
        yCol: 'change_oneyearbeforedate_pct',
        yColName: '1 Year (%)',
        yColFormat: 'percent',
        clickEventCol: 'symbol',
        colorPos: 'mediumspringgreen',
        colorNeg: 'lightcoral',
        chartTypes: ['Bubble', 'Bar', 'Column', 'Heat Map'],
      },
    ],
  };

  dataViewTypes = ['Charts', 'Tables'];
  @Input('defaultView') selectedDataViewType = 'Tables';

  tableTypes = ['Overview', 'Technicals', 'Fundamentals', 'Performance']; //, "Performance Chart"];
  @Input('defaultTable') selectedTableType = 'Overview';

  selectedColToPlot;
  @Input('defaultCol') colToPlot = 'mom';

  bubbleChartSeriesConfig = [];
  barChartSeriesConfig = [];
  heatChartSeriesConfig;
  @Input('defaultChart') selectedChartType = 'Column';

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.symbols.currentValue) {
      this.loadSymbolsData();
    }
  }

  loadSymbolsData() {
    this.compositeChartConfig.dataArray = [];
    this.selectedColToPlot = this.compositeChartConfig.colsToPlot.find(obj => {
      return obj.yCol == this.colToPlot;
    });
    if (this.symbols.length > 0) {
      this.onSymbolClicked({ value: this.symbols[0] });
      this.liveService
        .postRequest('/symbol/fundamental_technical/NA', this.symbols.join(','))
        .subscribe(d => this.setCompositeChartDataTechnical(d));
    }
  }

  setCompositeChartDataTechnical(technicalData) {
    this.compositeChartConfig.dataArray = technicalData;
    this.loadSelectedChartWithSelectedColumn();
  }

  onViewTypeChange(event) {
    this.selectedDataViewType = event.value;
  }

  onColToPlotChange(event) {
    this.selectedColToPlot = event.value;
    this.loadSelectedChartWithSelectedColumn();
  }

  onChartTypeChanged(chartType) {
    this.selectedChartType = chartType;
    this.loadSelectedChartWithSelectedColumn();
  }

  loadSelectedChartWithSelectedColumn() {
    if (this.selectedChartType == 'Bubble') {
      // An Enum can be made
      this.getBubbleChartSeriesConfig();
    } else if (this.selectedChartType == 'Bar') {
      this.getBarChartSeriesConfig('bar');
    } else if (this.selectedChartType == 'Column') {
      this.getBarChartSeriesConfig('column');
    } else if (this.selectedChartType == 'Heat Map') {
      this.getHeatMapSeriesConfig();
    }
  }

  onTableTypeChanged(tableType) {
    this.selectedTableType = tableType;
  }

  getBubbleChartSeriesConfig() {
    this.bubbleChartSeriesConfig = [];
    this.bubbleChartSeriesConfig.push({
      // can be extended to multiple series, if needed
      seriesName: this.selectedColToPlot.yColName,
      xCol: this.selectedColToPlot.xCol,
      xColName: this.selectedColToPlot.xColName,
      yCol: this.selectedColToPlot.yCol,
      yColFormat: this.selectedColToPlot.yColFormat,
      clickEventCol: this.selectedColToPlot.clickEventCol,
      colorPos: this.selectedColToPlot.colorPos,
      colorNeg: this.selectedColToPlot.colorNeg,
    });
  }

  getBarChartSeriesConfig(barOrColumn) {
    this.barChartSeriesConfig = [];
    this.barChartSeriesConfig.push({
      // can be extended to multiple series, if needed
      seriesName: this.selectedColToPlot.yColName,
      xCol: this.selectedColToPlot.xCol,
      xColName: this.selectedColToPlot.xColName,
      yCol: this.selectedColToPlot.yCol,
      clickEventCol: this.selectedColToPlot.clickEventCol,
      colorPos: this.selectedColToPlot.colorPos,
      colorNeg: this.selectedColToPlot.colorNeg,
      barOrColumn: barOrColumn,
      sortByCol: this.selectedColToPlot.yCol, 
    });
  }

  getHeatMapSeriesConfig() {
    this.heatChartSeriesConfig = {
      xCol: this.selectedColToPlot.xCol,
      xColName: this.selectedColToPlot.xColName,
      yCol: this.selectedColToPlot.yCol,
      yColFormat: this.selectedColToPlot.yColFormat,
      clickEventCol: this.selectedColToPlot.clickEventCol,
    };
  }

  onSymbolClicked(event) {
    this.symbolClicked.emit(event);
  }
}
