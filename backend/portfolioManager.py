import copy
import dbutil
import utils
import datetime
from datetime import timedelta
import pandas as pd
import constants
import math


def calculatemv(row, portfolio):
    sum = 0

    for key in row.keys():
        sum = sum + row[key] * portfolio[key][0]
    return sum


def get_portfolio_historical(portfolio_id, portfolio, df_market, startdate, enddate, isportfolio):
    df_portfolio = pd.DataFrame()

    mktindex = df_market.index
    for symbol, quantitytuple in portfolio.items():

        df_item = dbutil.get_symbol_adjclose(symbol, startdate, enddate)
        df_item = df_item.reindex(index=mktindex)
        df_item = df_item.bfill()
        df_item = df_item.ffill()

        if (not df_item.empty):
            if (len(df_portfolio) == 0):
                df_portfolio = df_item
            else:
                df_portfolio = df_portfolio.join(df_item)

    if (len(df_portfolio)) > 0:
        df_portfolio = df_portfolio.ffill()
        df_portfolio = df_portfolio.bfill()
        df_portfolio['mv'] = df_portfolio.apply(lambda row: calculatemv(row, portfolio), axis=1)
        list_drop_cloumns = []

        for column in df_portfolio.columns:
            list_drop_cloumns.append(column)

        list_drop_cloumns.remove('mv')

        df_portfolio = df_portfolio.drop(list_drop_cloumns, 1)
        df_portfolio.columns = [portfolio_id]

        portfolio_start_date = dbutil.get_portfolio_startdate(portfolio_id)
        df_portfolio.columns = ['mv']
        df_portfolio['mv_change'] = df_portfolio.pct_change()

    return df_portfolio


def calculate_portfolio_details(portfolio_id, startdate):
    MKT_SYMBOL = 'SPY'
    model_portfolio_id = 6
    try:
        enddate = datetime.datetime.today()
        # enddate = datetime.datetime.now()
        # startdate = enddate - timedelta(days=100)
        market = MKT_SYMBOL
        df_market = dbutil.get_symbol_adjclose(market, startdate, enddate)
        portfolio_composition = dbutil.get_portfoliodetails(portfolio_id)
        spy_portfolio_composition = dbutil.get_portfoliodetails(model_portfolio_id)
        df_portfolio = get_portfolio_historical(portfolio_id, portfolio_composition, df_market, startdate, enddate,
                                                True)

        df_spy = get_portfolio_historical(model_portfolio_id, spy_portfolio_composition, df_market, startdate, enddate,
                                          True)
        df_merged = df_portfolio.join(df_spy, lsuffix='_portfolio')
        df_merged.fillna(0, inplace=True)
    except Exception as ex:
        print(ex)


def setCurrentCash(portfolioDetails, openPositions, closedPositions, transactions):
    currentCash = portfolioDetails["startingCash"]

    for position in openPositions:
        # if position["side"] == "Buy":  # Buy To Cover has not impact on cash
        currentCash = currentCash - getCostValue(position) - position["commission"]
    for closedPosition in closedPositions:
        currentCash = currentCash + closedPosition["pnl"]

    # for transaction in transactions:
    #     currentCash = currentCash - transaction["commission"]
    portfolioDetails.update({"currentCash": currentCash})


def calculatePortfolioDetails(portfolioDetails, cash_transactions, basicDetails, openPositions):
    dividend = 0
    startingCash = portfolioDetails["startingCash"]
    dailyPnl = 0
    totalQty = 0
    mktValue = 0
    costPortfolio = 0
    commissions = 0
    if cash_transactions != None:
        for cash_trn in cash_transactions:
            dividend = dividend + cash_trn["amount"];
    portfolioDetails["currentCash"] = portfolioDetails["currentCash"] + dividend
    portfolioDetails["dividend"] = dividend
    for position in openPositions:
        symbol = position["symbol"]
        try:
            if symbol in basicDetails:
                basic = basicDetails[symbol]
            position["currentPrice"] = basic["currentPrice"];
            position["asset_name"] = basic["asset_name"];
            position["name"] = basic["name"];
            position["priceChange"] = basic["priceChange"];
            position["changePct"] = basic["changePct"];
            position["sector_name"] = basic["sector"];

            costPrice = 0

            if "cost_basis" not in position:
                costPrice = position["price"]
            else:
                costPrice = position["cost_basis"]
            costPosition = position["qty"] * costPrice
            currentValue = position["qty"] * (position["currentPrice"] or 0)

            position["pnl"] = currentValue - costPosition - position["commission"];
            if (position["side"] != "Buy"):
                position["pnl"] = - position["pnl"]
            position["pnlPercentage"] = (100 * position["pnl"]) / (costPosition);
            if position["priceChange"] is None:
                position["priceChange"] = 0
            position["currentValue"] = costPosition + position["pnl"]

            dailyPnl = dailyPnl + position["qty"] * float(position["priceChange"])
            totalQty = totalQty + position["qty"]
            mktValue = mktValue + position["currentValue"]
            costPortfolio = costPortfolio + costPosition
        except Exception as ex:
            print("Error for position {} {}".format(position, ex))

    portfolioDetails["portfolioValue"] = mktValue + portfolioDetails["currentCash"];
    if startingCash != 0:
        portfolioDetails["pnl"] = portfolioDetails["portfolioValue"] - startingCash;
        portfolioDetails["pnlPercent"] = 100 * portfolioDetails["pnl"] / startingCash;
    else:
        portfolioDetails["pnl"] = portfolioDetails["portfolioValue"] - costPortfolio;
        if costPortfolio != 0:
            portfolioDetails["pnlPercent"] = 100 * portfolioDetails["pnl"] / costPortfolio;
        else:
            portfolioDetails["pnlPercent"] = 0
    portfolioDetails["dailyPnlPercentage"] = 0
    if portfolioDetails["portfolioValue"] != 0:
        portfolioDetails["dailyPnlPercentage"] = (100 * dailyPnl) / (portfolioDetails["portfolioValue"] - dailyPnl);
    portfolioDetails["dailyPnl"] = dailyPnl
    for position in openPositions:
        if "currentValue" in position:
            position["percentageShare"] = (100 * position["currentValue"]) / portfolioDetails["portfolioValue"];

    portfolioDetails["composition_by_asset"] = create_composition(openPositions, portfolioDetails, "asset_name")
    portfolioDetails["composition_by_sector"] = create_composition(openPositions, portfolioDetails, "sector_name")
    portfolioDetails["holding_map"] = create_holding_map(openPositions, portfolioDetails)


def create_composition(openPositions, portfolioDetails, groupKey):
    dict_asset = {}
    for position in openPositions:
        if groupKey in position:
            asset_name = position[groupKey]
            if asset_name not in dict_asset:
                dict_asset[asset_name] = {"currentValue": 0, "percentage": 0}
            if "currentValue" in dict_asset[asset_name] and "currentValue" in position:
                dict_asset[asset_name]["currentValue"] = dict_asset[asset_name]["currentValue"] + position[
                    "currentValue"]

    for key, value in dict_asset.items():
        value["percentage"] = round(100 * value["currentValue"] / portfolioDetails["portfolioValue"], 2)
    if portfolioDetails["currentCash"] != 0:
        dict_asset["Cash"] = {"currentValue": portfolioDetails["currentCash"], "percentage": 0}
        dict_asset["Cash"]["percentage"] = round(
            100 * portfolioDetails["currentCash"] / portfolioDetails["portfolioValue"],
            2)
    return utils.getListFromDictByPercentage(dict_asset)


def create_holding_map(openPositions, portfolioDetails):
    holding_map = []
    try:
        for position in openPositions:
            sym_map ={}
            sym_map['companyName'] = position['name']
            sym_map['last'] = position['currentPrice']
            sym_map['marketValue'] = position['currentValue']
            sym_map['priceChange'] = position['priceChange']
            sym_map['priceChangePct'] = position['changePct']
            sym_map['sectorName'] = position['sector_name']
            sym_map['symbol'] = position['symbol']
            holding_map.append(sym_map)

        if portfolioDetails["currentCash"] != 0:
            cash_item = {
                'companyName': 'Cash',
                'last': portfolioDetails["currentCash"],
                'marketValue': portfolioDetails["currentCash"],
                'priceChange': 0,
                'priceChangePct': 0,
                'sectorName': 'Cash',
                'symbol': 'Cash'
            }
            holding_map.append(cash_item)
    except Exception as ex:
        print(ex)
    
    return holding_map


def createPositionsFromTransactions(transactions):
    closedPositions = []
    openPositions = {}
    shortPositions = {}
    transactionsOrig = copy.deepcopy(transactions)
    for transaction in transactionsOrig:
        symbol = transaction['symbol']
        side = transaction['side']

        if symbol not in openPositions and side == "Buy":
            positionToAdd = copy.deepcopy(transaction)
            positionToAdd["commission"] = positionToAdd["commission"] * positionToAdd["qty"]
            openPositions.update({symbol: positionToAdd})
        elif (symbol in openPositions):
            if side == "Buy":
                position = openPositions[symbol]
                position = addPosition(transaction, position)
                openPositions.update({symbol: position})
            elif side == "Sell":
                position = openPositions[symbol]
                position = closePosition(transaction, position, closedPositions)
                if position["qty"] > 0:
                    openPositions.update({symbol: position})
                else:
                    del openPositions[symbol]

        if symbol not in shortPositions and side == "Sell Short":
            shortPositions.update({symbol: transaction})
        elif (symbol in shortPositions):
            if side == "Sell Short":
                position = shortPositions[symbol]
                position = addPosition(transaction, position)
                shortPositions.update({symbol: position})
            elif side == "Buy To Cover":
                position = shortPositions[symbol]
                position = closePosition(transaction, position, closedPositions)
                if position["qty"] > 0:
                    shortPositions.update({symbol: position})
                else:
                    del shortPositions[symbol]

    openPositions = list(openPositions.values())
    roundValues(openPositions, {"price"})
    shortPositions = list(shortPositions.values())
    roundValues(shortPositions, {"price"})
    totalOpenPosition = openPositions + shortPositions
    return totalOpenPosition, closedPositions


def getCostValue(transaction):
    curValue = float(transaction["qty"]) * float(transaction["price"])
    return curValue
    # if transaction["side"] == "Buy" or transaction["side"] == "Buy To Cover":
    #     return curValue
    # elif transaction["side"] == "Sell Short" or transaction["side"] == "Sell":
    #     return -curValue


def addPosition(transaction, position):
    positionCopy = copy.deepcopy(position)
    qty = transaction["qty"] + positionCopy["qty"]
    totalValue = getCostValue(transaction) + getCostValue(positionCopy)
    price = totalValue / qty
    positionCopy["qty"] = qty
    positionCopy["price"] = price
    positionCopy["commission"] = positionCopy["commission"] + transaction["commission"] * transaction["qty"]
    return positionCopy


def roundValues(data, keys):
    for row in data:
        for key in keys:
            row[key] = round(row[key], 2)


def closePosition(transaction, position, closedPositions):
    positionCopy = copy.deepcopy(position)
    closedQty = transaction["qty"]
    newQty = positionCopy["qty"] - transaction["qty"]
    buyPrice = positionCopy["price"]
    buyCommission = (positionCopy["commission"] * transaction["qty"]) / positionCopy["qty"]
    positionCopy["commission"] = positionCopy["commission"] - buyCommission
    sellPrice = transaction["price"]
    sellCommission = transaction["commission"] * closedQty

    closedPosition = copy.deepcopy(transaction)
    closedPosition["buyDate"] = positionCopy["date"]
    closedPosition["sellDate"] = transaction["date"]
    closedPosition["buyPrice"] = positionCopy["price"]
    closedPosition["sellPrice"] = transaction["price"]
    closedPosition["buyValue"] = buyPrice * closedQty

    closedPosition["commission"] = sellCommission + buyCommission
    closedPosition["sellValue"] = sellPrice * closedQty - closedPosition["commission"]
    closedPosition["pnl"] = closedPosition["sellValue"] - closedPosition["buyValue"]
    closedPosition["pnlPercentage"] = (100 * closedPosition["pnl"]) / closedPosition["buyValue"]
    closedPositions.append(closedPosition)
    positionCopy["qty"] = newQty

    if position["side"] == "Sell Short":
        closedPosition["pnl"] = -closedPosition["pnl"]
        closedPosition["side"] = "Buy To Cover"
        closedPosition["pnlPercentage"] = -closedPosition["pnlPercentage"]

    return positionCopy


def getPortfolioAndWatchListSymbols(userId):
    sql = """select distinct symbol from (

        select distinct symbol from transactions t join model_portfolio m 
        on m.portfolioid = t.portfolioid where m.user_id = {} 
        union
        select distinct ps.symbol
                    from portfolio p 
                    join portfolio_symbols ps on p.portfolio_id= ps.portfolio_id
                    where p.user_id = {}
        union
        select distinct symbol  from watchlist_details wd join 
           watchlist_compostion wc on wc.watchlist_id = wd.watchlist_id where userid = {}
        ) t""".format(userId, userId, userId)
    data = dbutil.getDataArray(sql)
    return data


def getPortfolioSymbols(userId):
    sql = """select distinct symbol from (

        select distinct symbol from transactions t join model_portfolio m 
        on m.portfolioid = t.portfolioid where m.user_id = {} 
        union
        select distinct ps.symbol
                    from portfolio p 
                    join portfolio_symbols ps on p.portfolio_id= ps.portfolio_id
                    where p.user_id = {}
        ) t""".format(userId, userId)
    data = dbutil.getDataArray(sql)
    return data


def getWatchlistSymbols(userId):
    sql = """select distinct symbol  from watchlist_details wd join 
           watchlist_compostion wc on wc.watchlist_id = wd.watchlist_id where userid = {}""".format(userId)
    data = dbutil.getDataArray(sql)
    return data


def getPortfolioData(portfolio_id):
    sql = """select symbol,quantity as qty,price as cost_basis ,0 as commission from portfolio p 
            join portfolio_symbols ps on p.portfolio_id= ps.portfolio_id
            where p.portfolio_id = {}""".format(portfolio_id)
    data = dbutil.getDataTable(sql)
    return data
