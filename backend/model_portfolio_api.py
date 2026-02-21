import utils
from flask import request, make_response, jsonify
import dbutil
import portfolioManager as pm
import json
import login
from flask import Blueprint
import datetimeutil
from datetime import timedelta
import dataframe_utils
from dao import mongodb
import datetime

api_model_portfolio = Blueprint('api_model_portfolio', __name__)

BENCHMARK_PORTFOLIO_BOND_ID = 19
BENCHMARK_PORTFOLIO_EQUITY_ID = 6

#  TODO: model prefix added to the model names, so we can use this check to get the table names
transactions_table_dict = {
    "model_1": "ai_transactions",
    "model_2": "ai_transactions",
    "model_3": "ai_transactions",
}

dividend_table_dict = {
    "model_1": "ai_dividend_paid",
    "model_2": "ai_dividend_paid",
    "model_3": "ai_dividend_paid",
}

PORTFOLIO_SUMM_MONGO_DOC_NAME = "portfolio_summary_snapshot"

def getBenchMark(modelPortfolioId):
    return [BENCHMARK_PORTFOLIO_EQUITY_ID, BENCHMARK_PORTFOLIO_BOND_ID]


@api_model_portfolio.route("/modelportfolio/dataready/<portfolioId>", methods=['GET'])
def dataReady(portfolioId):
    stillProcessing = dbutil.getOneRow(
        "select  distinct id from editportfolio where id = {}".format(portfolioId))
    if stillProcessing:
        return jsonify({"status": 0})
    else:
        return jsonify({"status": 1})


@api_model_portfolio.route("/modelportfolio/historical", methods=['POST'])
def getModelPortfolioHistoricalData():
    post_data = json.loads(request.data)
    portfolioId = int(post_data["portfolio"])

    portfolioDetails = dbutil.getModelPortfolioDetails(portfolioId)
    transactions_tbl = "transactions"
    portfolio_type = portfolioDetails["portfolio_type"]

    # overrride default, if there are special tables for the portfolio type
    if portfolio_type:
        if portfolio_type in transactions_table_dict:
            transactions_tbl = transactions_table_dict[portfolio_type]

    first_transaction_date = dbutil.getFirstTransaction(portfolioId, transactions_tbl)
    first_transaction_date = datetimeutil.getdatetime(datetimeutil.getdatefromstr(first_transaction_date)) - timedelta(
        days=5)
    first_transaction_date = datetimeutil.getdatestr(first_transaction_date)
    period = post_data["period"]
    benchMarkIds = getBenchMark(portfolioId)
    all_portfolioIds = [portfolioId]
    all_portfolioIds.extend(benchMarkIds)
    sql = "select portfolioid as portfolio_id,name as portfolio_name from model_portfolio where portfolioid in  ({})".format(
        ",".join(map(str, all_portfolioIds)))
    nameMap = dbutil.getKeyValuePair(sql, "portfolio_id", "portfolio_name")
    portfolioCurrentData = getCurrentPortfolioValues(portfolioId)
    todayvalues = {}
    for benchMarkId in benchMarkIds:
        benchMarkCurrentData = getCurrentPortfolioValues(benchMarkId)
        todayvalues.update(
            {benchMarkId: benchMarkCurrentData["portfolioDetails"]["portfolioValue"]})
    todayvalues.update(
        {portfolioId: portfolioCurrentData["portfolioDetails"]["portfolioValue"]})

    df_historical = dbutil.getPortfolioHistorical("model_portfolio_historical_data", all_portfolioIds, nameMap,
                                                  period,
                                                  first_transaction_date, todayvalues)
    return jsonify(dataframe_utils.getDict(df_historical))
    # return dbutil.df_to_json(df_historical)


@api_model_portfolio.route("/modelportfolio/performance/<portfolioId>", methods=['GET'])
def getModelPortfolioPerformance(portfolioId):
    portfolioId = int(portfolioId)

    portfolioDetails = dbutil.getModelPortfolioDetails(portfolioId)
    transactions_tbl = "transactions"
    portfolio_type = portfolioDetails["portfolio_type"]

    # overrride default, if there are special tables for the portfolio type
    if portfolio_type:
        if portfolio_type in transactions_table_dict:
            transactions_tbl = transactions_table_dict[portfolio_type]

    first_transaction_date = dbutil.getFirstTransaction(portfolioId, transactions_tbl)
    first_transaction_date = datetimeutil.getdatetime(datetimeutil.getdatefromstr(first_transaction_date)) - timedelta(
        days=5)
    first_transaction_date = datetimeutil.getdatestr(first_transaction_date)
    benchMarkIds = getBenchMark(portfolioId)
    all_portfolioIds = [portfolioId]
    all_portfolioIds.extend(benchMarkIds)
    sql = "select portfolioid as portfolio_id,name as portfolio_name from model_portfolio where portfolioid in  ({})".format(
        ",".join(map(str, all_portfolioIds)))
    nameMap = dbutil.getKeyValuePair(sql, "portfolio_id", "portfolio_name")
    portfolioCurrentData = getCurrentPortfolioValues(portfolioId)
    todayvalues = {}
    for benchMarkId in benchMarkIds:
        benchMarkCurrentData = getCurrentPortfolioValues(benchMarkId)
        todayvalues.update(
            {benchMarkId: benchMarkCurrentData["portfolioDetails"]["portfolioValue"]})
    todayvalues.update(
        {portfolioId: portfolioCurrentData["portfolioDetails"]["portfolioValue"]})
    data = dbutil.performanceDataByPeriod("model_portfolio_historical_data", all_portfolioIds, nameMap, '10year',
                                          first_transaction_date, todayvalues)

    return jsonify(data)


def getCurrentPortfolioValues(id):
    portfolioData = {}
    portfolioDetails = dbutil.getModelPortfolioDetails(id)

    transactions_tbl = "transactions"
    dividend_paid_tbl = "dividend_paid"

    portfolio_type = portfolioDetails["portfolio_type"]

    # overrride default, if there are special tables for the portfolio type
    if portfolio_type:
        if portfolio_type in transactions_table_dict:
            transactions_tbl = transactions_table_dict[portfolio_type]
        if portfolio_type in dividend_table_dict:
            dividend_paid_tbl = dividend_table_dict[portfolio_type]
    
    transactions = dbutil.getTransactions(id, transactions_tbl)
    cash_transactions = dbutil.get_cash_transactions(id, dividend_paid_tbl)
    listSymbols = utils.getArrayFromColumn(transactions, "symbol")

    openPositions, closedPositions = pm.createPositionsFromTransactions(
        transactions)
    # set current cash onm portfolioDetails
    pm.setCurrentCash(portfolioDetails, openPositions,
                      closedPositions, transactions)
    listOpenSymbols = utils.getArrayFromColumn(openPositions, "symbol")
    basicDetails = dbutil.getBasicDetails(listSymbols)

    pm.calculatePortfolioDetails(portfolioDetails, cash_transactions, basicDetails,
                                 openPositions)
    transactions.sort(key=lambda x: x["date"], reverse=True)
    portfolioData['transactions'] = transactions
    portfolioData['cash_transactions'] = cash_transactions
    portfolioData['portfolioDetails'] = portfolioDetails
    portfolioData['openPositions'] = openPositions
    portfolioData['closedPositions'] = closedPositions
    portfolioData['basicDetails'] = basicDetails
    return portfolioData


# get all portfolio Ids
@api_model_portfolio.route("/modelportfolio/all/<portfolio_type>", methods=['GET'])
def getSelectedPortfolios(portfolio_type):
    userId = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
    allPortfolios = dbutil.getModelPortfolios(userId, portfolio_type)
    return jsonify(allPortfolios)


@api_model_portfolio.route("/modelportfolio", methods=['POST'])
def saveModelPortfolio():
    userId = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
    data = json.loads(request.data)
    action = data["action"]
    portfolioId = data["id"]
    cash = 0
    name = ""
    if action == "delete":
        dbutil.deletePortfolio(portfolioId)
    else:
        portfolioDetails = dbutil.getModelPortfolioDetails(portfolioId)

        transactions_tbl = "transactions"
        portfolio_type = portfolioDetails["portfolio_type"]

        # overrride default, if there are special tables for the portfolio type
        if portfolio_type:
            if portfolio_type in transactions_table_dict:
                transactions_tbl = transactions_table_dict[portfolio_type]

        name = data["name"]
        if 'startingCash' in data:
            cash = data["startingCash"]
        if 'name' in data:
            name = data["name"]
        if portfolioId == 0:  # add
            portfolioId = dbutil.createNewPortflio(
                name, cash, userId, data["portfolio_type"])
        else:
            if name != '' and cash != 0:
                dbutil.updateModelPortfolio(portfolioId, cash, name)
        if "newTransactions" in data:
            newTransactions = data["newTransactions"]
            if (len(newTransactions) > 0):
                dbutil.saveTransactions(portfolioId, newTransactions, transactions_tbl)
        if "updatedTransactions" in data:
            updatedTransactions = data["updatedTransactions"]
            if (len(updatedTransactions) > 0):
                dbutil.updateTransactions(portfolioId, updatedTransactions, transactions_tbl)
        if "deletedTransactions" in data:
            deletedTransactions = data["deletedTransactions"]
            if (len(deletedTransactions) > 0):
                dbutil.deleteTransactions(portfolioId, deletedTransactions, transactions_tbl)
        sqlCalc = "insert into editportfolio(id,portfolioOrwatch) value ({},3)".format(
            portfolioId)
        dbutil.saveDataQuery(sqlCalc)
    return jsonify({"success": "0", "action": action, "data": {"id": portfolioId, "name": name}})


# get data for a portfolio
@api_model_portfolio.route("/modelportfolio/<id>", methods=['GET'])
def getPortfolioData(id):
    portfolioData = getCurrentPortfolioValues(id)
    return jsonify(portfolioData)


@api_model_portfolio.route("/modelportfolio/holdingmap/<id>", methods=['GET'])
def getPortfolioHoldingMap(id):
    portfolioData = getCurrentPortfolioValues(id)
    return jsonify(portfolioData["portfolioDetails"]["holding_map"])


def get_model_portfolio_symbols(ids):
    symbols = []
    for id in ids:
        open_positions = getCurrentPortfolioValues(id)['openPositions']
        list_open_symbols = utils.getArrayFromColumn(open_positions, "symbol")
        symbols += list_open_symbols
    return symbols


# new APIs to simpify model/my portfolio management 
# web standard model_portfolios CRUD & transactions CRUD separation is the target 
# TODO: 
#   1. delete the ones above after these below are working with new UI portfolio-combined.ts
#   2. delete the /extra lanague once cleaned up above

# # # PORTFOLIO DETAILS CRUD API SET # # #
# CREATE NEW PORTFOLIO (/create - added as POST already exits)
@api_model_portfolio.route("/modelportfolio/create", methods=['POST'])
def create_portfolio():
    try:
        userId = 0
        token = login.checkToken(request)
        if token["status"] == "success":
            userId = token["data"]["user_id"]
        if userId == 0:
            return jsonify({'error': 'User is not logged in. Login first.'})
        
        data = json.loads(request.data)
        portfolio_type = data.get("type")
        portfolio_name = data.get("name")
        starting_cash = data.get("startingCash")

        if not portfolio_name:
            return jsonify({'error': 'Portfolio name cannot be empty'})
        
        if not starting_cash:
            return jsonify({'error': 'Portfolio starting cash cannot be zero'})
        
        portfolioId = dbutil.createNewPortflio(portfolio_name, starting_cash, userId, portfolio_type)
        remove_portfolio_summ_from_mongo(userId) # this will refresh the summ data
        return jsonify(portfolioId)
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while deleting.'})
    

# READ ONE PORTFOLIO FULL DATA (/read - added as GET already exists)
@api_model_portfolio.route("/modelportfolio/read/<port_id>", methods=['GET'])
def get_portfolio_data(port_id):
    portfolioData = getCurrentPortfolioValues(port_id)
    return jsonify(portfolioData)


# READ ALL PORTFOLIO SUMMARY
@api_model_portfolio.route("/modelportfolio/read/summary/<port_type>", defaults={'count': None} , methods=['GET'])
@api_model_portfolio.route("/modelportfolio/read/summary/<port_type>/<count>", methods=['GET'])
def getPortfolioSummaryData(port_type, count):
    userId = 0
    if count:
        count = int(count)
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
    # temp: user id to be replaced with a type later
    if port_type != "user":
        userId = port_type

    ## check if already in DB for of the same hour, else calculate again 
    port_data = get_portfolio_summ_from_mongo(port_type, userId)
    port_count = count

    current_date = datetime.datetime.now()

    if port_data:
        updated_date = port_data["updated_at"]
        difference = current_date - updated_date
        if difference < timedelta(minutes=5):
            # we have portfuolio summary data from today.
            portfolioSummData = port_data["port_summ"]
            if count is None:     # send -1 if we need all the portfolios of the user/sv/tpa
                port_count = len(portfolioSummData)
            else:
                port_count = min(count, len(portfolioSummData))
            portfolioSummData = portfolioSummData[:port_count]
            res = {"port_summ": portfolioSummData, "updated_at": str(updated_date)}
            return jsonify(res)

    ## if not in db then save them in DB and get from DB
    # this workd because, when portfilio type is not 'user' then userId is not used.
    allPortfolios = dbutil.getModelPortfolios(userId, port_type)
    portfolioSummData = []
    for portfolio in allPortfolios:
        portfolioSummData.append(getCurrentPortfolioValues(portfolio['id'])['portfolioDetails'])

    save_portfolio_summ_to_mongo(portfolioSummData, port_type, userId)

    # send back the generated porfolio summary data
    if count is None:     # send -1 if we need all the portfolios of the user/sv/tpa
        port_count = len(portfolioSummData)
    else:
        port_count = min(count, len(portfolioSummData))
    portfolioSummData = portfolioSummData[:port_count]
    res = {"port_summ": portfolioSummData, "updated_at": str(current_date)}
    return jsonify(res)


# UPDATE ONE PORTFOLIO (name and starting cash)
@api_model_portfolio.route("/modelportfolio/update/<port_id>", methods=['PUT'])
def update_portfolio(port_id):
    try:
        userId = 0
        token = login.checkToken(request)
        if token["status"] == "success":
            userId = token["data"]["user_id"]
        if userId == 0:
            return jsonify({'error': 'User is not logged in. Login first.'})
        
        data = json.loads(request.data)
        portfolio_name = data.get("name")
        starting_cash = data.get("startingCash")

        if not portfolio_name:
            return jsonify({'error': 'Portfolio name cannot be empty'})
        
        if not starting_cash:
            return jsonify({'error': 'Portfolio starting cash cannot be zero'})
        
        dbutil.updateModelPortfolio(port_id, starting_cash, portfolio_name)
        portfolioData = getCurrentPortfolioValues(port_id)
        remove_portfolio_summ_from_mongo(userId) # this will refresh the summ data
        return jsonify(portfolioData)
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while deleting.'})
    
    
# DELETE ONE PORTFOLIO 
@api_model_portfolio.route("/modelportfolio/delete/<port_id>", methods=['DELETE'])
def delete_portfolio(port_id):
    try:
        userId = 0
        token = login.checkToken(request)
        if token["status"] == "success":
            userId = token["data"]["user_id"]
        if userId == 0:
            return jsonify({'error': 'User is not logged in. Login first.'})
        if userId != 0:
            dbutil.deletePortfolio(port_id)
            remove_portfolio_summ_from_mongo(userId) # this will refresh the summ data
            return jsonify({'success': 'Portfolio Deleted Sucessfully'})
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while deleting.'})
    

# # # TRANSACTIONS CRUD API SET # # #
# CREATE new transactions (TODO: To be used by add transaction)
@api_model_portfolio.route("/modelportfolio/transactions/create", methods=['POST'])
def create_portfolio_transactions():
    try:
        pass
        return jsonify("Coming Soon...")
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while creating.'})


# READ transactions (TODO: To be used by portfolio txn tab)
@api_model_portfolio.route("/modelportfolio/transactions/read/<port_id>", methods=['GET'])
def read_portfolio_transactions():
    try:
        pass
        return jsonify("Coming Soon...")
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while reading.'})


# UPDATE Transactions (TODO: To be used by edit portfolio)
@api_model_portfolio.route("/modelportfolio/transactions/update/<port_id>", methods=['PUT'])
def update_portfolio_transaction(port_id):
    try:
        userId = 0
        token = login.checkToken(request)
        if token["status"] == "success":
            userId = token["data"]["user_id"]
        if userId == 0:
            return jsonify({'error': 'User is not logged in. Login first.'})
        
        portfolioDetails = dbutil.getModelPortfolioDetails(port_id)

        transactions_tbl = "transactions"

        portfolio_type = portfolioDetails["portfolio_type"]

        # overrride default, if there are special tables for the portfolio type
        if portfolio_type:
            if portfolio_type in transactions_table_dict:
                transactions_tbl = transactions_table_dict[portfolio_type]
        
        txn = json.loads(request.data)
        if txn and port_id:
            dbutil.updateTransactions(port_id, [txn], transactions_tbl)

        return jsonify({"status": "succes", "message": "Transaction Updated."})
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while updating.'})
    

# UPDATE Transaction (TODO: To be used by edit portfolio)
@api_model_portfolio.route("/modelportfolio/transactions/delete/<port_id>", methods=['POST'])
def delete_portfolio_transaction(port_id):
    try:
        userId = 0
        token = login.checkToken(request)
        if token["status"] == "success":
            userId = token["data"]["user_id"]
        if userId == 0:
            return jsonify({'error': 'User is not logged in. Login first.'})
        
        portfolioDetails = dbutil.getModelPortfolioDetails(port_id)

        transactions_tbl = "transactions"

        portfolio_type = portfolioDetails["portfolio_type"]

        # overrride default, if there are special tables for the portfolio type
        if portfolio_type:
            if portfolio_type in transactions_table_dict:
                transactions_tbl = transactions_table_dict[portfolio_type]
        
        txn = json.loads(request.data)
        print(txn)
        print(port_id)
        if txn and port_id:
            dbutil.deleteTransactions(port_id, [txn], transactions_tbl)
            
        return jsonify({"status": "succes", "message": "Transaction Deleted."})
    except Exception as ex:
        print(ex)
        return jsonify({'error': 'Error at database server while deleting.'})


# portfolio data 
def save_portfolio_summ_to_mongo(port_summ, portfolio_type, user_id):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        port_data = {}
        port_data["portfolio_type"] = portfolio_type
        port_data["user_id"] = user_id
        port_data["port_summ"] = port_summ
        port_data["updated_at"] = datetime.datetime.now()

        filter = {"portfolio_type": portfolio_type, "user_id": user_id}
        db_chartlab[PORTFOLIO_SUMM_MONGO_DOC_NAME].update_one(filter, {"$set": port_data}, upsert=True)
    except  Exception as ex:
        print("Factor Analysis data failed at: ", port_data['update_date'])
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()


def get_portfolio_summ_from_mongo(portfolio_type, user_id):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab

        filter = {"portfolio_type": portfolio_type, "user_id": user_id}
        port_data = db_chartlab[PORTFOLIO_SUMM_MONGO_DOC_NAME].find_one(filter)
        if port_data is None:
            return None
        port_data.pop("_id")
        return port_data
    except Exception as ex:
        print("Error in getting factor Analysis Data from MongoDB")
        print(ex)
    finally:
        con_mongo.close()

def remove_portfolio_summ_from_mongo(user_id):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab

        db_chartlab[PORTFOLIO_SUMM_MONGO_DOC_NAME].delete_one({"user_id": user_id})

        return True
    except Exception as ex:
        print("Error in getting factor Analysis Data from MongoDB")
        print(ex)
    finally:
        con_mongo.close()
        