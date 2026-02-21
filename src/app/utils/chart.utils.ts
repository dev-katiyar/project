export class ChartUtils {

  static getSeriesData(data, xColumn, yColumn, colorOnYColumnVal, colorColumn) {

    let series = [];
    let categories = []
    let ser1 = {
      data: [],
      name: '',
      color: ''
    };

    // data.sort((a, b) => (a[yColumn] > b[yColumn]) ? -1 : 1);
    // only 1 series
    for (let item of data) {
      let xColumnValue = item[xColumn];
      if (item["symbol"] != undefined) {
        categories.push(item["symbol"]); // alternate_name replaced with symbol for space in chart
      }
      let yVal = parseFloat(item[yColumn]); //priceChange

      let temp1 = { color: undefined, y: yVal, name: xColumnValue };

      if (colorOnYColumnVal) {
        temp1.color = yVal < 0 ? 'red' : 'green';
      }
      else if (colorColumn && item[colorColumn]) {
        temp1.color = item[colorColumn];
      }
      ser1.data.push(temp1);
    }
    series.push(ser1);

    return { "series": series, "categories": categories };
  }

  static getItemArrayFromList(data, column) {
    let symbols = [];
    for (let item of data) {
      symbols.push(item[column]);
    }
    return symbols;
  }

  static createSeriesData(data, valueColumn, categoryColumn, setColor) {
    let series = [{ name: valueColumn, data: [], marker: { enabled: false } }]
    if (categoryColumn != 'date') {
      data.sort((a,b) => (a[valueColumn] > b[valueColumn]) ? -1 : 1)
    }
    return this.getAllSeriesData(data, series, categoryColumn, setColor)
  }

  static getAllSeriesData(dataTable, series, categoryColumn, setColor, multiplier=1.0, decimals = 2) {
    let categories = [];
    for (let item of dataTable) {
      categories.push(item[categoryColumn]);
      for (let seriesItem of series) {
        let columnName = seriesItem["name"];
        let itemVal = item[columnName] * multiplier;
        itemVal = Number(itemVal.toFixed(decimals))
        let temp1 = { color: '', y: itemVal, name: item[categoryColumn] };
        if (setColor) {
          var color = itemVal < 0 ? 'red' : 'green';
          temp1.color = color;
        }
        else if ("color" in seriesItem) {
          temp1.color = seriesItem["color"];

        }
        seriesItem["data"].push(temp1);
      }
    }

    for (let seriesItem of series) {
      if (seriesItem['legend']) seriesItem['name'] = seriesItem['legend'];
    }

    return { "series": series, "categories": categories };
  }

  static getDataMultipleSeriesFromColumns(dataTable, seriesColumn) {
    let categories = [];
    let series = [];
    if (dataTable.length > 0) {
      categories = Object.keys(dataTable[0]);
      categories.splice(categories.indexOf(seriesColumn), 1);

      for (let row of dataTable) {
        let seriesItem = { "name": row[seriesColumn], "data": [] };
        for (let categoryColumn of categories) {
          let name = row[seriesColumn] + "(" + categoryColumn + ")";
          seriesItem.data.push({ "y": row[categoryColumn], "name": name });
        }
        series.push(seriesItem);
      }
    }

    return { "series": series, "categories": categories };
  }

  static getStrategyChartSettings(stg_inputs) {
    let sma_spcial_case = [];

    let uniq_strategies = [];  // collect all unique strategies
    // for all BUY strateiges
    for (let stg of stg_inputs.buy_conditions.strategy_list) {
      let k = stg.key;
      let v = stg.key;
      stg.settings.forEach(setting => {
        v += setting["value"];
      });
      // [AK: TODO 202203-23] => this approach can me made common, with checks inner stg exitance | or see, if can send to backend
      if (k == 'sma' && !sma_spcial_case.some(item => item.col_value == v)) {    // speical case, with two different indicators on both sides
        sma_spcial_case.push({ col_key: k, col_value: v });                 // outer sma
        let inner_stg = stg.selected_strategy.selected_option;
        let inner_k = inner_stg.key;
        let inner_v = inner_stg.key;
        inner_stg.settings.forEach(setting => {
          inner_v += setting["value"];
        });
        if (inner_k == 'sma' && !sma_spcial_case.some(item => item.col_value == inner_v)) {
          sma_spcial_case.push({ col_key: inner_k, col_value: inner_v });     // inner sma/close
          continue;
        }
      }
      if(k != 'sma' && !uniq_strategies.some(s => s.col_value == v)) {
        uniq_strategies.push({col_key: k, col_value: v});   // values are uniques, so using them as key
      }
    }
    // for all SELL strategies
    for (let stg of stg_inputs.sell_conditions.strategy_list) {
      let k = stg.key;
      let v = stg.key;
      stg.settings.forEach(setting => {
        v += setting["value"];
      })
      // [AK: TODO 202203-23] => this approach can me made common, with checks inner stg exitance | or see, if can send to backend
      if(k == 'sma' && !sma_spcial_case.some(item => item.col_value == v)) {    // speical case, with two different indicators on both sides
        sma_spcial_case.push({col_key: k, col_value: v});                 // outer sma
        let inner_stg = stg.selected_strategy.selected_option;
        let inner_k = inner_stg.key;
        let inner_v = inner_stg.key;
        inner_stg.settings.forEach(setting => {
          inner_v += setting["value"];
        });
        if (inner_k == 'sma' && !sma_spcial_case.some(item => item.col_value == inner_v)) {
          sma_spcial_case.push({ col_key: inner_k, col_value: inner_v });     // inner sma/close
          continue;
        }
      }
      if(k != 'sma' && !uniq_strategies.some(s => s.col_value == v)) {
        let obj = {};
        obj[v] = k;
        uniq_strategies.push({col_key: k, col_value: v});   // values are uniques, so using them as key
      }
    }

    // for all chart series, special case when we just want the chart
    if(Object.keys(stg_inputs["chart_conditions"]).length != 0) {   // assuming SMAs are not in chart_conditions
      for (let stg of stg_inputs.chart_conditions.strategy_list) {
        let k = stg.key;
        let v = stg.key;
        stg.settings.forEach(setting => {
          v += setting["value"];
        })
        if(!uniq_strategies.some(s => s.col_value == v)) {
          let obj = {};
          obj[v] = k;
          uniq_strategies.push({col_key: k, col_value: v});   // values are uniques, so using them as key
        }
      }
    }

    let chart_settings = (JSON.parse(JSON.stringify(this.strategy_chart_base)));
    chart_settings.series[0]['tickPositioner'] = this.strategy_chart_base.series[0].tickPositioner;  // for 'close'
    chart_settings.buy_flag_series['selected_condition'] = stg_inputs.buy_conditions['selected_condition'];
    chart_settings.sell_flag_series['selected_condition'] = stg_inputs.sell_conditions['selected_condition'];
    let yAxis = 0;
    let pane = 0;
    if(sma_spcial_case.length > 0) {
      sma_spcial_case.unshift({col_key: 'close', col_value: 'close'});
      pane+= 1;
      for(let sma_stg of sma_spcial_case) {
        let indcators = this.strategy_chart_dict[sma_stg.col_key];
        for(let ind of indcators) {
          let temp_ind = (JSON.parse(JSON.stringify(ind)));
          yAxis += ind['yAxis'];
          temp_ind['id'] = sma_stg.col_value + temp_ind['id'];
          temp_ind['pane'] = pane;
          temp_ind['yAxis'] = yAxis;
          temp_ind['tickPositioner'] = ind['tickPositioner'];
          chart_settings.series.push(temp_ind);
        }
      }
    }
  
    for (let stg of uniq_strategies) {                                                               // for other non 'sma'
      let indicators = this.strategy_chart_dict[stg.col_key];
      pane += 1; 
      for(let ind of indicators) {
        let temp_ind = (JSON.parse(JSON.stringify(ind)));
        yAxis += ind['yAxis'];
        temp_ind['id'] = stg.col_value + temp_ind['id'];
        temp_ind['pane'] = pane;
        temp_ind['yAxis'] = yAxis;
        temp_ind['tickPositioner'] = ind['tickPositioner'];
        chart_settings.series.push(temp_ind);
      }
    }

    return chart_settings;
  }

  static strategy_chart_base = {   // this will render by defualt
      categoryLine: 'date',
      series: [
        {
          id: 'close',
          name: 'Close Price',
          type: 'line',
          pane: 0,
          yAxis: 0,
          opposite: false,
          tickPositions: undefined,
          tickPositioner: function () {
            // Limits and Ticks
            var positions = [],
              tick = Math.floor(this.dataMin),
              increment = Math.ceil((this.dataMax - this.dataMin) / 6);

            if (this.dataMax !== null && this.dataMin !== null) {
              for (tick; tick - increment <= this.dataMax; tick += increment) {
                positions.push(tick);
              }
            }
            return positions;
          },
        },
      ],
      buy_flag_series: {
        id: 'buy_score',
        name: 'Buy Rating'
      },
      sell_flag_series: {
        id: 'sell_score',
        name: 'Sell Rating'
      }
  };

  static strategy_chart_dict = {
    close: [
      {
        id: '',
        name: 'Close Price',
        type: 'line',
        pane: 0,
        yAxis: 1,
        opposite: false,
        tickPositions: undefined,
        tickPositioner: function () {
          // Limits and Ticks
          var positions = [],
            tick = Math.floor(this.dataMin),
            increment = Math.ceil((this.dataMax - this.dataMin) / 6);

          if (this.dataMax !== null && this.dataMin !== null) {
            for (tick; tick - increment <= this.dataMax; tick += increment) {
              positions.push(tick);
            }
          }
          return positions;
        },
      },
    ],
    sma: [
      {
        id: '',
        name: 'SMA',
        type: 'line',
        pane: 1,
        yAxis: 0,
        opposite: false,
        tickPositions: undefined,
        tickPositioner: function () {
          // Limits and Ticks
          var positions = [],
            tick = Math.floor(this.dataMin),
            increment = Math.ceil((this.dataMax - this.dataMin) / 6);

          if (this.dataMax !== null && this.dataMin !== null) {
            for (tick; tick - increment <= this.dataMax; tick += increment) {
              positions.push(tick);
            }
          }
          return positions;
        },
      },
    ],
    rsi: [
      {
        id: '',
        name: 'RSI',
        type: 'line',
        pane: 1,
        yAxis: 1,
        opposite: false,
        tickPositions: [0, 20, 50, 80, 100],
      },
    ],
    svmf: [
      {
        id: '',
        name: 'SV Money Flow',
        type: 'line',
        pane: 1,
        yAxis: 1,
        opposite: false,
        tickPositions: [0, 20, 50, 80, 100],
      },
      {
        id: 'signal',
        name: 'SVMF Signal',
        type: 'line',
        pane: 1,
        yAxis: 0,
        opposite: false,
        tickPositions: [0, 20, 50, 80, 100],
      },
      {
        id: 'hist',
        name: 'SVMF Diff',
        type: 'column',
        pane: 1,
        yAxis: 1,
        opposite: true,
        tickPositions: [-50, 0, 50],
      },
    ],
    stoch: [
      {
        id: '',
        name: 'Stoch',
        type: 'line',
        pane: 2,
        yAxis: 1,
        opposite: false,
        tickPositions: [0, 50, 100],
      },
      {
        id: 'signal',
        name: 'Stoch Signal',
        type: 'line',
        pane: 2,
        yAxis: 0,
        opposite: false,
        tickPositions: [0, 50, 100],
      },
      {
        id: 'hist',
        name: 'Stoch Diff',
        type: 'column',
        pane: 2,
        yAxis: 1,
        opposite: true,
        tickPositions: [-50, 0, 50],
      },
    ],
    cmf: [
      {
        id: '',
        name: 'Money Flow',
        type: 'column',
        pane: 3,
        yAxis: 1,
        opposite: false,
        tickPositions: undefined,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
          return [-max, -0.05, 0, 0.05, max];
        },
      },
    ],
    macd: [
      {
        id: '',
        name: 'MACD',
        type: 'line',
        pane: 4,
        yAxis: 1,
        opposite: false,
        tickPositions: undefined,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
          return [-max, 0, max];
        },
      },
      {
        id: 'signal',
        name: 'MACD Signal',
        type: 'line',
        pane: 4,
        yAxis: 0,
        opposite: false,
        tickPositions: undefined,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
          return [-max, 0, max];
        },
      },
      {
        id: 'hist',
        name: 'MACD Diff',
        type: 'column',
        pane: 4,
        yAxis: 1,
        opposite: true,
        tickPositions: undefined,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(2);
          return [-max, 0, max];
        },
      },
    ]
  };

}