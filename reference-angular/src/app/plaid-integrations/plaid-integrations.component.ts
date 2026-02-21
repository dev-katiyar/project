import { Component, Input, OnInit } from '@angular/core';
import { PlaidService } from '../services/plaid.service';
import { MessageService } from 'primeng/api';
import { PortfolioService } from '../services/portfolio.service';

@Component({
  selector: 'app-plaid-integrations',
  templateUrl: './plaid-integrations.component.html',
  styleUrls: ['./plaid-integrations.component.scss'],
})
export class PlaidIntegrationsComponent implements OnInit {
  @Input() linkedPortfolios = [];

  userAccounts: any[];
  selectedAccount: any;

  selectedAccountHoldingsRes: any;
  selectedAccountHoldings: any[];

  selectedAccountTransactionsRes: any;
  selectedAccountTransactions: any[];
  selectedAccountValidTransactions = []; // for sv unsupported assests
  clonedAccountTransactions = {}; // being edited
  selectedAccountCashTransactions = []; // separrrete list, in case add to starting cash on ongoing basis
  clonedAccountCashTransactions = {}; // being edited
  validSecurityTypes = ['equity', 'etf'];

  newLinkedPortfolio: any;

  constructor(
    private plaidService: PlaidService,
    private messageService: MessageService,
    private portfolioService: PortfolioService,
  ) {}

  ngOnInit(): void {
    this.plaidService.getUserLinkedAccounts().subscribe(res => {
      if (res['error'] === '') {
        this.userAccounts = res['user_accounts'] as any[];
      } else {
        this.userAccounts = [];
      }
    });
  }

  getAccountHoldings(accountId) {
    this.selectedAccountHoldingsRes = null;
    this.selectedAccountHoldings = [];
    this.selectedAccount = this.userAccounts.find(acc => acc.account_id === accountId);
    if ('currentBalance' in this.selectedAccount) {
      this.selectedAccount['currentBalance'] = null;
    }
    this.plaidService.getHoldingsForUserAccount(accountId).subscribe(res => {
      if (res['error'] === '') {
        this.selectedAccountHoldingsRes = res['user_account_holdings'] as any[];
        if (this.selectedAccountHoldingsRes) {
          this.setUpAndShowHoldingsData(accountId);
        }
      }
    });
  }

  setUpAndShowHoldingsData(accountId) {
    // update account balance
    const balances = this.selectedAccountHoldingsRes['accounts'][0]['balances'];
    this.selectedAccount['currentBalance'] = balances['current'];

    // create holdings data for holdings table
    const securities = this.selectedAccountHoldingsRes['securities'];
    const holdings = this.selectedAccountHoldingsRes['holdings'];

    // index to enable local editing in UI before saving, not for saving in db
    for (let [index, holding] of holdings.entries()) {
      // get details about the ticker from accompanying array
      const security = securities.find(sec => sec.security_id == holding.security_id);
      this.selectedAccountHoldings.push({
        id: index,
        symbol: security['ticker_symbol'],
        tickerName: security['name'],
        tickerType: security['type'],
        cosBasis: holding['cost_basis'],
        qty: holding['quantity'],
        currencyCode: holding['iso_currency_code'],
        side: 'Buy',
        security_id: security['security_id'],
        // date: new Date(),
      });
    }

    this.updateAccountCostBasisHoldings();
  }

  updateAccountCostBasisHoldings() {
    // update the account cost basis
    let costBasis = 0;
    for (let holding of this.selectedAccountHoldings) {
      costBasis += holding.cosBasis;
    }
    // update cost basis
    this.selectedAccount['costBasisTotal'] = costBasis;
  }

  updateAccountCostBasisTransactions() {
    // is it needed
    // update the account cost basis based on transactions
    let costBasis = 0;
    for (let txn of this.selectedAccountTransactions) {
      costBasis += txn.qty * txn.price;
    }
    // update cost basis
    this.selectedAccount['costBasisTotal'] = costBasis;
  }

  updateAccountCashBalance() {
    // is it needed?
  }

  setNewPortfolioDetails() {
    // set up new portfolio, in case it is created
    this.newLinkedPortfolio = {
      id: 0,
      name: this.selectedAccount.account_name,
      action: 'add',
      newTransactions: this.selectedAccountValidTransactions,
      newCashTransactions: this.selectedAccountCashTransactions,
      deletedTransactions: [],
      updatedTransactions: [],
      currentCash: this.selectedAccount['currentBalance'],
      portfolio_type: 'linked',
      startingCash: (
        this.selectedAccount['currentBalance'] + this.selectedAccount['costBasisTotal']
      ).toFixed(2),
    };
  }

  createNewPortfolio() {
    // this.newLinkedPortfolio['newTransactions'] = this.selectedAccountTransactions;
  }

  isNewPortfolioValid() {
    const symbols = []; // needed for ticker validation

    // validate portfolio name and cash
    if(!this.validatePortfolioDetails(this.newLinkedPortfolio)) {
      return false;
    }
    
    // validate transaction qty and cost price
    for (let txn of this.newLinkedPortfolio.newTransactions) {
      symbols.push(txn['symbol'])
      if (!this.validateTransaction(txn)) {
        return false;
      }
    }

    // validate cash transaction newCashTransactions
    for (let cashTxn of this.newLinkedPortfolio.newCashTransactions) {
      if (!this.validateCashTransaction(cashTxn)) {
        return false;
      }
    }

    // validate symbols are supported
    this.portfolioService.checkSymbolsValidity({ symbols: symbols }).subscribe((res: any[]) => {
      let status = res['isvalid'];
      if (status === 'invalid') {
        this.showError(
          `'${res['invalidsymbol']['invalidsymbol']}' does not seem to be a valid symbol. Please check and/or contact support`,
        );
        return false;
      }
    });


    // send to backend to create portfolio, transactions and cash transactions (new table)

    // show a list of plaid portfolios or show my portfolio like page with extra button to show/integrate more plaid portfolios

    

    // if (error == "") {
    //   let tradesValue = this.getMarketValue();
    //   if (tradesValue > startingCash) {
    //     error = `You don't have sufficient funds. Trade value is :${tradesValue.toFixed(2)} and available Cash :${startingCash.toFixed(2)} . Please increase Starting Cash `;
    //   }
    // }

    // if (error == "") {
    //   this.showMessage({ "status": "success", "message": "Saving Portfolio..." });
    //   this.OnValidateSuccess.emit({ "portfolio": this.portfolio, "type": "save" });
    // }
    // else {
    //   this.showMessage({ "status": "error", "message": error });
    // }

    return true;
  }

  validatePortfolioDetails(portfolio) {
     // validate the portfolio name and cash
     const name = this.newLinkedPortfolio['name'];
     if (name == '') {
       this.showError('Please enter Portfolio Name !');
       return false;
     }
 
     const startingCash = Number(this.newLinkedPortfolio['startingCash']);
     if (startingCash == 0 || isNaN(startingCash) || startingCash <= 0) {
       this.showError('Please enter valid Starting Cash !');
       return false;
     }
 
     if (this.linkedPortfolios.includes(name)) {  // TODO: linked portfolio names list need to be filled
       this.showError('You already have portfolio with same name !');
       return false;
     }

     return true;
  }

  validateTransaction(txn) {
    if (isNaN(txn.price) || txn.price <= 0) {
      this.showError(`Please enter valid price for ${txn.symbol}`);
      return false;
    }

    if (isNaN(txn.qty) || txn.qty <= 0) {
      this.showError(`Please enter # shares for ${txn.symbol}`);
      return false;
    }

    return true;
  }

  validateCashTransaction(cashTxn) {
    if (isNaN(cashTxn.amount) || cashTxn.amount === 0) {
      this.showError(`Please enter valid amount for ${cashTxn.subtype} dated ${cashTxn.dateObj}!`);
      return false;
    }

    if (isNaN(cashTxn.fees)) {
      this.showError(`Please enter valid fees for ${cashTxn.subtype} dated ${cashTxn.dateObj}!`);
      return false;
    }

    return true;
  }

  cancelCreateNewPortfolio() {
    this.resetSelectedAccount();
  }

  resetSelectedAccount() {
    // in case new account selected or selected account create portfolio cancelled
    this.selectedAccount = null;
    this.selectedAccountHoldings = null;
    this.selectedAccountHoldingsRes = null;
    this.clonedAccountTransactions = null;
    this.selectedAccountTransactionsRes = null;
    this.selectedAccountTransactions = null;
    this.newLinkedPortfolio = null;
  }

  getAccountTransactions(accountId) {
    this.selectedAccountTransactionsRes = null;
    this.selectedAccountTransactions = [];
    this.selectedAccountValidTransactions = [];
    this.plaidService.getTransactionsForUserAccount(accountId).subscribe(res => {
      if (res['error'] === '') {
        this.selectedAccountTransactionsRes = res['user_account_transactions'] as any[];
        if (this.selectedAccountTransactionsRes) {
          this.setUpAndShowTransactionsData();
        }
      }
    });
  }

  getRelevantSecurites() {
    let securities = [];
    for (let hldg of this.selectedAccountHoldings) {
      securities.push(hldg.security_id);
    }
    return securities;
  }

  setUpAndShowTransactionsData() {
    // create transactoins data for transactions table
    const relvantSecurityIDs = this.getRelevantSecurites();
    const securities = this.selectedAccountTransactionsRes['securities'];
    const transactions = this.selectedAccountTransactionsRes['investment_transactions'];

    for (let [index, txn] of transactions.entries()) {
      if (txn['type'] === 'cash') {
        this.selectedAccountCashTransactions.push(txn);
        continue;
      }

      const security = securities.find(sec => sec.security_id == txn.security_id);
      const accTxn = {
        id: index,
        dateObj: new Date(txn['date']),
        symbol: security['ticker_symbol'],
        tickerName: security['name'],
        tickerType: security['type'],
        qty: Math.abs(txn['quantity']),
        price: txn['price'],
        amount: txn['amount'],
        type: txn['type'],
        side: txn['subtype'],
        currencyCode: txn['iso_currency_code'],
      };
      if (this.validSecurityTypes.includes(accTxn['tickerType'])) {
        this.selectedAccountValidTransactions.push(accTxn);
      } else if (accTxn['tickerType'] === 'mutual fund') {
        this.selectedAccountCashTransactions.push(txn);
      } else {
        this.selectedAccountTransactions.push(accTxn);
      }
    }

    this.setNewPortfolioDetails();
  }

  onHoldingRowDelete(hldg) {
    this.selectedAccountHoldings = this.selectedAccountHoldings.filter(h => h.id !== hldg.id);

    // update cost basis
    this.updateAccountCostBasisHoldings();
  }

  // Editing handler for equity and etf transactions
  onTxnRowEditInit(txn) {
    this.clonedAccountTransactions[txn.id] = { ...txn };
  }

  onTxnRowDelete(txn) {
    this.selectedAccountTransactions = this.selectedAccountTransactions.filter(
      t => t.id !== txn.id,
    );

    this.updateAccountCostBasisTransactions(); // update cost basis
  }

  onTxnRowEditSave(txn) {
    if (txn.qty !== 0 || txn.price !== 0) {
      delete this.clonedAccountTransactions[txn.id];
      this.showSuccess('Transaction row is updated');
    } else {
      this.showError('Invalid Price or Quantity');
    }

    this.updateAccountCostBasisTransactions(); // update cost basis
  }

  onTxnRowEditCancel(txn, idx) {
    this.selectedAccountTransactions[idx] = this.clonedAccountTransactions[txn.id];
    delete this.clonedAccountTransactions[txn.id];

    this.updateAccountCostBasisTransactions(); // update cost basis
  }

  // Editing handler for cash transactions
  onCashTxnRowEditInit(txn) {
    this.clonedAccountCashTransactions[txn.id] = { ...txn };
  }

  onCashTxnRowDelete(txn) {
    this.selectedAccountCashTransactions = this.selectedAccountCashTransactions.filter(
      t => t.id !== txn.id,
    );

    this.updateAccountCashBalance(); // update cash
  }

  onCashTxnRowEditSave(txn) {
    if (txn.amount !== 0) {
      delete this.selectedAccountCashTransactions[txn.id];
      this.showSuccess('Transaction row is updated');
    } else {
      this.showError('Invalid Amount or Fee');
    }

    this.updateAccountCashBalance(); // update cash
  }

  onCashTxnRowEditCancel(txn, idx) {
    this.selectedAccountCashTransactions[idx] = this.clonedAccountCashTransactions[txn.id];
    delete this.clonedAccountCashTransactions[txn.id];

    this.updateAccountCashBalance(); // update cash
  }

  showSuccess(msg) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: msg,
    });
  }

  showError(errMsg) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errMsg,
    });
  }
}
