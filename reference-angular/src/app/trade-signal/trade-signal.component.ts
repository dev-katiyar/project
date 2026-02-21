import { Component, Input, OnChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-trade-signal',
  templateUrl: './trade-signal.component.html',
  styleUrls: ['./trade-signal.component.scss'],
})
export class TradeSignalComponent implements OnChanges {
  // model name as input 
  @Input() modelKey = 'model_1';

  // spy symbol list realted
  symbols = [];
  todayDate = new Date();
  errMsg = '';

  // selected symbiol and its data
  selTickerAndName = {};
  symbolData = [];
  signalInLastDays = 5;

  // chart related
  options = {};
  barClass = 'chart-big';
  chart: Chart;
  selectedScale = 'linear';

  // Anomaly table related
  filterTableDays = this.signalInLastDays;
  signalDataAll = [];
  singalDataFiltered = [];
  // avgBuyPosRet = {};
  // avgBuyNegRet = {};

  // Performance Table Related
  perfTradeDays = [3, 5, 10, 20, 60];

  constructor(private liveService: LiveService) {}

  ngOnChanges() {
    this.getFilteredTradeSignalList();
  }

  getFilteredTradeSignalList() {
    this.errMsg = '';
    this.liveService
      .getUrlData('/snp-trade-signals/filter/' + this.modelKey + '/' + this.signalInLastDays)
      .subscribe(res => {
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
    this.selTickerAndName = sym;
    const ticker = this.selTickerAndName['ticker'];
    this.resetObjects(ticker);

    this.liveService.getUrlData('/snp-trade-signals/' + this.modelKey + '/' + ticker).subscribe(res => {
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

  resetObjects(ticker) {
    // for trade singals in table
    this.signalDataAll = [];
    this.singalDataFiltered = [];

    // for avges in table
    // this.avgBuyPosRet = {};
    // this.avgBuyNegRet = {};
    // this.avgBuyPosRet["ticker"] = ticker;
    // this.avgBuyNegRet["ticker"] = ticker;
    // for(let days of this.perfTradeDays) {
    //   const avgKey =  this.getAvgKey(days);
    //   const avgCountKey = this.getAvgCountKey(days);
    //   this.avgBuyPosRet[avgKey] = 0;
    //   this.avgBuyNegRet[avgKey] = 0;
    //   this.avgBuyPosRet[avgCountKey] = 0;
    //   this.avgBuyNegRet[avgCountKey] = 0;
    // }
  }

  getAvgKey(days) {
    return 'avg_' + days + '_days';
  }

  getAvgCountKey(days) {
    return 'avg_' + days + '_days_ct';
  }

  getDataKey(days) {
    return days + '_day_return';
  }

  filterRowsOfTable() {
    const today = new Date();
    today.setDate(today.getDate() - this.filterTableDays);
    this.singalDataFiltered = this.signalDataAll.filter(row => new Date(row?.Date) >= today);
    // this.calculateRetAverages(this.singalDataFiltered);
  }

  setChartData() {
    let chartInputs = this.prepareChartInputs(this.symbolData);
    this.singalDataFiltered = this.signalDataAll;
    this.singalDataFiltered = this.singalDataFiltered.sort((a, b) => {
      const d1: any = new Date(a['Date']);
      const d2: any = new Date(b['Date']);
      return d2 - d1;
    });
    this.calculateBuySignalStrength();
    // this.calculateRetAverages(this.singalDataFiltered);

    this.setChartOptions(chartInputs);
  }

  calculateBuySignalStrength() {
    const openBuyRows = [];
    // need to traverse from bootom to top to get gains
    for (let i = this.signalDataAll.length - 1; i >= 0; i--) {
      const row = this.signalDataAll[i];
      row['gain'] = '';
      const signal = row['Signal'];

      if (signal === 'Buy') {
        openBuyRows.push(row);
      }

      if (signal == 'Sell') {
        while (openBuyRows.length > 0) {
          const buyRow = openBuyRows.pop();
          this.calculateGainLoss(buyRow, row);
        }
      }
    }

    // if some open buy row then gain with current price
    if(openBuyRows.length > 0 ) {
      const latestRow = this.signalDataAll[0];

      while(openBuyRows.length > 0) {
        const buyRow = openBuyRows.pop();
        this.calculateGainLoss(buyRow, latestRow);
      }
    }
  }

  calculateGainLoss(buyRow, sellRow) {
    // gain/loss
    const buyPrice = buyRow['Close'];
    const sellPrice = sellRow['Close'];

    buyRow['gain'] = sellPrice / buyPrice - 1;

    // in how many days
    const buyDate = new Date(buyRow["Date"]);
    const sellDate = new Date(sellRow["Date"]);

    const diffTime = sellDate.getTime() - buyDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    buyRow["holdDuration"] = diffDays;

    buyRow["sellPrice"] = sellPrice;
    buyRow["sellDate"] = sellDate;
  }

  prepareChartInputs(chartData) {
    // X-AXIS SERIES TEMPLATE
    let categoryLine = 'Date';
    let categories = []; // TO FILLED FROM 'chartData'

    // Y-AXIS ALL SERIES TEMPLATE
    let series = [];

    // Y-AXIS 'LINE' SERIES TEMPLATES
    let lines_series = [];
    lines_series.push(
      {
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
      },
      {
        id: 'RSI',
        name: 'RSI',
        yAxis: 1,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#000000',
        showInLegend: false,
        tooltip: { valueDecimals: 2 },
      },
      {
        id: 'MACD',
        name: 'MACD',
        yAxis: 2,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#001a66',
        tooltip: { valueDecimals: 2 },
        zIndex: 2, // Layering Order
      },
      {
        id: 'MACD_Signal',
        name: 'MACD Signal',
        yAxis: 2,
        type: 'line',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillOpacity: 0.8,
        marker: { enabled: false },
        color: '#3385ff',
        tooltip: { valueDecimals: 2 },
        zIndex: 3, // Layering Order
      },
    );

    // Y-AXIS 'COLUMN' SERIES TEMPLATES
    let columns_series = [];
    columns_series.push({
      id: 'MACD_histogram',
      name: 'MACD Diff',
      yAxis: 3,
      type: 'column',
      data: [], // TO FILLED FROM 'chartData
      lineWidth: 2,
      fillOpacity: 0.8,
      marker: { enabled: false },
      color: '#802000',
      tooltip: { valueDecimals: 2 },
      zIndex: 1, // Layering Order
    });

    // Y-AXIS 'FLAG' SERIES TEMPLATES
    let flags_series = [];
    flags_series.push(
      {
        id: 'BuySignal',
        name: 'Buy Signal',
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
      },
      {
        id: 'SellSignal',
        name: 'Sell Signal',
        type: 'flags',
        data: [], // TO FILLED FROM 'chartData
        lineWidth: 2,
        fillColor: 'rgba(203, 21, 21, 0.05)',
        y: -50,
        onSeries: lines_series[0].id, // On 'Close Price' line
        shape: 'squarepin',
        color: '#CB1515',
        showInLegend: false,
        clip: false,
        turboThreshold: 0,
        allowOverlapX: true,
      },
    );

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

      for (let column_series of columns_series) {
        // Fill Y-Axis 'Columns' Series
        let pointValue = rowObj[column_series['id']];
        let pointColor = pointValue > 0 ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';

        let point = { y: pointValue, color: pointColor };
        column_series['data'].push(point);
      }

      let signal = rowObj['Signal']; // Fill Y-Axis 'Flags' Series - BUY
      if (signal && signal == 'Buy') {
        flags_series[0]['data'].push({ x: k, title: 'B' }); // Note Index 0
        this.makeAnomalyData(rowObj); // not right place, but to save a loop
      }
      if (signal && signal == 'Sell') {
        flags_series[1]['data'].push({ x: k, title: 'S' }); // Note Index 0
        this.makeAnomalyData(rowObj); // not right place, but to save a loop
      }

      k = k + 1;
    }

    series = lines_series.concat(columns_series, flags_series);

    let chartInputs = { series: series, categories: categories, ticker: chartData[0].ticker };

    return chartInputs;
  }

  setChartOptions(chartInputs) {
    this.options = {
      chart: { backgroundColor: 'transparent', zoomType: 'x' },
      exporting: { enabled: false },
      credits: { enabled: false },
      title: { text: '' },
      subtitle: { text: '' },
      xAxis: { categories: chartInputs.categories, labels: { enabled: true } },
      yAxis: [
        /* Y-Axis [0] left: Close Price */
        {
          title: { text: 'Close Price (Linear)', offset: 0, x: -28 },
          type: 'linear',
          labels: { offset: 0, x: -5 },
          top: '4%',
          height: '38%', // Chart Pane [0]
          offset: 0,
          lineWidth: 2,
          overflow: 'justify',
        },

        /* Y-Axis [2] left: RSI */
        {
          title: { text: 'RSI', offset: 0, x: -28 },
          labels: { offset: 0, x: -5 },
          top: '44%',
          height: '27%', // Chart Pane [1]
          offset: 0,
          lineWidth: 2,
          tickPositions: [0, 20, 50, 80, 100], // Limits and Ticks
          overflow: 'justify',
        },

        /* Y-Axis [3] left: MACD & Signal  */
        {
          title: { text: 'MACD & Signal', offset: 0, x: -28 },
          labels: { offset: 0, x: -5 },
          top: '73%',
          height: '27%', // Chart Pane [2]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
            return [-max, 0, max];
          },
        },

        /* Y-Axis [4] right: MACD Diff */
        {
          title: { text: 'MACD Diff', offset: 0, x: 15 },
          labels: { offset: 0, x: 5 },
          top: '73%',
          height: '27%', // Chart Pane [2]
          offset: 0,
          lineWidth: 2,
          tickPositioner: function () {
            // Limits and Ticks
            var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
            return [-max, 0, max];
          },
          opposite: true,
        },
      ],

      tooltip: {
        crosshairs: { color: 'green', dashStyle: 'solid', width: 1 },
        backgroundColor: 'rgba(90, 135, 230, 0.1)',
        borderWidth: 0,
        shadow: false,
        padding: 2,
        split: true,
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

      annotations: [
        {
          draggable: 'x',
          labels: [
            {
              point: {
                x: 0,
                y: 66,
              },
              text: 'Stock Price',
            },
            {
              point: {
                x: 0,
                y: 334,
              },
              text: 'RSI',
            },
            {
              point: {
                x: 0,
                y: 530,
              },
              text: 'MACD Indicators',
            },
          ],
          labelOptions: {
            borderRadius: 5,
            backgroundColor: 'rgba(252, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: '#AAA',
            style: {
              fontSize: '12px',
              fontWeight: 'bold',
            },
            shape: 'rect',
            shadow: {
              color: 'gray',
              offsetX: -0.3,
              opacity: 0.3,
            },
          },
        },
      ],

      series: chartInputs.series,
    };
    this.chart = new Chart(this.options);
  }

  // calculateRetAverages(rows) {
  //   for(const row of rows) {
  //     this.updateSumForAverages(row)
  //   }

  //   for(let days of this.perfTradeDays) {
  //     const avgKey =  this.getAvgKey(days);
  //     const avgCountKey = this.getAvgCountKey(days);

  //     const avgPosCount = this.avgBuyPosRet[avgCountKey];
  //     if( avgPosCount > 0) {
  //       this.avgBuyPosRet[avgKey] /= avgPosCount;
  //     }

  //     const avgNegCount = this.avgBuyNegRet[avgCountKey];
  //     if (avgNegCount > 0) {
  //       this.avgBuyNegRet[avgKey] /= avgNegCount;
  //     }
  //   }
  // }

  makeAnomalyData(row) {
    try {
      // const startIndex = row['index'];
      // for (let daysCount of this.perfTradeDays) {
      //   const startPrice = row['Close'];
      //   let gain = 0;
      //   if(startIndex + daysCount < this.symbolData.length) {
      //     const endPrice = this.symbolData[startIndex + daysCount]['Close'];
      //     gain = startPrice ? (endPrice - startPrice) / startPrice : 0;
      //   }
      //   const colName = daysCount.toString() + 'D';
      //   row[colName] = gain;
      // }
      this.signalDataAll.push(row);
    } catch (error) {

    }
  }

  // updateSumForAverages(row) {
  //   for(let days of this.perfTradeDays) {
  //     const dataKey = this.getDataKey(days);
  //     const avgKey =  this.getAvgKey(days);
  //     const avgCountKey = this.getAvgCountKey(days);

  //     const dayRet = row[dataKey];
  //     if(dayRet > 0) {
  //       this.avgBuyPosRet[avgKey] += dayRet;
  //       this.avgBuyPosRet[avgCountKey]++;
  //     }

  //     if (dayRet < 0) {
  //       this.avgBuyNegRet[avgKey] += dayRet;
  //       this.avgBuyNegRet[avgCountKey]++;
  //     }
  //   }
  // }

  toggleYAxisScale(scale) {
    this.selectedScale = scale;

    // update the chart options
    this.options['yAxis'][0]['type'] = scale;
    this.options['yAxis'][0]['title']['text'] = 'Close Price (' + scale + ')';

    // update the chart
    this.chart.ref.yAxis[0].update(this.options['yAxis'][0]);
  }
}
