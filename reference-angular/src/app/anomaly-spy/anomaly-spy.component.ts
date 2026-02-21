import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-anomaly-spy',
  templateUrl: './anomaly-spy.component.html',
  styleUrls: ['./anomaly-spy.component.scss'],
})
export class AnomalySpyComponent implements OnInit {
  // spy symbol list realted
  symbols = [];
  errMsg = '';

  // selected symbiol and its data
  selSymbol = {};
  symbolData = [];
  anomalyInLastDays = 10;

  // chart related
  options = {};
  barClass = 'chart-big';
  chart: Chart;
  isLogScale = false;

  // Anomaly table related
  anomalyData = [];

  // Performance Table Related
  perfTradeDays = [7, 14, 25, 65, 100];

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.errMsg = '';
    this.liveService.getUrlData('/snpsymbols').subscribe(res => {
      if ((res['status'] = 'ok')) {
        this.symbols = res['data'];
        if (this.symbols.length > 0) {
          this.onSymbolClick(this.symbols[0]);
        }
      } else {
        this.errMsg = 'Server Error. Please contact us.';
      }
    });
  }

  onSymbolClick(sym) {
    this.selSymbol = sym;
    this.anomalyData = [];

    const symbol = this.selSymbol['symbol'];
    this.liveService.getUrlData('/anomaly/' + symbol).subscribe(res => {
      if ((res['status'] = 'ok')) {
        this.symbolData = res['data'];
        if (this.symbolData.length == 0) {
          this.errMsg = 'No Data for this symbol. Please contact us.';
        } else {
          // create chart with flags
          this.setChartData();
        }
      } else {
        this.errMsg = 'Server Error. Please contact us.';
      }
    });
  }

  setChartData() {
    let chartInputs = this.prepareChartInputs(this.symbolData);
    this.setChartOptions(chartInputs);
  }

  prepareChartInputs(chartData) {
    // X-AXIS SERIES TEMPLATE
    let categoryLine = 'Date';
    let categories = []; // TO FILLED FROM 'chartData'

    // Y-AXIS ALL SERIES TEMPLATE
    let series = [];

    // Y-AXIS 'LINE' SERIES TEMPLATES
    let lines_series = [];
    lines_series.push({
      id: 'Close',
      name: 'Close Price',
      yAxis: 0,
      type: 'line',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillOpacity: 0.8,
      marker: { enabled: false },
      color: '#000000',
      showInLegend: false,
      tooltip: { valueDecimals: 2 },
    });

    // Y-AXIS 'FLAG' SERIES TEMPLATES
    let flags_series = [];
    flags_series.push({
      id: 'Anomaly',
      name: 'Anomaly',
      type: 'flags',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillColor: 'rgba(21, 203, 36, 0.05)',
      y: -50,
      onSeries: lines_series[0].id, // On 'Close Price' line
      shape: 'squarepin',
      color: '#15CB24',
      showInLegend: false,
      clip: false,
      turboThreshold: 0,
      allowOverlapX: true,
    });

    // FILL SERIES TEMPLATES DATA POINTS FROM 'chartData' OBJECT ARRAY
    let k = 0;
    for (let rowObj of chartData) {
      // For each row object of dataframe

      const catDate = new Date(rowObj[categoryLine]);
      const formattedDate = `${catDate.getUTCFullYear()}-${(catDate.getUTCMonth() + 1)
        .toString()
        .padStart(2, '0')}-${catDate.getUTCDate().toString().padStart(2, '0')}`;
      categories.push(formattedDate); // Fill X-Axis Series Customized Points

      for (let line_series of lines_series) {
        // Fill Y-Axis 'Lines' Series
        let pointValue = rowObj[line_series['id']];

        let point = { y: pointValue };
        line_series['data'].push(point);
      }

      let anomaly = rowObj['Anomaly']; // Fill Y-Axis 'Flags' Series - BUY
      if (anomaly == -1) {
        flags_series[0]['data'].push({ x: k, title: 'A' }); // Note Index 0

        rowObj['index'] = k; // to be used later by getting row related to anomaly
        this.makeAnomalyData(rowObj); // not right place, but to save a loop
      }

      k = k + 1;
    }

    series = lines_series.concat(flags_series);

    let chartInputs = { series: series, categories: categories, symbol: chartData[0].symbol };

    return chartInputs;
  }

  setChartOptions(chartInputs) {
    this.options = {
      chart: { backgroundColor: 'transparent', zoomType: 'x' },
      exporting: { enabled: false },
      credits: { enabled: false },
      title: { text: '' },
      subtitle: { text: '', x: 200 },
      xAxis: { categories: chartInputs.categories, labels: { enabled: true } },
      yAxis: [
        /* Y-Axis [0] */
        {
          title: { text: 'Close Price (Linear)', offset: 0, x: -28 },
          type: 'linear',
          labels: { offset: 0, x: -5 },
          top: '7%',
          height: '93%', // Chart Pane [0]
          offset: 0,
          lineWidth: 2,
          overflow: 'justify',
        },
      ],

      tooltip: {
        crosshairs: { color: 'green', dashStyle: 'solid', width: 1 },
        backgroundColor: 'rgba(90, 135, 230, 0.1)',
        borderWidth: 0,
        shadow: false,
        padding: 2,
        // split: true,
      },

      plotOptions: {
        series: {
          turboThreshold: 3000,
          connectNulls: true,
          cursor: 'pointer',
          pointInterval: undefined,
          pointStart: undefined,
        },
      },

      series: chartInputs.series,
    };
    this.chart = new Chart(this.options);
  }

  makeAnomalyData(row) {
    try {
      const startIndex = row['index'];
      for (let daysCount of this.perfTradeDays) {
        const startPrice = row['Close'];
        let gain = 0;
        if (startIndex + daysCount < this.symbolData.length) {
          const endPrice = this.symbolData[startIndex + daysCount]['Close'];
          gain = startPrice ? (endPrice - startPrice) / startPrice : 0;
        }
        const colName = daysCount.toString() + 'D';
        row[colName] = gain;
      }
      this.anomalyData.push(row);
    } catch (error) {
      // console.log(error);
    }
  }

  toggleYAxisScale() {
    // toggle switch
    this.isLogScale = !this.isLogScale;

    // get appropriate values
    const scaleType = this.isLogScale ? 'logarithmic' : 'linear';
    const scaleLabel = this.isLogScale ? 'Close Price (Log)' : 'Close Price (Linear)';

    // update the chart options
    this.options['yAxis'][0]['type'] = scaleType;
    this.options['yAxis'][0]['title']['text'] = scaleLabel;

    // update the chart
    this.chart.ref.yAxis[0].update(this.options['yAxis'][0]);
  }

  filterAnomalySymbolList() {
    const indexFrom = this.symbolData.length - this.anomalyInLastDays;
    const startDate = this.symbolData[indexFrom]['Date'];
    this.liveService.getUrlData('/snpsymbols/filter/' + startDate).subscribe(res => {
      if ((res['status'] = 'ok')) {
        this.symbols = res['data'];
        if (this.symbols.length > 0) {
          this.onSymbolClick(this.symbols[0]);
        }
      } else {
        this.errMsg = 'Server Error. Please contact us.';
      }
    });
  }
}
