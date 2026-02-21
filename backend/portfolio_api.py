from flask import request, make_response, jsonify
import dbutil
import portfolioManager as pm
import json
import login
from flask import Blueprint
import constants

api_portfolio = Blueprint('api_portfolio', __name__)


@api_portfolio.route("/watchlist/<watchlistId>", methods=['POST', 'GET'])
def getWatchList(watchlistId):
    sql = """select symbol from watchlist_compostion 
    where watchlist_id={};""".format(watchlistId)
    watchlistData = dbutil.getDataArray(sql)
    return jsonify(watchlistData)


# list of all portfolios
@api_portfolio.route('/userportfolio', methods=['GET'])
def getUserPortfolio():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        sqlSector = """select portfolio_id as id,portfolio_name as name from portfolio where user_id = {}""".format(
            userId)
        data = dbutil.getDataTable(sqlSector)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


# add , update , delete user portfolio
@api_portfolio.route('/userportfolio', methods=['POST'])
def addUserPortfolio():
    token = login.checkToken(request)
    success = "1"
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        post_data = json.loads(request.data)
        action = post_data["action"]
        reason = ""
        portfolio_id = 0
        if action == "add":

            portfolioName = post_data['name']
            sql_unique_name = """select count(*) as count_portfolio from portfolio where portfolio_name="{}" and user_id ={}""".format(
                portfolioName, userId)
            count_watchlist = dbutil.getOneRow(sql_unique_name, "count_portfolio")
            if count_watchlist == 0:
                sql = """insert into portfolio(user_id,portfolio_name) values ({},"{}")""".format(
                    userId, post_data['name'])
                data = dbutil.saveDataQuery(sql)
                reason = "Portfolio {} Created !".format(portfolioName)
                query_portfolio_id = """select portfolio_id from  portfolio where portfolio_name ="{}" and user_id={}""".format(
                    portfolioName, userId)
                portfolio_id = dbutil.getOneRow(query_portfolio_id, "portfolio_id")
                reason = "Portfolio created successfully!"
            else:
                reason = "You already have a portfolio with same name!"
        elif action == "delete":
            portfolio_id = post_data["portfolio_id"]
            sqlSector = """delete from  portfolio where user_id = {} and portfolio_id ={}""".format(
                userId, portfolio_id)
            data = dbutil.saveDataQuery(sqlSector)
            reason = "Portfolio Deleted !"
        elif action == "update":
            portfolio_id = post_data["portfolio_id"]
            sqlSector = """update  portfolio set portfolio_name = "{}" where user_id = {} and portfolio_id ={}""".format(
                post_data['name'], userId, portfolio_id)
            data = dbutil.saveDataQuery(sqlSector)
            reason = "Portfolio name updated to {} !".format(post_data['name'])

        sqlCalc = "insert into editportfolio(id,portfolioOrwatch) value ({},1)".format(portfolio_id);
        dbutil.saveDataQuery(sqlCalc)

        return jsonify({"success": success, "portfolio_id": int(portfolio_id), "action": action, "reason": reason})

    else:
        return make_response(jsonify(token)), 401


@api_portfolio.route("/userportfolio/<id>", methods=['GET'])
def getUserPortfolioById(id):
    transactions = pm.getPortfolioData(id)
    symbols = []
    for transaction in transactions:
        transaction["side"] = "Buy"
        symbols.append(transaction["symbol"])
    basicDetails = dbutil.getBasicDetails(symbols)
    portfolioDetails = {"startingCash": 0, "currentCash": 0}
    pm.calculatePortfolioDetails(portfolioDetails, None, basicDetails,
                                 transactions)
    result = {"portfolio_details": portfolioDetails, "transactions": transactions}
    return jsonify(result)


# add , delete symbols from portfolio
@api_portfolio.route('/userPortfolio/<id>', methods=['POST'])
def addUserPortfolioSymbols(id):
    post_data = json.loads(request.data)
    action = post_data["action"]
    if action == "add":
        sql = """insert into portfolio_symbols(portfolio_id,symbol,quantity,price) values ({},"{}",{},{})""".format(
            id, post_data['symbol'], post_data['qty'], post_data['price'])
        data = dbutil.saveDataQuery(sql)
    elif action == "delete":
        sql = """delete from portfolio_symbols where portfolio_id={} and symbol ="{}" """.format(id, post_data['symbol'])
        data = dbutil.saveDataQuery(sql)
    if action == "import":
        for item in post_data["data"]:
            sql = """insert into portfolio_symbols(portfolio_id,symbol,quantity,price) values ({},"{}",{},{})""".format(
                id, item['symbol'], item['qty'], item['costBasis'])
            data = dbutil.saveDataQuery(sql)
    if action == "add-multi":
        for item in post_data["data"]:
            sql = """insert into portfolio_symbols(portfolio_id,symbol,quantity,price) values ({},"{}",{},{})""".format(
                id, item['symbol'], item['qty'], item['price'])
            data = dbutil.saveDataQuery(sql)
    if action == "update":
        for item in post_data["data"]:
            sql = """update portfolio_symbols set quantity={}, price={} where portfolio_id={} and symbol ="{}";""".format(
                item['qty'], item['cost_basis'], id, item['symbol'])
            data = dbutil.saveDataQuery(sql)

    sqlCalc = "insert into editportfolio(id,portfolioOrwatch) value ({},1)".format(id);
    data = dbutil.saveDataQuery(sqlCalc)
    return getUserPortfolioById(id)


@api_portfolio.route("/userportfolio_watchlist/symbol", methods=['POST', 'GET'])
def getUserPortfoliosWatchLists():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        data = pm.getPortfolioAndWatchListSymbols(userId)
        if (len(data) == 0):
            data = pm.getPortfolioAndWatchListSymbols(constants.MODEL_USER_ID)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


# get portfolio symbols if not then send model portfolio top symbols
@api_portfolio.route("/userportfolio/symbol", methods=['POST', 'GET'])
def getUserPortfolios():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        data = pm.getPortfolioSymbols(userId)
        if (len(data) == 0):
            data = pm.getPortfolioSymbols(constants.MODEL_USER_ID)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@api_portfolio.route("/userwatchlist/symbol", methods=['POST', 'GET'])
def getUserWatchlistSymbol():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        data = pm.getWatchlistSymbols(userId)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@api_portfolio.route("/userPortfolio/historical", methods=['POST'])
def getPortfolioHistoricalData():
    post_data = json.loads(request.data)
    portfolioIds = post_data["portfolio"];
    period = post_data["period"];
    portfolioIds = str(portfolioIds) + ",6";
    sql = "select portfolio_id,portfolio_name from portfolio where portfolio_id in ({})".format(portfolioIds)
    nameMap = dbutil.getKeyValuePair(sql, "portfolio_id", "portfolio_name")
    portfolioIds = portfolioIds.split(",")
    portfolioIds = list(map(lambda x: int(x), portfolioIds))
    df_historical = dbutil.getPortfolioHistorical("iview_portfoliodata", portfolioIds, nameMap, period)
    df_historical.dropna(inplace=True)
    return jsonify(dbutil.df_to_dict(df_historical))


@api_portfolio.route('/userwatchlist', methods=['GET'])
def getUserWatchlist():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        sqlSector = """select watchlist_id as id , watchlist_name as name from watchlist_details where userid  = {}""".format(
            userId)
        data = dbutil.getDataTable(sqlSector)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@api_portfolio.route('/userwatchlist', methods=['POST'])
def addUserWatchlist():
    token = login.checkToken(request)
    reason = ""
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        post_data = json.loads(request.data)
        watchlistId = 0
        success = "1"
        action = post_data["action"]
        if action == "add":
            watchlistName = post_data['name']
            sql_unique_name = """select count(*) as count_watchlist from watchlist_details where watchlist_name="{}" and userid ={}""".format(
                watchlistName, userId)
            count_watchlist = dbutil.getOneRow(sql_unique_name, "count_watchlist")
            if count_watchlist == 0:
                sql = """insert into watchlist_details(userid,watchlist_name,date_inception) values ({},"{}",CURDATE())""".format(
                    userId, watchlistName)
                dbutil.saveDataQuery(sql)
                query_watchlist_id = """select watchlist_id from  watchlist_details where watchlist_name ="{}" and userid={}""".format(
                    watchlistName, userId)
                watchlistId = dbutil.getOneRow(query_watchlist_id, "watchlist_id")
                reason = "Watchlist created successfully!"
            else:
                success = "0"
                reason = "You already have a watchlist with same name!"
        elif action == "update":
            watchlistId = post_data['watchlist_id']
            sql = """update  watchlist_details set watchlist_name ="{}" where userid ={} and watchlist_id ={}""".format(
                post_data["name"], userId, post_data['watchlist_id'])
            data = dbutil.saveDataQuery(sql)
            reason = "Watchlist Name  Updated !"
        elif action == "delete":
            watchlistId = post_data['watchlist_id']
            sql = """delete from watchlist_details where userid ={} and watchlist_id ={}""".format(
                userId, post_data['watchlist_id'])
            data = dbutil.saveDataQuery(sql)
            reason = "Watchlist Deleted !"
        return jsonify({"success": success, "watchlist_id": int(watchlistId), "action": action, "reason": reason})
    else:
        return make_response(jsonify({"success": "0"})), 401


@api_portfolio.route('/userwatchlist/<id>', methods=['GET'])
def getUserWatchlistDetail(id):
    sqlSector = """select symbol from watchlist_compostion where watchlist_id   = {}""".format(id)
    data = dbutil.getDataArray(sqlSector)
    return jsonify(data)


@api_portfolio.route('/userwatchlist/<id>', methods=['POST'])
def addSymbolToWatchList(id):
    try:
        data = request.data
        post_data = json.loads(data)
        symbol_list = post_data['symbol'].split(",")
        action = post_data["action"]
        if (action == "add"):
            all_rows = []
            for symbol in symbol_list:
                all_rows.append((id, symbol, 1))
            sql = """ insert into watchlist_compostion (
                watchlist_id,symbol,qty) 
                values (%s,%s,%s)           
            """
            dbutil.insert_many_rows(sql, all_rows)
            return jsonify({"status": "success", "message": "Symbol Added Successfully."})
        if (action == "delete"):
            query = """delete from watchlist_compostion where symbol ="{}" and watchlist_id ={}""".format(
                post_data['symbol'].upper().strip(), id)
            dbutil.saveDataQuery(query)
            return jsonify({"status": "success", "message": "Symbol Deleted Successfully."})

    except Exception as ex:
        print(ex)
        return jsonify({"status": "error", "reason": "Problem in saving watchlist symbols"})
