import mysql.connector
from MyConfig import MyConfig as cfg
import pandas
import pymongo
import utils
from dateutil import parser
from datetime import datetime, date, timedelta
import dateutil.relativedelta
import datetimeutil as dtutil
import datetimeutil
import json
import dataframe_utils
from rapid_api import get_symbol_profile_data, get_symbol_quotes_data, get_suggested_symbols
from util import mongo_utils
from sqlalchemy import create_engine

connectionMysql = "mysql://{}:{}@{}:3306/{}".format(
    cfg.mysqldb_user, 
    cfg.mysqldb_passwd, 
    cfg.mysqldb_host, 
    cfg.mysqldb_db
)

def getSymbolData(list_symbols):
    list_dict_data = []
    dbcon, cursor = getDbConn()
    formatted_symbols = map(lambda x: "'" + x + "'", list_symbols)
    symbols = ','.join(formatted_symbols)

    query = "SELECT * from list_symbol where symbol in ({})".format(symbols)

    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        list_dict_data.append(row)
    dbcon.close()
    return list_dict_data


def symbolsInListSymbolTable(list_symbols):
    result_symbols = []
    dbcon, cursor = getDbConn()
    formatted_symbols = map(lambda x: "'" + x + "'", list_symbols)
    symbols = ','.join(formatted_symbols)
    query = "SELECT symbol, exchange from list_symbol where symbol in ({})".format(symbols)

    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        result_symbols.append(row["symbol"])
    dbcon.close()
    return result_symbols


def updatInsertRelativeScores():
    dbcon, cursor = getDbConn()
    try:
        sql = """
            REPLACE INTO relative_analysis_history
            (`date`, `symbol`, `vs_symbol`, `relative_score`, `absolute_score`)
            SELECT `date`, `symbol`, `vs_symbol`, `relative_score`, `absolute_score`
            FROM relative_analysis_history_temp;
        """
        cursor.execute(sql)
        dbcon.commit()
    except  Exception as ex:
        print(ex)
    finally:
        dbcon.close()


def get_relative_scores(symbol1, symbol2, start_date, end_date):
    dbcon, cursor = getDbConn()
    try:
        scores = []
        sql = """
            SELECT * FROM relative_analysis_history
            WHERE symbol = '{}' 
                AND vs_symbol = '{}'
                AND date BETWEEN '{}' AND '{}'
            ORDER BY date DESC;
        """.format(symbol1, symbol2, start_date, end_date)
        cursor.execute(sql)
        results = cursor.fetchall()
        for row in results:
            scores.append(row)
        return scores
    except  Exception as ex:
        print(ex)
    finally:
        dbcon.close()


def checkSymbolsFromYahoo(missing_symbols):
    yf_symbols = []
    yf_quotes_data = get_symbol_quotes_data(missing_symbols)
    for quote in yf_quotes_data:
        if quote['quoteType'] != 'NONE':
            yf_symbols.append(quote['symbol'])
    return yf_symbols


def getSuggestedSymolsFromYahoo(symbol):
    suggested_symbols = get_suggested_symbols(symbol)
    return suggested_symbols


def getSymbolDataFromYahoo(symbols):
    list_symbol_data = []
    for symbol in symbols:
        yf_symbol_data = get_symbol_profile_data(symbol)
        symbol_data = {
            'symbol': yf_symbol_data['quoteType']['symbol'] if yf_symbol_data['quoteType']['quoteType'] != "FUTURE" else yf_symbol_data['quoteType']['underlyingSymbol'],
            'companyname': yf_symbol_data['quoteType']['shortName'] if yf_symbol_data['quoteType'].get('shortName', None) else yf_symbol_data['quoteType']['longName'],
            'alternate_name': yf_symbol_data['quoteType']['shortName'] if yf_symbol_data['quoteType'].get('shortName', None) else yf_symbol_data['quoteType']['longName'],
            'exchange': yf_symbol_data['quoteType']['exchange'],
            'source': 'yahoo',
            'asset': yf_symbol_data['quoteType']['quoteType'],
            'sector': '',
            'industry': '',
            'isactive': 1,
            'isnew': 1
        }
        if yf_symbol_data.get('assetProfile', None) is not None:
            symbol_data['sector'] = yf_symbol_data['assetProfile'].get('sector', '')
            symbol_data['industry'] = yf_symbol_data['assetProfile'].get('industry', '')
        if symbol_data['asset'] == 'CRYPTOCURRENCY':
            symbol_data['sector'] = 'Crypto'

        list_symbol_data.append(symbol_data)
    return list_symbol_data


def insertIntoListSymbols(list_symbol_data):
    for symbol_data in list_symbol_data:
        ls_data = getAssetSectorIndustryId(
            symbol_data)  # TODO: Optimisation possible? - for bulk getting of sector etc in one query and saving all row in one query
        sql = """insert into list_symbol(symbol,companyname,exchange,source,assetid,sectorid,industryid,isactive,alternate_name,isnew) 
                 values ("{}","{}","{}","{}",{},{},{},{},"{}",{})""".format(
            ls_data['symbol'], ls_data['companyname'], ls_data['exchange'], ls_data['source'],
            ls_data['assetid'], ls_data['sectorid'], ls_data['industryid'], ls_data['isactive'],
            ls_data['alternate_name'], ls_data['isnew'])
        data = saveDataQuery(sql)
    return {"status": "success", "message": data}


def getAssetSectorIndustryId(symbol_data):
    try:
        # symbol_data["industry"] = utils.convertToUtf(symbol_data["industry"])
        # symbol_data["sector"] = utils.convertToUtf(symbol_data["sector"])
        # symbol_data["asset"] = utils.convertToUtf(symbol_data["asset"])
        query = """SELECT
        (SELECT asset_id FROM assets WHERE assets.asset_type_yf = '{}' LIMIT 1) as assetid,
        (SELECT id FROM sectors WHERE sectors.name = '{}' LIMIT 1) as sectorid,
        (SELECT industryid FROM industries WHERE industries.industryname = '{}' LIMIT 1) as industryid;
        """.format(symbol_data['asset'], symbol_data['sector'], symbol_data['industry'])
        dbcon, cursor = getDbConn()
        cursor.execute(query)
        row = cursor.fetchone()
        dbcon.close()
        symbol_data['assetid'] = row['assetid']
        symbol_data['sectorid'] = row['sectorid'] or 'null'
        symbol_data['industryid'] = row['industryid'] or 'null'
        return symbol_data
    except Exception as ex:
        print(ex)
        return symbol_data


def deletePortfolio(portfolioId):
    dbcon, cursor = getDbConn()

    # delete transactions of the given portfolio first
    del_port_txns = delete_portfolio_transactions(portfolioId)
    if del_port_txns == False:
        raise Exception("Error deleting portfolio transactions")
    
    # delete portfolio
    query_delete = """delete from model_portfolio where  portfolioId ={} """.format(portfolioId)

    cursor.execute(query_delete)
    dbcon.commit()
    dbcon.close()


def delete_portfolio_transactions(portfolioId):
    try:
        dbcon, cursor = getDbConn()
        txn_query_get = """
            select * from transactions where portfolioId ={}
        """.format(portfolioId)
        txn_ids = getDataArray(txn_query_get, "id")
        txn_ids_set = ",".join(map(str, txn_ids))
        txn_query_delete = """delete from transactions where id in ({}) """.format(txn_ids_set)
        cursor.execute(txn_query_delete)
        dbcon.commit()
        return True
    except Exception as ex:
        print(ex)
        return False
    finally:
        dbcon.close()

def getRateOfReturn(portfolio_id):

    query = """SELECT sum(ps.allocation*
            (CASE when f.ten_year != 0 then f.ten_year  
            when f.five_year !=0 then f.five_year else  f.one_year END ))/sum(ps.allocation)  as rateOfReturn FROM 401k_funds f
                        join 401k_portfolio_funds ps on ps.symbol = f.symbol
                        where ps.portfolio_id = {}; 
        """.format(portfolio_id)

    rateOfReturn = getOneRow(query, "rateOfReturn")
    return rateOfReturn


def createNewPortflio(name, startingcash, userId, portfolio_type):
    dbcon, cursor = getDbConn()
    query = """insert into model_portfolio(name,startingcash,status,user_id,portfolio_type) values ("{}",{},1,{},"{}")""".format(
        name, startingcash, userId, portfolio_type)
    cursor.execute(query)
    dbcon.commit()
    dbcon.close()
    return getPortfolioId(name, userId)


def getPortfolioId(name, user_id):
    query = """SELECT portfolioid from model_portfolio where name= "{}" and user_id ={}; 
        """.format(name, user_id)

    portfolioid = getOneRow(query, "portfolioid")
    return portfolioid


def insert_multiple_query(table, rows):
    dbcon, cursor = getDbConn()
    for mydict in rows:
        placeholders = ', '.join(['%s'] * len(mydict))
        columns = ', '.join("`" + str(x).replace('/', '_') + "`" for x in mydict.keys())
        values = ', '.join("'" + str(x).replace('/', '_') + "'" for x in mydict.values())
    sql = "INSERT INTO %s ( %s ) VALUES ( %s );" % ('mytable', columns, values)
    dbcon.commit()
    dbcon.close()


def execute_single_query(sql):
    dbcon, cursor = getDbConn()
    result = cursor.execute(sql)
    dbcon.commit()
    dbcon.close()
    return result


def execute_query(list_sql):
    dbcon, cursor = getDbConn()
    for sql in list_sql:
        if (sql.strip() != ""):
            cursor.execute(sql)
    dbcon.commit()
    dbcon.close()


def updateModelPortfolio(portfolioId, startingCash, name):
    sql = """update model_portfolio set name ="{}" , startingCash = {} where portfolioid ={}""".format(name,
                                                                                                   startingCash,
                                                                                                   portfolioId)
    execute_query([sql])


def saveTransactions(portfolioId, transactions, tbl_name="transactions"):
    dbcon, cursor = getDbConn()

    multipleRows = []
    for transaction in transactions:
        tr_date = transaction['date'][0:10]
        commissionPerTrade = float(transaction['commission']) / float(transaction['qty'])
        transactionRow = "('{}',{},'{}',{},'{}',{},{})".format(transaction['symbol'], transaction['qty'],
                                                               tr_date, portfolioId, transaction['side'],
                                                               transaction['price'], commissionPerTrade)
        multipleRows.append(transactionRow)

    multipleRowsFormatted = ",".join(multipleRows)
    query = """insert into {}(symbol,qty,date,portfolioid,side,price,commission) 
         values {}""".format(tbl_name, multipleRowsFormatted
                             )
    cursor.execute(query)
    dbcon.commit()
    dbcon.close()


def updateTransactions(portfolioId, transactions, tbl_name="transactions"):
    dbcon, cursor = getDbConn()
    for transaction in transactions:
        tr_date = transaction['date'][0:10]
        query = """update {}
            set symbol ='{}',
            qty = {},
            side ='{}',
            price ={},
            date ='{}',
            commission={}
         where portfolioid ={} and id ={}""".format(tbl_name,
                                                    transaction['symbol'],
                                                    transaction['qty'],
                                                    transaction['side'],
                                                    transaction['price'],
                                                    tr_date,
                                                    transaction['commission'],
                                                    portfolioId, transaction["id"])
        cursor.execute(query)
    dbcon.commit()
    dbcon.close()


def deleteTransactions(portfolioid, transactions, tbl_name="transactions"):
    dbcon, cursor = getDbConn()
    idsToDelete = map(lambda transaction: str(transaction['id']), transactions)
    idsToDelete = ",".join(idsToDelete)
    query = """delete from {} where id in ({}) and portfolioid ={}""".format(
        tbl_name, idsToDelete, portfolioid
    )

    cursor.execute(query)
    dbcon.commit()
    dbcon.close()


def getTransactions_Cash(portfolioId):
    dbcon, cursor = getDbConn()
    list_dict_data = []
    query_transactions = """select portfolioid,cash,date,name from model_portfolio_cash where portfolioid  = {}""".format(
        portfolioId)
    cursor.execute(query_transactions)
    results = cursor.fetchall()
    for row in results:
        list_dict_data.append(row)
    dbcon.close()
    return list_dict_data


def get_alert_text(value):
    data_map = {0: "Neutral", 1: "Very Bearish", 2: "Bearish", 3: "Bullish", 4: "Very Bullish"}
    if value in data_map:
        return data_map[value]
    else:
        return ""


def getSymbolTechnicalDataAndFundamental(symbols):
    formattedSymbols = map(lambda x: "'" + x + "'", symbols.split(","))
    formattedSymbols = ','.join(formattedSymbols)
    sql = """select ls.symbol,ls.companyname,ls.exchange,ls.source,ls.assetid as asset_id,ls.sectorid as sector_id,
            ls.industryid as industry_id,ls.isactive,
            sl.PiotroskiFScore ,
			sl.MohanramScore ,
			sl.PiotroskiFScore ,
			sl.RelativeStrength12Weeks ,
			sl.ZacksRank ,
			sl.relative_strength,
            l.last as price,l.price_change as priceChange ,
            l.change_pct as priceChangePct,ls.companyname as companyName,
            ls.alternate_name as alternate_name,
            t.rating   ,t.mom,t.macd, t.macdhist, 
            round(100*(l.last-t.price_Monthly)/t.price_Monthly ,2)as mtd,
            round(100*(l.last-t.price_Monthly)/t.price_Monthly,2)as priceChangeMonthly,
            
            round(100*(l.last-t.price_Weekly)/t.price_Weekly ,2)as wtd,
            round(100*(l.last-t.price_Yearly)/t.price_Yearly ,2)as ytd,
            round(100*(l.last-t.price_Yearly)/t.price_Yearly ,2)as priceChangeYearly,
            round(100*(l.last-t.price_2year)/t.price_2year ,2)as priceChange2Year,
            round(100*(l.last-t.price_3year)/t.price_3year ,2)as priceChange3Year,
            round(100*(l.last-t.price_oneMonth)/t.price_oneMonth ,2)as change_oneMonth_pct,
            round(l.last-t.price_oneMonth,2)as change_oneMonth,
                        
            round(l.last-t.price_oneyearbeforedate ,2)as change_oneyearbeforedate,
            round(100*(l.last-t.price_oneyearbeforedate)/t.price_oneyearbeforedate ,2)as change_oneyearbeforedate_pct,
            
            round(100*(l.last-t.price_Quaterly)/t.price_Quaterly ,2)as qtd, 
            
            rsi,sma50,sma20,sma100,sma200,sma150,t.inter_trend,t.long_trend,
            t.short_trend,t.macd_trend ,
            l.52weekhigh as high52, l.52weeklow as low52,
            l.52weekhigh as week_high_52, l.52weeklow as week_low_52,
            
            l.market_cap_raw as marketCap,
            sf.dividendYield*100 as dividend_yield,
            sf.dividendYield*100 as dividendYield,
            sf.trailingPE,
            sf.forwardPE,
            sf.pegRatio,
            sf.priceToSalesTrailing12Months,
            sf.priceToBook,
            sf.trailingEps,
            sf.forwardEps,
            sf.returnOnAssets,
            sf.returnOnEquity,
            sf.currentRatio,
            sf.quickRatio,
            sf.debtToEquity,
            sf.grossMargins,
            sf.operatingMargins,
            sf.profitMargins,
            sf.payoutRatio,
            sf.totalCash,
            sf.totalCashPerShare,
            sf.ebitda,
            sf.totalDebt,
            sf.totalRevenue,
            sf.revenuePerShare,
            sf.grossProfits,
            sf.freeCashflow,
            sf.operatingCashflow,
            sf.ebitdaMargins,
            sf.enterpriseValue,
            sf.beta,
            sf.bookValue,
            sf.enterpriseToRevenue,
            sf.enterpriseToEbitda,
            sf.ex_dividend_date,
            sf.pay_date,
            sf.earning_date,
            te.fair_value,
            te.peter_lync,
            te.benjamin,
            COALESCE( sec.name  ,"N/A") as sector
            from list_symbol ls
            left join live_symbol l on l.symbol =ls.symbol
            left join technicals_symbol t on ls.symbol= t.symbol
            left join stats_latest as sl on ls.symbol = sl.symbol
            left join symbol_fundamentals as sf on ls.symbol = sf.symbol
            left join technicals_extra as te on te.symbol = ls.symbol
            left join sectors as sec on sec.id = ls.sectorid
            where ls.symbol in ({}) """.format(formattedSymbols)
    data = getDataTable(sql)

    return data


def getFirstTransaction(portfolioId, tbl_name="transactions"):
    first_transaction_date = ""
    dbcon, cursor = getDbConn()
    query_transactions = """select min(date) as date
            from model_portfolio m 
              join {} t on m.portfolioid= t.portfolioid 
              where m.portfolioid  = {}  """.format(
        tbl_name, portfolioId)

    cursor.execute(query_transactions)

    results = cursor.fetchall()
    for row in results:
        first_transaction_date = row["date"]
    dbcon.close()
    return first_transaction_date


def getTransactions(portfolioId, tbl_name = 'transactions'):
    dbcon, cursor = getDbConn()
    list_dict_data = []
    query_transactions = """select t.id,t.symbol,t.price,t.date,qty,side,commission
            from model_portfolio m 
              join {} t on m.portfolioid= t.portfolioid 
              where m.portfolioid  = {}  
              order by t.symbol , t.date , FIELD(side, 'Buy', 'Sell', 'Sell Short', 'Buy To Cover') """.format(
        tbl_name, portfolioId)
    cursor.execute(query_transactions)
    results = cursor.fetchall()
    for row in results:
        list_dict_data.append(row)
    dbcon.close()
    return list_dict_data


def get_cash_transactions(portfolioId, divd_tbl="dividend_paid"):
    dbcon, cursor = getDbConn()

    list_dict_data = []

    query_transactions = """select portfolio_id,qty,amount,pay_date,ex_dividend_date,symbol,next_payout from {} where portfolio_id= {} """.format(
        divd_tbl, portfolioId)

    cursor.execute(query_transactions)

    results = cursor.fetchall()
    for row in results:
        list_dict_data.append(row)
    dbcon.close()
    return list_dict_data


def getModelPortfolios(userId, portfolio_type):
    list_dict_data = []

    dbcon, cursor = getDbConn()
    query = ""

    if portfolio_type == "user":
        query = """select m.name,m.portfolioid as id,m.startingcash as startingCash 
                    from model_portfolio  as m 
                    where m.status =1 
                    and user_id = {}
                    and m.portfolio_type = '{}'
                    """.format(userId, portfolio_type)
    else:
        query = """select m.name,m.portfolioid as id,m.startingcash as startingCash 
                    from model_portfolio  as m 
                    where m.status =1 
                    and m.portfolio_type ='{}'
                    
                    """.format(portfolio_type)

    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        list_dict_data.append(row)

    dbcon.close()
    return list_dict_data


def getModelPortfolioDetails(portfolioId):
    list_dict_data = []
    dbcon, cursor = getDbConn()
    query = "select portfolioid,name,startingcash as startingCash, portfolio_type from model_portfolio where portfolioid={}".format(
        portfolioId)
    cursor.execute(query)
    row = cursor.fetchone()
    dbcon.close()
    return row


def getBasicDetails(listSymbols):
    if len(listSymbols) == 0:
        return {}
    list_dict_data = {}
    dbcon, cursor = getDbConn()
    formattedSymbols = map(lambda x: "'" + x + "'", listSymbols)
    symbols = ','.join(formattedSymbols)
    query = """select l.symbol,e.companyName as name,
        COALESCE( s.name  ,"N/A") as sector, 
        COALESCE(i.industryname ,'N/A') as  industry,
        last as currentPrice,change_pct as changePct ,price_Change as priceChange , 
        COALESCE(a.asset_name ,'N/A' ) as asset_name
         from 
               live_symbol l 
              join list_symbol e on e.symbol = l.symbol
              left join sectors s on e.sectorid = s.id
              left join industries i on e.industryid = i.industryid
              left join assets a on e.assetid= a.asset_id
              left join etf_asset es on e.etf_asset_id = es.id
              where l.symbol in   ({})""".format(symbols)

    cursor.execute(query)

    results = cursor.fetchall()
    for row in results:
        list_dict_data.update({row["symbol"]: row})
    dbcon.close()
    return list_dict_data


def get_data_by_collection(coll, query):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        db_chartlab = con_mongo.chartlab
        data = db_chartlab[coll].find_one(query)
        if data is not None:
            del data['_id']
        return data
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def getNews(symbol_list, limit):
    list_news = []
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        db_chartlab = con_mongo.chartlab
        news_data = db_chartlab.news.find({"symbol": {"$in": symbol_list}})
        current_date = datetime.now() + dateutil.relativedelta.relativedelta(days=-5)
        current_date = utils.getFormattedStr(current_date, '%Y-%m-%d')
        for item in news_data:
            item["news"].sort(key=lambda x: parser.parse(x["pubDate"].replace("&nbsp;", "")), reverse=True)
            sortedTopNewsItems = item["news"]
            if (len(sortedTopNewsItems) > 4):
                # sortedTopNewsItems = filter(
                #     lambda x: utils.getFormattedStr(parser.parse(x["pubDate"]), '%Y-%m-%d') >= current_date,
                #     sortedTopNewsItems)
                sortedTopNewsItems = sortedTopNewsItems[0:limit]

            for newsItem in sortedTopNewsItems:
                title = newsItem["title"].replace('&quot;', '').replace('&#39;', '`')
                date1 = parser.parse(newsItem["pubDate"].replace("&nbsp;", ""))
                list_news.append(
                    {"symbol": item["symbol"], "title": title, "link": newsItem["link"],
                     "time": utils.getFormattedStr(date1),
                     "date_raw": date1})
        return list_news
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def getStartDateFromPeriod(period):
    end_date = datetime.today()
    if (period == "ytd"):
        start_date = end_date.replace(month=1, day=1)
    elif (period == "20Day"):
        start_date = end_date + dateutil.relativedelta.relativedelta(days=-20)
    elif (period == "1month"):
        start_date = end_date + dateutil.relativedelta.relativedelta(months=-1)
    elif (period == "3month"):
        start_date = end_date + dateutil.relativedelta.relativedelta(months=-3)
    elif (period == "6month"):
        start_date = end_date + dateutil.relativedelta.relativedelta(months=-6)
    elif (period == "1year"):
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-1)
    elif (period == "2year"):
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-2)
    elif (period == "3year"):
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-3)
    elif (period == "10year"):
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-10)
    elif (period == "20year"):
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-20)
    elif (period == "All"):
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-15)
    else:
        start_date = end_date + dateutil.relativedelta.relativedelta(years=-10)
    day_adjust = 1
    if start_date.weekday() == 5:  # saturday
        day_adjust = 1
    if start_date.weekday() == 6:  # sunday
        day_adjust = 2
    start_date = start_date - dateutil.relativedelta.relativedelta(days=day_adjust)

    return start_date


def getSymbolHistoricalDiff(symbol_list, period):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        end_date = datetime.today()
        start_date = getStartDateFromPeriod(period)
        db_chartlab = con_mongo.chartlab
        result = db_chartlab.symbolshistorical.find(
            {"symbol": {"$in": symbol_list}, "date": {'$lt': end_date, '$gte': start_date}}).sort("date", 1)
        symbol_data = {}
        first_price = {}
        for item in result:
            symbol = item["symbol"]
            if symbol in symbol_data:
                price_data = symbol_data[symbol]
            else:
                price_data = []
                symbol_data.update({symbol: price_data})
                first_price.update({symbol: item["close"]})
            start_price = first_price[symbol]
            close = item['close']
            diff = round(100 * (close - start_price) / start_price, 2)
            price_data.append({"date": item["date"], symbol: diff})
        df_result = None
        for symbol, data in symbol_data.items():
            df = pandas.DataFrame.from_dict(data)
            df.set_index("date", inplace=True)
            if '^GSPC' in df.columns:
                df = df.rename(columns={"^GSPC": "S&P500"})
            if df_result is None:
                df_result = df
            else:
                df_result = df_result.join(df, lsuffix='_caller', rsuffix='_other')

        if df_result is None:
            return df_result
        df_result = df_result.drop_duplicates()
        df_result.ffill(inplace=True)
        df_result = limit_rows_to_thousand(df_result)
        df_result["date"] = df_result.index
        df_result["date"] = df_result["date"].apply(lambda x: x.strftime("%b %d, %Y"))
        return df_result
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def getSymbolHistoricalPrice(symbol_list, period):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        end_date = datetime.today()
        start_date = getStartDateFromPeriod(period)
        db_chartlab = con_mongo.chartlab
        result = db_chartlab.symbolshistorical.find(
            {"symbol": {"$in": symbol_list}, "date": {'$lt': end_date, '$gte': start_date}}).sort("date", 1)
        symbol_data = {}
        # first_price = {}
        for item in result:
            symbol = item["symbol"]
            if symbol in symbol_data:
                price_data = symbol_data[symbol]
            else:
                price_data = []
                symbol_data.update({symbol: price_data})
                # first_price.update({symbol: item["close"]})
            # start_price = first_price[symbol]
            close = item['close']
            # diff = round(100 * (close - start_price) / start_price, 2)
            price_data.append({"date": item["date"], symbol: close})
        df_result = None
        for symbol, data in symbol_data.items():
            df = pandas.DataFrame.from_dict(data)
            df.set_index("date", inplace=True)
            if '^GSPC' in df.columns:
                df = df.rename(columns={"^GSPC": "S&P500"})
            if df_result is None:
                df_result = df
            else:
                df_result = df_result.join(df, lsuffix='_caller', rsuffix='_other')

        if df_result is None:
            return df_result
        df_result = df_result.drop_duplicates()
        df_result.ffill(inplace=True)
        df_result = limit_rows_to_thousand(df_result)
        df_result["date"] = df_result.index
        df_result["date"] = df_result["date"].apply(lambda x: x.strftime("%b %d, %Y"))
        return df_result
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def limit_rows_to_thousand(df):
    num_of_rows = len(df.index)
    if num_of_rows < 1000:
        return df
    else:
        num_of_rows_to_drop = num_of_rows - 999
        step = num_of_rows * 1.00 / num_of_rows_to_drop
        rows_to_drop = []
        for x in range(1, num_of_rows_to_drop):
            rows_to_drop.append(df.index[0 + int(x * step)])
            if int(x * step) == num_of_rows:
                continue
        df = df.drop(rows_to_drop)
        return df


def getSymbolHistorical(symbol_list, period):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        end_date = datetime.today()
        start_date = getStartDateFromPeriod(period)
        db_chartlab = con_mongo.chartlab
        result = db_chartlab.symbolshistorical.find(
            {"symbol": {"$in": symbol_list}, "date": {'$lt': end_date, '$gte': start_date}}).sort("date", 1)
        symbol_data = {}
        first_price = {}
        for item in result:
            symbol = item["symbol"]
            if symbol in symbol_data:
                price_data = symbol_data[symbol]
            else:
                price_data = []
                symbol_data.update({symbol: price_data})
                first_price.update({symbol: item["close"]})
            price_data.append({"date": item["date"], symbol: item['close']})
        df_result = None
        for symbol, data in symbol_data.items():
            df = pandas.DataFrame.from_dict(data)
            df.set_index("date", inplace=True)
            if '^GSPC' in df.columns:
                df = df.rename(columns={"^GSPC": "S&P500"})
            if df_result is None:
                df_result = df
            else:
                df_result = df_result.join(df, lsuffix='_caller', rsuffix='_other')

        df_result["date"] = df_result.index
        return df_result
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def getPortfolioMktValue(portfolio_id):
    dbcon, cursor = getDbConn()

    sql = """ select sum(round(t1.quantity*t2.last,2)) as portfolio_value 
                        ,round(sum(t2.change_pct*t1.quantity)/sum(t1.quantity),2) as portfolio_change
                        , sum(round(t1.quantity*t1.price,2)) as start_value
                         from portfolio_symbols t1
                        join live_symbol t2 
                        on t1.symbol=t2.symbol
                        
                        where portfolio_id=%d """ % (portfolio_id)
    cursor.execute(sql)
    results = cursor.fetchone()
    dbcon.close()
    return results


def get_portfolio_startdate(portfolio_id):
    dbcon, cursor = getDbConn()
    sql = "SELECT create_date FROM portfolio WHERE portfolio_id={}".format(portfolio_id)
    cursor.execute(sql)
    results = cursor.fetchone()
    start_date = results["create_date"]
    dbcon.close()
    return start_date


def get_portfoliodetails(portfolio_id):
    dict_portfolio = {}
    dbcon, cursor = getDbConn()
    sql = "SELECT upper(symbol) as symbol,quantity,price AS price FROM portfolio_symbols where portfolio_id= {}".format(
        portfolio_id)
    cursor.execute(sql)
    results = cursor.fetchall()
    for row in results:
        dict_portfolio.update({row["symbol"]: (row["quantity"], row["price"])})
    dbcon.close()
    return dict_portfolio


def get_symbol_adjclose(symbol, startdate, enddate):
    con = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    db = con.chartlab
    df_symbol = pandas.DataFrame()
    prices_symbol = db.symbolshistorical.find({"$and": [{'symbol': symbol},
                                                        {"date": {"$gt": startdate}},
                                                        {"date": {"$lt": enddate}}]}).sort("date", 1)
    if (mongo_utils.getdocs_count(prices_symbol) > 0):
        df_symbol = pandas.DataFrame(list(prices_symbol), columns=['close', 'date'])

        df_symbol['date'] = df_symbol.apply(lambda x: dtutil.getdatewithzero(x['date']), axis=1)
        df_symbol = df_symbol.set_index('date')
        df_symbol.columns = [symbol]

        df_symbol = df_symbol.reset_index().drop_duplicates(subset='date', keep='last').set_index('date')
    con.close()
    return df_symbol


def getPortfolioHistoricalDataFrame(collection_name, portfolioIds, period, first_transaction_date=None):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        end_date = datetime.today()
        start_date = getStartDateFromPeriod(period) - timedelta(days=1)
        if first_transaction_date is not None:
            first_transaction_date = datetimeutil.getdatefromstr(first_transaction_date) - timedelta(days=3)
            if start_date < first_transaction_date:
                start_date = first_transaction_date

        db_chartlab = con_mongo.chartlab
        result = db_chartlab[collection_name].find(
            {"PortfolioId": {"$in": portfolioIds}, "date": {'$lt': end_date, '$gte': start_date}}).sort("date", 1)
        df = pandas.DataFrame(list(result))
        return df
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def performanceDataByPeriod(collection_name, portfolioIds, nameMap, period, first_transaction_date=None,
                            todayValues=None):
    try:
        historical_data = getPortfolioHistoricalDataFrame(collection_name, portfolioIds, period,
                                                          first_transaction_date)
        symbol_data = []
        for item in historical_data.iterrows():
            symbol_data.append(
                {"date": item[1]["date"], "mv": item[1]['marketValue'], 'PortfolioId': item[1]['PortfolioId']})
        if todayValues and len(symbol_data) > 0:
            for portfolio, currentVal in todayValues.items():
                symbol_data.append(
                    {"date": datetimeutil.getdatetime(datetime.today()), "mv": currentVal, 'PortfolioId': portfolio})
        df = pandas.DataFrame(symbol_data)
        performance = {}
        if (not (df.empty)):
            keys = ["yearly", "monthly", "quarterly"]
            for portfolioId in portfolioIds:
                df_individual = df[df["PortfolioId"] == portfolioId][["date", "mv"]]
                perf = dataframe_utils.getPerfForDataFrame(df_individual, nameMap[portfolioId])
                for key in keys:
                    dataframe_utils.mergePortfolioPerf(perf[key], key, performance)
            for key in keys:
                item = performance[key].reset_index().to_dict(orient='records')
                performance.update({key: item})
            performance.update({"names": list(nameMap.values())})
        return performance
    except  Exception as ex:
        print(ex)


def getPortfolioHistorical(collection_name, portfolioIds, nameMap, period, first_transaction_date=None,
                           todayValues=None):
    try:
        historical_data = getPortfolioHistoricalDataFrame(collection_name, portfolioIds, period,
                                                          first_transaction_date)
        symbol_data = {}
        first_price = {}
        for row in historical_data.iterrows():
            item = row[1]
            symbol = item["PortfolioId"]
            if symbol in symbol_data:
                price_data = symbol_data[symbol]
            else:
                price_data = []
                symbol_data.update({symbol: price_data})
                first_price.update({symbol: item["marketValue"]})
            start_price = first_price[symbol]
            close = item['marketValue']
            diff = round(100 * (close - start_price) / start_price, 2)
            price_data.append({"date": item["date"], symbol: diff})
            # price_data_filtered = filter(
            #     lambda x: x["date"] >= datetimeutil.getdatefromstr(first_transaction_date),
            #     price_data)
        if todayValues:
            for portfolio, currentVal in todayValues.items():
                if portfolio in first_price and portfolio in symbol_data:
                    diff_Current = round(100 * (currentVal - first_price[portfolio]) / first_price[portfolio], 2)
                    last_date = datetimeutil.getdatetime(datetime.today())
                    latest_week_day = symbol_data[portfolio][-1]["date"].isoweekday()
                    if (latest_week_day == 5 and last_date.isoweekday() in [6, 7]):
                        last_item = symbol_data[portfolio][-1]
                        last_date = last_item["date"]
                        symbol_data[portfolio].remove(last_item)

                    symbol_data[portfolio].append(
                        {"date": last_date, portfolio: diff_Current})

        df_result = None
        for symbol, data in symbol_data.items():
            df = pandas.DataFrame.from_dict(data)
            df.set_index("date", inplace=True)
            for nameId, portfolio_name in nameMap.items():
                if nameId in df.columns:
                    df = df.rename(columns={nameId: portfolio_name})
            if df_result is None:
                df_result = df
            else:
                df_result = df_result.join(df, lsuffix='_caller', rsuffix='_other')
        return df_result
    except  Exception as ex:
        print(ex)


def df_to_dict(df_result):
    if df_result is None:
        return {}
    else:
        df_result["date"] = df_result.index
        df_result["date"] = df_result["date"].apply(lambda x: x.strftime("%b %d, %Y"))

    return df_result.to_dict('records')


def df_to_json(df_result):
    if df_result is None:
        return json.dumps({})
    else:
        df_result["date"] = df_result.index
        df_result["date"] = df_result["date"].apply(lambda x: x.strftime("%b %d, %Y"))

    return df_result.to_json(orient='records')


def getTechAlerts(listSymbols):
    list_dict_data = []
    upsymbols = []
    downsymbols = []
    up = 0
    down = 0
    if len(listSymbols) > 0:
        formattedSymbols = map(lambda x: "'" + x + "'", listSymbols)
        symbols = ','.join(formattedSymbols)
        query = """ select s.symbol,t.name as event , t.sign, s.date from alerts_latest s join 
        alert_types t on s.typeid = t.type_id where s.symbol in  ({}) AND s.date >= DATE_SUB(CURDATE(), INTERVAL 10 DAY) ORDER BY s.date DESC""".format(symbols)

        dbcon, cursor = getDbConn()
        cursor.execute(query)
        results = cursor.fetchall()
        for row in results:
            list_dict_data.append(row)
        dbcon.close()

    for alert in list_dict_data:
        if (alert["sign"] == 1):
            upsymbols.append(alert)
            up = up + 1
        else:
            downsymbols.append(alert)
            down = down + 1

    tech_alerts = {
        "up": up,
        "down": down,
        "upsymbols": upsymbols,
        "downsymbols": downsymbols

    }

    return tech_alerts


def getLiveData(listSymbols):
    if len(listSymbols) == 0:
        return {}
    dict_data = {}
    dbcon, cursor = getDbConn()

    formattedSymbols = list(map(lambda x: "'" + x + "'", listSymbols))
    symbols = ','.join(formattedSymbols)
    query = """select li.symbol,ls.companyname,li.last as price,li.price_change as priceChange ,
    li.change_pct as priceChangePct, ass.asset_id, ass.asset_type from  live_symbol li 
    join list_symbol ls on ls.symbol=li.symbol
    left join assets ass on ass.asset_id = ls.assetid
    where li.symbol in ({})""".format(symbols)

    cursor.execute(query)

    results = cursor.fetchall()
    for row in results:
        dict_data.update({row["symbol"]: row})
    dbcon.close()
    return dict_data


def getTechnicalCurrent(listSymbols):
    if len(listSymbols) == 0:
        return {}
    dict_data = {}
    dbcon, cursor = getDbConn()
    formattedSymbols = map(lambda x: "'" + x + "'", listSymbols)
    symbols = ','.join(formattedSymbols)
    query = """select * from technicals_symbol where symbol in  ({})""".format(symbols)
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        dict_data.update({row["symbol"]: row})
    dbcon.close()
    return dict_data


def getTechnicalHistory(listSymbols):
    cutOffDate = date.today() - timedelta(15)
    cutOffDate = cutOffDate.strftime('%Y-%m-%d')
    if len(listSymbols) == 0:
        return {}
    dict_data = {}
    dbcon, cursor = getDbConn()

    formattedSymbols = map(lambda x: "'" + x + "'", listSymbols)
    symbols = ','.join(formattedSymbols)
    query = """select * from technical_symbol_history where symbol in  ({}) and date >='{}'""".format(symbols,
                                                                                                      cutOffDate)

    cursor.execute(query)

    results = cursor.fetchall()
    symbol_data = {}
    first_price = {}
    for item in results:
        symbol = item["symbol"]

        if symbol in symbol_data:
            price_data = symbol_data[symbol]
        else:
            price_data = []
            symbol_data.update({symbol: price_data})

        price_data.append(item)

    for symbol, data in symbol_data.items():
        data.sort(key=lambda x: x["date"], reverse=False)
        for x in data:
            x["date"] = x["date"].strftime("%b %d, %Y")
    return symbol_data


def getKeyValuePair(query, keyColumn, valueColumn):
    dict_data = {}
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        dict_data.update({row[keyColumn]: row[valueColumn]})

    dbcon.close()
    return dict_data


def getDataDict(query, column="symbol"):
    dict_data = {}
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        dict_data.update({row[column]: row})
    dbcon.close()
    return dict_data


def getDataDictMultipleRows(query, column, sort_key):
    dict_data = {}
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        key = row[column]
        values = []
        if key not in dict_data:
            dict_data.update({key: values})
        else:
            values = dict_data[key]
        values.append(row)
    dbcon.close()
    if (sort_key != ""):
        for key, array_data in dict_data.items():
            array_data.sort(key=lambda x: x[sort_key], reverse=True)

    return dict_data


def getData(query):
    dict_data = {}
    dbcon, cursor = getDbConn()
    cursor.execute(query)

    results = cursor.fetchall()
    for row in results:
        dict_data.update({row["symbol"]: row})

    dbcon.close()
    return dict_data


def getDataList(query, column):
    dict_data = {}
    dbcon, cursor = getDbConn()

    cursor.execute(query)

    results = cursor.fetchall()
    for row in results:
        valueArray = []
        key = row[column]
        if key in dict_data:
            valueArray = dict_data[key]
        else:
            dict_data.update({key: valueArray})
        valueArray.append(row)

    dbcon.close()
    return dict_data


def getDataArray(query, column="symbol"):
    list_data = []
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        list_data.append(row[column])
    dbcon.close()
    return list_data


def getDataTable(query):
    list_data = []
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        list_data.append(row)
    dbcon.close()
    limit_items_to_thousand(list_data)
    return list_data


def getDataTableNoLimit(query):
    list_data = []
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        list_data.append(row)
    dbcon.close()
    return list_data


def limit_items_to_thousand(lst):
    num_of_items = len(lst)
    if num_of_items < 1000:
        return lst
    else:
        num_of_items_to_drop = num_of_items - 999
        step = num_of_items * 1.00 / num_of_items_to_drop
        items_to_drop = []
        for x in range(1, num_of_items_to_drop):
            index = int(x * step)
            if index >= num_of_items:
                continue
            items_to_drop.append(lst[index])
        for item in items_to_drop:
            lst.remove(item)

        return lst


def convertToSeperated(data, columns):
    final_data = []
    for row in data:
        row_data = []
        for column in columns:
            row_data.append(row[column])
        final_data.append("|".join(row_data))
    return final_data


def getUserDetails(userName):
    dbcon, cursor = getDbConn()
    sql = """ select userId,isPaid,isundertrial,emailaddress, firstName, lastName, substype, stripe_user_id, admin_type, password_hash from users 
    where  
    (emailaddress = '{}')
    or 
    (username = '{}')
    """.format(userName, userName)
    cursor.execute(sql)
    results = cursor.fetchone()
    dbcon.close()
    return results


def getOneRow(query, columnName=None):
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    row = cursor.fetchone()
    dbcon.close()
    if columnName is None:
        return row
    elif row is None:
        return None
    else:
        return row[columnName]


def saveDataQuery(query):
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    dbcon.commit()
    dbcon.close()


def insertQuery(query):
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    lastid = cursor.lastrowid
    dbcon.commit()
    dbcon.close()
    return lastid


def insert_many_rows(sql, values):
    dbcon, cursor = getDbConn()
    if (sql.strip() != ""):
        cursor.executemany(sql, values)
    dbcon.commit()
    dbcon.close()


def getScanFilters():
    name_dict = {}
    name_data = [];
    dbcon, cursor = getDbConn()
    query = "SELECT s.id,s.name,s.Description,s.group from scan_filter s;"
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        name = row["name"]
        id = row["id"]
        desc = row["Description"]
        group = row["group"]
        name_array = []
        if name in name_dict:
            name_array = name_dict[name]
        else:
            name_dict.update({name: name_array})

        name_array.append({"id": id, "name": desc, "group": group})

    for key, value in name_dict.items():
        name_data.append({"name": key, "value": value, "group": value[0]["group"], "selectedId": 0})
    dbcon.close()
    name_data.sort(key=lambda x: x['group'], reverse=True)
    return name_data


def getPeers(symbol):
    sqlIndustry = """SELECT ls.symbol as symbol FROM list_symbol AS ls
		JOIN spy_symbol s ON  ls.symbol=s.symbol
        WHERE industryId = (SELECT industryId FROM list_symbol WHERE symbol= '{}') 
     limit 5""".format(symbol)
    data = getDataArray(sqlIndustry)
    if len(data) <= 2:
        sqlSector = """SELECT ls.symbol as symbol FROM list_symbol AS ls
            JOIN spy_symbol s ON  ls.symbol=s.symbol
            join live_symbol l on ls.symbol = l.symbol
        WHERE sectorId = (SELECT sectorId FROM list_symbol WHERE symbol= '{}') 
        order by CAST(l.market_cap_raw AS DECIMAL(40,3)) desc limit 4""".format(symbol)
        data = getDataArray(sqlSector)
    return data


def getDbConn():
    dbcon = mysql.connector.connect(
        host=cfg.mysqldb_host,
        user=cfg.mysqldb_user,
        passwd=cfg.mysqldb_passwd,
        db=cfg.mysqldb_db,
        ssl_verify_cert=False,
        # ssl_disabled=True
        # ,auth_plugin='mysql_native_password'
    )

    cursor = dbcon.cursor(dictionary=True)

    # Disable ONLY_FULL_GROUP_BY mode to handle DISTINCT + ORDER BY issues
    cursor.execute("SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))")
    
    return (dbcon, cursor)


def getEarnings(listSymbols, upcoming=False):
    list_dict_data = []
    if len(listSymbols) > 0:
        extra_query = ""
        if upcoming:
            extra_query = " and date >=curdate()"
        formattedSymbols = map(lambda x: "'" + x + "'", listSymbols)
        symbols = ','.join(formattedSymbols)

        query = """select * from earning_history where symbol in 
        ({}) {} order by date desc;""".format(symbols, extra_query)

        dbcon, cursor = getDbConn()
        cursor.execute(query)

        results = cursor.fetchall()
        for row in results:
            list_dict_data.append(row)
        dbcon.close()

    return list_dict_data


def getDividend(listSymbols, upcoming=False):
    list_dict_data = []
    if len(listSymbols) > 0:
        extra_query = ""
        if upcoming:
            extra_query = " and ex_dividend_date >=curdate()"
        formattedSymbols = map(lambda x: "'" + x + "'", listSymbols)
        symbols = ','.join(formattedSymbols)
        query = """select * from dividend_history where symbol in 
        ({}) {} order by ex_dividend_date desc;""".format(symbols, extra_query)

        dbcon, cursor = getDbConn()
        cursor.execute(query)
        results = cursor.fetchall()
        for row in results:
            list_dict_data.append(row)
        dbcon.close()
    return list_dict_data


def getGlobalIndicesTechnicalData(symbols):
    formattedSymbols = map(lambda x: "'" + x + "'", symbols.split(","))
    formattedSymbols = ','.join(formattedSymbols)

    sql = """select gi.symbol,gi.country,ls.companyname,ts.macd,ts.rsi,l.priceChange,
            round(100*(l.last-ts.price_Monthly)/ts.price_Monthly ,2)as mtd,
            round(100*(l.last-ts.price_Weekly)/ts.price_Weekly ,2)as wtd,
            round(100*(l.last-ts.price_Yearly)/ts.price_Yearly ,2)as ytd
             from technicals_symbol  ts
            left join global_indices gi on gi.symbol=ts.symbol
            left join list_symbol ls on ls.symbol=gi.symbol
            left join live_symbol l on l.symbol =ls.symbol
            where gi.symbol in ({}) """.format(formattedSymbols)

    data = getDataTable(sql)

    return data


def save_dataframe(df, table_name):
    mydb = create_engine(connectionMysql)
    try:
        df.to_sql(con=mydb, name=table_name, if_exists='replace', chunksize=1000, index=False)
    except  Exception as ex:
        print(ex)


def insert_dataframe(df, table_name):
    mydb = create_engine(connectionMysql)
    try:
        df.to_sql(con=mydb, name=table_name, if_exists='append', chunksize=1000, index=False)
    except  Exception as ex:
        print(ex)


def saveDataFromDict(table, dict):
    dbcon, cursor = getDbConn()
    try:
        dict.pop("id")
        columns = ', '.join("`" + str(x).replace('/', '_') + "`" for x in dict.keys())
        values = ', '.join("'" + str(x).replace('/', '_') + "'" for x in dict.values())

        sql = "INSERT INTO {} ({}) VALUES ({})".format(
            table,
            columns,
            values)
        cursor.execute(sql)
        dbcon.commit()
    except  Exception as ex:
        print(ex)
    finally:
        dbcon.close()


# AK[2021-Sep-27]: right now, only profile data is being reutunred. Later it can be extened to performance etc. 
def getDetailsForTickers(tickers, detail):
    if tickers == '' or detail == '':
        return
    else:
        try:
            formattedSymbols = map(lambda x: "'" + x + "'", tickers.split(","))
            formattedSymbols = ','.join(formattedSymbols)

            if (detail == "profile"):
                sql = """
                    SELECT ls.symbol, ls.alternate_name, COALESCE(sec.name, 'N/A') AS sector, COALESCE(ind.industryname, 'N/A') AS industry
                    FROM list_symbol AS ls
                    LEFT JOIN sectors AS sec ON ls.sectorid = sec.id
                    LEFT JOIN industries AS ind ON ls.industryid = ind.industryid
                    WHERE ls.symbol in ({});""".format(formattedSymbols)
                data = getDataTable(sql)
                return data
            elif (detail == "performance"):
                sql = """
                    SELECT 
                        l.symbol, 
                        l.last, 
                        ls.alternate_name,
                        l.change_pct as priceChangePct,
                        round(100*(l.last-t.price_Weekly)/t.price_Weekly ,2)as wtd,
                        round(100*(l.last-t.price_Monthly)/t.price_Monthly ,2)as mtd,
                        round(100*(l.last-t.price_Quaterly)/t.price_Quaterly ,2)as qtd,
                        round(100*(l.last - t.price_Yearly)/t.price_Yearly, 2) AS ytd,
                        round(100*(l.last - t.price_oneMonth)/t.price_oneMonth, 2) AS '1month', 
                        round(100*(l.last - t.price_oneyearbeforedate)/t.price_oneyearbeforedate ,2) AS '1year',
                        round(100*(l.last - t.price_2year)/t.price_2year, 2) AS '2year',
                        round(100*(l.last - t.price_3year)/t.price_3year, 2) AS '3year'
                    FROM live_symbol AS l
                    LEFT JOIN technicals_symbol AS t ON l.symbol = t.symbol
                    LEFT JOIN list_symbol AS ls ON l.symbol = ls.symbol
                    WHERE l.symbol in ({});""".format(formattedSymbols)
                data = getDataTable(sql)
                return data  # These are just numbers need to convert in percentage in the DB table.

        except Exception as ex:
            print(ex)


def getsymbol_data_count(symbol, start_date, end_date):
    # connection to server
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        db_chartlab = con_mongo.chartlab
        query = {"$and": [{'symbol': symbol},
                          {"date": {"$gte": start_date}},
                          {"date": {"$lte": end_date}}]}
        prices_data_count = db_chartlab.symbolshistorical.count_documents(query)

        return prices_data_count
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_symbol_historicals(symbol):
    try:
        con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
        collection = con_mongo.chartlab["fundamentals_data"]
        searchQuery = {"General.Code": symbol}
        data = list(collection.find(searchQuery))
        return data
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def truncate_table(tbl_name):
    dbcon, cursor = getDbConn()
    try:
        sql = "TRUNCATE {}".format(tbl_name)
        cursor.execute(sql)
        dbcon.commit()
    except  Exception as ex:
        print(ex)
    finally:
        dbcon.close()


def get_two_col_dict(sql, keyCol, valCol):
    data_dict = {}
    try:
        dbcon, cursor = getDbConn()
        cursor.execute(sql)
        results = cursor.fetchall()
        for row in results:
            data_dict[row[keyCol]] = row[valCol]
    except  Exception as ex:
        print(ex)
    finally:
        dbcon.close()
        return data_dict


def get_symbol_historical_oas_data(symbol_list, period='20year', sym_name_map=None):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        end_date = datetime.today().strftime("%Y-%m-%d")
        start_date = getStartDateFromPeriod(period).strftime("%Y-%m-%d")
        db_chartlab = con_mongo.chartlab
        result = db_chartlab.fred_oas_data.find({
            "series_id": {"$in": symbol_list}, 
            "date": {'$lt': end_date, '$gte': start_date}
        }).sort("date", -1)
        symbol_data = {}
        # first_price = {}
        for item in result:
            symbol = item["series_id"]
            sym = sym_name_map[symbol] if sym_name_map else symbol 
            if sym in symbol_data:
                price_data = symbol_data[sym]
            else:
                price_data = []
                symbol_data.update({sym: price_data})
            value = item['value']
            price_data.append({"date": item["date"], sym: value})
        df_result = None
        for symbol, data in symbol_data.items():
            df = pandas.DataFrame.from_dict(data)
            df.set_index("date", inplace=True)
            if df_result is None:
                df_result = df
            else:
                df_result = df_result.join(df, lsuffix='_caller', rsuffix='_other')

        if df_result is None:
            return df_result
        df_result = df_result.drop_duplicates()
        df_result.ffill(inplace=True)
        df_result["date"] = df_result.index
        return df_result
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_code_set_items(set_id):
    try:
        items = []
        sql = """
            SELECT
                id,
                item_key,
                label,
                description,
                sort_order
            FROM code_items
            WHERE set_id = {} 
            ORDER BY sort_order
        """.format(set_id)
        
        items = getDataTable(sql)
    except  Exception as ex:
        print(ex)
        items = []
    finally:
        return items


def get_code_set_dict(set_key):
    try:
        data_dict = {}
        sql = """
            SELECT
                ci.id,
                ci.item_key,
                ci.label,
                ci.description,
                ci.sort_order
            FROM code_items ci
            JOIN code_sets cs ON cs.id = ci.set_id
            WHERE cs.set_key = '{}' 
            ORDER BY ci.sort_order
        """.format(set_key)
        
        data_dict = getDataDict(sql, column="id")
    except  Exception as ex:
        print(ex)
        data_dict = {}
    finally:
        return data_dict