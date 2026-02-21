import { Component, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { LiveService } from '../services/live.service';
import { VisibilityType } from 'src/assets/charting_library/charting_library';

interface RegimeTimelineData {
  date: string;
  regime: string;
  confidence: string;
}

interface PortfolioData {
  date: string;
  portfolio_value: number;
  spy_value: number;
  regime: string;
}

interface PeriodOption {
  label: string;
  value: string;
}

interface Portfolio {
  id: string;
  name: string;
}

interface EtfClusterData {
  cluster_id: string;
  cluster_name: string;
  etf_count: number;
  etf_list: string[];
  description: string;
}

interface RegimeAllocationData {
  allocation_percentage: string;
  cluster_id: number;
  cluster_name: string;
  description: string;
  regime: string;
}

interface RegimeAllocations {
  [regime: string]: RegimeAllocationData[];
}

interface PortfolioConfigPerformance {
  annualizedReturn: number;
  excessAnnualizedReturn: number;
  excessTotalReturn: number;
  config: string;
  maxDrawdown: number;
  name: string;
  sharpe: number;
  totalReturn: number;
  trades: number;
  volatility: number;
}

@Component({
  selector: 'app-ai-regime-charts',
  templateUrl: './ai-regime-charts.component.html',
  styleUrls: ['./ai-regime-charts.component.scss'],
})
export class AiRegimeChartsComponent implements OnInit {
  // Charts
  regimeTimelineChart: Chart;
  portfolioPerformanceChart: Chart;

  // Data
  regimeTimelineData: RegimeTimelineData[] = [];
  portfolioData: PortfolioData[] = [];
  portfolios: Portfolio[] = [];

  // Loading states
  loadingTimeline = true;
  loadingPortfolio = true;

  // Regime color mapping
  regimeColors = {
    Bull: '#4CAF50',
    Bear: '#E91E63',
    Sideways: '#9E9E9E',
    'Risk-Off': '#2196F3',
  };

  // Regime statistics
  regimeStats: { regime: string; count: number; percentage: number; color: string }[] = [];

  // Selected date range
  selectedRangeRegimeChart: PeriodOption = { label: '3Y', value: '3year' };
  selectedRangePerfChart: PeriodOption = { label: '3Y', value: '3year' };
  dateRanges: PeriodOption[] = [
    { label: '1M', value: '1month' },
    { label: '3M', value: '3month' },
    { label: '6M', value: '6month' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1year' },
    { label: '2Y', value: '2year' },
    { label: '3Y', value: '3year' },
    // { label: '5Y', value: '5year' },
    { label: 'All', value: 'All' },
  ];

  // Current Regime
  currentRegimeChart: Chart;

  // ETF Cluster Data
  etfClusterData: EtfClusterData[] = [];
  loadingEtfClusters = false;

  // Regime Allocation Data
  regimeAllocationData: RegimeAllocations = {};
  loadingRegimeAllocations = false;
  regimePieCharts: any = {};

  // Portfolio Config Performance
  portfolioConfigPerformance: PortfolioConfigPerformance[] = [];
  loadingPortfolioConfigPerformance = false;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.liveService.getUrlData('/ai_regimes_portfolios').subscribe({
      next: (data: Portfolio[]) => {
        this.portfolios = data || [];
        // console.log('Loaded portfolios:', this.portfolios);
        this.loadRegimeTimeline();
        this.loadPortfolioPerformance();
        this.loadEtfClusterData();
        this.loadRegimeAllocationData();
        this.loadPortfolioConfigPerformance();
      },
      error: err => {
        console.error('Error loading portfolios:', err);
      },
    });
  }

  loadRegimeTimeline(): void {
    this.loadingTimeline = true;
    this.liveService.getUrlData('/ai_regimes_timeline').subscribe({
      next: (data: any) => {
        this.regimeTimelineData = data || [];
        this.calculateRegimeStats();
        this.buildRegimeTimelineChart();
        this.buildCurrentRegimeChart();
        this.loadingTimeline = false;
      },
      error: err => {
        console.error('Error loading regime timeline:', err);
        this.loadingTimeline = false;
      },
    });
  }

  loadPortfolioPerformance(): void {
    this.loadingPortfolio = true;
    this.liveService.getUrlData('/ai_regimes_backtest_portfolio_values').subscribe({
      next: (data: any) => {
        this.portfolioData = data || [];
        this.buildPortfolioPerformanceChart();
        this.loadingPortfolio = false;
      },
      error: err => {
        console.error('Error loading portfolio data:', err);
        this.loadingPortfolio = false;
      },
    });
  }

  loadEtfClusterData(): void {
    this.loadingEtfClusters = true;
    this.liveService.getUrlData('/ai_regimes_etf_clusters').subscribe({
      next: (data: EtfClusterData[]) => {
        this.etfClusterData = data || [];
        // console.log('Loaded ETF cluster data:', this.etfClusterData);
        this.loadingEtfClusters = false;
      },
      error: err => {
        console.error('Error loading ETF cluster data:', err);
        this.loadingEtfClusters = false;
      },
    });
  }

  loadRegimeAllocationData(): void {
    this.loadingRegimeAllocations = true;
    this.liveService.getUrlData('/ai_regime_allocations').subscribe({
      next: (data: RegimeAllocations) => {
        this.regimeAllocationData = data || {};
        // console.log('Loaded regime allocation data:', this.regimeAllocationData);
        this.buildRegimePieCharts();
        this.loadingRegimeAllocations = false;
      },
      error: err => {
        console.error('Error loading regime allocation data:', err);
        this.loadingRegimeAllocations = false;
      },
    });
  }

  loadPortfolioConfigPerformance(): void {
    this.loadingPortfolioConfigPerformance = true;
    this.liveService.getUrlData('/ai_regime_performance_comparison').subscribe({
      next: (data: PortfolioConfigPerformance[]) => {
        this.portfolioConfigPerformance = data || [];
        if (this.portfolioConfigPerformance.length > 0) {
          // get the benchmark config performance (where config is 'benchmark')
          const benchmarkConfig = this.portfolioConfigPerformance.find(
            p => p.config.toLowerCase() === 'benchmark_spy',
          );

          // filter out the benchmark from the main list
          this.portfolioConfigPerformance = this.portfolioConfigPerformance.filter(
            p => p.config.toLowerCase() !== 'benchmark_spy',
          );

          if (benchmarkConfig) {
            // add excess return fields in each portfolio config performance
            this.portfolioConfigPerformance = this.portfolioConfigPerformance.map(p => ({
              ...p,
              excessAnnualizedReturn: p.annualizedReturn - benchmarkConfig.annualizedReturn,
              excessTotalReturn: p.totalReturn - benchmarkConfig.totalReturn,
            }));
          }
        }
        // console.log('Loaded portfolio config performance data:', this.portfolioConfigPerformance);
        this.loadingPortfolioConfigPerformance = false;
      },
      error: err => {
        console.error('Error loading portfolio config performance data:', err);
        this.loadingPortfolioConfigPerformance = false;
      },
    });
  }

  buildRegimeTimelineChart(): void {
    if (!this.regimeTimelineData || this.regimeTimelineData.length === 0) {
      return;
    }

    const filteredData = this.filterDataByRange(
      this.regimeTimelineData,
      this.selectedRangeRegimeChart.value,
    );

    // Prepare data series
    const categories: number[] = [];
    const spyData: [number, number][] = [];
    const confidenceData: [number, number][] = [];
    const regimeBands: any[] = [];

    // Get starting value for percentage calculation
    const startBenchmark = filteredData[0]?.benchmark_value || 100;

    let currentRegime = '';
    let bandStart = 0;

    filteredData.forEach((item, index) => {
      const timestamp = new Date(item.date).getTime();
      categories.push(timestamp);
      // Calculate percentage gain from start
      const percentGain = ((item.benchmark_value - startBenchmark) / startBenchmark) * 100;
      spyData.push([timestamp, percentGain]);

      // Add confidence data
      const confidence = parseFloat(item.confidence) * 100; // Convert to percentage
      confidenceData.push([timestamp, confidence]);

      // Track regime changes for plot bands
      if (item.regime !== currentRegime) {
        if (currentRegime && bandStart) {
          regimeBands.push({
            from: bandStart,
            to: timestamp,
            color: this.getRegimeColor(currentRegime, 0.2),
          });
        }
        currentRegime = item.regime;
        bandStart = timestamp;
      }

      // Handle last band
      if (index === filteredData.length - 1 && currentRegime) {
        regimeBands.push({
          from: bandStart,
          to: timestamp,
          color: this.getRegimeColor(currentRegime, 0.2),
          label: {
            text: currentRegime,
            style: { color: '#666', fontSize: '10px' },
          },
        });
      }
    });

    this.regimeTimelineChart = new Chart({
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        height: 450,
        zoomType: 'x',
      },
      title: {
        text: '',
        style: { color: '#333', fontWeight: 'bold' },
      },
      subtitle: {
        text: 'SPY Price with Regime Overlay and Confidence',
      },
      xAxis: {
        type: 'datetime',
        plotBands: regimeBands,
        labels: {
          format: '{value:%Y-%m-%d}',
          rotation: -45,
          align: 'right',
        },
      },
      yAxis: [
        {
          title: { text: 'Cumulative Return (%)' },
          labels: { format: '{value}%' },
          startOnTick: true,
          endOnTick: true,
          tickAmount: 6,
          plotLines: [
            {
              value: 0,
              color: '#666',
              width: 1,
              dashStyle: 'Dash',
            },
          ],
        },
        {
          title: { text: 'Confidence (%)' },
          labels: { format: '{value}%' },
          opposite: true,
          min: 0,
          max: 100,
        },
      ],
      legend: {
        enabled: true,
        align: 'center',
      },
      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d',
        valueDecimals: 2,
      },
      plotOptions: {
        line: {
          marker: { enabled: false },
          lineWidth: 2,
        },
        column: {
          borderWidth: 0,
          groupPadding: 1,
          pointPadding: 1,
        },
      },
      series: [
        {
          type: 'line',
          name: 'Benchmark',
          data: spyData,
          color: '#d26f19',
          lineWidth: 3,
          yAxis: 0,
          tooltip: {
            valueSuffix: '%',
          },
        },
        {
          type: 'area',
          name: 'Confidence',
          data: confidenceData,
          color: '#3b83f671',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(78, 144, 249, 0.40)'],
              [1, 'rgba(59, 130, 246, 0.05)'],
            ],
          },
          yAxis: 1,
          tooltip: {
            valueSuffix: '%',
          },
        },
      ],
      credits: { enabled: false },
    });
  }

  buildCurrentRegimeChart(): void {
    if (!this.regimeTimelineData || this.regimeTimelineData.length === 0) {
      return;
    }

    // Get the last data point
    const lastData = this.regimeTimelineData[this.regimeTimelineData.length - 1];
    const currentRegime = lastData.regime;
    const confidence = parseFloat(lastData.confidence) * 100;

    // Calculate percentages for each regime (for visual representation)
    // const regimeData = Object.keys(this.regimeColors).map(regime => ({
    //   name: regime,
    //   y: regime === currentRegime ? confidence : 0,
    //   color:
    //     regime === currentRegime ? this.regimeColors[regime] : this.getRegimeColor(regime, 0.2),
    // }));
    const regimeData = [
      { name: currentRegime, y: confidence, color: this.regimeColors[currentRegime] },
      { name: 'Others', y: 100 - confidence, color: '#E0E0E0', showInLegend: false },
    ];

    this.currentRegimeChart = new Chart({
      chart: {
        type: 'pie',
        height: 300,
        backgroundColor: 'transparent',
      },
      title: {
        text: currentRegime,
        align: 'center',
        verticalAlign: 'middle',
        y: -10,
        style: {
          fontSize: '24px',
          fontWeight: 'bold',
          color: this.regimeColors[currentRegime],
        },
      },
      subtitle: {
        text: `${confidence.toFixed(1)}% confidence`,
        align: 'center',
        verticalAlign: 'middle',
        y: 15,
        style: {
          fontSize: '14px',
          color: '#666',
        },
      },
      tooltip: {
        pointFormat: '<b>{point.percentage:.1f}%</b>',
      },
      plotOptions: {
        pie: {
          innerSize: '70%',
          dataLabels: {
            enabled: false,
          },
          // showInLegend: true,
        },
      },
      // legend: {
      //   align: 'center',
      //   verticalAlign: 'bottom',
      //   layout: 'horizontal',
      //   itemStyle: {
      //     fontSize: '11px',
      //   },
      // },
      series: [
        {
          type: 'pie',
          name: 'Regime',
          data: regimeData,
        },
      ],
      credits: {
        enabled: false,
      },
    });
  }

  buildPortfolioPerformanceChart(): void {
    if (!this.portfolioData || this.portfolioData.length === 0) {
      return;
    }

    const filteredData = this.filterDataByRange(
      this.portfolioData,
      this.selectedRangePerfChart.value,
    );

    // Prepare SPY benchmark series
    const spySeries: [number, number][] = [];
    const startSpy = filteredData[0]?.benchmark_value || 100;

    // Prepare series for each portfolio
    const portfolioSeriesMap: { [key: string]: [number, number][] } = {};
    const startValues: { [key: string]: number } = {};

    // Initialize series for each portfolio
    this.portfolios.forEach(portfolio => {
      portfolioSeriesMap[portfolio.id] = [];
      const firstValue = filteredData[0]?.[portfolio.id];
      startValues[portfolio.id] = firstValue || 100;
    });

    // Build all series data
    filteredData.forEach(item => {
      const timestamp = new Date(item.date).getTime();

      // SPY benchmark
      const spyReturn = ((item.benchmark_value - startSpy) / startSpy) * 100;
      spySeries.push([timestamp, spyReturn]);

      // Each portfolio
      this.portfolios.forEach(portfolio => {
        const portfolioValue = item[portfolio.id];
        if (portfolioValue !== undefined) {
          const portfolioReturn =
            ((portfolioValue - startValues[portfolio.id]) / startValues[portfolio.id]) * 100;
          portfolioSeriesMap[portfolio.id].push([timestamp, portfolioReturn]);
        }
      });
    });

    // Define colors for each portfolio
    const portfolioColors = ['#4CAF50', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#CDDC39'];

    // Build series array
    const series: any[] = this.portfolios.map((portfolio, index) => ({
      type: 'area',
      name: portfolio.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      data: portfolioSeriesMap[portfolio.id],
      color: portfolioColors[index % portfolioColors.length],
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, this.getRegimeColor(portfolioColors[index % portfolioColors.length], 0.3)],
          [1, this.getRegimeColor(portfolioColors[index % portfolioColors.length], 0.05)],
        ],
      },
    }));
    // Add SPY benchmark series
    series.push({
      type: 'area',
      name: 'SPY Benchmark',
      data: spySeries,
      color: '#1976D2',
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(25, 118, 210, 0.3)'],
          [1, 'rgba(25, 118, 210, 0.05)'],
        ],
      },
    });

    this.portfolioPerformanceChart = new Chart({
      chart: {
        type: 'area',
        backgroundColor: 'transparent',
        height: 450,
        zoomType: 'x',
      },
      title: {
        text: '',
        style: { color: '#333', fontWeight: 'bold' },
      },
      subtitle: {
        text: 'Cumulative Returns vs SPY Benchmark',
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%Y-%m-%d}',
          rotation: -45,
          align: 'right',
        },
      },
      yAxis: {
        title: { text: 'Cumulative Return (%)' },
        labels: { format: '{value}%' },
        plotLines: [
          {
            value: 0,
            color: '#666',
            width: 1,
            dashStyle: 'Dash',
          },
        ],
      },
      legend: {
        enabled: true,
        align: 'center',
      },
      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d',
        valueSuffix: '%',
        valueDecimals: 2,
      },
      plotOptions: {
        area: {
          marker: { enabled: false },
          lineWidth: 2,
          fillOpacity: 0.15,
        },
      },
      series: series,
      credits: { enabled: false },
    });
  }

  filterDataByRange(data: any[], range: string): any[] {
    if (!data || data.length === 0 || range === 'All') {
      return data;
    }
    const cutoffDate = this.getCutOffDate(range);
    return data.filter(item => new Date(item.date) >= cutoffDate);
  }

  getCutOffDate(range: string): Date {
    const now = new Date();
    let cutoffDate: Date;

    switch (range) {
      case 'YTD':
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '1year':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case '2year':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 2));
        break;
      case '3year':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 3));
        break;
      default:
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 10));
    }
    return cutoffDate;
  }

  getRegimeColor(regime: string, opacity: number = 1): string {
    const baseColor = this.regimeColors[regime] || '#9E9E9E';
    // Convert hex to rgba
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  onRangeChangeRegimeChart(range: PeriodOption): void {
    this.selectedRangeRegimeChart = range;
    this.calculateRegimeStats();
    this.buildRegimeTimelineChart();
  }

  onRangeChangePerformanceChart(range: PeriodOption): void {
    this.selectedRangePerfChart = range;
    this.buildPortfolioPerformanceChart();
  }

  refreshData(): void {
    this.loadAllData();
  }

  // Get regime legend items for display
  getRegimeLegendItems(): { name: string; color: string }[] {
    return Object.entries(this.regimeColors).map(([name, color]) => ({
      name,
      color,
    }));
  }

  // Calculate regime statistics
  calculateRegimeStats(): void {
    if (!this.regimeTimelineData || this.regimeTimelineData.length === 0) {
      this.regimeStats = [];
      return;
    }

    const filteredData = this.filterDataByRange(
      this.regimeTimelineData,
      this.selectedRangeRegimeChart.value,
    );
    const totalDays = filteredData.length;

    // Count occurrences of each regime
    const regimeCounts: { [key: string]: number } = {};
    filteredData.forEach(item => {
      const regime = item.regime;
      regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
    });

    // Create stats array with percentages
    this.regimeStats = Object.entries(regimeCounts).map(([regime, count]) => ({
      regime,
      count,
      percentage: (count / totalDays) * 100,
      color: this.regimeColors[regime] || '#9E9E9E',
    }));

    // Sort by count descending
    this.regimeStats.sort((a, b) => b.count - a.count);
  }

  getClusterColor(clusterId: number): string {
    const colors = [
      '#3b82f6', // Blue - Small Cap
      '#f59e0b', // Amber - Commodities/Gold
      '#8b5cf6', // Purple - Technology/Semiconductors
      '#10b981', // Green - Large Cap Value
      '#ec4899', // Pink - Innovation/High Growth
      '#06b6d4', // Cyan - Large Cap Growth/Momentum
    ];
    return colors[clusterId] || '#6b7280';
  }

  getFilteredAllocations(regime: string): RegimeAllocationData[] {
    if (!this.regimeAllocationData || !this.regimeAllocationData[regime]) {
      return [];
    }
    // Filter out 0% allocations and sort by percentage descending
    return this.regimeAllocationData[regime]
      .filter(a => parseFloat(a.allocation_percentage) > 0)
      .sort((a, b) => parseFloat(b.allocation_percentage) - parseFloat(a.allocation_percentage));
  }

  getSharpeColor(sharpe: string): string {
    const sharpeValue = parseFloat(sharpe);
    if (sharpeValue > 1) return '#10b981';
    if (sharpeValue > 0.5) return '#f59e0b';
    return '#ef4444';
  }

  buildRegimePieCharts() {
    if (!this.regimeAllocationData || Object.keys(this.regimeAllocationData).length === 0) {
      // console.log('No regime allocation data available');
      return;
    }

    const regimes = ['Bull', 'Bear', 'Sideways', 'Risk-Off'];

    regimes.forEach(regime => {
      const allocations = this.regimeAllocationData[regime];
      if (!allocations || !Array.isArray(allocations)) {
        // console.log(`No allocations found for regime: ${regime}`);
        return;
      }

      // Filter out 0% allocations for cleaner charts
      const nonZeroAllocations = allocations.filter(a => parseFloat(a.allocation_percentage) > 0);

      if (nonZeroAllocations.length === 0) {
        // console.log(`No non-zero allocations for regime: ${regime}`);
        return;
      }

      const labels = nonZeroAllocations.map(a => a.cluster_name);
      const data = nonZeroAllocations.map(a => parseFloat(a.allocation_percentage));
      const colors = nonZeroAllocations.map(a => this.getClusterColor(a.cluster_id));

      // console.log(`Building pie chart for ${regime}:`, { labels, data, colors });

      this.regimePieCharts[regime] = new Chart({
        chart: {
          type: 'pie',
          height: 250,
          backgroundColor: 'transparent',
        },
        title: {
          text: '',
        },
        tooltip: {
          pointFormat: '<b>{point.percentage:.1f}%</b>',
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '{point.percentage:.1f}%',
              style: {
                fontSize: '11px',
                fontWeight: 'bold',
              },
            },
            showInLegend: true,
          },
        },
        legend: {
          align: 'center',
          verticalAlign: 'bottom',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '11px',
          },
        },
        series: [
          {
            type: 'pie',
            name: 'Allocation',
            data: nonZeroAllocations.map((allocation, index) => ({
              name: allocation.cluster_name,
              y: parseFloat(allocation.allocation_percentage),
              color: colors[index],
            })),
          },
        ],
        credits: {
          enabled: false,
        },
      });
    });

    // console.log('Built pie charts:', Object.keys(this.regimePieCharts));
  }
}
