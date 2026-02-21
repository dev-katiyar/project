import { Component, OnInit, ViewChild } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { StrategyService } from '../services/strategy.service';
import { ConfirmationService } from 'primeng/api';
import { StrategyBuilderComponent } from '../strategy-builder/strategy-builder.component';
import { CommonUtils } from '../utils/common.utils';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-strategy-dashboard',
  templateUrl: './strategy-dashboard.component.html',
  styleUrls: ['./strategy-dashboard.component.scss'],
})
export class StrategyDashboardComponent implements OnInit {
  // show and hide selected portfolio details
  showMinimalView = false;
  showCreateUserStg = false;

  // in case anyone needs it like header text, else user and sv strategy handled separatel
  selectedStg;

  // SV 1 Symbol Price Money Flow Related (Default Symbol)
  svPxStgTicker = 'AAPL';
  svPxStgRecentTickers = [];

  // SV 2 Symbol Price Ratio Money Flow Related (Default Symbols)
  svRatioStgTicker1 = 'AAPL';
  svRatioStgTicker2 = 'SPY';
  svRatioStgRecentTickers = [];

  // SV Strategies
  svStrategies = [
    { name: 'SV Money Flow Daily', id: 'svPriceMF' },
    { name: 'SV 2 Symbol Money Flow Daily', id: 'svRatioMF' },
    { name: 'SV Money Flow Weekly', id: 'svWeeklyPriceMF' },
  ];
  selectedSVStg;
  shouldOpenInEditMode = false;

  // User Stratgies
  userStrategies = [];
  selectedUserStg;
  newUserStg = {
    id: null,
    name: 'New Strategy',
    image: '',
    description: '',
    isDebug: true, // gets all the columns in df, when true
    symbol: 'SPY',
    start_date: new Date(),
    end_date: new Date(),
    buy_operator: '',
    sell_operator: '',
    buy_conditions: { selected_condition: 'and', strategy_list: [] },
    sell_conditions: { selected_condition: 'and', strategy_list: [] },
    chart_conditions: {},
  };

  // Save User Strategy Related
  @ViewChild('stgBuilderRef', { static: false }) stgBuilder!: StrategyBuilderComponent;
  displaySaveDialog = false;
  stgToSave;

  constructor(
    private notificationService: NotificationService,
    private strategyService: StrategyService,
    private confirmationService: ConfirmationService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit(): void {
    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.svPxStgTicker = symbol;
    });
    // this.selectedSVStg = this.svStrategies[0];
    // this.selectedStg = this.selectedSVStg;
    this.strategyService.getSavedStrategiesOfUser().subscribe(data => this.setPresetValues(data));
    this.loadRecentSearchedSymbols();
    this.loadRecentSearchedSymbolPairs();
  }

  // SV Strategy
  runSVStrategy(stg) {
    // On Run Strategy button click
    this.selectedSVStg = stg;
    this.selectedStg = this.selectedSVStg;
    this.selectedUserStg = null;
    this.showCreateUserStg = false;
    if (this.selectedSVStg.id === 'svPriceMF') {
      this.svPxStgRunBtnClicked();
    }

    if (this.selectedSVStg.id === 'svRatioMF') {
      this.svRatioStgRunBtnClicked();
    }

    if (this.selectedSVStg.id === 'svWeeklyPriceMF') {
      this.svWklyPxStgRunBtnClicked();
    }
  }

  // SV 1 Symbol - Actions
  svPxStgEditBtnClicked() {
    this.selectSVPxStg();
    this.shouldOpenInEditMode = true;
  }

  svPxStgRunBtnClicked() {
    this.selectSVPxStg();
    this.shouldOpenInEditMode = false;
  }

  selectSVPxStg() {
    this.showMinimalView = true;
    this.selectedUserStg = null;
    this.selectedSVStg = this.svStrategies[0]; // Hard Coding Alert
    this.selectedStg = this.selectedSVStg;
    this.showCreateUserStg = false;
  }

  // SV 1 Symbol - Recents
  loadRecentSearchedSymbols() {
    let userRecents = JSON.parse(localStorage.getItem('svmfRecentSymbols'));
    if (!userRecents) {
      this.svPxStgRecentTickers = ['AAPL'];
      localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.svPxStgRecentTickers));
    } else {
      this.svPxStgRecentTickers = userRecents;
    }
  }

  clearSVPxStgRecentSymbols() {
    this.svPxStgRecentTickers = [];
    localStorage.setItem('svmfRecentSymbols', JSON.stringify(this.svPxStgRecentTickers));
  }

  onRecentSymbolClick(symbol) {
    this.svPxStgTicker = symbol;
    this.svPxStgRunBtnClicked();
  }

  // SV 2 Symbol - Actions
  svRatioStgEditBtnClicked() {
    this.selectSVRatioStg();
    this.shouldOpenInEditMode = true;
  }

  svRatioStgRunBtnClicked() {
    this.selectSVRatioStg();
    this.shouldOpenInEditMode = false;
  }

  selectSVRatioStg() {
    this.showMinimalView = true;
    this.selectedUserStg = null;
    this.selectedSVStg = this.svStrategies[1]; // Hardcoding Alert
    this.selectedStg = this.selectedSVStg;
    this.showCreateUserStg = false;
  }

  // SV 2 Symbol Ratio - Recents
  loadRecentSearchedSymbolPairs() {
    let userRecentPairs = JSON.parse(localStorage.getItem('svmfRecentSymbolPairs'));
    if (!userRecentPairs) {
      this.svRatioStgRecentTickers = [{ sym1: 'AAPL', sym2: 'SPY' }];
      localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.svRatioStgRecentTickers));
    } else {
      this.svRatioStgRecentTickers = userRecentPairs;
    }
  }

  clearRecentSymbolPairs() {
    this.svRatioStgRecentTickers = [];
    localStorage.setItem('svmfRecentSymbolPairs', JSON.stringify(this.svRatioStgRecentTickers));
  }

  onRecentSymbolPairClick() {
    this.svRatioStgRunBtnClicked();
  }

  // SV 3 Symbol Weekly Price - Actions
  svWklyPxStgRunBtnClicked() {
    this.showMinimalView = true;
    this.selectedUserStg = null;
    this.selectedSVStg = this.svStrategies[2]; // Hard Coding Alert
    this.selectedStg = this.selectedSVStg;
    this.showCreateUserStg = false;
  }

  // Load User Strategies receieved from Server
  setPresetValues(stgs) {
    this.userStrategies = stgs;
    this.selectedSVStg = null;
    this.showCreateUserStg = false;
  }

  selectFirstUserStrategy() {
    this.selectedUserStg = this.userStrategies[0];
    this.selectedStg = this.selectedUserStg;
  }

  runUserStrategy(stg) {
    this.showMinimalView = true;
    this.selectedUserStg = stg;
    this.selectedStg = this.selectedUserStg;
    this.selectedSVStg = null;
    this.showCreateUserStg = false;
  }

  // Create User Strategies
  onNewStrategyClick() {
    this.showMinimalView = true;
    this.selectedSVStg = null;
    this.selectedUserStg = null;
    this.showCreateUserStg = true;

    // DEFAULT test_period IS 366 DAYS
    const currentDate = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(currentDate.getFullYear() - 1);

    this.newUserStg.start_date = oneYearAgo;
    this.newUserStg.end_date = currentDate;

    this.selectedStg = this.newUserStg;
  }

  onCloseStrategyClick() {
    this.selectedSVStg = null;
    this.selectedUserStg = null;
    this.showCreateUserStg = false;
    this.showMinimalView = false;
  }

  deleteSelectedStrategyConfirm(event, stg) {
    this.confirmationService.confirm({
      target: event.target,
      message: 'Are you sure that you want to delete this strategy?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        //confirm action - call backend to delete
        this.deleteSelectedStrategy(stg);
      },
      reject: () => {
        //reject action - none
      },
    });
  }

  deleteSelectedStrategy(stg) {
    this.strategyService.deleteStrategyById(stg.id).subscribe(data => {
      if (data['status'] == 'ok') {
        this.notificationService.showStatus({ status: 'success', message: data['reason'] });
        this.userStrategies = this.userStrategies.filter(item => item.id != stg.id);
        this.onCloseStrategyClick();
      } else {
        this.notificationService.showError('Something went wrong! Please contact support');
      }
    });
  }

  // Save new
  saveUserStg() {
    this.displaySaveDialog = true;
    this.stgToSave = CommonUtils.deepClone(this.stgBuilder.strategy_inputs);
  }

  saveStartegy() {
    this.stgToSave.buy_conditions.strategy_list.forEach(strategy => {
      strategy.strategies = [];
    });
    this.stgToSave.sell_conditions.strategy_list.forEach(strategy => {
      strategy.strategies = [];
    });
    this.stgToSave.chart_conditions = {};

    this.strategyService
      .saveStrategyForUser(this.stgToSave)
      .subscribe(data => this.setSavedStrategyData(data));
    this.displaySaveDialog = false;
  }

  setSavedStrategyData(data) {
    if (data.status == 'ok') {
      this.notificationService.showStatus({ status: 'success', message: data['reason'] });
      this.strategyService.getSavedStrategiesOfUser().subscribe(data => {
        this.setPresetValues(data);
        this.selectFirstUserStrategy();
      });
    } else {
      this.notificationService.showError({
        status: 'error',
        message: 'Something went wrong! Please try again!',
      });
    }
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
