import { Component, Input, OnInit } from '@angular/core';
import { StrategyService } from '../services/strategy.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-sv-moneyflow1',
  templateUrl: './sv-moneyflow1.component.html',
  styleUrls: ['./sv-moneyflow1.component.scss']
})
export class SvMoneyflow1Component implements OnInit {
  @Input() isEditMode = false;

  // DEFAULT DATE RANGES for 'days' [FOR 'weeks' in 'days'/'weeks' DROPDOWN and CHECKS DONE IN RUN CLICK EVENT ]
  minStartDate = new Date('2015-04-12'); // 100 days from 2015-01-01
  maxStartDate = new Date(); // TODAY
  minEndDate = new Date('2015-05-01'); // 120 days from 2015-01-01
  maxEndDate = new Date(); // TODAY

  sampleFrequencies = [
    { id: 'days', name: 'days' },
    { id: 'weeks', name: 'weeks' },
  ]; // DAYS AND WEEKS DROPDOWN
  
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
  strategy_inputs;  // for working copy of inputs
  recentSymbols = [];

  // Model Inputs
  fieldSetCollapsed = true; // FIELD SET IS COLLAPSED BY DEFAULT

  // Validation Check
  error = false;
  errorMessage = '';

  // Output
  responseChartData: any; // FOR RESULT DF AS ROW ARRAY FROM BACK END

  constructor(
    private strategyService: StrategyService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    this.strategy_inputs = this.getCopyOfStdInputs();

    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.strategy_inputs.model_inputs.symbol = symbol;
    });

    this.loadRecentSearchedSymbols();
    if(this.isEditMode) {
      this.fieldSetCollapsed = false;
    } else {
      this.getStrategyResult();
    }
  }

  // Input and Model Synch and Get Output
  onSymbolSelected(event) {
    this.strategy_inputs.model_inputs.symbol = event.value;
  }

  onRecentSymbolClick(symbol) {
    this.strategy_inputs.model_inputs.symbol = symbol;
    this.getStrategyResult();
  }

  // GETS CHART DATA FROM BACKEND
  getStrategyResult() {
    this.responseChartData = null;
    this.error = false;
    this.validateStrategyInputs();
    if (!this.error) {
      this.fieldSetCollapsed = true;
      this.strategyService.executeStrategy(this.strategy_inputs).subscribe(res => {
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

  sampleFrequencyDropdownChange(event) {
    this.strategy_inputs.model_inputs.sample_frequency = event.value; // unwanted -SELECT- option
  }

  // Recent Symbol Related
  addSymbolToRecentSerached(symbol) {
    if (!this.recentSymbols.includes(symbol)) {
      if (this.recentSymbols.length == 15) {
        this.recentSymbols.pop();
      }
      this.recentSymbols.unshift(symbol);
      localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.recentSymbols));
    }
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

  clearRecentSymbols() {
    this.recentSymbols = [];
    localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.recentSymbols));
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
