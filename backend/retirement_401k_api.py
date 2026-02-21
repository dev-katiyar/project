import utils
from flask import request, make_response, jsonify
import dbutil
import json
import login
from flask import Blueprint
import constants

api_401k = Blueprint('api_401k', __name__)


@api_401k.route("/401kFunds", methods=['GET'])
def get401kFunds():
    sql = """select symbol,name,asset_class,one_year,five_year,ten_year,rank,equity as Equity , etf as Bonds,family 
    from 401k_funds where 
    ten_year is not null 
    and one_year is not null 
    and five_year is not null 
    and isActive = 1
    order by priority asc"""
    fundData = dbutil.getDataTable(sql)
    return jsonify(fundData)


@api_401k.route("/401kFunds/categories", methods=['GET'])
def get401kCategories():
    sqlAssets = """select distinct asset_class as id ,  asset_class as name
    from 401k_funds where asset_class !='' and asset_class !='N/A' and asset_class is not null order by asset_class """
    sqlFamily = """SELECT id,name FROM riapro.401k_funds_familiy order by id_order"""
    assets = dbutil.getDataTable(sqlAssets)
    fundFamilies = dbutil.getDataTable(sqlFamily)
    return jsonify({"assets": assets, "fundFamilies": fundFamilies})


@api_401k.route("/401kFunds/search", methods=['POST'])
def search401kFunds():
    post_data = json.loads(request.data)
    symbol = post_data["symbol"]
    name = post_data["name"]
    fundFamily = post_data["fundFamily"]
    if fundFamily == 0 or fundFamily == "0":
        fundFamily = ""
    asset_class = post_data["asset_class"]
    if asset_class == 0 or asset_class == "0":
        asset_class = ""

    sql = """select symbol,name,asset_class,one_year,five_year,ten_year,
    rank,equity as Equity , etf as Bonds,family ,expense_ratio,rating
    from 401k_funds where 
    isActive = 1 and symbol like '%{}%' and name like '%{}%'
    and family like '%{}%' and asset_class like '%{}%'
    order by rating desc ,ten_year desc """.format(symbol, name, fundFamily, asset_class)
    fundData = dbutil.getDataTable(sql)
    return jsonify(fundData)


@api_401k.route('/user401kInfo/<portfolio_id>', methods=['GET'])
def getUser401kInfo(portfolio_id):
    income_details = []
    sql = "select * from 401k_user_info where portfolio_id = {}".format(portfolio_id)
    userInfo = dbutil.getDataTable(sql)
    user_details = {}
    if (len(userInfo) > 0):
        income_details = get_income_details(userInfo[0])
        user_details = userInfo[0]
    return jsonify({"user_info": user_details, "my_income": income_details})


@api_401k.route('/user401kInfo', methods=['POST'])
def saveUser401kInfo():
    token = login.checkToken(request)
    post_data = json.loads(request.data)
    userId = token["data"]["user_id"]
    userInfo = post_data['userInfo']
    portfolio_id = int(post_data['portfolio_id'])

    existingUserCount = dbutil.getOneRow(
        "select count(*) as count from 401k_user_info where portfolio_id ='{}'".format(portfolio_id), "count")

    if existingUserCount == 0:
        sql = """insert into 401k_user_info
        (currentAge,percentToContribute,annualSalary,annualSalaryIncrease,ageOfRetirement,
        current401kBalance,employerMatch,employerMatchEnds,annualRateOfReturn,inflation,retirementReturn,retirementYears,portfolio_id) 
        values ({},{},{},{},{},{},{},{},{},{},{},{},{}) """.format(
            userInfo['currentAge'], userInfo['percentToContribute'], userInfo['annualSalary'],
            userInfo['annualSalaryIncrease'],
            userInfo['ageOfRetirement'], userInfo['current401kBalance'], userInfo['employerMatch'],
            userInfo['employerMatchEnds'], userInfo['annualRateOfReturn'],
            userInfo['inflation'],
            userInfo['retirementReturn'],
            userInfo['retirementYears'],
            portfolio_id)

        data = dbutil.saveDataQuery(sql)

        return jsonify(
            {"success": "ok", "message": "Your Information has been saved successfully !"})

    else:
        sql = """update 401k_user_info 
                set currentAge={},percentToContribute={},annualSalary={},annualSalaryIncrease={},ageOfRetirement={},
                current401kBalance={},employerMatch={},employerMatchEnds={},
                annualRateOfReturn={} ,
                inflation={} ,
                retirementReturn={} ,
                retirementYears={} 
                where portfolio_id={}; """.format(
            userInfo['currentAge'], userInfo['percentToContribute'], userInfo['annualSalary'],
            userInfo['annualSalaryIncrease'],
            userInfo['ageOfRetirement'], userInfo['current401kBalance'], userInfo['employerMatch'],
            userInfo['employerMatchEnds'], userInfo['annualRateOfReturn'],
            userInfo['inflation'],
            userInfo['retirementReturn'],
            userInfo['retirementYears'],
            portfolio_id)

        data = dbutil.saveDataQuery(sql)
        return jsonify(
            {"success": "ok", "message": "Your Information has been updated successfully !"})


@api_401k.route('/adminFunds', methods=['POST'])
def updateFunds():
    post_data = json.loads(request.data)
    action = post_data["action"]
    symbol = post_data["symbol"]

    try:
        if action == "add":
            sql = """insert into 401k_funds(symbol,name,asset_class,family,one_year,five_year,ten_year,equity,etf,priority,isActive) values ('{}','{}','{}','{}',{},{},{},{},{},{},{})""".format(
                post_data['symbol'], post_data['name'], post_data['asset_class'],
                post_data['family'], post_data['one_year'], post_data['five_year'], post_data['ten_year'],
                post_data['equity'], post_data['etf'], post_data['priority'], post_data['isActive'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Added"})

        elif action == "delete":
            sql = """delete from 401k_funds where symbol ='{}'""".format(post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Deleted"})

        elif action == "save":
            sql = """update 401k_funds set name='{}',
            asset_class='{}',family='{}',
            one_year={},five_year={},
            ten_year={},equity={},etf={},priority={} ,isActive={}
            where symbol ='{}';""".format(
                post_data['name'], post_data['asset_class'],
                post_data['family'], post_data['one_year'], post_data['five_year'], post_data['ten_year'],
                post_data['equity'], post_data['etf'], post_data['priority'], post_data['isActive'],
                post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Updated"})

        elif action == "get":
            sql = """select symbol,name,asset_class,one_year,five_year,ten_year,rank,equity ,etf,family,priority,isActive 
                    from 401k_funds where symbol like '{}%';""".format(symbol)
            data = dbutil.getDataTable(sql)
            return jsonify(data)

    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in saving / getting data {}".format(ex)})


@api_401k.route("/401kSectorComposition/<symbol>", methods=['GET'])
def get401kComposition(symbol):
    fundSectorSql = "select sector,composition from 401k_fund_sectors where symbol = '{}' and composition > 0.1;".format(
        symbol)
    fundData = dbutil.getDataTable(fundSectorSql)

    return jsonify(fundData)


@api_401k.route("/401kincome/<portfolio_id>,<model_portfolio_id>", methods=['GET'])
def get_income_details_portfolio(portfolio_id, model_portfolio_id):
    result = {}
    sql = "select * from 401k_user_info where portfolio_id = {}".format(portfolio_id)
    userInfo = dbutil.getDataTable(sql)
    user_details = {}
    if (len(userInfo) > 0):
        userData = userInfo[0]
        userData['annualRateOfReturn'] = dbutil.getRateOfReturn(portfolio_id);
        if userData['annualRateOfReturn'] is not None:
            my_income = get_income_details(userData)
            userData['annualRateOfReturn'] = dbutil.getRateOfReturn(model_portfolio_id);
            model_income = get_income_details(userData)
            result["my_income"] = my_income[-1]
            result["model_income"] = model_income[-1]
    return jsonify(result)


def get_income_details(income_data):
    my_income = []
    prev_income = float(income_data['current401kBalance'])
    prev_income_inflation = prev_income
    current_age = int(income_data['currentAge'])
    ageOfRetirement = int(income_data['ageOfRetirement'])
    percentToContribute = float(income_data['percentToContribute'])
    employerMatch = float(income_data['employerMatch'])
    employerMatchEnds = float(income_data['employerMatchEnds'])
    annualSalary = float(income_data['annualSalary'])
    annualRateOfReturn = float(income_data['annualRateOfReturn'])
    annualSalaryIncrease = income_data['annualSalaryIncrease']
    retirementReturn = income_data['retirementReturn']
    retirementYears = income_data['retirementYears']
    inflation = income_data['inflation']
    current_annual_salary = annualSalary
    employerMatchFinal = percentToContribute
    my_cumulative_contri = 0
    employer_cumulative_contri = 0
    if percentToContribute >= employerMatchEnds:
        employerMatchFinal = employerMatchEnds

    employerMatchFinal = employerMatchFinal * employerMatch / 100.0
    my_income.append({"age": current_age, "income": prev_income, "income_with_inflation": prev_income})
    for age in range(current_age + 1, ageOfRetirement + 1):
        data = {}
        data["age"] = age
        my_contribution = current_annual_salary * (percentToContribute / 100.0)
        if (my_contribution >= 19000 and age < 60):
            my_contribution = 19000
        elif (my_contribution >= 19000 and my_contribution <= 25000 and age > 60):
            my_contribution = my_contribution
        elif (my_contribution > 25000 and age > 60):
            my_contribution = 25000

        my_cumulative_contri = my_cumulative_contri + my_contribution

        employer_contribution = current_annual_salary * (employerMatchFinal / 100.0)
        employer_contribution = employer_contribution
        employer_cumulative_contri = employer_cumulative_contri + employer_contribution
        income_with_interest = (prev_income + my_contribution + employer_contribution) * (
                1 + annualRateOfReturn / 100.0)

        income_with_inflation = income_with_interest * (1 - inflation / 100.0)

        prev_income = income_with_interest
        prev_income_inflation = income_with_inflation

        data["income"] = long(income_with_interest)
        data["income_with_inflation"] = long(income_with_inflation)
        data["emp"] = my_cumulative_contri
        current_annual_salary = current_annual_salary * (1 + annualSalaryIncrease / 100.0)
        data["monthly_income"] = long((income_with_interest * (1 + retirementReturn / 100.0)) / (retirementYears * 12))
        data["monthly_income_inflation_adj"] = long(
            (income_with_inflation * (1 + retirementReturn / 100.0)) / (retirementYears * 12))
        data["employer_cumulative_contri"] = long(employer_cumulative_contri)
        data["my_cumulative_contri"] = long(my_cumulative_contri)
        data["emp_contribution"] = long(employer_contribution)
        data["my_contribution"] = long(my_contribution)
        data["annualRateOfReturn"] = round(annualRateOfReturn, 2)
        my_income.append(data)

    return my_income


@api_401k.route("/401K", methods=['GET'])
def get401k():
    target = {"cash": 5, "bonds": 35, "equity": 60}
    actual = {"cash": 0, "bonds": 0, "equity": 0}

    technical_score = .75

    actual["bonds"] = target["bonds"]
    actual["equity"] = target["equity"] * technical_score
    actual["cash"] = 100 - (actual["bonds"] + actual["equity"])

    target_array = utils.getListFromDict(target)

    actual_array = utils.getListFromDict(actual)

    result = {"actual_array": actual_array, "target_array": target_array, "actual": actual, "target": target}
    return jsonify(result)


@api_401k.route('/portfolio/401k_mapping/<portfolio_id>', methods=['POST'])
def saveUserFundsMapping(portfolio_id):
    token = login.checkToken(request)
    post_data = json.loads(request.data)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        funds = post_data["funds"]
        update_queries = []
        for fund in funds:
            sql_update = """update 401k_portfolio_funds
            set mapping_symbol ='{}'
            where portfolio_id = {} and symbol='{}'
            """.format(fund["mapping_symbol"], portfolio_id, fund["symbol"])
            update_queries.append(sql_update)
        dbutil.execute_query(update_queries)
        return jsonify({"success": "0", "message": "Funds Mapping saved Successfully!"})
    else:
        return make_response(jsonify(token)), 401


@api_401k.route('/portfolio/401k/<portfolio_id>', methods=['POST'])
def saveUserFunds(portfolio_id):
    token = login.checkToken(request)
    post_data = json.loads(request.data)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        funds = post_data["funds"]
        sqlDelete = "delete from 401k_portfolio_funds where portfolio_id = {}".format(portfolio_id)
        dbutil.saveDataQuery(sqlDelete);
        for row in funds:
            if ("allocation" in row):
                sqlInsert = """insert into 401k_portfolio_funds(portfolio_id,allocation,symbol) values({},{},'{}');""".format(
                    portfolio_id, row["allocation"], row["symbol"])
                dbutil.saveDataQuery(sqlInsert)
        return jsonify({"success": "0", "message": "Funds Saved Successfully!"})
    else:
        return make_response(jsonify(token)), 401


@api_401k.route("/portfolio/401k_only_funds_symbols/<portfolio_id>", methods=['GET'])
def getFundCompositionDropDown(portfolio_id):
    sql = """select u.symbol as id , 
        concat(u.symbol,'  (',f.name,')')  as name
        from 401k_portfolio_funds u 
         left join 401k_funds f   on u.symbol = f.symbol     
        where portfolio_id ={} """.format(portfolio_id)
    return jsonify(dbutil.getDataTable(sql))


@api_401k.route("/portfolio/401k_only_funds/<portfolio_id>", methods=['GET'])
def getFundCompositionJson(portfolio_id):
    return jsonify(getFundComposition(portfolio_id))


def getFundComposition(portfolio_id):
    sql = """select up.portfolio_name,u.allocation ,u.symbol, 
        COALESCE(f.name,l.companyname) as name,
        COALESCE(f.family,'N/A') as family,
        COALESCE( f.equity,100) as Equity, 
        COALESCE(f.etf ,0)as Bonds, 
        COALESCE(f.asset_class ,'N/A') as asset_class,
        COALESCE(l.assetid,9) as asset_id,
        COALESCE(u.mapping_symbol ,'') as mapping_symbol
        from 401k_portfolio_funds u     
        left join 401k_funds f   on u.symbol = f.symbol 
        left join list_symbol l on u.symbol = l.symbol
        left join 401k_user_portfolio up on up.portfolioid = u.portfolio_id
        where portfolio_id ={} ;""".format(portfolio_id)
    return dbutil.getDataTable(sql)


@api_401k.route("/portfolio/401k_only_funds/<portfolio_id>", methods=['GET'])
def getFundComposition_401k(portfolio_id):
    return jsonify(getFundComposition(portfolio_id))


@api_401k.route("/portfolio/401k/<portfolio_id>", methods=['GET'])
def getUser401kFunds(portfolio_id):
    userFundData = getFundComposition(portfolio_id)
    dict_asset = {"Bonds": 0, "Equity": 0}
    for row in userFundData:
        if row["asset_id"] in [1]:
            row["Bonds"] = 0
            row["Equity"] = 100
        elif row["asset_id"] in [22,24,25]:
            row["Bonds"] = 100
            row["Equity"] = 0

        dict_asset["Bonds"] = dict_asset["Bonds"] + (row["allocation"] * row["Bonds"]) / 100.0
        dict_asset["Equity"] = dict_asset["Equity"] + (row["allocation"] * row["Equity"]) / 100.0

    assets = utils.getListFromDict(dict_asset)
    sectorsSql = """select  sum(COALESCE(composition,100) *allocation)/100.0 as percentage ,
                COALESCE(s.sector,ls.name,"N/A") as sectorname from  401k_portfolio_funds u 
                left join 401k_fund_sectors s on u.symbol = s.symbol
                left join list_symbol as l on u.symbol=l.symbol 
                left join sectors ls on ls.id = l.sectorid
                where portfolio_id = {} group by sectorname having percentage > 0.1;""".format(portfolio_id)
    sectors = dbutil.getDataTable(sectorsSql)
    result = {"funds": userFundData, "sectors": sectors, "assets": assets}

    return jsonify(result)


@api_401k.route("/401k/modelFunds", methods=['GET'])
def getModel401kFunds():
    sql = """select pf.symbol,f.family,l.companyname,f.equity,f.etf,f.asset_class,pf.allocation,up.portfolio_name,up.portfolioid from 401k_portfolio_funds pf 
            join 401k_user_portfolio up on up.portfolioid=pf.portfolio_id
            left join 401k_funds f  on pf.symbol = f.symbol 
            left join list_symbol l on pf.symbol = l.symbol
            where userid = {} ;""".format(constants.MODEL_USER_ID)

    modelFundData = dbutil.getDataTable(sql)
    return jsonify(modelFundData)


@api_401k.route("/model/portfolio/401k", methods=['GET'])
def getModel401kPortfolios():
    portfolio_data = getUser401kPortfolios(constants.MODEL_USER_ID)
    return jsonify(portfolio_data)


@api_401k.route("/user/portfolio/401k", methods=['GET'])
def getUser401kPortfolios():
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
        portfolio_data = getUser401kPortfolios(user_id)
        return jsonify(portfolio_data)
    else:
        return make_response(jsonify(token)), 401


def getUser401kPortfolios(user_id):
    sql = """select portfolioid as id , portfolio_name as name from 401k_user_portfolio where userid ={} order by portfolio_name; """.format(
        user_id)
    return dbutil.getDataTable(sql)


# add , update , delete user portfolio
@api_401k.route('/user/portfolio/401k', methods=['POST'])
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
            sql_unique_name = "select count(*) as count_portfolio from 401k_user_portfolio where portfolio_name='{}' and userid ={}".format(
                portfolioName, userId)
            count_watchlist = dbutil.getOneRow(sql_unique_name, "count_portfolio")
            if count_watchlist == 0:
                sqlInsert = """insert into 401k_user_portfolio(userid,portfolio_name) values ({},'{}')""".format(
                    userId, post_data['name'])
                data = dbutil.saveDataQuery(sqlInsert)
                reason = "Portfolio {} Created !".format(portfolioName)
                query_portfolio_id = "select portfolioid from  401k_user_portfolio where portfolio_name ='{}' and userid={}".format(
                    portfolioName, userId)
                portfolio_id = dbutil.getOneRow(query_portfolio_id, "portfolioid")
                reason = "Portfolio created successfully!"
            else:
                reason = "You already have a portfolio with same name!"
        elif action == "delete":
            portfolio_id = post_data["portfolio_id"]
            sqlDeletePortfolio = """delete from  401k_user_portfolio where  portfolioid ={}""".format(
                portfolio_id)
            data = dbutil.saveDataQuery(sqlDeletePortfolio)

            sqlDeleteUserInfo = """delete from  401k_user_info where  portfolio_id ={}""".format(
                portfolio_id)
            data = dbutil.saveDataQuery(sqlDeleteUserInfo)

            reason = "Portfolio Deleted !"
        elif action == "update":
            portfolio_id = post_data["portfolio_id"]
            sqlUpdate = """update  401k_user_portfolio set portfolio_name = '{}' where userid = {} and portfolioid ={}""".format(
                post_data['name'], userId, portfolio_id)
            data = dbutil.saveDataQuery(sqlUpdate)
            reason = "Portfolio name updated to {} !".format(post_data['name'])

        return jsonify({"success": success, "portfolio_id": int(portfolio_id), "action": action, "reason": reason})

    else:
        return make_response(jsonify(token)), 401


@api_401k.route('/fund_top10', methods=['POST', "GET"])
def getFundTop10():
    try:
        post_data = json.loads(request.data)
        action = post_data["action"]
        if action == "get":
            symbol = post_data["symbol"]
            sql = """SELECT * from 401k_fund_top10 where symbol = '{}'; """.format(symbol)
            symbol_list = dbutil.getDataTable(sql)
            return jsonify(symbol_list)
        elif action == "add":
            sql = """insert into 401k_fund_top10(symbol,ticker,composition,name) values ('{}','{}',{},'{}')""".format(
                post_data['symbol'], post_data['ticker'], post_data['composition'], post_data['name'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Added"})

        elif action == "delete":
            sql = """delete from 401k_fund_top10 where symbol ='{}'""".format(post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Deleted"})

        elif action == "save":
            sql = """update 401k_fund_top10 set symbol='{}',ticker='{}',composition={},name={} where symbol = '{}' ;""".format(
                post_data['symbol'], post_data['ticker'], post_data['composition'], post_data['name'],
                post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Saved"})
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in saving / getting data {}".format(ex)})


@api_401k.route('/symbol/linkSymbols', methods=['POST'])
def linkSymbol():
    try:
        post_data = json.loads(request.data)
        action = post_data["action"]

        if action == "save":
            sql1 = """ insert into  401k_funds(symbol,name,asset_class,one_year,five_year,ten_year,equity,etf,priority,rank,isActive,islinked)
            select '{}' as symbol,'{}',asset_class,one_year,five_year,ten_year,equity,etf,priority,rank,isActive,1 from 401k_funds where symbol ='{}';""".format(
                post_data['symbol'], post_data['name'], post_data['linkSymbol'])
            data1 = dbutil.saveDataQuery(sql1)

            sql2 = """ insert into  401k_fund_top10(symbol,ticker,composition,name)
            select '{}' as symbol,ticker,composition,name from 401k_fund_top10 where symbol ='{}';""".format(
                post_data['symbol'], post_data['linkSymbol'])
            data2 = dbutil.saveDataQuery(sql2)

            sql3 = """ insert into  401k_fund_sectors(symbol,sector,composition)
            select '{}' as symbol,sector,composition from 401k_fund_sectors where symbol ='{}';""".format(
                post_data['symbol'], post_data['linkSymbol'])
            data3 = dbutil.saveDataQuery(sql3)

            return jsonify({"status": "success", "message": "Symbol Linked"})

    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in saving data {}".format(ex)})


@api_401k.route('/admin/topFundSymbols', methods=['POST'])
def topFundSymbols():
    post_data = json.loads(request.data)
    action = post_data["action"]

    try:
        if action == "delete":
            sql = """delete from 401k_fund_top10 where ticker ='{}' and symbol='{}' """.format(post_data['ticker'],
                                                                                               post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Deleted"})

        elif action == "save":
            fundsTopSymbols = post_data["fundsTopSymbols"]
            sqlDelete = """delete from 401k_fund_top10 where symbol ='{}'""".format(post_data['symbol'])
            dbutil.saveDataQuery(sqlDelete);
            for row in fundsTopSymbols:
                if ("ticker" in row):
                    sqlInsert = """insert into 401k_fund_top10(symbol,ticker,composition,name) values('{}','{}',{},'{}');""".format(
                        row["symbol"], row["ticker"], row["composition"], row["name"])
                dbutil.saveDataQuery(sqlInsert)
            return jsonify({"success": "0", "message": "Saved Successfully!"})


    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in saving / getting data {}".format(ex)})


@api_401k.route('/admin/fundSectorSymbols', methods=['POST'])
def fundSectorSymbols():
    post_data = json.loads(request.data)
    action = post_data["action"]
    symbol = post_data["symbol"]
    sector = post_data['sector']

    try:
        if action == "delete":
            sql = """delete from 401k_fund_sectors where sector ='{}' and symbol='{}' """.format(sector, symbol)
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Deleted"})

        # elif action == "save":
        #     sql = """delete from 401k_fund_top10 where symbol ='{}'""".format(post_data['symbol'])
        #     data = dbutil.saveDataQuery(sql)
        #
        #     sql = """update 401k_funds set name='{}',
        #     asset_class='{}',family='{}',
        #     one_year={},five_year={},
        #     ten_year={},equity={},etf={},priority={} ,isActive={}
        #     where symbol ='{}';""".format(
        #         post_data['name'], post_data['asset_class'],
        #         post_data['family'], post_data['one_year'], post_data['five_year'], post_data['ten_year'],
        #         post_data['equity'], post_data['etf'], post_data['priority'], post_data['isActive'],
        #         post_data['symbol'])
        #     data = dbutil.saveDataQuery(sql)
        #
        #     return jsonify({"status": "success", "message": "Symbol List Updated"})

        elif action == "get":
            sql = """select * from 401k_fund_top10 where symbol ='{}'""".format(post_data['symbol'])
            data = dbutil.saveDataQuery(sql)


    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in saving / getting data {}".format(ex)})
