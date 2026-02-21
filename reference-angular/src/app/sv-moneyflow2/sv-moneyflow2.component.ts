import { Component, Input, OnInit } from '@angular/core';
import { StrategyService } from '../services/strategy.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-sv-moneyflow2',
  templateUrl: './sv-moneyflow2.component.html',
  styleUrls: ['./sv-moneyflow2.component.scss'],
})
export class SvMoneyflow2Component implements OnInit {
  @Input() isEditMode = false;

  // DEFAULT DATE RANGES for 'days' [FOR 'weeks' in 'days'/'weeks' DROPDOWN and CHECKS DONE IN RUN CLICK EVENT ]
  minStartDate = new Date('2015-04-12'); // 100 days from 2015-01-01
  maxStartDate = new Date(); // TODAY
  minEndDate = new Date('2015-05-01'); // 120 days from 2015-01-01
  maxEndDate = new Date(); // TODAY

  // DAYS AND WEEKS DROPDOWN
  sampleFrequencies = [
    { id: 'days', name: 'days' },
    { id: 'weeks', name: 'weeks' },
  ];

  // DEFAULTS VALUES for INPUTS TO MODEL & STRATEGY
  strategy_inputs_std = {
    model_inputs: {
      symbol: 'AAPL',
      symbol1: 'AAPL',
      symbol2: 'SPY',
      start_date: '',
      end_date: '',
      test_period: 366,
      sample_frequency: 'days',
    },
    ria_pro_inputs: {
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
    },
  };
  strategy_inputs;

  recentSymbolPairs = [];

  // Validation Check
  error = false;
  errorMessage = '';

  // Output
  responseChartData: any; // FOR RESULT DF AS ROW ARRAY FROM BACK END

  // Chart Options Config
  chartSettingsPairMF = {
    chartTitle: `MoneyFlow Indicator`,
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
        name: 'Price Ratio',
        opposite: false,
        pane: 0,
        tickPositioner: function () {
          // Limits and Ticks
          var positions = [],
            tick = Math.floor(this.dataMin * 100) / 100,
            increment = Math.ceil(((this.dataMax - this.dataMin) * 100) / 6) / 100;

          if (this.dataMax !== null && this.dataMin !== null) {
            for (tick; tick - increment <= this.dataMax; tick += increment) {
              positions.push(Math.round(tick * 100) / 100);
            }
          }
          return positions;
        },
        tickPositions: undefined,
        type: 'line',
        yAxis: 0,
      },
      {
        id: 'ria',
        name: 'SV MF',
        opposite: false,
        pane: 1,
        tickPositioner: undefined,
        tickPositions: [0, 20, 50, 80, 100],
        type: 'line',
        yAxis: 1,
        yAixsTitle: 'SV MF & Signal',
        color: '#dd7612',
      },
      {
        id: 'ria_trigger',
        name: 'SV MF Signal',
        opposite: false,
        pane: 1,
        tickPositioner: undefined,
        tickPositions: [0, 20, 50, 80, 100],
        type: 'line',
        yAxis: 1,
        yAixsTitle: 'SV MF & Signal',
        color: '#782ca8',
      },
      {
        id: 'ria_diff',
        name: 'SV MF Diff',
        opposite: true,
        pane: 1,
        tickPositioner: undefined,
        tickPositions: [-50, 0, 50],
        type: 'column',
        yAxis: 2,
      },
      {
        id: 'macd',
        name: 'MACD',
        opposite: false,
        pane: 2,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(4);
          return [-max, 0, max];
        },
        tickPositions: undefined,
        type: 'line',
        yAxis: 3,
        yAixsTitle: 'MACD & Signal',
        color: 'black',
      },
      {
        id: 'macd_trigger',
        name: 'MACD Signal',
        opposite: false,
        pane: 2,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(4);
          return [-max, 0, max];
        },
        tickPositions: undefined,
        type: 'line',
        yAxis: 3,
        yAixsTitle: 'MACD & Signal',
        color: 'blue',
      },
      {
        id: 'macd_diff',
        name: 'MACD Diff',
        opposite: true,
        pane: 2,
        tickPositioner: function () {
          // Limits and Ticks
          var max = Math.max(Math.abs(this.dataMax), Math.abs(this.dataMin)).toFixed(4);
          return [-max, 0, max];
        },
        tickPositions: undefined,
        type: 'column',
        yAxis: 4,
      },
      {
        id: 'stoch',
        name: 'Stochastic',
        opposite: false,
        pane: 3,
        tickPositioner: undefined,
        tickPositions: [0, 20, 50, 80, 100],
        type: 'line',
        yAxis: 5,
        yAixsTitle: 'Stoch & Signal',
        color: '#004D4D',
      },
      {
        id: 'stoch_trigger',
        name: 'Stochastic Signal',
        opposite: false,
        pane: 3,
        tickPositioner: undefined,
        tickPositions: [0, 20, 50, 80, 100],
        type: 'line',
        yAxis: 5,
        yAixsTitle: 'Stoch & Signal',
        color: '#96640F',
      },
      {
        id: 'stoch_diff',
        name: 'Stochastic Diff',
        opposite: true,
        pane: 3,
        tickPositioner: undefined,
        tickPositions: [-50, 0, 50],
        type: 'column',
        yAxis: 6,
      },
    ],
  };

  // Model Inputs
  fieldSetCollapsed = true; // FIELD SET IS COLLAPSED BY DEFAULT

  constructor(
    private strategyService: StrategyService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.strategy_inputs = this.getCopyOfStdInputs();

    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.strategy_inputs.model_inputs.symbol = symbol;
    });

    this.loadRecentSearchedSymbolPairs();
    if(this.isEditMode) {
      this.fieldSetCollapsed = false;
    } else {
      this.getStrategyResultPairRatio();
    }
  }

  // Recent Symbol Management Related
  loadRecentSearchedSymbolPairs() {
    let userRecentPairs = JSON.parse(localStorage.getItem('svmfRecentSymbolPairs'));
    if (!userRecentPairs) {
      this.recentSymbolPairs = [{ sym1: 'AAPL', sym2: 'SPY' }];
      localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.recentSymbolPairs));
    } else {
      this.recentSymbolPairs = userRecentPairs;
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

  clearRecentSymbolPairs() {
    this.recentSymbolPairs = [];
    localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.recentSymbolPairs));
  }

  // Manage Input chagnes from UI to model
  onPairSymbol1Selected(event) {
    this.strategy_inputs.model_inputs.symbol1 = event.value;
  }

  onPairSymbol2Selected(event) {
    this.strategy_inputs.model_inputs.symbol2 = event.value;
  }

  sampleFrequencyDropdownChange(event) {
    this.strategy_inputs.model_inputs.sample_frequency = event.value; // unwanted -SELECT- option
  }

  // GETS CHART DATA FROM BACKEND - based on inputs
  getStrategyResultPairRatio() {
    this.responseChartData = null;
    this.error = false;
    this.validateStrategyInputs();
    const symbol1 = this.strategy_inputs.model_inputs.symbol1;
    const symbol2 = this.strategy_inputs.model_inputs.symbol2;
    if (symbol1 == symbol2) {
      this.error = true;
      this.errorMessage = 'Both Symbols cannot be same!';
    }
    if (!this.error) {
      this.fieldSetCollapsed = true;
      this.strategyService.executeStrategyForPairRatio(this.strategy_inputs).subscribe(res => {
        if (res['status'] != 'failed') {
          this.responseChartData = res;
          const smybolPair = {
            sym1: symbol1,
            sym2: symbol2,
          };
          this.chartSettingsPairMF.chartTitle = `MoneyFlow Indicator (${symbol1}/${symbol2})`;
          this.addSymbolPairToRecentSerached(smybolPair);
        } else {
          this.notificationService.showError(res['message']);
        }
      });
    }
  }

  onRecentSymbolPairClick(symbolPair) {
    this.strategy_inputs.model_inputs.symbol1 = symbolPair.sym1;
    this.strategy_inputs.model_inputs.symbol2 = symbolPair.sym2;
    this.getStrategyResultPairRatio();
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

  resetModelInputs() {
    this.responseChartData = null;
    this.strategy_inputs = this.getCopyOfStdInputs();
  }

  getCopyOfStdInputs() {
    const stgInputs = JSON.parse(JSON.stringify(this.strategy_inputs_std));

    // DEFAULT test_period IS 366 DAYS
    const currentDate = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(currentDate.getFullYear() - 1);

    stgInputs.model_inputs.start_date = oneYearAgo;
    stgInputs.model_inputs.end_date = currentDate;

    return stgInputs;
  }
}
