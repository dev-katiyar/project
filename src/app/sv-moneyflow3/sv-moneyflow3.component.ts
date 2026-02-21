import { Component, OnInit } from '@angular/core';
import { StrategyService } from '../services/strategy.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-sv-moneyflow3',
  templateUrl: './sv-moneyflow3.component.html',
  styleUrls: ['./sv-moneyflow3.component.scss'],
})
export class SvMoneyflow3Component implements OnInit {
  constructor(
    private notificationService: NotificationService,
    private strategyService: StrategyService,
  ) {
  }

  fieldSetCollapsed = true; // FIELD SET IS COLLAPSED BY DEFAULT
  sampleFrequencies = [
    { id: 'days', name: 'days' },
    { id: 'weeks', name: 'weeks' },
  ]; // DAYS AND WEEKS DROPDOWN

  start_date = new Date();

  // DEFAULT DATE RANGES for 'days' [FOR 'weeks' in 'days'/'weeks' DROPDOWN and CHECKS DONE IN RUN CLICK EVENT ]
  minStartDate = new Date('2015-04-12'); // 100 days from 2015-01-01
  maxStartDate = new Date(); // TODAY
  minEndDate = new Date('2015-05-01'); // 120 days from 2015-01-01
  maxEndDate = new Date(); // TODAY
  error = false;
  errorMessage = '';
  recentSymbols = [];
  recentSymbolPairs = [];

  responseChartData: any; // FOR RESULT DF AS ROW ARRAY FROM BACK END

  strategy_inputs = {
    // DEFAULTS VALUES for INPUTS TO MODEL & STRATEGY
    model_inputs: {
      symbol: 'SPY',
      start_date: this.start_date,
      end_date: new Date(),
      sample_frequency: 'weeks',
    },
    ria_pro_inputs: {
      sma_inputs: {
        sma1_num_of_period: 13,
        sma2_num_of_period: 34,
        sma_buy_sell_weight: 1,
        label: 'WMA(13) & WMA(34)',
      },
      ria_inputs: {
        ria_num_of_periods: 12,
        ria_smoothening_ema_period: 26,
        ria_trigger_ema_period: 9,
        ria_buy_sell_weight: 2,
        ria_condition_buy_below: 20,
        ria_condition_sell_above: 80,
      },
      stoch_inputs: {
        stoch_num_of_periods: 12,
        stoch_smoothening_ema_period: 26,
        stoch_trigger_ema_period: 9,
        stoch_buy_sell_weight: 2,
        stoch_buy_trigger_diff_cross: 0,
        stoch_sell_trigger_diff_cross: 0,
      },
      mfi_inputs: {
        mfi_num_of_periods: 14,
        mfi_buy_sell_weight: 1,
      },
      macd_inputs: {
        macd_slow_period: 26,
        macd_fast_period: 12,
        macd_trigger_period: 9,
        macd_buy_sell_weight: 1,
      },
      macd1_inputs: {
        macd_slow_period: 26,
        macd_fast_period: 12,
        macd_trigger_period: 12,
        macd_buy_sell_weight: 1,
        label: 'MACD(12,26,12)',
      },
      macd2_inputs: {
        macd_slow_period: 52,
        macd_fast_period: 24,
        macd_trigger_period: 21,
        macd_buy_sell_weight: 1,
        label: 'MACD(24,54,21)',
      },
      rsi_inputs: {
        rsi_period: 14,
        macd_buy_sell_weight: 1,
      },
    },
  };

  minMaxPositioner = function () {
    // Limits and Ticks
    var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(0);
    var maxInt = Number(max);
    return [-maxInt, 0, maxInt];
  };

  selectedTab: number = 0;
  chartSettingsPairMF = {
    chartTitle: `MoneyFlow Indicator - ` + this.strategy_inputs.model_inputs.symbol,
    buy_flag_series: {
      id: 'buy_rating',
      name: 'Buy Rating',
    },
    sell_flag_series: {
      id: 'sell_rating',
      name: 'Sell Rating',
    },
    categoryLine: 'date',
    series: [
      {
        id: 'close',
        name: 'Price',
        opposite: false,
        pane: 0,
        tickPositioner: function () {
          // Limits and Ticks
          var positions = [],
            tick = Math.floor(this.dataMin * 100) / 100,
            increment = Math.ceil(((this.dataMax - this.dataMin) * 100) / 4) / 100;

          tick = tick - 0.1 * Math.abs(tick); // little below than acutal min
          var max = this.dataMax + 0.1 * Math.abs(this.dataMax); // little more than acutal max

          if (this.dataMax !== null && this.dataMin !== null) {
            for (tick; tick - increment <= this.dataMax; tick += increment) {
              positions.push(Math.round(tick));
            }
          }
          return positions;
        },
        tickPositions: undefined,
        type: 'line',
        yAxis: 0,
      },
      {
        id: 'sma' + this.strategy_inputs.ria_pro_inputs.sma_inputs.sma1_num_of_period,
        name: 'WMA (' + this.strategy_inputs.ria_pro_inputs.sma_inputs.sma1_num_of_period + ')',
        opposite: false,
        pane: 1,
        tickPositioner: undefined,
        // tickPositions: [0, 20, 50, 80, 100],
        type: 'line',
        yAxis: 1,
        yAixsTitle: this.strategy_inputs.ria_pro_inputs.sma_inputs.label,
        color: '#dd7612',
      },
      {
        id: 'sma' + this.strategy_inputs.ria_pro_inputs.sma_inputs.sma2_num_of_period,
        name: 'WMA (' + this.strategy_inputs.ria_pro_inputs.sma_inputs.sma2_num_of_period + ')',
        opposite: true,
        pane: 1,
        tickPositioner: undefined,
        // tickPositions: [0, 20, 50, 80, 100],
        type: 'line',
        yAxis: 1,
        yAixsTitle: this.strategy_inputs.ria_pro_inputs.sma_inputs.label,
        color: '#782ca8',
      },
      {
        id: 'sma_diff',
        name: `WMA(${this.strategy_inputs.ria_pro_inputs.sma_inputs.sma1_num_of_period})-WMA(${this.strategy_inputs.ria_pro_inputs.sma_inputs.sma2_num_of_period}) Diff`,
        opposite: true,
        pane: 1,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'column',
        yAxis: 2,
      },
      {
        id: 'macd1',
        name: this.strategy_inputs.ria_pro_inputs.macd1_inputs.label,
        opposite: false,
        pane: 2,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'line',
        yAxis: 3,
        yAixsTitle: this.strategy_inputs.ria_pro_inputs.macd1_inputs.label + ' & Signal',
        color: 'black',
      },
      {
        id: 'macd1_trigger',
        name: this.strategy_inputs.ria_pro_inputs.macd1_inputs.label + ' Signal',
        opposite: false,
        pane: 2,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'line',
        yAxis: 3,
        yAixsTitle: this.strategy_inputs.ria_pro_inputs.macd1_inputs.label + ' & Signal',
        color: 'blue',
      },
      {
        id: 'macd1_diff',
        name: this.strategy_inputs.ria_pro_inputs.macd1_inputs.label + ' Diff',
        opposite: true,
        pane: 2,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'column',
        yAxis: 4,
      },
      {
        id: 'macd2',
        name: this.strategy_inputs.ria_pro_inputs.macd2_inputs.label,
        opposite: false,
        pane: 3,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'line',
        yAxis: 5,
        yAixsTitle: this.strategy_inputs.ria_pro_inputs.macd2_inputs.label + ' & Signal',
        color: '#004D4D',
      },
      {
        id: 'macd2_trigger',
        name: this.strategy_inputs.ria_pro_inputs.macd2_inputs.label + ' Signal',
        opposite: false,
        pane: 3,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'line',
        yAxis: 5,
        yAixsTitle: this.strategy_inputs.ria_pro_inputs.macd2_inputs.label + ' & Signal',
        color: '#96640F',
      },
      {
        id: 'macd2_diff',
        name: this.strategy_inputs.ria_pro_inputs.macd2_inputs.label + ' Diff',
        opposite: true,
        pane: 3,
        tickPositioner: this.minMaxPositioner,
        tickPositions: undefined,
        type: 'column',
        yAxis: 6,
      },
      {
        id: 'rsi' + this.strategy_inputs.ria_pro_inputs.rsi_inputs.rsi_period,
        name: 'RSI (' + this.strategy_inputs.ria_pro_inputs.rsi_inputs.rsi_period + ')',
        opposite: false,
        pane: 4,
        tickPositioner: undefined,
        tickPositions: [0, 30, 50, 70, 100],
        type: 'line',
        yAxis: 7,
        yAixsTitle: 'RSI (' + this.strategy_inputs.ria_pro_inputs.rsi_inputs.rsi_period + ')',
        color: 'green',
      },
    ],
  };

  ngOnInit() {
    this.start_date.setDate(new Date().getDate() - 1130); // DEFAULT test_period is 2 years
    this.loadRecentSearchedSymbols();
    this.loadRecentSearchedSymbolPairs();
    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.strategy_inputs.model_inputs.symbol = symbol;
    });
    this.getStrategyResult();
  }

  loadRecentSearchedSymbols() {
    let userRecents = JSON.parse(localStorage.getItem('svmfRecentSymbols'));
    if (!userRecents) {
      this.recentSymbols = ['AAPL'];
      localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.recentSymbols));
    } else {
      this.recentSymbols = userRecents;
    }
  }

  loadRecentSearchedSymbolPairs() {
    let userRecentPairs = JSON.parse(localStorage.getItem('svmfRecentSymbolPairs'));
    if (!userRecentPairs) {
      this.recentSymbolPairs = [{ sym1: 'AAPL', sym2: 'SPY' }];
      localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.recentSymbolPairs));
    } else {
      this.recentSymbolPairs = userRecentPairs;
    }
  }

  clearRecentSymbols() {
    this.recentSymbols = [];
    localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.recentSymbols));
  }

  clearRecentSymbolPairs() {
    this.recentSymbolPairs = [];
    localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.recentSymbolPairs));
  }

  sampleFrequencyDropdownChange(event) {
    this.strategy_inputs.model_inputs.sample_frequency = event.value; // unwanted -SELECT- option
  }

  getStrategyResult() {
    // GETS CHART DATA FROM BACKEND
    this.responseChartData = null;
    this.error = false;
    this.chartSettingsPairMF.chartTitle =
      `MoneyFlow Indicator - ` + this.strategy_inputs.model_inputs.symbol;
    this.validateStrategyInputs();
    if (!this.error) {
      this.strategyService.executeStrategy2024(this.strategy_inputs).subscribe(res => {
        if (res['status'] != 'failed') {
          this.responseChartData = res;
          this.addSymbolToRecentSerached(this.strategy_inputs.model_inputs.symbol);
          localStorage.setItem('currentSymbol', this.strategy_inputs.model_inputs.symbol);
          this.notificationService.changeSelectedSymbol(this.strategy_inputs.model_inputs.symbol);
        } else {
          this.notificationService.showError(res['message']);
        }
      });
    }
  }

  addSymbolToRecentSerached(symbol) {
    if (!this.recentSymbols.includes(symbol)) {
      if (this.recentSymbols.length == 15) {
        this.recentSymbols.pop();
      }
      this.recentSymbols.unshift(symbol);
      localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.recentSymbols));
    }
  }

  addSymbolPairToRecentSerached(symbolPair) {
    if (
      !this.recentSymbolPairs.find(
        obj => obj.sym1 == symbolPair.sym1 && obj.sym2 == symbolPair.sym2,
      )
    ) {
      if (this.recentSymbolPairs.length == 15) {
        this.recentSymbolPairs.pop();
      }
      this.recentSymbolPairs.unshift(symbolPair);
      localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.recentSymbolPairs));
    }
  }

  validateStrategyInputs() {
    let sample_frequency = this.strategy_inputs.model_inputs.sample_frequency;
    let start_date = this.strategy_inputs.model_inputs.start_date;
    let end_date = this.strategy_inputs.model_inputs.end_date;
    if (sample_frequency == 'days') {
      let day = 24 * 3600 * 1000;
      let date_diff = (end_date.getTime() - start_date.getTime()) / day;
      if (date_diff < 0) {
        this.error = true;
        this.errorMessage = "'from Date' should be before 'to Date'!";
      } else if (date_diff < 10) {
        this.error = true;
        this.errorMessage = "'from Date' and 'to Date' should be at least 10 days apart!";
      } else if (date_diff > 900) {
        this.error = true;
        this.errorMessage = "'from Date' and 'to Date' should be less than 900 days apart!";
      }
    }
    if (sample_frequency == 'weeks') {
      let week = 24 * 3600 * 1000 * 7;
      let date_diff = (end_date.getTime() - start_date.getTime()) / week;
      if (date_diff < 0) {
        this.error = true;
        this.errorMessage = "'from Date' should be before 'to Date'!";
      } else if (date_diff < 10) {
        this.error = true;
        this.errorMessage = "'from Date' and 'to Date' should be at least 10 weeks apart!";
      } else if (date_diff > 300) {
        this.error = true;
        this.errorMessage = "'from Date' and 'to Date' should be less than 300 weeks apart!";
      }
    }
  }

  onSymbolSelected(event) {
    this.strategy_inputs.model_inputs.symbol = event.value;
    this.getStrategyResult();
  }

  onRecentSymbolClick(symbol) {
    this.strategy_inputs.model_inputs.symbol = symbol;
    this.getStrategyResult();
  }

  clearOutputData() {
    this.responseChartData = null;
    this.error = false;
  }
}
