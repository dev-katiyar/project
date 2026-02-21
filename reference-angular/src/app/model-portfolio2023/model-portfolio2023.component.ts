import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { PortfolioService } from '../services/portfolio.service';
import { ZachService } from '../services/zach.service';
import { LiveService } from '../services/live.service';
import { CommonUtils } from '../utils/common.utils';
import { ChartUtils } from '../utils/chart.utils';
import { DateUtils } from '../utils/dateutils';
import { Observable, Subject, Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-model-portfolio2023',
  templateUrl: './model-portfolio2023.component.html',
  styleUrls: ['./model-portfolio2023.component.scss'],
})
export class ModelPortfolio2023Component implements OnInit, OnChanges, OnDestroy {
  @Input() portfolio_type = 'riapro';
  @Input() portfolioData; // to receive all portfolio data
  @Input() addTxnBtnClickObs: Observable<void>;
  @Input() editTxnBtnClickObs: Observable<void>;
  addTxnBtnClickSub: Subscription;
  editTxnBtnClickSub: Subscription;
  isEditTxnModeActive = false;
  editingClonedTxns = {};
  isAddTradeDialogVisible = false;
  isAddTradeMultiDialogVisible = false;
  isNoPortfolioDivVisible = false;
  portfolioEditMode = 'Edit a Portfolio';
  newPositionEditing = false;
  changingValue: Subject<boolean> = new Subject();
  displayDialog = false;
  @Input() selectedPortfolio = {
    id: 0,
    name: '',
    transactions: [],
    currentCash: 0,
    portfolio_type: '',
    startingCash: 0,
  }; // TODO: TO BE DELETED
  yearlyChartData: any;
  quarterlyChartData: any;
  monthlyChartData: any;
  snapShotPortfolios = [{ id: 0, name: '-Select-' }];
  snapShotPortfolio = { name: '', startingCash: 0, transactions: [], isModel: 0, action: 'add' };
  fullDividendDetail = 0;
  fullEarningDetail = 0;
  sellTransactions = [];
  isChanged = true;
  activeTabIndex;
  portfolioDetails = {
    composition_by_asset: [],
    composition_by_sector: [],
    pnl: 0,
    dailyPnl: 0,
    dailyPnlPercentage: 0,
    pnlPercent: 0,
    portfolioValue: 0,
    interest: 0,
    dividend: 0,
    startingCash: 0,
    currentCash: 0,
    portfolioid: 0,
    name: '',
    portfolio_type: '',
  };
  title = '';
  portfolios: any; // TODO: TO BE DELETED
  newPortfolio = { name: '', startingCash: 0, action: 'add', isModel: 0 };
  editingPortfolio;
  cash_transactions = [];
  basicDetails = [];
  openPositions = [];
  closedPositions = [];
  techAlerts = {};
  fundamentalDetails = [];
  charts = [];
  //topSymbols = [];
  allSymbols = [];
  @Input() isAdminUser = 0;
  tab: number = 1;
  rowData: any;
  loading = false;
  showportfolioDetailsFlag = 1;
  frequency = 'yearly';
  barChartData: any;

  @Output() public reloadPotfolioData = new EventEmitter();

  constructor(
    private liveService: LiveService,
    private portfolioService: PortfolioService,
    private zachService: ZachService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private symbolPopupService: SymbolPopupService
  ) {}

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
    this.loading = false;
  }

  ngOnInit() {
    this.addTxnBtnClickSub = this.addTxnBtnClickObs.subscribe(() => this.onAddTxnBtnClick())
    this.editTxnBtnClickSub = this.editTxnBtnClickObs.subscribe(() => this.onEditTxnBtnClick())
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('portfolioData' in changes) {
      this.buildPositions(this.portfolioData);
      this.callSelectedIndex();
    }
  }

  ngOnDestroy(): void {
    this.addTxnBtnClickSub.unsubscribe();
    this.editTxnBtnClickSub.unsubscribe();
  }

  onTabChange(event) {
    this.activeTabIndex = event.index;
    this.callSelectedIndex();
  }

  callSelectedIndex() {
    if (this.activeTabIndex == 4 && this.isChanged) {
        this.changingValue.next(true);
        this.liveService.getUrlData("/modelportfolio/performance/" + this.selectedPortfolio.id).subscribe(d => this.setPerformanceData(d));
        this.isChanged = false;
    }
}

  deletePortfolio() {
    this.displayDialog = false;
    if (this.checkIfPortfolioCreated()) {
      this.loading = true;
      let portfolioToSave = {
        id: this.selectedPortfolio.id,
        action: 'delete',
        portfolio_type: this.portfolio_type,
      };
      this.loading = true;
      this.portfolioService
        .savePortfolio(portfolioToSave)
        .subscribe(data => this.loadSavedPortfolio(data));
    }
  }

  SaveImportedTransactions(event) {
    this.newPositionEditing = false;
    if (event.type === 'save') {
      let originalTransactions = [];
      let changedPortfolio = event.portfolio;
      let newTransactions = [];
      let updatedTransactions = [];
      let deletedTransactions = [];
      let changedTransactions = changedPortfolio.transactions.map(t => {
        t['date'] = DateUtils.formatDate(t['date']);
        return t;
      });

      newTransactions = changedTransactions.filter(t => t.id == 0);
      if (changedPortfolio.id != 0) {
        originalTransactions = this.selectedPortfolio.transactions;
        updatedTransactions = changedTransactions
          .filter(t => t.id != 0)
          .filter(t => !originalTransactions.some(t2 => CommonUtils.shallowEqual(t, t2)));
        deletedTransactions = originalTransactions.filter(
          t => !changedTransactions.some(t2 => t2.id == t.id),
        );
      }
      let portfolioToSave = {
        name: changedPortfolio.name,
        id: changedPortfolio.id,
        startingCash: changedPortfolio.startingCash,
        newTransactions: newTransactions,
        updatedTransactions: updatedTransactions,
        deletedTransactions: deletedTransactions,
        action: 'add',
        portfolio_type: this.portfolio_type,
      };
      this.loading = false;

      this.portfolioService
        .savePortfolio(portfolioToSave)
        .subscribe(data => this.loadSavedPortfolio(data));
    }
    if (event.type === 'cancel') {
      if (this.portfolios.length <= 0) {
        this.isNoPortfolioDivVisible = true;
      }
    }
  }

  checkIfPortfolioCreated() {
    if (this.selectedPortfolio.id == 0) {
      this.loading = false;
      this.showStatus({ status: 'info', message: 'Please create a portfolio first !' });
      return false;
    }
    return true;
  }

  portfolioChanged(event) {
    // TODO: TO BE DELETED
    this.selectedPortfolio = event.value;

    this.getPortfolioDetails();
    this.isChanged = true;
    this.callSelectedIndex();
  }

  createNewPortfolio() {
    this.newPositionEditing = true;
    this.editingPortfolio = {
      id: 0,
      name: '',
      transactions: [],
      currentCash: 0,
      portfolio_type: [],
      startingCash: 0,
    };
  }

  handleEditPortfolio() {
    if (this.checkIfPortfolioCreated()) {
      this.newPositionEditing = true;
      let clonedPortfolio = JSON.parse(JSON.stringify(this.selectedPortfolio));
      clonedPortfolio.transactions = clonedPortfolio.transactions.map(tr => {
        tr.date = DateUtils.StringtoDate(tr.date);
        return tr;
      });
      this.editingPortfolio = clonedPortfolio;
    }
  }

  loadSavedPortfolio(d) {
    let portfolioId = d.data.id;
    let portfolioName = d.data.name;
    let portfolio = this.portfolios.find(p => p.id == portfolioId);
    if (d.action == 'delete') {
      let portfolio = this.portfolios.find(p => p.id == portfolioId);
      this.portfolios.splice(this.portfolios.indexOf(portfolio), 1);
      this.portfolios = CommonUtils.deepClone(this.portfolios);
      this.showStatus({ status: 'info', message: 'Portfolio deleted !' });
    } else {
      if (!portfolio) {
        this.portfolios.push({ id: portfolioId, name: portfolioName });
      }
      this.selectedPortfolio = this.portfolios.find(p => p.id == portfolioId);
      this.portfolioChanged({ value: this.selectedPortfolio });
    }
  }

  showPortfolioDetails() {
    this.loading = false;
    this.setSymbols();
    this.showportfolioDetailsFlag = 1;
  }

  getPortfolioDetails() {
    this.loading = true;
    this.liveService
      .getUrlData('/modelportfolio/read/' + this.selectedPortfolio.id)
      .subscribe(d => this.buildPositions(d));
  }

  setPerformanceData(d) {
    if (d.yearly) {
      this.yearlyChartData = ChartUtils.getAllSeriesData(
        d.yearly,
        this.getSeries(d.names),
        'year',
        false,
      );
      this.quarterlyChartData = ChartUtils.getAllSeriesData(
        d.quarterly,
        this.getSeries(d.names),
        'quarter',
        false,
      );
      this.monthlyChartData = ChartUtils.getAllSeriesData(
        d.monthly,
        this.getSeries(d.names),
        'month',
        false,
      );
      this.frequencyChanged('quarterly');
    }
  }

  getSeries(names) {
    let series = [];
    for (let name of names) {
      let color = 'rgb(51, 157, 51)';
      if (name.includes('60/40 Index')) {
        color = 'lightcoral';
      } else if (name.includes('S&P')) {
        color = 'steelblue';
      }
      series.push({ name: name, data: [], color: color });
    }
    return series;
  }

  // Sets all symbols and top symbols based on position share
  setSymbols() {
    this.openPositions.sort((l, r): number => {
      if (l.sector == 'FixedIncome') return 1;
      if (r.sector == 'FixedIncome') return -1;
      // percentageShare
      if (l.percentageShare < r.percentageShare) return 1;
      if (l.percentageShare > r.percentageShare) return -1;
      return 0;
    });

    let listSymbols = [];
    for (let position of this.openPositions) {
      listSymbols.push(position.symbol);
    }

    this.allSymbols = listSymbols;
  }

  buildPositions(data) {
    this.isChanged = true;
    this.loading = false;
    this.techAlerts = data.techAlerts;
    this.portfolioDetails = data.portfolioDetails;

    // TODO: remove dependency on selectedPortfolio variable (or see how other component of data are being used like holding, tranction etc. )
    this.selectedPortfolio['id'] = this.portfolioDetails.portfolioid;
    this.selectedPortfolio['name'] = this.portfolioDetails.name;
    this.selectedPortfolio['currentCash'] = this.portfolioDetails.currentCash;
    this.selectedPortfolio['portfolio_type'] = this.portfolioDetails.portfolio_type;
    this.selectedPortfolio['startingCash'] = this.portfolioDetails.startingCash;

    let mktValue = 0;
    this.openPositions = data.openPositions;
    this.selectedPortfolio.transactions = data.transactions;
    this.cash_transactions = data.cash_transactions;
    this.closedPositions = data.closedPositions;
    this.basicDetails = data.basicDetails;

    for (let position of this.openPositions) {
      let basic = this.basicDetails[position['symbol']];
      if (basic != undefined) {
        position['name'] = basic['name'];
        position['sector'] = basic['sector'];
        position['industry'] = basic['industry'];
      }
      if (position['side'] == 'Buy') {
        position['type'] = 'Long';
      } else {
        position['type'] = 'Short';
      }
    }

    for (let position of this.openPositions) {
      position['percentageShare'] =
        (100 * position['currentValue']) / this.portfolioDetails.portfolioValue;
    }
    this.setSymbols();
    if (this.allSymbols != null && this.allSymbols.length > 0) {
      this.zachService.getZach(this.allSymbols).subscribe(d => this.fillFundamentalDetails(d));
    }
    for (let position of this.selectedPortfolio.transactions) {
      let basic = this.basicDetails[position['symbol']];
      this.fillBasicDetails(position);
    }
    for (let position of this.closedPositions) {
      let basic = this.basicDetails[position['symbol']];
      if (basic != undefined) {
        position['name'] = basic['name'];
      }
    }

    this.portfolioData.transactions = this.portfolioData.transactions.map(tr => {
      tr.date = DateUtils.StringtoDate(tr.date);
      return tr;
    });
    this.selectedPortfolio.startingCash = this.portfolioDetails.startingCash;
    this.selectedPortfolio.currentCash = this.portfolioDetails.currentCash;
  }

  fillFundamentalDetails(d) {
    this.fundamentalDetails = d;
    for (let pos of this.openPositions) {
      let modelDetail = this.fundamentalDetails.filter(t => t.symbol === pos.symbol);
      if (modelDetail.length > 0) {
        pos.dividendYield = modelDetail[0].dividendYield;
      }
    }
    for (let fundamental of this.fundamentalDetails) {
      this.fillBasicDetails(fundamental);
      let position = this.openPositions.filter(p => p.symbol === fundamental.symbol);
      if (position.length > 0) {
        fundamental['currentValue'] = position[0]['currentValue'];
      }
    }
  }

  fillBasicDetails(obj) {
    let symbol = obj['symbol'];
    let basic = this.basicDetails[symbol];
    if (basic != undefined) {
      obj['name'] = basic['name'];
      obj['sector'] = basic['sector'];
      obj['industry'] = basic['industry'];
      obj['currentPrice'] = basic['currentPrice'];
      obj['priceChange'] = basic['priceChange'];
      obj['changePct'] = basic['changePct'];
    }
  }

  setTab(tabN: number): void {
    this.tab = tabN;
  }

  onOpenLiveTrade() {
    // to be implemented
  }

  onAddToPortfolio() {
    // to be implemented, if needed. Else remove.
  }

  frequencyChanged(frequency) {
    this.frequency = frequency;
    if (frequency === 'yearly') {
      this.barChartData = this.yearlyChartData;
    }
    if (frequency === 'quarterly') {
      this.barChartData = this.quarterlyChartData;
    }
    if (frequency === 'monthly') {
      this.barChartData = this.monthlyChartData;
    }
  }

  techAlertsCount = 0;
  onAlertsLoaded(alertsCount) {
    this.techAlertsCount = alertsCount;
  }

  onTradeClick() {
    this.isAddTradeDialogVisible = true;
  }

  onTradingTicketCancelClick() {
    this.isAddTradeDialogVisible = false;
  }

  onTradingTicketSaveClick() {
    this.isAddTradeDialogVisible = false;
    this.portfolioChanged({ value: this.selectedPortfolio });
  }

  onTradeMultiClick() {
    // TODO: To be place in transactions tab?
    this.isAddTradeMultiDialogVisible = true;
  }

  onTradingTicketMultiCancelClick() {
    this.isAddTradeMultiDialogVisible = false;
  }

  onTradingTicketMultiSaveClick() {
    this.isAddTradeMultiDialogVisible = false;
    this.portfolioChanged({ value: this.selectedPortfolio });
  }

  // keeping Plaid code seggregated, in case need to make new component
  isLinkPortfolioPlaidVisible = false;

  onLinkPortfoliosClick() {
    this.isLinkPortfolioPlaidVisible = true;
    this.isNoPortfolioDivVisible = false;
  }

  onAddTxnBtnClick() {
    this.activeTabIndex = 2;  // txns tab
  }

  onEditTxnBtnClick() {
    this.activeTabIndex = 2;  // txns tab
    this.isEditTxnModeActive = true;
    this.editingClonedTxns = {};
  }

  onEditTxnDoneBtnClick() {
    this.isEditTxnModeActive = false;
    this.editingClonedTxns = {};
    this.reloadPotfolioData.emit(this.portfolioDetails);
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
