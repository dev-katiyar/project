import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { TechnicalService } from '../services/technical.service';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-stock-fundamentals',
  templateUrl: './stock-fundamentals.component.html',
  styleUrls: ['./stock-fundamentals.component.scss'],
})
export class StockFundamentalsComponent implements OnInit {
  @Input() symbol: string; // symbol for which all data to be shown
  symbolPeers = []; // list of peers from the server
  symbolFundamentals: any; // to hold raw fundamental data from the backend

  selectedData: any; // data selected based on values in the drop downs
  chartConfig = {
    height: 400,
    showLegend: false,
    dataLabelsEnabled: false,
    yAxes: [],
  }; // for overall chart configs, series configs below
  defaultPointWidth = 9;
  seriesConfigs: any = {
    // line/column points specific settings.
    // TODO: fundamental charts have a lot in common, if later needed merged then to generic config
    totalRevenue: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'Total Revenue($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalRevenue',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    grossProfit: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'Gross Profit($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'grossProfit',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    netIncome: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'Net Income($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'netIncome',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    costOfRevenue: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'Cost of Revenue($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'costOfRevenue',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    operatingIncome: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'Operating Income($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'operatingIncome',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    incomeBeforeTax: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'Income Before Tax($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'incomeBeforeTax',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    ebit: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'EBIT($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'ebit',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    ebitda: {
      seriesData: ['Financials', 'Income_Statement'],
      seriesName: 'EBITDA($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'ebitda',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    totalAssets: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Assets($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalAssets',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    totalLiab: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Liabilities($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalLiab',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    totalStockholderEquity: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Equity($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalStockholderEquity',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    shortLongTermDebtTotal: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Debt($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'shortLongTermDebtTotal',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    netDebt: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Net Debt($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'netDebt',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    netWorkingCapital: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Working Capital($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'netWorkingCapital',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    netInvestedCapital: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Invested Capital($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'netInvestedCapital',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    netTangibleAssets: {
      seriesData: ['Financials', 'Balance_Sheet'],
      seriesName: 'Tangible Assests($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'netTangibleAssets',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    endPeriodCashFlow: {
      seriesData: ['Financials', 'Cash_Flow'],
      seriesName: 'Cash($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'endPeriodCashFlow',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    capitalExpenditures: {
      seriesData: ['Financials', 'Cash_Flow'],
      seriesName: 'Capital Expense($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'capitalExpenditures',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    freeCashFlow: {
      seriesData: ['Financials', 'Cash_Flow'],
      seriesName: 'Free Cash Flow($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'freeCashFlow',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    totalCashFromFinancingActivities: {
      seriesData: ['Financials', 'Cash_Flow'],
      seriesName: 'Financing Cash Flow($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalCashFromFinancingActivities',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    totalCashflowsFromInvestingActivities: {
      seriesData: ['Financials', 'Cash_Flow'],
      seriesName: 'Investing Cash Flow($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalCashflowsFromInvestingActivities',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    totalCashFromOperatingActivities: {
      seriesData: ['Financials', 'Cash_Flow'],
      seriesName: 'Operating Cash Flow($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'totalCashFromOperatingActivities',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    outstandingShares: {
      seriesData: ['outstandingShares'],
      seriesName: 'Shares Outstanding($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'shares',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    Earnings: {
      seriesData: ['Earnings'],
      seriesName: 'EPS($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'eps',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    Dividends: {
      seriesData: ['Dividends'],
      seriesName: 'Dividends($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'div',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    Price: {
      seriesData: ['Price'],
      seriesName: 'Price($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'adjusted_close',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'green',
      colorNeg: 'lightcoral',
      colorSer: 'black',
      barOrColumn: 'line',
      // sortByCol: 'date',
      colPointWidth: this.defaultPointWidth,
      yAxis: 1,
    },
    trendCurve: {
      seriesData: ['trendCurve'],
      seriesName: 'Trend Curve($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'value',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'line',
      // sortByCol: 'date',
      colorSer: 'green',
      colPointWidth: this.defaultPointWidth,
      yAxis: 2,
    },
    Trend: {
      seriesData: ['Trend'],
      seriesName: 'Trend Line($)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'value',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'black',
      colorNeg: 'lightcoral',
      barOrColumn: 'line',
      // sortByCol: 'date',
      colorSer: 'green',
      colPointWidth: this.defaultPointWidth,
      yAxis: 0,
    },
    'Growth Trend': {
      seriesData: ['Growth Trend'],
      seriesName: 'Annualised Growth(%)',
      xCol: 'date',
      xColName: 'Date',
      yCol: 'value',
      // clickEventCol: 'Outsanding Shares',
      colorPos: 'blue',
      colorNeg: 'lightcoral',
      barOrColumn: 'line',
      // sortByCol: 'date',
      colorSer: 'green',
      colPointWidth: this.defaultPointWidth,
      yAxis: 2,
    },
  };

  selectedSeriesConfigs = this.seriesConfigs[0];
  dataSerieConfig;

  // Node Tree of Fundamental Data
  iconOnVisible = 'pi pi-chart-bar';
  treeNodes = [
    {
      label: 'Key Stats',
      expanded: true,
      selectable: false,
      children: [
        {
          label: 'Earnings(EPS)',
          data: 'Earnings',
          icon: this.iconOnVisible,
          key: 'earnings',
        },
        {
          label: 'Dividends',
          data: 'Dividends',
          icon: this.iconOnVisible,
          key: 'dividends',
        },
        {
          label: 'Outstanding Shares',
          data: 'outstandingShares',
          icon: this.iconOnVisible,
          key: 'outstandingShares',
        },
      ],
    },
    {
      label: 'Income Statement',
      expanded: false,
      selectable: false,
      children: [
        {
          label: 'Revenue',
          data: 'totalRevenue',
          icon: this.iconOnVisible,
          key: 'totalRevenue',
        },
        {
          label: 'Cost of Revenue',
          data: 'costOfRevenue',
          icon: this.iconOnVisible,
          key: 'costOfRevenue',
        },
        {
          label: 'Operating Income',
          data: 'operatingIncome',
          icon: this.iconOnVisible,
          key: 'operatingIncome',
        },
        {
          label: 'Gross Profit',
          data: 'grossProfit',
          icon: this.iconOnVisible,
          key: 'grossProfit',
        },
        {
          label: 'Net Income',
          data: 'netIncome',
          icon: this.iconOnVisible,
          key: 'netIncome',
        },
        {
          label: 'Income Before Tax',
          data: 'incomeBeforeTax',
          icon: this.iconOnVisible,
          key: 'incomeBeforeTax',
        },
        {
          label: 'EBIT',
          data: 'ebit',
          icon: this.iconOnVisible,
          key: 'ebit',
        },
        {
          label: 'EBITDA',
          data: 'ebitda',
          icon: this.iconOnVisible,
          key: 'ebitda',
        },
      ],
    },
    {
      label: 'Balance Sheet',
      expanded: false,
      selectable: false,
      children: [
        {
          label: 'Assets',
          data: 'totalAssets',
          icon: this.iconOnVisible,
          key: 'totalAssets',
        },
        {
          label: 'Liabilities',
          data: 'totalLiab',
          icon: this.iconOnVisible,
          key: 'totalLiab',
        },
        {
          label: 'Equity',
          data: 'totalStockholderEquity',
          icon: this.iconOnVisible,
          key: 'totalStockholderEquity',
        },
        {
          label: 'Debt',
          data: 'shortLongTermDebtTotal',
          icon: this.iconOnVisible,
          key: 'shortLongTermDebtTotal',
        },
        {
          label: 'Net Debt',
          data: 'netDebt',
          icon: this.iconOnVisible,
          key: 'netDebt',
        },
        {
          label: 'Working Capital',
          data: 'netWorkingCapital',
          icon: this.iconOnVisible,
          key: 'netWorkingCapital',
        },
        {
          label: 'Invested Capital',
          data: 'netInvestedCapital',
          icon: this.iconOnVisible,
          key: 'netInvestedCapital',
        },
        {
          label: 'Tangible Assests',
          data: 'netTangibleAssets',
          icon: this.iconOnVisible,
          key: 'netTangibleAssets',
        },
      ],
    },
    {
      label: 'Cash Flow',
      expanded: false,
      selectable: false,
      children: [
        {
          label: 'Operating',
          data: 'totalCashFromOperatingActivities',
          icon: this.iconOnVisible,
          key: 'totalCashFromOperatingActivities',
        },
        {
          label: 'Investing',
          data: 'totalCashflowsFromInvestingActivities',
          icon: this.iconOnVisible,
          key: 'totalCashflowsFromInvestingActivities',
        },
        {
          label: 'Financing',
          data: 'totalCashFromFinancingActivities',
          icon: this.iconOnVisible,
          key: 'totalCashFromFinancingActivities',
        },
        {
          label: 'Free Cash Flow',
          data: 'freeCashFlow',
          icon: this.iconOnVisible,
          key: 'freeCashFlow',
        },
        {
          label: 'Capital Expense',
          data: 'capitalExpenditures',
          icon: this.iconOnVisible,
          key: 'capitalExpenditures',
        },
        {
          label: 'Cash',
          data: 'endPeriodCashFlow',
          icon: this.iconOnVisible,
          key: 'endPeriodCashFlow',
        },
      ],
    },
  ];
  selectedNode = this.treeNodes[0].children[0];

  fundamentalDataCategories = [
    {
      name: 'Key Stats',
      codes: [
        { name: 'Earnings(EPS)', code: 'Earnings' },
        { name: 'Dividends', code: 'Dividends' },
        { name: 'Outstanding Shares', code: 'outstandingShares' },
      ],
    },
    {
      name: 'Income Statement',
      codes: [
        { name: 'Revenue', code: 'totalRevenue' },
        { name: 'Cost of Revenue', code: 'costOfRevenue' },
        { name: 'Operating Income', code: 'operatingIncome' },
        { name: 'Gross Profit', code: 'grossProfit' },
        { name: 'Net Income', code: 'netIncome' },
        { name: 'Income Before Tax', code: 'incomeBeforeTax' },
        { name: 'EBIT', code: 'ebit' },
        { name: 'EBITDA', code: 'ebitda' },
      ],
    },
    {
      name: 'Balance Sheet',
      codes: [
        { name: 'Assets', code: 'totalAssets' },
        { name: 'Liabilities', code: 'totalLiab' },
        { name: 'Equity', code: 'totalStockholderEquity' },
        { name: 'Debt', code: 'shortLongTermDebtTotal' },
        { name: 'Net Debt', code: 'netDebt' },
        { name: 'Working Capital', code: 'netWorkingCapital' },
        { name: 'Invested Capital', code: 'netInvestedCapital' },
        { name: 'Tangible Assests', code: 'netTangibleAssets' },
      ],
    },
    {
      name: 'Cash Flow',
      codes: [
        { name: 'Operating', code: 'totalCashFromOperatingActivities' },
        { name: 'Investing', code: 'totalCashflowsFromInvestingActivities' },
        { name: 'Financing', code: 'totalCashFromFinancingActivities' },
        { name: 'Free Cash Flow', code: 'freeCashFlow' },
        { name: 'Capital Expense', code: 'capitalExpenditures' },
        { name: 'Cash', code: 'endPeriodCashFlow' },
      ],
    },
  ];
  selectedFundamentalCategory = this.fundamentalDataCategories[0];
  selectedFundamentalDataItem = this.selectedFundamentalCategory.codes[0];

  chartDataFrequency = [
    { name: 'Quarterly', code: 'quarterly' },
    { name: 'Annual', code: 'annual' },
  ];
  selectedChartDataFrequency = this.chartDataFrequency[0];
  selectedTimePeriod = '10year';

  selectedTrendLine = undefined;
  isTrendLineVisible = false;
  isGrowthTrendCurveVisible = false;
  growthCurvePeriod = 5; // in years, used to calc annualized growth, can be exposed in the UI if needed

  startDate: string;
  periodMap = {
    '3year': 3,
    '10year': 10,
    '20year': 20,
  };

  error = '';

  //TODO:  what data to be shown filtering to be done based on the date and date range buttons, show all for now

  constructor(
    private liveService: LiveService,
    private technicalService: TechnicalService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {}

  // load each time symbol changes
  ngOnChanges(changes: SimpleChanges) {
    this.setStartDate(this.selectedTimePeriod);
    this.clearComponent();
    this.getFundamentalData();
    this.getPeerData();
  }

  getFundamentalData() {
    forkJoin({
      fundaData: this.liveService.getSymbolFinancials(this.symbol, this.selectedTimePeriod),
      priceData: this.liveService.getSymbolPriceData(this.symbol, this.selectedTimePeriod),
    }).subscribe(data => {
      this.symbolFundamentals = data.fundaData;
      this.symbolFundamentals['Price'] = data.priceData;
      if ('error' in data.fundaData) {
        this.error = 'No Fundamental data for ' + this.symbol;
      } else {
        this.error = '';
      }
      this.setDataForChart();
    });
  }

  getPeerData() {
    this.liveService.getUrlData('/peer/' + this.symbol).subscribe(d => this.setPeerSymbols(d));
  }

  setPeerSymbols(symbols) {
    this.symbolPeers = symbols;
  }

  clearComponent() {
    this.symbolFundamentals = undefined;
    this.selectedSeriesConfigs = [];
  }

  onNodeSelect(node) {
    this.selectedNode = node;
    this.setDataForChart();
  }

  onCategoryChange(event) {
    this.selectedFundamentalCategory = event.value;
    this.selectedFundamentalDataItem = this.selectedFundamentalCategory.codes[0];
    this.setDataForChart();
  }

  onDataTypeChange(event) {
    this.selectedFundamentalDataItem = event.value;
    this.setDataForChart();
  }

  onChartDataFrequencyChanged(freq) {
    this.selectedChartDataFrequency = freq;
    this.setDataForChart();
  }

  setDataForChart() {
    // 1. PRICE Series
    const priceConfig = this.seriesConfigs['Price'];

    // 2. SELECTED Fundamental Series
    this.dataSerieConfig = JSON.parse(JSON.stringify(this.seriesConfigs[this.selectedNode.data]));
    this.dataSerieConfig['seriesData'].push(this.selectedChartDataFrequency.code);

    // Chart Configs for 1. and 2. above
    this.chartConfig.yAxes = [
      { title: { text: this.dataSerieConfig.seriesName }, opposite: false },
      { title: { text: priceConfig.seriesName }, opposite: true },
    ];
    this.selectedSeriesConfigs = [this.dataSerieConfig, priceConfig];

    // 3. Add trend line
    if (this.isTrendLineVisible) {
      this.addTrend();
    }

    // 4. Add growth curve
    if (this.isGrowthTrendCurveVisible) {
      this.addGrowthTrend();
    }
  }

  onTrendLinePillClick() {
    this.isTrendLineVisible = !this.isTrendLineVisible;
    this.addTrend();
  }

  onGrowthTrendLinePillClick() {
    this.isGrowthTrendCurveVisible = !this.isGrowthTrendCurveVisible;
    this.addGrowthTrend();
  }

  onTrendLineSelected(event) {
    this.isTrendLineVisible = event;
    this.addTrend();
  }

  onGrowthTrendLineSelected(event) {
    this.isGrowthTrendCurveVisible = event;
    this.addGrowthTrend();
  }

  addTrend() {
    if (!this.isTrendLineVisible) {
      this.removeTrendLine();
    } else {
      const seriesDataKeys = this.dataSerieConfig['seriesData'];
      const yCol = this.dataSerieConfig['yCol'];
      // get data relevant to series
      let seriesDataArr = [];
      let temp = this.symbolFundamentals;
      for (let key of seriesDataKeys) {
        if (temp[key]) {
          temp = temp[key];
        }
      }
      if (temp.length < 5) {
        this.messageService.add({
          severity: 'info',
          detail: 'Not enough data for Trend Line',
          life: 1000,
        });
        return;
      }
      seriesDataArr = temp;
      let relevantPeriodDataArray = seriesDataArr.filter(item => item['date'] > this.startDate);

      let len = relevantPeriodDataArray.length;
      // need tuble for the regression lib function, TODO: move tuple logic to tech service
      const resArr = [];
      for (let i = 0; i < len; i++) {
        const currentValue = +relevantPeriodDataArray[i][yCol];
        if (!currentValue) {
          continue;
        }
        resArr.push([i, currentValue]);
      }
      // get regression
      const regressionResult = this.technicalService.getRegressionLine(resArr);
      const trendLinePoints = [];
      // add regression data
      len = resArr.length;
      regressionResult.points.forEach(point => {
        const pointIndex = point[0];
        trendLinePoints.push({
          date: relevantPeriodDataArray[pointIndex]['date'],
          value: point[1],
        });
      });
      this.symbolFundamentals['Trend'] = trendLinePoints;
      // get and add regression config
      const trendConfig = this.seriesConfigs['Trend'];
      this.selectedSeriesConfigs.push(trendConfig);
      this.selectedSeriesConfigs = JSON.parse(JSON.stringify(this.selectedSeriesConfigs));
    }
  }

  addGrowthTrend() {
    if (!this.isGrowthTrendCurveVisible) {
      this.removeGrowthTrendCurve();
    } else {
      // get the selected series keys
      const seriesDataKeys = this.dataSerieConfig['seriesData'];
      const yCol = this.dataSerieConfig['yCol'];
      // get data relevant to selected series
      let seriesDataArr = [];
      let temp = this.symbolFundamentals;
      for (let key of seriesDataKeys) {
        if (temp[key]) {
          temp = temp[key];
        }
      }
      seriesDataArr = temp.filter(item => item[yCol]); // remove null and zeros

      if (this.selectedChartDataFrequency.code === 'quarterly') {
        // get quarterly growth data arrray
        let relevantPeriodDataArray = seriesDataArr.filter(item => item['date'] > this.startDate);
        const relevantLength = relevantPeriodDataArray.length;
        const lookbackPeriods = this.growthCurvePeriod * 4 + 3;

        if (seriesDataArr.length > 5 + lookbackPeriods) {
          // relevantPeriodDataArray = seriesDataArr.slice(0, relevantLength + lookbackPeriods);
          let growthDataArray = this.getQtrlyGrowthDataArray(seriesDataArr, yCol);
          growthDataArray = growthDataArray.slice(0, relevantLength);
          this.symbolFundamentals['Growth Trend'] = growthDataArray;
          const growthTrendConfig = this.seriesConfigs['Growth Trend'];
          this.selectedSeriesConfigs.push(growthTrendConfig);
          this.selectedSeriesConfigs = JSON.parse(JSON.stringify(this.selectedSeriesConfigs));
          this.chartConfig.yAxes.push({
            title: { text: growthTrendConfig.seriesName },
            opposite: false,
          });
        } else {
          this.messageService.add({
            severity: 'info',
            detail: 'Not enough data for Growth Curve',
            life: 1000,
          });
        }
      } else {
        // get annaul growth data arrray
        let relevantPeriodDataArray = seriesDataArr.filter(item => item['date'] > this.startDate);
        const relevantLength = relevantPeriodDataArray.length;
        const lookbackPeriods = this.growthCurvePeriod;

        if (seriesDataArr.length > 5 + lookbackPeriods) {
          // relevantPeriodDataArray = seriesDataArr.slice(0, relevantLength + lookbackPeriods);
          let growthDataArray = this.getAnnualGrowthDataArray(seriesDataArr, yCol);
          growthDataArray = growthDataArray.slice(0, relevantLength);
          this.symbolFundamentals['Growth Trend'] = growthDataArray;
          const growthTrendConfig = this.seriesConfigs['Growth Trend'];
          this.selectedSeriesConfigs.push(growthTrendConfig);
          this.selectedSeriesConfigs = JSON.parse(JSON.stringify(this.selectedSeriesConfigs));
          this.chartConfig.yAxes.push({
            title: { text: growthTrendConfig.seriesName },
            opposite: false,
          });
        } else {
          this.messageService.add({
            severity: 'info',
            detail: 'Not enough data for Growth Curve',
            life: 1000,
          });
          return;
        }
      }
    }
  }

  removeTrendLine() {
    this.selectedSeriesConfigs = this.selectedSeriesConfigs.filter(
      item => item.seriesName != 'Trend Line($)',
    );
  }

  removeGrowthTrendCurve() {
    // remove serices config
    this.selectedSeriesConfigs = this.selectedSeriesConfigs.filter(
      item => item.seriesName != 'Annualised Growth(%)',
    );
    // remove yAxis
    const chartConfig = this.seriesConfigs['Growth Trend'];
    this.chartConfig.yAxes = this.chartConfig.yAxes.filter(
      item => item.title.text != 'Annualised Growth(%)',
    );
  }

  getQtrlyGrowthDataArray(dataArr, yCol) {
    const len = dataArr.length;

    const resArr = new Array(len).fill(0);
    // last 4 quarter rolling sum
    for (let i = 0; i < len - 3; i++) {
      resArr[i] = dataArr
        .slice(i, i + 4)
        .reduce((accumulator, currentValue) => accumulator + +currentValue[yCol], 0);
    }
    for (let i = 0; i < len; i++) {
      if (i < len - (this.growthCurvePeriod * 4 + 3)) {
        const currentValue = resArr[i];
        const lastYearValue = resArr[i + this.growthCurvePeriod * 4];
        if (!currentValue || !lastYearValue) {
          continue;
        }
        resArr[i] = {
          date: dataArr[i]['date'],
          value: 100 * (Math.pow(currentValue / lastYearValue, 1 / this.growthCurvePeriod) - 1),
        };
      } else {
        resArr[i] = { date: dataArr[i]['date'], value: 0 };
      }
    }
    return resArr;
  }

  getAnnualGrowthDataArray(dataArr, yCol) {
    const len = dataArr.length;
    const resArr = new Array(len).fill(0);

    for (let i = 0; i < len; i++) {
      if (i < len - this.growthCurvePeriod) {
        const currentValue = +dataArr[i][yCol];
        const lastYearValue = +dataArr[i + this.growthCurvePeriod][yCol];
        resArr[i] = {
          date: dataArr[i]['date'],
          value: 100 * (Math.pow(currentValue / lastYearValue, 1 / this.growthCurvePeriod) - 1),
        };
      } else {
        resArr[i] = { date: dataArr[i]['date'], value: 0 };
      }
    }
    return resArr;
  }

  handlePriceChartPeriodChange(period: string) {
    this.selectedTimePeriod = period;
    this.getFundamentalData();
    this.setStartDate(period);
  }

  setStartDate(period) {
    const years = this.periodMap[period];
    let startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    this.startDate = startDate.toISOString().split('T')[0];
  }
}
