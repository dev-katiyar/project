import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonUtils } from '../utils/common.utils';
import { TooltipModule } from 'primeng/tooltip';
import { StrategyService } from '../services/strategy.service';
import { NotificationService } from '../services/notification.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ChartUtils } from '../utils/chart.utils';
import { RIAConstants } from '../utils/ria.constants';

@Component({
  selector: 'app-strategy-builder',
  templateUrl: './strategy-builder.component.html',
  styleUrls: ['./strategy-builder.component.css'],
})
export class StrategyBuilderComponent implements OnInit, OnChanges {
  @Input() strategy_inputs_org;
  strategy_inputs;

  error = false;
  recentSymbols = [];
  stgData;
  stgCols;
  displaySaveDialog = false;
  isAdminUser = 1;
  responseChartData: any;
  screenImages;

  stg_chart_settings;
  indicators;
  savedUserStrategies;
  selectedSavedUserStrategyId;
  DEFAULT_OPTION = { name: RIAConstants.DEFAULT_SELECT_TEXT, id: RIAConstants.DEFAULT_OPTION_ID };
  DEFAULT_OPTION_ID = RIAConstants.DEFAULT_OPTION_ID;
  isDeleteHidden = true;
  // isStgParamsCollapsed = false;

  constructor(
    private strategyService: StrategyService,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadRecentSearchedSymbols();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.strategy_inputs_org) {
      this.strategy_inputs = this.getCopyOfInputs();
      if (!this.indicators) {
        this.strategyService.getListOfIndicators().subscribe(res => {
          this.setIndicatorData(res);
          if (this.strategy_inputs.id) {
            this.setSelectedStrategyInputs(this.strategy_inputs);
            this.runStrategy();
          }
        });
      } else {
        if (this.strategy_inputs.id) {
          this.setSelectedStrategyInputs(this.strategy_inputs);
          this.runStrategy();
        }
      }
    }
  }

  getCopyOfInputs() {
    const stgInputs = JSON.parse(JSON.stringify(this.strategy_inputs_org));

    stgInputs.start_date = new Date(stgInputs.start_date);
    stgInputs.end_date = new Date(stgInputs.end_date);

    return stgInputs;
  }

  loadRecentSearchedSymbols() {
    let userRecents = JSON.parse(localStorage.getItem('stgRecentSymbols'));
    if (!userRecents) {
      this.recentSymbols = ['SPY'];
      localStorage.setItem('stgRecentSymbols', JSON.stringify(this.recentSymbols));
    } else {
      this.recentSymbols = userRecents;
    }
  }

  addSymbolToRecentSerached(symbol) {
    if (!this.recentSymbols.includes(symbol)) {
      if (this.recentSymbols.length == 15) {
        this.recentSymbols.pop();
      }
      this.recentSymbols.unshift(symbol);
      localStorage.setItem('stgRecentSymbols', JSON.stringify(this.recentSymbols));
    }
  }

  clearRecentSymbols() {
    this.recentSymbols = [];
    localStorage.setItem('stgRecentSymbols', JSON.stringify(this.recentSymbols));
  }

  onRecentSymbolDropdownChange(symbol) {
    this.strategy_inputs.symbol = symbol;
    this.runStrategy();
  }

  setIndicatorData(res) {
    this.indicators = res;
    this.indicators.forEach(function (indicator) {
      let strategies = indicator['strategies'];
      indicator['selected_strategy'] = {
        key: '-1',
        type: '',
        settings: [],
        selected_option: { key: '-1', value: '' },
      };
      strategies.forEach(function (strategy) {
        if (strategy['options']) {
          strategy['options'].unshift({ key: '-1', name: '--select--' });
        }
      });
      strategies.unshift({ key: '-1', name: '--select--' });
    });
  }

  setSelectedStrategyInputs(selectedStrageyParams) {
    // need to fill back the list of the strategies, as these were removed before saving.
    if (selectedStrageyParams) {
      // its better to fill back latest, as over time some options/indcators might be addeed/rmoved/renamed.
      this.strategy_inputs.buy_conditions = selectedStrageyParams['buy_conditions'];
      this.strategy_inputs.buy_conditions.strategy_list.forEach(selectedStg => {
        let indicator = this.indicators.find(ind => ind.key == selectedStg.key);
        if (indicator) {
          selectedStg['strategies'] = indicator.strategies;
        } else {

        }
      });
      this.strategy_inputs.sell_conditions = selectedStrageyParams['sell_conditions'];
      this.strategy_inputs.sell_conditions.strategy_list.forEach(selectedStg => {
        let indicator = this.indicators.find(ind => ind.key == selectedStg.key);
        if (indicator) {
          selectedStg['strategies'] = indicator.strategies;
        } else {

        }
      });
      this.strategy_inputs.chart_conditions = selectedStrageyParams['chart_conditions'];
    }
  }

  onSymbolSelected(event) {
    this.strategy_inputs.symbol = event.value;
  }

  runStrategy() {
    // this.isStgParamsCollapsed = true;
    let strategyParams = CommonUtils.deepClone(this.strategy_inputs);
    strategyParams.buy_conditions.strategy_list.forEach(buy => {
      buy['strategies'] = [];
    });
    strategyParams.sell_conditions.strategy_list.forEach(sell => {
      sell['strategies'] = [];
    });
    this.stgData = null;
    this.stg_chart_settings = null;
    this.strategyService.getOutputDataForStrategyInputs(strategyParams).subscribe(d => {
      this.setStgData(d);
      this.addSymbolToRecentSerached(strategyParams.symbol);
    });
    this.stg_chart_settings = ChartUtils.getStrategyChartSettings(strategyParams);
  }

  runSavedStrategy() {
    // this.isStgParamsCollapsed = true;
    let selectedStrategyParams = this.savedUserStrategies.find(
      item => item.id == this.selectedSavedUserStrategyId,
    );
    selectedStrategyParams = CommonUtils.deepClone(selectedStrategyParams);
    selectedStrategyParams.start_date = new Date(
      new Date().setFullYear(new Date().getFullYear() - 1),
    );
    selectedStrategyParams.end_date = new Date();
    this.stgData = null;
    this.stg_chart_settings = null;
    this.strategyService
      .getOutputDataForStrategyInputs(selectedStrategyParams)
      .subscribe(d => this.setStgData(d));
    this.stg_chart_settings = ChartUtils.getStrategyChartSettings(selectedStrategyParams);
  }

  deleteSavedStrategy() {
    this.strategyService.deleteStrategyById(this.selectedSavedUserStrategyId).subscribe(data => {
      if (data['status'] == 'ok') {
        this.notificationService.showStatus({ status: 'success', message: data['reason'] });
        this.savedUserStrategies = this.savedUserStrategies.filter(
          item => item.id != this.selectedSavedUserStrategyId,
        );
      } else {
        this.notificationService.showError('Something went wrong! Please try again.');
      }
      this.onResetButtonClick();
    });
  }

  setStgData(data) {
    this.stgData = data;
    if (this.stgData) {
      this.stgCols = [
        { field: 'date', header: 'date' },
        { field: 'symbol', header: 'symbol' },
        { field: 'close', header: 'close' },
        { field: 'buy_rating', header: 'buy_rating' },
        { field: 'sell_rating', header: 'sell_rating' },
        { field: 'action', header: 'action' },
      ];
    }
  }

  saveDialogBox() {
    this.displaySaveDialog = true;
  }

  saveStartegy() {
    let strategyParams = CommonUtils.deepClone(this.strategy_inputs);
    strategyParams.buy_conditions.strategy_list.forEach(strategy => {
      strategy.strategies = [];
    });
    strategyParams.sell_conditions.strategy_list.forEach(strategy => {
      strategy.strategies = [];
    });
    strategyParams.chart_conditions = {};

    this.strategyService
      .saveStrategyForUser(strategyParams)
      .subscribe(data => this.setSavedStrategyData(data));
    this.displaySaveDialog = false;
  }

  setSavedStrategyData(data) {
    if (data.status == 'ok') {
      this.notificationService.showStatus({ status: 'success', message: data['reason'] });
    } else {
      this.notificationService.showError({
        status: 'error',
        message: 'Something went wrong! Please try again!',
      });
    }
  }

  onSavedStrategyDropdownChange(selectedSavedUserStrategyId) {
    this.isDeleteHidden = selectedSavedUserStrategyId == this.DEFAULT_OPTION_ID;
    this.resetStrategyParams();

    if (selectedSavedUserStrategyId != this.DEFAULT_OPTION_ID) {
      let selectedSavedStrategy = this.savedUserStrategies.find(
        item => item.id == selectedSavedUserStrategyId,
      );
      selectedSavedStrategy = CommonUtils.deepClone(selectedSavedStrategy);
      this.setSelectedStrategyInputs(selectedSavedStrategy);
    }
  }

  resetStrategyParams() {
    this.stgData = null;
    this.stg_chart_settings = null;

    this.strategy_inputs.buy_conditions.selected_condition = 'and';
    this.strategy_inputs.buy_conditions.strategy_list = [];
    this.strategy_inputs.sell_conditions.selected_condition = 'and';
    this.strategy_inputs.sell_conditions.strategy_list = [];
  }

  onResetButtonClick() {
    this.resetStrategyParams();
    this.selectedSavedUserStrategyId = this.DEFAULT_OPTION_ID;
  }

  resetStgInputs() {
     this.strategy_inputs = this.getCopyOfInputs();
  }
}
