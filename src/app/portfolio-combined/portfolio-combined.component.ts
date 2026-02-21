import { Component, Input, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PortfolioService } from '../services/portfolio.service';
import { Subject, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-portfolio-combined',
  templateUrl: './portfolio-combined.component.html',
  styleUrls: ['./portfolio-combined.component.scss'],
})
export class PortfolioCombinedComponent implements OnInit {
  @Input() portfolioViewType = 'sv';

  // summary data from server
  svPortfoliosSumm: any;
  svPortfoliosSummUpdatedAt = '';
  svRoboPortfoliosSumm: any;
  svRoboPortfoliosSummUpdatedAt = '';
  userPortfoliosSumm: any;
  userPortfoliosSummUpdatedAt = '';
  tpaPortfoliosSumm: any;
  tpaPortfoliosSummUpdatedAt = '';
  aiXgbPortfoliosSumm: any;
  aiXgbPortfoliosSummUpdatedAt = '';

  // show and hide selected portfolio details
  showMinimalView = false;
  selectedPortfolio;
  selectedPortfolioData;

  // edit portfolio details
  showEditPortfolio = false;
  editPortfolioError: any;
  editPortfolioNewName;
  editPortfolioNewStatingCash;

  // create new portfolio
  isCreateNewPortfolioMode = false;

  // add transaction(s)
  isAddTradeMultiDialogVisible = false;
  addTxnsSubject: Subject<void> = new Subject<void>();

  // edit transaction(s)
  isEditTradeDialogVisible = false;
  editTxnsSubject: Subject<void> = new Subject<void>();

  // portfolio data sent from URL
  urlParamPortId;
  urlParamPortType;

  // check if amdin for the selected portfolio
  isAdminUser = 0;

  // view type for TPA Portfolios
  tpaViewType = 'non_user';

  constructor(
    private liveService: LiveService,
    private confirmationService: ConfirmationService,
    private portfolioService: PortfolioService,
    private messageService: MessageService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const urlPortId = params['selPortId'];
      const urlPortType = params['selPortType'];

      if (urlPortId) {
        this.urlParamPortId = urlPortId;
      }

      if (urlPortType) {
        this.urlParamPortType = urlPortType;
      }
    });

    if (this.portfolioViewType === 'sv') {
      this.loadSVViewData();
    }

    if (this.portfolioViewType === 'tpa-research') {
      this.loadTPAViewData();
    }

    if (this.portfolioViewType.includes('model_')) {
      this.loadAiXgbAViewData();
    }
  }

  loadSVViewData() {
    forkJoin([
      this.liveService.getUrlData('/modelportfolio/read/summary/riapro'),
      this.liveService.getUrlData('/modelportfolio/read/summary/riapro_robo'),
      this.liveService.getUrlData('/modelportfolio/read/summary/user'),
    ]).subscribe(([svRes, svRoboRes, userRes]) => {
      this.svPortfoliosSumm = svRes['port_summ'];
      this.svPortfoliosSummUpdatedAt = svRes['updated_at'];
      this.svRoboPortfoliosSumm = svRoboRes['port_summ'];
      this.svRoboPortfoliosSummUpdatedAt = svRoboRes['updated_at'];
      this.userPortfoliosSumm = userRes['port_summ'];
      this.userPortfoliosSummUpdatedAt = userRes['updated_at'];
      if (this.urlParamPortType && this.urlParamPortId) {
        this.setIsAdminUserAndReload(this.urlParamPortType, this.urlParamPortId);
      }
    });
  }

  loadTPAViewData() {
    this.liveService.getUrlData('/modelportfolio/read/summary/tpa-research').subscribe(tpaRes => {
      this.tpaPortfoliosSumm = tpaRes['port_summ'];
      this.tpaPortfoliosSummUpdatedAt = tpaRes['updated_at'];
    });
  }

  loadAiXgbAViewData() {
    this.liveService
      .getUrlData('/modelportfolio/read/summary/' + this.portfolioViewType)
      .subscribe(aiXgb => {
        this.aiXgbPortfoliosSumm = aiXgb['port_summ'];
        this.aiXgbPortfoliosSummUpdatedAt = aiXgb['updated_at'];
      });
  }

  // shows latest portfolio details on the right
  onPortfolioClick(portfolio) {
    this.selectedPortfolio = portfolio;
    this.selectedPortfolioData = null;
    this.setIsAdminUserAndReload(
      this.selectedPortfolio?.portfolio_type,
      this.selectedPortfolio.portfolioid,
    );
  }

  setIsAdminUserAndReload(portType, portId) {
    this.isAdminUser = 0;
    if (portType == 'user') {
      this.isAdminUser = 1;
      this.reloadSelectedPortfolioData(portId);
    } else if (portType == 'tpa-research') {
      this.liveService.getUrlData('/user/tpaAmdin').subscribe(d => {
        this.tpaViewType = d['viewType'];
        if (this.tpaViewType == 'admin') {
          this.isAdminUser = 1;
          this.reloadSelectedPortfolioData(portId);
        } else if (['sv_tpa_user', 'tpa_only_user'].includes(this.tpaViewType)) {
          this.isAdminUser = 0;
          this.reloadSelectedPortfolioData(portId);
        } else {
          this.tpaViewType = 'none';
        }
      });
    } else if (portType == 'riapro' || portType == 'riapro_robo' || portType.includes('model_')) {
      this.liveService.getUrlData('/user/isAdmin').subscribe(d => {
        this.isAdminUser = d['userType'];
        this.reloadSelectedPortfolioData(portId);
      });
    }
  }

  reloadSelectedPortfolioData(pId) {
    this.showMinimalView = true;
    this.showEditPortfolio = false;
    this.liveService.getUrlData('/modelportfolio/read/' + pId).subscribe(d => {
      this.selectedPortfolioData = d;
      // update the side view with latest data
      this.selectedPortfolio = this.selectedPortfolioData.portfolioDetails;
    });
  }

  onEditPortfolioClick() {
    this.editPortfolioNewName = this.selectedPortfolio.name;
    this.editPortfolioNewStatingCash = this.selectedPortfolio.startingCash;
    this.showEditPortfolio = !this.showEditPortfolio;
  }

  onCancelEditPortfolioClick() {
    this.showEditPortfolio = false;
  }

  onUpdateEditPortfolioClick() {
    // client side validation
    const err = this.validatePortfolioForSave();

    if (err) {
      this.editPortfolioError = err;
      return;
    }

    // save only if valid
    const port_data = {
      name: this.editPortfolioNewName,
      startingCash: this.editPortfolioNewStatingCash,
    };

    this.liveService
      .putRequest('/modelportfolio/update/' + this.selectedPortfolio.portfolioid, port_data)
      .subscribe(d => {
        // server side validation or issue can also send error, means failure
        if (d && d.hasOwnProperty('error')) {
          this.editPortfolioError = d['error'];
        } else {
          this.showEditPortfolio = false;
          this.editPortfolioError = '';
          this.messageService.add({
            severity: 'success',
            summary: 'Portfolio Updated',
            detail: 'The selected portfolio has been updated successfully',
          });
          this.selectedPortfolioData = d;
          // update the side view with latest data
          this.selectedPortfolio = this.selectedPortfolioData.portfolioDetails;
        }
      });
  }

  // validates name and cash for edited or new portfolio
  validatePortfolioForSave() {
    const name = this.editPortfolioNewName;
    const cash = this.editPortfolioNewStatingCash;
    const type = this.selectedPortfolio.portfolio_type;

    // name checks
    if (name == '') {
      return 'Portfolio name cannot be empty.';
    }

    if (type == 'riapro' && this.svPortfoliosSumm.some(p => p.name == name)) {
      return 'Portfolio with this name already exists.';
    }

    if (
      type == 'user' &&
      this.userPortfoliosSumm.some(p => p.name == name && name != this.selectedPortfolio.name)
    ) {
      return 'Portfolio with this name already exists.';
    }

    // cash checks
    if (cash == 0 || isNaN(cash) || cash <= 0) {
      return 'Invalid cash.';
    }

    let tradesValue = this.getMarketValue();
    if (tradesValue > cash) {
      return `
        Cost value of existing transactions in this portfolio is $${tradesValue.toFixed(2)} 
        and new available cash is $${cash}. Please increase Starting Cash.
      `;
    }

    return '';
  }

  getMarketValue() {
    return this.portfolioService.getMarketValue(this.selectedPortfolioData.transactions);
  }

  // asks for cofirmation
  onDeletePortfolioClick(event) {
    this.showEditPortfolio = false;
    this.confirmationService.confirm({
      target: event.target,
      message: 'Are you sure that you want to delete this portfolio?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        //confirm action - call backend to delete
        this.deleteSelectedPortfolio();
      },
      reject: () => {
        //reject action - none
      },
    });
  }

  // supporting above method
  deleteSelectedPortfolio() {
    const portId = this.selectedPortfolio.portfolioid;
    const portType = this.selectedPortfolio.portfolio_type;

    this.liveService.deleteRequest('/modelportfolio/delete/' + portId).subscribe(data => {
      if (data?.['success']) {
        this.messageService.add({
          severity: 'success',
          summary: 'Portfolio Deleted',
          detail: 'The selected portfolio has been deleted successfully',
        });

        // remove locally for client side view
        if (portType == 'user') {
          this.userPortfoliosSumm = this.userPortfoliosSumm.filter(
            port => port.portfolioid != portId,
          );
        }
        if (portType == 'riapro') {
          this.svPortfoliosSumm = this.svPortfoliosSumm.filter(port => port.portfolioid != portId);
        }
        this.showMinimalView = false;
        this.selectedPortfolio = null;
        this.selectedPortfolioData = null;
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Portfolio Not Deleted',
          detail: 'Error occured while deleting. Please contact support.',
        });
      }
    });
  }

  // hides portfolio details pane on the right
  onClosePortfolioDetailsClick() {
    this.showMinimalView = false;
    this.showEditPortfolio = false;
    this.selectedPortfolio = null;
    this.selectedPortfolioData = null;
  }

  onCreateNewPortfolioClick() {
    this.isCreateNewPortfolioMode = !this.isCreateNewPortfolioMode;
  }

  // from summary child coomponent
  onNewPortfolioCancelled() {
    this.isCreateNewPortfolioMode = false;
  }

  // from summary child component
  onNewPortfolioCreated(newPortID) {
    this.loadSVViewData(); // TODO: see if new id an be used to load selectively
  }

  onAddTransactionsClick() {
    this.showEditPortfolio = false;
    this.addTxnsSubject.next();
    this.isAddTradeMultiDialogVisible = true;
  }

  onEditTransactionsClick() {
    this.showEditPortfolio = false;
    this.editTxnsSubject.next();
    this.isEditTradeDialogVisible = true;
  }

  onTradingTicketMultiCancelClick() {
    this.isAddTradeMultiDialogVisible = false;
  }

  onEditTradingTicketMultiSaveClick() {
    this.isAddTradeMultiDialogVisible = false;
    this.onPortfolioClick(this.selectedPortfolio);
  }

  onEditTradeCancelClick() {
    this.isEditTradeDialogVisible = false;
  }

  onEditTradeSaveClick() {
    this.isEditTradeDialogVisible = false;
  }
}
