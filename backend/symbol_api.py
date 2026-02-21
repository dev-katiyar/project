import utils
from flask import request, make_response, jsonify
import dbutil
import json
from datetime import datetime, timedelta, date
import datetimeutil
from flask import Blueprint
import pandas as pd
import dataframe_utils
import eod_api
import login

api_symbol = Blueprint('api_symbol', __name__)


@api_symbol.route("/symbol/model/<symbols>", methods=['GET', 'POST'])
def getSymbolModelData(symbols):
    if request.method == "POST":
        symbols = json.loads(request.data)
    data = dbutil.getSymbolTechnicalDataAndFundamental(symbols)
    for row in data:
        try:
            ma_34wk = row["sma150"]
            ma_13wk = row["sma50"]
            price = row["price"]
            if price != None and ma_13wk != None:
                stopLoss = ma_34wk * .99
                row['distance_to_stop'] = price - stopLoss
                stop_loss_alert = ""
                if price < stopLoss:
                    stop_loss_alert = "ALERT"
                row['stop_loss_alert'] = stop_loss_alert
                row['stop_loss'] = stopLoss
                row['deviation_from_13wkma'] = price - ma_13wk
                row['deviation_from_34wkma'] = price - ma_34wk
                row['short_trend_text'] = dbutil.get_alert_text(row['short_trend'])
                row['long_trend_text'] = dbutil.get_alert_text(row['long_trend'])
                data_map = {0: "Neutral", 1: "Very Bearish", 2: "Bearish", 3: "Bullish", 4: "Very Bullish"}
                short_trend = row['short_trend']
                inter_trend = row['inter_trend']
                long_trend = row['long_trend']
                buy_signal = ""
                sell_signal = ""
                if ((inter_trend >= 3 or long_trend >= 3) and stop_loss_alert == ""):
                    buy_signal = "Bullish"
                elif (inter_trend == 0 and long_trend == 0):
                    buy_signal = ""
                elif ((inter_trend <= 2 and long_trend <= 2) or stop_loss_alert == ""):
                    sell_signal = "Bearish"
                row['buy_signal'] = buy_signal
                row['sell_signal'] = sell_signal
                if buy_signal != "":
                    row['net_signal'] = sell_signal
                else:
                    row['net_signal'] = sell_signal
        except Exception as ex:
            print
            ex

    return jsonify(data)


@api_symbol.route("/symbol/news/<symbols>", methods=['GET'])
def getNews(symbols):
    limit = 10
    if len(symbols.split(",")) <= 15:
        limit = 20
    news = dbutil.getNews(symbols.split(","), limit)
    return jsonify(news)


@api_symbol.route('/symbol/peers/<symbol>', methods=['GET'])
def getSymbolPeers(symbol):
    peerSymbols = dbutil.getPeers(symbol)
    peerSymbols.append(symbol)
    return jsonify(peerSymbols)


@api_symbol.route('/symbol/arevalid', methods=['POST', 'GET'])
def checkSymbolValidity():
    try:
        if request.method == 'POST':
            data = json.loads(request.data)
            req_symbols = data["symbols"]
        else:
            req_symbols = request.args.get('symbols')
            req_symbols = req_symbols.split(",")
        db_symbols = dbutil.symbolsInListSymbolTable(req_symbols)
        missing_symbols = list(set(req_symbols) - set(db_symbols))
        if len(missing_symbols) == 0:
            return jsonify({"isvalid": 'valid', "invalidsymbol": {}})
        elif len(missing_symbols) > 0:
            yf_symbols = dbutil.checkSymbolsFromYahoo(missing_symbols)
            if len(yf_symbols) > 0:
                list_symbol_data = dbutil.getSymbolDataFromYahoo(yf_symbols)
                dbutil.insertIntoListSymbols(list_symbol_data)
            invalid_symbols = list(set(missing_symbols) - set(yf_symbols))
            if len(invalid_symbols) == 0:
                return jsonify({"isvalid": 'valid', "invalidsymbol": {}})
            elif len(invalid_symbols) > 0:
                invalid_symbol = invalid_symbols[0]
                suggested_symbols = dbutil.getSuggestedSymolsFromYahoo(invalid_symbol)
                return jsonify({
                    "isvalid": 'invalid',
                    "invalidsymbol": {
                        'invalidsymbol': invalid_symbol,
                        'suggestions': suggested_symbols
                    }})
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in validating symbol. {}".format(ex)})


@api_symbol.route('/symbol/details', methods=['POST'])
def addSymbolDetails():
    try:
        post_data = json.loads(request.data)
        action = post_data["action"]
        if action == "get":
            symbol = post_data["symbol"]
            sql = """SELECT ls.symbol FROM list_symbol ls
            where ls.symbol like '{}%' and ls.isactive = 1""".format(symbol)
            symbol_list = dbutil.getDataArray(sql)
            data = dbutil.getSymbolTechnicalDataAndFundamental(",".join(symbol_list))
            return jsonify(data)
        elif action == "add":
            sql = """insert into list_symbol(symbol,companyname,exchange,source,assetid,sectorid,industryid,isactive) values ('{}','{}','{}','{}',{},{},{},{})""".format(
                post_data['symbol'], post_data['companyname'], post_data['exchange'], post_data['source'],
                post_data['assetid'], post_data['sectorid'], post_data['industryid'], post_data['isactive'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Added"})

        elif action == "delete":

            sql = """delete from list_symbol where symbol ='{}'""".format(post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Deleted"})

        elif action == "save":
            sql = """update list_symbol set source='{}',companyname='{}',exchange='{}',assetid={} ,sectorid={} ,industryid={} ,isactive={} where symbol = '{}' ;""".format(
                post_data['source'], post_data['companyname'], post_data['exchange'], post_data['asset_id'],
                post_data['sector_id'],
                post_data['industry_id'], post_data['isactive'], post_data['symbol'])
            data = dbutil.saveDataQuery(sql)
            return jsonify({"status": "success", "message": "Symbol Saved"})
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in saving / getting data {}".format(ex)})


@api_symbol.route('/symbol/details/upsert', methods=['POST'])
def addUpdateSymbolDetails():
    try:
        post_data = json.loads(request.data)
        print(post_data)
        upsert_sql = f"""
            INSERT INTO list_symbol (
                symbol, 
                symbol_p,
                alternate_name,
                companyname,
                exchange,
                assetid,
                industryid,
                sectorid,
                source,
                isactive,
                isnew,
                last_checked
            )
            VALUES (
                '{post_data['symbol']}',
                '{post_data['symbol_p']}',
                '{post_data['alternate_name']}',
                '{post_data['companyname']}',
                '{post_data['exchange']}',
                '{post_data['assetid']}',
                '{post_data['industryid']}',
                '{post_data['sectorid']}',
                '{post_data['source']}',
                '{post_data['isactive']}',
                '{post_data['isnew']}',
                now()
            )
            ON DUPLICATE KEY UPDATE
                symbol_p = VALUES(symbol_p),
                alternate_name = VALUES(alternate_name),
                companyname = VALUES(companyname),
                exchange = VALUES(exchange),
                assetid = VALUES(assetid),
                industryid = VALUES(industryid),
                sectorid = VALUES(sectorid),
                source = VALUES(source),
                isactive = VALUES(isactive),
                isnew = VALUES(isnew),
                last_checked = VALUES(last_checked);
        """
        
        dbutil.saveDataQuery(upsert_sql)
        return jsonify({"status": "success", "message": "Symbol Details Saved"})
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in  data {}".format(ex)})


@api_symbol.route("/sectors", methods=['GET'])
def getSectors():
    data = dbutil.getDataTable("select id,name from sectors;")
    return jsonify(data)


@api_symbol.route("/sector/liveprices", methods=['GET'])
def getSectorLivePrices():
    data = dbutil.getDataTable("""SELECT 
            sec.`symbol`,
            sec.`name`,
            liv.`last`,
            liv.`price_change` AS priceChange,
            liv.`change_pct` AS priceChangePct,
            liv.`52weeklow`,
            liv.`52weekhigh`
        FROM
            sectors sec
                LEFT JOIN
            live_symbol liv ON sec.symbol = liv.symbol
        WHERE
            sec.symbol IS NOT NULL;""")
    return jsonify(data)


@api_symbol.route("/assets", methods=['GET'])
def getAssets():
    sqlAsset = """select distinct asset_name from assets;"""
    assetNames = dbutil.getDataTable(sqlAsset)
    return jsonify(assetNames)


@api_symbol.route("/industries", methods=['GET'])
def getIndustry():
    data = dbutil.getDataTable("select industryid as id,industryname as name from industries;")
    return jsonify(data)


@api_symbol.route("/symbol/fundamental_technical/<symbols>", methods=['GET', 'POST'])
def getSymbolFundmanetalsAndTechnical(symbols):
    if request.method == "POST":
        symbols = json.loads(request.data)
    data = dbutil.getSymbolTechnicalDataAndFundamental(symbols)

    return jsonify(data)


@api_symbol.route("/symbol/technical/<symbols>", methods=['GET', 'POST'])
def getSymbolTechnical(symbols):
    if request.method == "POST":
        symbols = json.loads(request.data)
    data = dbutil.getSymbolTechnicalDataAndFundamental(symbols)

    return jsonify(data)


@api_symbol.route("/symbol/synopsis/<symbol>", methods=['POST', 'GET'])
def getSynopsis(symbol):
    sql = """select current_situation,synopsis, sign from synopsis_symbol where symbol = '{}' """.format(symbol)

    data = dbutil.getDataTable(sql)
    return jsonify(data)


@api_symbol.route("/assetSector", methods=['GET'])
def getAssetSector():
    sqlAsset = """select distinct asset_name from assets;"""
    sqlSector = """select distinct name from sectors;"""

    assetNames = dbutil.getDataTable(sqlAsset)
    sectorNames = dbutil.getDataTable(sqlSector)

    return jsonify({"assets": assetNames, "sectors": sectorNames})


@api_symbol.route("/symbol/list_type/<typeid>", methods=['POST', 'GET'])
def getSymbolListByTypeNew(typeid):
    symbols = []
    formattedTypes = typeid.split(",")
    formattedTypes = ','.join(formattedTypes)
    rows = dbutil.getDataTable("select query from list_types where typeid in ({})".format(formattedTypes))
    for row in rows:
        rowSymbols = dbutil.getDataArray(row["query"])
        symbols.extend(rowSymbols)
    return jsonify(symbols)


# this one gets name and symbol both
@api_symbol.route("/symbol/list_type2/<typeid>", methods=['POST', 'GET'])
def getSymbolListByTypeNew2(typeid):
    symbolsData = []
    formattedTypes = typeid.split(",")
    formattedTypes = ','.join(formattedTypes)
    rows = dbutil.getDataTable("select query from list_types where typeid in ({})".format(formattedTypes))
    for row in rows:
        rowSymbols = dbutil.getDataTable(row["query"])
        symbolsData.extend(rowSymbols)
    return jsonify(symbolsData)


@api_symbol.route("/symbol/info", methods=['POST', 'GET'])
def getTickerDetails():
    tickers = ""
    detail = ""
    if request.method == 'POST':
        data = json.loads(request.data)
        tickers = data["tickers"]
        detail = data["detail"]
    else:
        tickers = request.args.get('tickers')
        detail = request.args.get("detail")

    data = dbutil.getDetailsForTickers(tickers, detail)
    if data is not None:
        return jsonify(data)
    else:
        return jsonify({})


@api_symbol.route("/symbol/live/<symbols>", methods=['POST', 'GET'])
def getLiveData(symbols):
    data = dbutil.getLiveData(utils.getSymbolListFromString(symbols))
    return jsonify(data)


@api_symbol.route("/symbol/prices", methods=['POST', 'GET'])
def getSymbolPrices():
    symbol = request.args.get('symbol')
    end_date = request.args.get('date')
    today = date.today()
    end_date = datetimeutil.getdatefromstr_format(end_date, "%Y-%m-%d")
    delta_days = today - end_date.date()
    if delta_days.days == 0:
        return getLiveData(symbol)
    else:
        start_date = end_date + timedelta(days=-5)
        data = dbutil.get_symbol_adjclose(symbol, start_date, end_date)
        if (len(data.index) >= 1):
            return jsonify(
                {symbol: {"price": data.tail(1)[symbol][0],"symbol": symbol}})  # data.tail(1).to_dict('records')
        else:
            return jsonify({})


@api_symbol.route("/symbol/technical/history/<symbols>", methods=['POST', 'GET'])
def getTechnicalHistory(symbols):
    data = dbutil.getTechnicalHistory(utils.getSymbolListFromString(symbols))
    return jsonify(data)


@api_symbol.route("/symbol/indtechnicalHistory/movAvg/<period>", methods=['POST', 'GET'])
def getMovAvgHistorical(period):
    end_date = datetime.today()
    start_date = dbutil.getStartDateFromPeriod(period)
    sql = """SELECT DATE_FORMAT(rating_date ,'%Y-%m-%d') as rating_date ,cast(movavg50*100/586 as FLOAT) as movavg50, cast(movavg75*100/571 as FLOAT) as movavg75,cast(movavg150*100/547 as FLOAT) as movavg150 FROM symbol_count_per_rating_hist
    where rating_date  >= '{}' ORDER BY rating_date ASC""".format(start_date.date())
    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_symbol.route("/symbol/technicalHistory/obos/<period>", methods=['POST', 'GET'])
def getObOsHistorical(period):
    end_date = datetime.today()
    start_date = dbutil.getStartDateFromPeriod(period)
    sql = """SELECT DATE_FORMAT(date ,'%Y-%m-%d') as date,oBPer as Overbought,oSPer as Oversold,obCount,osCount  FROM ob_os_counts WHERE  date >= '{}' order by date """.format(
        start_date.date())
    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_symbol.route("/symbol/technicalHistory/fear_greed/<period>", methods=['POST', 'GET'])
def getHistoryFearGreed(period):
    end_date = datetime.today()
    start_date = dbutil.getStartDateFromPeriod(period)
    sql = """SELECT 
    round(fear_greed,2) as fear_greed,
    round(technical,2) as technical,
    DATE_FORMAT(date,'%Y-%m-%d') as date 
    FROM history_fear_technical
    WHERE date >= '{}'
    ORDER BY date ASC;""".format(start_date.date())

    technicals = dbutil.getDataTable(sql)
    df_technical = pd.DataFrame(technicals)
    return jsonify(dataframe_utils.getDict(df_technical)) #df_technical.to_json(orient='records')

@api_symbol.route("/symbol/technicalHistory/fear_greed_price/<period>/<symbol>", methods=['POST', 'GET'])
def getHistoryFearGreedAndPrice(period, symbol):
    end_date = datetime.today()
    start_date = dbutil.getStartDateFromPeriod(period)
    sql = """SELECT 
    round(fear_greed,2) as fear_greed,
    round(technical,2) as technical,
    DATE_FORMAT(date,'%Y-%m-%d') as date 
    FROM history_fear_technical
    WHERE date >= '{}'
    ORDER BY date ASC;""".format(start_date.date())

    technicals = dbutil.getDataTable(sql)
    df_technical = pd.DataFrame(technicals)
    df_price_diff = dbutil.getSymbolHistoricalDiff([symbol], period)
    
    # add SPY price diff for the dates
    df_technical.index = df_technical['date'].apply(lambda x: datetimeutil.getdatefromstr(x))
    df_technical = df_technical.drop('date', axis=1)
    df_res = pd.merge(df_price_diff, df_technical, left_index=True, right_index=True, how='left')

    # technical is weekly data, SPY is daily. Null being dropped. Add as needed.
    return jsonify(dataframe_utils.getDict(df_res))


@api_symbol.route('/symbol/technical-fear-greed', methods=['GET'])
def get_technical_fear_greed():
    sqlSector = """
        SELECT 
            date, fear_greed, technical
        FROM
            history_fear_technical
        ORDER BY date DESC
        LIMIT 1;
    """
    data = dbutil.getOneRow(sqlSector)
    return jsonify(data)


@api_symbol.route("/symbol/technicalHistory/sentiment/<period>", methods=['POST', 'GET'])
def getSentimentHistorical(period):
    end_date = datetime.today()
    start_date = dbutil.getStartDateFromPeriod(period)
    sql = """SELECT round(meter_score,2) as meter_score,DATE_FORMAT(date,'%Y-%m-%d') as date FROM df_spyrating
                        WHERE date >= '{}'
                ORDER BY date ASC;""".format(start_date.date())

    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_symbol.route("/symbol/technicalHistory/buySellRatio/<period>", methods=['POST', 'GET'])
def getBuySellRatioHistory(period):
    end_date = datetime.today()
    start_date = dbutil.getStartDateFromPeriod(period)
    sql = """SELECT DATE_FORMAT(rating_date,'%Y-%m-%d') as date,rating1 as StrongSell,rating5 as StrongBuy FROM symbol_count_per_rating_hist
        where rating_date >= '{}' ORDER BY rating_date ASC""".format(start_date.date())
    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_symbol.route("/global_indices/<symbols>", methods=['GET', 'POST'])
def getGlobalIndicesData(symbols):
    if request.method == "POST":
        symbols = json.loads(request.data)
    data = dbutil.getGlobalIndicesTechnicalData(symbols)

    return jsonify(data)


@api_symbol.route("/insider-transactions", methods=['GET'])
def getInsiderTransactions():
    sqlAsset = """select * from insider_transactions;"""
    transactions = dbutil.getDataTable(sqlAsset)
    return jsonify(transactions)


@api_symbol.route("/symbol/historical/<symbol>/<period>", methods=['GET', 'POST'])
def getSymbolHistoricalData(symbol, period):
    if symbol and period:
        data = dbutil.get_symbol_historicals(symbol)
        if len(data) == 0:
            return jsonify({'error': 'No Data!'})
        symbol_data = data[0]
        del symbol_data['_id']
        dividend_data = eod_api.get_dividend_for_symbol(symbol)
        symbol_historical = parepare_historical_data(symbol_data, dividend_data, period) 
        return jsonify(symbol_historical)
    return jsonify('No Data!')


def parepare_historical_data(symbol_data, div_data, period):
    # response shape is fixed to simplify front end
    res_symbol_data = {
        'Financials': {
            'Income_Statement': {
                'annual': [],
                'quarterly': []
            },
            'Balance_Sheet': {
                'annual': [],
                'quarterly': []
            },
            'Cash_Flow': {
                'annual': [],
                'quarterly': []
            },
        },
        'outstandingShares': {
            'annual': [],
            'quarterly': []
        },
        'Earnings': {
            'annual': [],
            'quarterly': []
        },
        'Dividends': {
            'annual': [],
            'quarterly': []
        }
    }

    # start_date = dbutil.getStartDateFromPeriod(period)
    date_format = '%Y-%m-%d' #'%b %d, %Y'

    # Financials 
    if symbol_data.get('Financials', {}):
        # Income Statement
        if symbol_data.get('Financials', {}).get('Income_Statement', {}):
            Income_Statement_obj = symbol_data['Financials']['Income_Statement']
            # annaul
            if Income_Statement_obj.get('yearly', {}):
                Income_Statement_yearly = Income_Statement_obj['yearly']
                for key, value in Income_Statement_yearly.items():
                    data_date = datetimeutil.getdatefromstr(value['date'])
                    # if data_date < start_date:
                    #     continue
                    res_symbol_data['Financials']['Income_Statement']['annual'].append({
                        'date': data_date.strftime(date_format),
                        'totalRevenue': value['totalRevenue'],
                        'netIncome': value['netIncome'],
                        'grossProfit': value['grossProfit'],
                        'costOfRevenue': value['costOfRevenue'],
                        'operatingIncome': value['operatingIncome'],
                        'ebitda': value['ebitda'],
                        'ebit': value['ebit'],
                        'incomeBeforeTax': value['incomeBeforeTax'],
                    })
                    res_symbol_data['Financials']['Income_Statement']['annual'].sort(key=lambda isy: isy['date'], reverse=True)
            # quarterly
            if Income_Statement_obj.get('quarterly', {}):
                Income_Statement_quarterly = Income_Statement_obj['quarterly']
                for key, value in Income_Statement_quarterly.items():
                    data_date = datetimeutil.getdatefromstr(value['date'])
                    # if data_date < start_date:
                    #     continue
                    res_symbol_data['Financials']['Income_Statement']['quarterly'].append({
                        'date': data_date.strftime(date_format),
                        'totalRevenue': value['totalRevenue'],
                        'netIncome': value['netIncome'],
                        'grossProfit': value['grossProfit'],
                        'costOfRevenue': value['costOfRevenue'],
                        'operatingIncome': value['operatingIncome'],
                        'ebitda': value['ebitda'],
                        'ebit': value['ebit'],
                        'incomeBeforeTax': value['incomeBeforeTax'],
                    })
                    res_symbol_data['Financials']['Income_Statement']['quarterly'].sort(key=lambda isq: isq['date'], reverse=True)

        # Balance Sheet
        if symbol_data.get('Financials', {}).get('Balance_Sheet', {}):
            Balance_Sheet_obj = symbol_data['Financials']['Balance_Sheet']
            # annaul
            if Balance_Sheet_obj.get('yearly', {}):
                Balance_Sheet_yearly = Balance_Sheet_obj['yearly']
                for key, value in Balance_Sheet_yearly.items():
                    data_date = datetimeutil.getdatefromstr(value['date'])
                    # if data_date < start_date:
                    #     continue
                    res_symbol_data['Financials']['Balance_Sheet']['annual'].append({
                        'date': data_date.strftime(date_format),
                        'totalAssets': value['totalAssets'],
                        'totalLiab': value['totalLiab'],
                        'totalStockholderEquity': value['totalStockholderEquity'],
                        'shortLongTermDebtTotal': value['shortLongTermDebtTotal'],
                        'netDebt': value['netDebt'],
                        'netTangibleAssets': value['netTangibleAssets'],
                        'netWorkingCapital': value['netWorkingCapital'],
                        'netInvestedCapital': value['netInvestedCapital'],
                    })
                    res_symbol_data['Financials']['Balance_Sheet']['annual'].sort(key=lambda isy: isy['date'], reverse=True)
            # quarterly
            if Balance_Sheet_obj.get('quarterly', {}):
                Balance_Sheet_quarterly = Balance_Sheet_obj['quarterly']
                for key, value in Balance_Sheet_quarterly.items():
                    data_date = datetimeutil.getdatefromstr(value['date'])
                    # if data_date < start_date:
                    #     continue
                    res_symbol_data['Financials']['Balance_Sheet']['quarterly'].append({
                        'date': data_date.strftime(date_format),
                        'totalAssets': value['totalAssets'],
                        'totalLiab': value['totalLiab'],
                        'totalStockholderEquity': value['totalStockholderEquity'],
                        'shortLongTermDebtTotal': value['shortLongTermDebtTotal'],
                        'netDebt': value['netDebt'],
                        'netTangibleAssets': value['netTangibleAssets'],
                        'netWorkingCapital': value['netWorkingCapital'],
                        'netInvestedCapital': value['netInvestedCapital'],
                    })
                    res_symbol_data['Financials']['Balance_Sheet']['quarterly'].sort(key=lambda isq: isq['date'], reverse=True)

        # Cash Flow
        if symbol_data.get('Financials', {}).get('Cash_Flow', {}):
            Cash_Flow_obj = symbol_data['Financials']['Cash_Flow']
            # annaul
            if Cash_Flow_obj.get('yearly', {}):
                Cash_Flow_yearly = Cash_Flow_obj['yearly']
                for key, value in Cash_Flow_yearly.items():
                    data_date = datetimeutil.getdatefromstr(value['date'])
                    # if data_date < start_date:
                    #     continue
                    res_symbol_data['Financials']['Cash_Flow']['annual'].append({
                        'date': data_date.strftime(date_format),
                        'totalCashFromOperatingActivities': value['totalCashFromOperatingActivities'],
                        'totalCashflowsFromInvestingActivities': value['totalCashflowsFromInvestingActivities'],
                        'totalCashFromFinancingActivities': value['totalCashFromFinancingActivities'],
                        'endPeriodCashFlow': value['endPeriodCashFlow'],
                        'freeCashFlow': value['freeCashFlow'],
                        'capitalExpenditures': value['capitalExpenditures'],
                        # 'netWorkingCapital': value['netWorkingCapital'],
                        # 'netInvestedCapital': value['netInvestedCapital'],
                    })
                    res_symbol_data['Financials']['Cash_Flow']['annual'].sort(key=lambda isy: isy['date'], reverse=True)
            # quarterly
            if Cash_Flow_obj.get('quarterly', {}):
                Cash_Flow_quarterly = Cash_Flow_obj['quarterly']
                for key, value in Cash_Flow_quarterly.items():
                    data_date = datetimeutil.getdatefromstr(value['date'])
                    # if data_date < start_date:
                    #     continue
                    res_symbol_data['Financials']['Cash_Flow']['quarterly'].append({
                        'date': data_date.strftime(date_format),
                        'totalCashFromOperatingActivities': value['totalCashFromOperatingActivities'],
                        'totalCashflowsFromInvestingActivities': value['totalCashflowsFromInvestingActivities'],
                        'totalCashFromFinancingActivities': value['totalCashFromFinancingActivities'],
                        'endPeriodCashFlow': value['endPeriodCashFlow'],
                        'freeCashFlow': value['freeCashFlow'],
                        'capitalExpenditures': value['capitalExpenditures'],
                        # 'netWorkingCapital': value['netWorkingCapital'],
                        # 'netInvestedCapital': value['netInvestedCapital'],
                    })
                    res_symbol_data['Financials']['Cash_Flow']['quarterly'].sort(key=lambda isq: isq['date'], reverse=True)

    # Outstanding Shares
    if(symbol_data.get('outstandingShares', {})):
        outstandingShares_obj = symbol_data['outstandingShares']     # named same as key in obj
        # annual
        if(outstandingShares_obj.get('annual', {})):
            outstandingShares_annual = outstandingShares_obj['annual']
            for key, value in outstandingShares_annual.items():
                data_date = datetimeutil.getdatefromstr(value['dateFormatted'])
                # if data_date < start_date:
                #     continue
                res_symbol_data['outstandingShares']['annual'].append({
                    'date': data_date.strftime(date_format), 
                    # 'dateFormatted': value['dateFormatted'],
                    'shares': round(value['shares'])
                })
                res_symbol_data['outstandingShares']['annual'].sort(key=lambda oa: oa['date'], reverse=True)
        # quarterly
        if(outstandingShares_obj.get('quarterly', {})):
            outstandingShares_quarterly = outstandingShares_obj['quarterly']
            for key, value in outstandingShares_quarterly.items():
                data_date = datetimeutil.getdatefromstr(value['dateFormatted'])
                # if data_date < start_date:
                #     continue
                res_symbol_data['outstandingShares']['quarterly'].append({
                    'date': data_date.strftime(date_format),
                    # 'dateFormatted': value['dateFormatted'],
                    'shares': round(value['shares'])
                })
                res_symbol_data['outstandingShares']['quarterly'].sort(key=lambda oq: oq['date'], reverse=True)

    # Earnings 
    # TODO: Add estimtes
    if(symbol_data.get('Earnings', {})):
        earnings_obj = symbol_data['Earnings']
        # annual
        if(earnings_obj.get('Annual', {})):
            earnings_annual = earnings_obj['Annual']
            for key, value in earnings_annual.items():
                data_date = datetimeutil.getdatefromstr(value['date'])
                # if data_date < start_date:
                #     continue
                res_symbol_data['Earnings']['annual'].append({
                    'date': data_date.strftime(date_format),
                    'eps': value['epsActual'],
                    'actual': True
                })
                res_symbol_data['Earnings']['annual'].sort(key=lambda ea: ea['date'], reverse=True)
        # quarterly
        if(earnings_obj.get('History', {})):
            earnings_quarterly = earnings_obj['History']
            for key, value in earnings_quarterly.items():
                data_date = datetimeutil.getdatefromstr(value['date'])
                # if data_date < start_date:
                #     continue
                if not value['epsActual'] and not value['epsEstimate']:
                    continue
                res_symbol_data['Earnings']['quarterly'].append({
                    'date': data_date.strftime(date_format),
                    'eps': value['epsActual'],
                    'epsEstimate': value['epsEstimate']
                })
                res_symbol_data['Earnings']['quarterly'].sort(key=lambda eq: eq['date'], reverse=True)

    # Dividends 
    if div_data and len(div_data) > 0:
        div_data.sort(key=lambda div: div['date'], reverse=True)
        for div in div_data:
            data_date = datetimeutil.getdatefromstr(div['date'])
            # Quarterly Dividends
            qtr_date = data_date.strftime(date_format)
            qtr_div = div['value']
            # if data_date < start_date:
            #     continue
            res_symbol_data['Dividends']['quarterly'].append({
                'date': qtr_date,
                'div': qtr_div
            })

            # Aggregate qarterly dividend into annual
            ann_date = date(data_date.year, 12, 31).strftime(date_format)
            ann_div_data_arr = res_symbol_data['Dividends']['annual']
            ann_div_data_item = next((x for x in ann_div_data_arr if x['date'] == ann_date), None)
            if not ann_div_data_item:
                ann_div_data_arr.append({
                    'date': ann_date,
                    'div': qtr_div
                })
            else:
                ann_div_data_item['div'] += qtr_div

    return res_symbol_data


@api_symbol.route("/symbol/fairvalue/<symbol>", methods=['POST', 'GET'])
def get_symbol_fairvalue(symbol):
    sql = """SELECT te.symbol, te.fair_value, ls.last as last_price 
            FROM technicals_extra te 
            JOIN live_symbol ls ON te.symbol = ls.symbol 
            WHERE te.symbol = '{}' 
            LIMIT 1;""".format(symbol)

    data = dbutil.getDataTable(sql)
    res = {}
    if len(data) > 0:
        res = data[0]

    return jsonify(res)  


@api_symbol.route("/symbol/price/<symbol>/<period>", methods=['GET', 'POST'])
def getSymbolHistoricalPriceData(symbol, period):
    if symbol and period:
        freq = 'd'  # day: d, weekly: w, mlonthy: m
        start_date = dbutil.getStartDateFromPeriod(period)
        years = datetime.now().year - start_date.year
        if years > 3:
            freq = 'w'
        if years > 15:
            freq = 'm'
        start_date_str = start_date.strftime("%Y-%m-%d")
        price_data = eod_api.get_historical_price(symbol, start_date_str, freq)
        return jsonify(price_data)
    return jsonify('No Data!')


# Historical Data for symbol with all 3 parameters from frone end
@api_symbol.route("/symbol/pricedata/<symbol>/<period>/<frequency>", methods=['GET', 'POST'])
def getSymbolHistoricalDataFreq(symbol, period, frequency):
    if symbol and period and frequency:
        start_date = dbutil.getStartDateFromPeriod(period)
        start_date_str = start_date.strftime("%Y-%m-%d")
        price_data = eod_api.get_historical_price(symbol, start_date_str, frequency)
        return jsonify(price_data)
    return jsonify('No Data!')


@api_symbol.route("/symbol/options/<symbol>", methods=['GET', 'POST'])
def get_symbol_options_data(symbol):
    sql = """
        SELECT * FROM symbol_options WHERE symbol = '{}';
    """.format(symbol)
    options_data = dbutil.getDataTableNoLimit(sql)
    return jsonify(options_data)


@api_symbol.route("/symbol/spytreemap", methods=['GET', 'POST'])
def get_spy_sector_industry_map_data():
    sql = """
        SELECT 
            sp.symbol,
            ls.companyname AS companyName,
            sec.name AS sectorName,
            ind.industryname AS industryName,
            liv.last,
            liv.price_change AS priceChange,
            liv.change_pct AS priceChangePct,
            liv.market_cap_raw AS marketCap
        FROM
            spy_symbol sp
                LEFT JOIN
            list_symbol ls ON sp.symbol = ls.symbol
                LEFT JOIN
            sectors sec ON ls.sectorid = sec.id
                LEFT JOIN
            industries ind ON ls.industryid = ind.industryid
                LEFT JOIN
            live_symbol liv ON sp.symbol = liv.symbol;
    """
    treemap_data = dbutil.getDataTableNoLimit(sql)
    return jsonify(treemap_data)


@api_symbol.route("/symbol/nasdaqtreemap", methods=['GET', 'POST'])
def get_nasdaq_sector_industry_map_data():
    sql = """
        SELECT 
            nsdq.symbol,
            ls.companyname AS companyName,
            sec.name AS sectorName,
            ind.industryname AS industryName,
            liv.last,
            liv.price_change AS priceChange,
            liv.change_pct AS priceChangePct,
            liv.market_cap_raw AS marketCap
        FROM
            nasdaq_100 nsdq
                LEFT JOIN
            list_symbol ls ON nsdq.symbol = ls.symbol
                LEFT JOIN
            sectors sec ON ls.sectorid = sec.id
                LEFT JOIN
            industries ind ON ls.industryid = ind.industryid
                LEFT JOIN
            live_symbol liv ON nsdq.symbol = liv.symbol;
    """
    treemap_data = dbutil.getDataTableNoLimit(sql)
    return jsonify(treemap_data)


@api_symbol.route("/symbol/holding-maps-categories", methods=['GET'])
def get_holding_map_categories():
    # default categories
    map_categories = [
        {"id": "indices", "name": "Indices", "item": "Index", "children": [
            {"id": "SandP500", "name": "S&P 500"},
            {"id": "Nasdaq100", "name": "NASDAQ 100"},
        ]},
    ]

    # add market x-ray
    map_categories.append({"id": "market_xray", "name": "Market X-Ray", "item": "Market", "children": []})

    # add sv portfolios
    sv_portfolios = dbutil.getModelPortfolios(0, 'riapro')
    map_categories.append({"id": "sv_portfolios", "name": "SV Portfolios", "item": "Portfolio", "children": sv_portfolios})

    # add sv thematic portfolios
    sv_portfolios_thematic = dbutil.getModelPortfolios(0, 'riapro_robo')
    map_categories.append({"id": "sv_portfolios_thematic", "name": "SV Thematic Portfolios", "item": "Portfolio", "children": sv_portfolios_thematic})

    # add user portfolios
    userId = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]

    user_portfolios = dbutil.getModelPortfolios(userId, 'user')
    map_categories.append({"id": "user_portfolios", "name": "My Portfolios", "item": "Portfolio", "children": user_portfolios})

    return jsonify(map_categories)


@api_symbol.route('/symbol/market-summary', methods=['GET'])
def getMarketSummaryData():
    # visual rep of tickers for reference
    symbols = [
        # Value  | Core  | Growth
        ['VTV', 'IVV', 'IVW'], # Large
        ['MDYV', 'MDY', 'MDYG'], # Mid
        ['VBR', 'IJR', 'VBK']  # Small
    ]

    # get technicals
    tickers = [item for row in symbols for item in row]
    tickers = ','.join(tickers)
    symbol_technicals_list = dbutil.getDetailsForTickers(tickers, 'performance')
    symbol_technical_dict = {}

    # convet to dict for each access
    for sym_tech in symbol_technicals_list:
        symbol_technical_dict[sym_tech['symbol']] = sym_tech

    # prepare response
    ## get dict
    row_labels = ['LARGE', 'MID', 'SMALL']
    column_labels = ['VALUE', 'CORE', 'GROWTH']
    matrix = pd.DataFrame(symbols, index=row_labels, columns=column_labels)
    res_dict = matrix.to_dict(orient='index')

    ## populate data in response
    for row_key, row_value in res_dict.items():
        for col_key in row_value:
            sym = row_value[col_key]
            row_value[col_key] = symbol_technical_dict[sym]

    return jsonify(res_dict)


@api_symbol.route('/symbol/autocomplete/<searchLetter>', methods=['GET'])
def get_yahoo_supported_symbols(searchLetter):
    searchFor = searchLetter.replace(" ", "").replace(".", "").replace("-", "")
    try:
        symbols = dbutil.getSuggestedSymolsFromYahoo(searchFor)
        return jsonify({"status": "ok", "data": symbols})
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in fetching data {}".format(ex)})