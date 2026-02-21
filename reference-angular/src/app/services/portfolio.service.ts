import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GtmService } from './gtm.service';

@Injectable()
export class PortfolioService {
  constructor(private http: HttpClient, private readonly gtmService: GtmService) {}

  getAllPortfolios(portfolio_type) {
    this.gtmService.fireGtmEventForApiCalled('getAllPortfolios');
    return this.http.get(environment.baseUrl + '/modelportfolio/all/' + portfolio_type);
  }

  savePortfolio(portfolio) {
    this.gtmService.fireGtmEventForApiCalled('savePortfolio');
    return this.http.post(environment.baseUrl + '/modelportfolio', portfolio);
  }

  editPortfolio(newPortfolio) {
    this.gtmService.fireGtmEventForApiCalled('editPortfolio');
    return this.http.post(environment.baseUrl + '/modelportfolio', newPortfolio);
  }

  updateTransactionInPortfolio(portId, txn) {
    this.gtmService.fireGtmEventForApiCalled('updateTransactionInPortfolio');
    return this.http.put(
      environment.baseUrl + '/modelportfolio/transactions/update/' + portId,
      txn,
    );
  }

  deleteTransactionFromPortfolio(portId, txn) {
    this.gtmService.fireGtmEventForApiCalled('deleteTransactionFromPortfolio');
    return this.http.post(
      environment.baseUrl + '/modelportfolio/transactions/delete/' + portId,
      txn,
    );
  }

  getEmptyTransaction() {
    let txn = {
      // new empty transaction, inialization for intellisense
      id: 0,
      symbol: '',
      companyname: '',
      holdings: 0,
      qty: 1,
      isChanged: false,
      price: 0,
      avgCost: 0,
      side: 'Buy',
      commission: 0,
      dateObj: new Date(),
      get pnl() {
        if (this.side == 'Sell' && this.holdings > 0) {
          return this.qty * (this.price - this.avgCost);
        }
        if (this.side == 'Buy To Cover' && this.holdings > 0) {
          return this.qty * (this.avgCost - this.price);
        }
        return 0;
      },
      get cashFlow() {
        if (['Buy', 'Sell Short'].includes(this.side)) {
          return this.qty * this.price * -1;
        } else if (['Buy To Cover', 'Sell'].includes(this.side)) {
          return this.qty * this.avgCost + this.pnl;
        }
      },
    };

    return txn;
  }

  getEmptyPortfolioDetails() {
    return {
      // details needed for validing the transaction, inialization for intellisense
      id: 0,
      name: '',
      portfolio_type: 'user',
      currentCash: 0,
      startingCash: 0,
      openPositions: [],
      transactions: [], // transactions are the new transactions being added
      get txnPnLCash() {
        // P&L of all newly added transations. When 'Sell' and 'Buy to Cover' are done
        if (this.transactions.length > 0) {
          return this.transactions.reduce((total, txn) => {
            return total + txn.pnl;
          }, 0);
        } else {
          return 0;
        }
      },
      get totalCashFlow() {
        // Starting Cash + Net cash flow of transactions being added.
        if (this.transactions.length > 0) {
          return this.transactions.reduce((total, t) => {
            if (['Buy', 'Sell Short'].includes(t.side)) {
              return total + t.qty * t.price * -1;
            } else if (['Buy To Cover', 'Sell'].includes(t.side)) {
              return total + t.qty * t.avgCost + t.pnl;
            }
          }, this.currentCash);
        } else {
          return this.currentCash;
        }
      },
    };
  }

  saveTransaction(transactions, portfolioId, action, type) {
    let transactionData = { action: action, type: type, rows: transactions };
    let bodyString = JSON.stringify(transactionData);
    this.gtmService.fireGtmEventForApiCalled('saveTransaction');
    return this.http.post(environment.baseUrl + '/modelportfolio/' + portfolioId, transactionData);
  }

  AddCash(portfolioId, cashData) {
    this.gtmService.fireGtmEventForApiCalled('AddCash');
    return this.http.post(environment.baseUrl + '/modelportfolio/' + portfolioId, cashData);
  }

  getMarketValue(transactions) {
    return transactions.reduce(
      (accumulator, t) => accumulator + t.qty * t.price * this.getTransactionMul(t),
      0,
    );
  }

  getTransactionMul(transaction) {
    if (['Buy', 'Sell Short'].includes(transaction.side)) {
      return 1;
    } else {
      return -1;
    }
  }

  getValidSides() {
    return [
      { name: 'Buy', id: 'Buy' },
      { name: 'Sell', id: 'Sell' },
      { name: 'Sell Short', id: 'Sell Short' },
      { name: 'Buy To Cover', id: 'Buy To Cover' },
    ];
  }

  getSymbolHoldings(symbol, side, openPositions) {
    let holding = 0;
    if (openPositions) {
      if (side == 'Buy' || side == 'Sell') {
        let pos = openPositions.find(pos => pos.symbol == symbol && pos.side == 'Buy');
        holding = pos ? pos.qty : 0;
      } else if (side == 'Sell Short' || side == 'Buy To Cover') {
        let pos = openPositions.find(pos => pos.symbol == symbol && pos.side == 'Sell Short');
        holding = pos ? pos.qty : 0;
      }
    }
    return holding;
  }

  getSymbolAvgCost(symbol, side, openPositions) {
    let avgCost = 0;
    if (openPositions) {
      if (side == 'Sell' || side == 'Buy') {
        let pos = openPositions.find(pos => pos.symbol == symbol && pos.side == 'Buy');
        avgCost = pos ? pos.price : 0;
      } else if (side == 'Buy To Cover' || side == 'Sell Short') {
        let pos = openPositions.find(pos => pos.symbol == symbol && pos.side == 'Sell Short');
        avgCost = pos ? pos.price : 0;
      }
    }
    return avgCost;
  }

  // TODO: Many functions doiing similar taks. Need to Consolidate

  checkNewTransactionBasicDetails(transaction) {
    if (!transaction.dateObj || isNaN(transaction['dateObj'].getMonth())) {
      return `Please enter valid transaction date for symbol ${transaction.symbol}`;
    }
    if (!transaction.symbol || transaction.symbol == '') {
      return `Please enter valid symbol for transaction`;
    }
    if (isNaN(transaction.qty) || transaction.qty <= 0) {
      return `Please enter valid number of shares for symbol ${transaction.symbol}`;
    }
    if (isNaN(transaction.price) || transaction.price <= 0) {
      return `Please enter valid price for symbol ${transaction.symbol}`;
    }
    return '';
  }

  checkEditTransactionBasicDetails(txn) {
    // Side and Symbol are not editable
    if (isNaN(txn.price) || txn.price <= 0) {
      return `Please enter a valid price for '${txn.symbol}'`;
    }

    if (isNaN(txn.qty) || txn.qty <= 0) {
      return `Please enter valid # of shares for ${txn.symbol}`;
    }

    if (!txn.date) {
      return `Please enter transaction date for ${txn.symbol}`;
    }

    return '';
  }

  checkEditTransactionsFundingDetails(portData) {
    const startingCash = Number(portData.portfolioDetails['startingCash']);
    const tradesCostValue = this.getMarketValue(portData.transactions);
    if (tradesCostValue > startingCash) {
      return `
        Available Cash: $${startingCash.toFixed(2)}. 
        Trades Cost Value: $${tradesCostValue.toFixed(2)}. 
        Edit Portfolio to increase Starting Cash.`;
    }
    return '';
  }

  checkEditTransactionHoldingDetails(txn, portData) {
    const txns = portData.transactions;

    // Can not Sell more than Buy
    if (txn.side == 'Sell') {
      const [buyQty, sellQty] = this.getBuySellQty(txn, txns);
      if (sellQty > buyQty) {
        return `${txn.symbol} 'Sell' quanity cannot be more than it's current 'Buy' holdings.`;
      }
    }

    // Can not Buy to Cover more than Sell Short
    if (txn.side == 'Buy To Cover') {
      const [shortQty, btcQty] = this.getBtcShortQty(txn, txns);
      if (btcQty > shortQty) {
        return `${txn.symbol} 'Buy To Cover' quanity cannot be more than it's current 'Short Sell' holdings.`;
      }
    }

    return '';
  }

  getBuySellQty(targetTxn, allTxns) {
    let buyQty = 0;
    let sellQty = 0;
    for (let t of allTxns) {
      if (t.symbol == targetTxn.symbol && t.side == 'Buy') {
        buyQty = buyQty + parseFloat(t.qty);
      }
      if (t.symbol == targetTxn.symbol && t.side == 'Sell') {
        sellQty = sellQty + parseFloat(t.qty);
      }
    }
    return [buyQty, sellQty];
  }

  getBtcShortQty(targetTxn, allTxns) {
    let shortQty = 0;
    let btcQty = 0;
    for (let t of allTxns) {
      if (t.symbol == targetTxn.symbol && t.side == 'Sell Short') {
        shortQty = shortQty + parseFloat(t.qty);
      }
      if (t.symbol == targetTxn.symbol && t.side == 'Buy To Cover') {
        btcQty = btcQty + parseFloat(t.qty);
      }
    }
    return [shortQty, btcQty];
  }

  checkDeleteTransactionHoldingDetails(txn, portData) {
    // Trick: Assume delete txn qty is 0, so remove txn qty from total

    const txns = portData.transactions;

    // Can not remove Buy, if already sold it
    if (txn.side == 'Buy') {
      let [buyQty, sellQty] = this.getBuySellQty(txn, txns);
      buyQty = buyQty - parseFloat(txn.qty);
      if (sellQty > buyQty) {
        return `${txn.symbol} 'Buy' holding cannot be less than it's total current 'Sell' quantity. Delete closing 'Sell' trades first.`;
      }
    }

    // Can not remove Sell Short, if already covered it.
    if (txn.side == 'Sell Short') {
      let [shortQty, btcQty] = this.getBtcShortQty(txn, txns);
      shortQty = shortQty - parseInt(txn.qty);
      if (btcQty > shortQty) {
        return `${txn.symbol} 'Sell Short' quanity cannot be less than it's current 'Buy To Cover' quanity. Delete opening 'Sell Short' trades first.`;
      }
    }

    return '';
  }

  checkSymbolsValidity(symbols) {
    this.gtmService.fireGtmEventForApiCalled('checkSymbolsValidity');
    return this.http.post(environment.baseUrl + '/symbol/arevalid', symbols);
  }

  checkNewTransactionHoldingDetails(transaction) {
    if (transaction.side == 'Sell' && transaction.qty > transaction.holdings) {
      return `'Sell' quantity cannot be more than 'Buy' holdings`;
    }
    if (transaction.side == 'Buy To Cover' && transaction.qty > transaction.holdings) {
      return `'Buy to Cover' quantity cannot be more 'Sell Short' holdings`;
    }
    return '';
  }

  // AK 2022-04-14 Closed and Open Positions in backend depends on order of entry, so it is not allowed
  // to have BUY and SELL of same symbol in one go from multi trade ticket. This can become an issue soon.
  // checkNewTransactionHoldingDetailsAll(transaction, all_transactions) {
  //   let holdings = transaction.holdings;
  //   let symbol = transaction.symbol;
  //   if(transaction.side == 'Sell') {
  //     let netQty = all_transactions.reduce((total, txn) => {
  //       if (txn.symbol == symbol) {
  //         if(txn.side == "Sell") return total - txn.qty;
  //         if(txn.side == "Buy") return total + txn.qty;
  //       }
  //     }, holdings);
  //     if(netQty < 0) return `'Sell' quantity cannot be more than 'Buy' holdings`;
  //   }

  //   if(transaction.side == 'Buy To Cover') {
  //     let netQty = all_transactions.reduce((total, txn) => {
  //       if (txn.symbol == symbol) {
  //         if(txn.side == "Buy To Cover") return total - txn.qty;
  //         if(txn.side == "Sell Short") return total + txn.qty;
  //       }
  //     }, holdings);
  //     if(netQty < 0) return `'Buy to Cover' quantity cannot be more 'Sell Short' holdings`;
  //   }
  //   return "";
  // }

  checkNewTransactionFundingDetails(transaction, currentCash) {
    let tradeValue = transaction.qty * transaction.price;
    if (
      (transaction.side == 'Buy' || transaction.side == 'Buy To Cover') &&
      tradeValue > currentCash
    ) {
      return `You don't have sufficient funds! Trade value is: $${tradeValue.toFixed(
        2,
      )} more than available Cash: $${currentCash.toFixed(2)}`;
    }
    return '';
  }

  checkNewTransactionsFundingDetails(portfolio) {
    if (portfolio.totalCashFlow <= 0) {
      return `You don't have sufficient funds! Please increase Cash or include Sell transactions.`;
    }
    return '';
  }
}