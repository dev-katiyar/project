from __future__ import print_function
from collections import defaultdict
import json
from MyConfig import MyConfig as cfg
from flask import request, jsonify
from datetime import datetime
from flask import Blueprint
import pytz
import requests
import dbutil
import historical_api
import datetimeutil
import pandas
import yfinance as yf

api_rapid = Blueprint('api_rapid', __name__)
est = pytz.timezone('US/Eastern')
utc = pytz.utc


def corrected_data(ohlcData, columnname):
    return map(lambda x: x if x is not None else 0, ohlcData[columnname])


@api_rapid.route("/symbol/option/<ticker>", methods=['GET'])
def getOptionsExpiration(ticker):
    url = "{}/v7/finance/options/{}".format(cfg.RAPID_BASE_API, ticker)
    querystring = {"symbol": ticker}
    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request(
        "GET", url, headers=headers, params=querystring, timeout=10)
    result = json.loads(response.text)
    result = result["optionChain"]["result"][0]["expirationDates"]
    result_list = None
    if result:
        result_list = []
        result_list = [{"id": x, "name": datetime.fromtimestamp(x).strftime('%B %d, %y')} for x in result]
    # date_formatted = map(lambda x: createTempMap(x), result)
    return jsonify(result_list)


def createTempMap(utc_date):
    dateTime = datetime.fromtimestamp(utc_date)
    return {"id": utc_date, "name": dateTime.strftime('%B %d, %y')}


@api_rapid.route("/symbol/option/<ticker>/<expiration>", methods=['GET'])
def getOptionsFullData(ticker, expiration):
    url = "{}/v7/finance/options/{}".format(cfg.RAPID_BASE_API, ticker)
    querystring = {"symbol": ticker, "date": expiration}
    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request(
        "GET", url, headers=headers, params=querystring, timeout=10)
    result = json.loads(response.text)
    result = result["optionChain"]["result"][0]["options"][0]
    result_dict = None
    if result:
        result_dict = {}
        calls = result["calls"]
        if len(calls) > 0:
            result_dict["calls"] = []
            for call in calls:
                result_dict["calls"].append(formatOptionRow(call, 'call'))
        puts = result["puts"]
        if len(puts) > 0:
            result_dict["puts"] = []
            for put in puts:
                result_dict["puts"].append(formatOptionRow(put, 'put'))
    return jsonify(result_dict)


def formatOptionRow(row, type):
    if 'impliedVolatility' in row:
        row['impliedVolatility'] = format(row['impliedVolatility'] * 100 , ".1f")
        row['impliedVolatility'] = row['impliedVolatility'] + '%'
    row["type"] = type
    row["lastTradeDate"] = datetime.fromtimestamp(
        row["lastTradeDate"]).strftime('%B %d, %y')
    return row


@api_rapid.route("/market/summary", methods=['GET'])
def getMarketSummary():
    url = "{}/v6/finance/quote/marketSummary".format(cfg.RAPID_BASE_API)
    querystring = {"region": "US", "lang": "en"}
    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request(
        "GET", url, headers=headers, params=querystring, timeout=10)
    jsonData = json.loads(response.text)
    result = jsonData["marketSummaryResponse"]["result"]
    result = filter(lambda x: x["quoteType"] != "CRYPTOCURRENCY", result)
    result = map(lambda x: createMarkeySummaryObj(x), result)
    return jsonify(result)


def createMarkeySummaryObj(x):
    y = {}
    y["shortName"] = x["shortName"]
    y["symbol"] = x["symbol"]
    y["change"] = x["regularMarketChange"]["fmt"]
    return y


def get_symbol_quotes_data(symbols):
    url = "{}/v6/finance/quote".format(cfg.RAPID_BASE_API)
    querystring = {"lang": "en", "symbols": ','.join(symbols)}
    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request(
        "GET", url, headers=headers, params=querystring, timeout=10)
    jsonData = json.loads(response.text)
    yf_quote_data = jsonData['quoteResponse']['result']
    return yf_quote_data


def get_suggested_symbols(symbol):
    url = "{}/v6/finance/autocomplete".format(cfg.RAPID_BASE_API)
    querystring = {"lang": "en", "query": ','.join(symbol)}
    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request(
        "GET", url, headers=headers, params=querystring, timeout=10)
    jsonData = json.loads(response.text)
    yf_suggested_symbols = jsonData['ResultSet']['Result']
    return yf_suggested_symbols


def get_symbol_profile_data(symbol):
    modules = ["quoteType","assetProfile"]
    yf_profile_data = get_yahoo_quote_details(symbol, modules)
    return yf_profile_data


@api_rapid.route("/symbol_search_yahoo/<symbol>", methods=['GET'])
def get_symbol_profile_data_delayed(symbol):
    res = {}
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        if info and info.get('quoteType', "NONE") == 'NONE':
            return jsonify({'error': "Symbol not found with Yahoo!"})

        symb_data = fill_symbol_data_from_info(info)
        profile_options = get_company_profile_options()

        res["symbol"] = symbol
        res["symbol_data"] = symb_data
        res["company_profile_options"] = profile_options

        return jsonify(res)
    except Exception as ex:
        print(ex)
        return jsonify({'error': "Symbol not found with Yahoo!"})


def fill_symbol_data_from_info(info):
    symb_data = {}

    symb_data['symbol'] = info.get('symbol', '')
    symb_data['companyname'] = info.get('shortName', info.get('longName', ''))
    symb_data['alternate_name'] = info.get('shortName', info.get('longName', ''))
    symb_data['exchange'] = info.get('exchange', '')
    symb_data['source'] = 'poly'
    symb_data['asset'] = info.get('quoteType', '')
    symb_data['sector'] = info.get('sector', '')
    symb_data['industry'] = info.get('industry', '')
    symb_data['isactive'] = 1
    symb_data['isnew'] = 1

    if symb_data['asset'] == 'CRYPTOCURRENCY':
        symb_data['sector'] = 'Crypto'

    return symb_data


def get_company_profile_options():
    sql_ast_ind_sec = """
        SELECT 
            MIN(asset_id) AS id, 
            asset_type_yf AS name, 
            'assets' AS field
        FROM
            assets 
        GROUP BY name
            
        UNION 

        SELECT 
            id AS id, 
            name AS name, 
            'sectors' AS field
        FROM
            sectors 
            
        UNION 

        SELECT 
            industryid AS id,
            industryname AS name,
            'industries' AS field
        FROM
            industries;
    """

    results = dbutil.getDataTable(sql_ast_ind_sec)

    grouped = defaultdict(list)
    for row in results:
        grouped[row['field']].append(row)
    grouped_dict = dict(grouped)
    return grouped_dict



def get_stats_data(ticker):
    modules = ["earnings","summaryDetail","financialData","defaultKeyStatistics"]
    data = get_yahoo_quote_details(ticker, modules)
    rawData = {}
    baseData = data.get('defaultKeyStatistics', {})
    earnings = data.get('earnings', {})
    summaryDetail = data.get('summaryDetail', {})
    financialData = data.get('financialData', {})

    if baseData:
        rawData.update(summaryDetail)
    if summaryDetail:
        rawData.update(summaryDetail)
    if financialData:
        rawData.update(financialData)
    if earnings:
        rawData.update(earnings)
    result = {}
    for key, value in rawData.items():
        if isinstance(value, dict) and 'fmt' in value:
            result.update({key: value['fmt']})
    result["symbol"] = ticker
    return result


def get_overview_data(ticker):
    modules = [
        "price","assetProfile","earnings","summaryDetail","financialData",
        "defaultKeyStatistics","earningsHistory","earningsTrend","netSharePurchaseActivity","balanceSheetHistory","balanceSheetHistoryQuarterly"
    ]
    data = get_yahoo_quote_details(ticker, modules)
    dataPoints = {
        "symbol": ['price', 'symbol'],
        "longName": ['price', 'longName'],
        "regularMarketTime": ['price', 'regularMarketTime'],
        "regularMarketPrice": ['price', 'regularMarketPrice', 'raw'],
        "regularMarketChange": ['price', 'regularMarketChange', 'raw'],
        "regularMarketChangePercent": ['price', 'regularMarketChangePercent', 'raw'],
        "regularMarketPreviousClose": ['price', 'regularMarketPreviousClose', 'raw'],
        "regularMarketOpen": ['price', 'regularMarketOpen', 'raw'],
        "regularMarketDayLow": ['price', 'regularMarketDayLow', 'raw'],
        "regularMarketDayHigh": ['price', 'regularMarketDayHigh', 'raw'],
        "regularMarketVolume": ['price', 'regularMarketVolume', 'raw'],
        "averageDailyVolume3Month": ['price', 'averageDailyVolume3Month', 'raw'],

        "fiftyTwoWeekLow": ['summaryDetail', 'fiftyTwoWeekLow', 'raw'],
        "fiftyTwoWeekHigh": ['summaryDetail', 'fiftyTwoWeekHigh', 'raw'],
        "trailingAnnualDividendRate": ['summaryDetail', 'trailingAnnualDividendRate', 'raw'],
        "trailingAnnualDividendYield": ['summaryDetail', 'trailingAnnualDividendYield', 'raw'],
        "marketCap": ['summaryDetail', 'marketCap', 'raw'],
        "beta": ['summaryDetail', 'beta', 'raw'],
        "dividendRateForward": ['summaryDetail', 'dividendRate', 'raw'],
        "dividendYieldForward": ['summaryDetail', 'dividendYield', 'raw'],
        "fiveYearAvgDividendYield": ['summaryDetail', 'fiveYearAvgDividendYield', 'raw'],

        "sharesOutstanding": ['defaultKeyStatistics', 'sharesOutstanding', 'raw'],
        "floatShares": ['defaultKeyStatistics', 'floatShares', 'raw'],
        "heldPercentInsiders": ['defaultKeyStatistics', 'heldPercentInsiders', 'raw'],
        "heldPercentInstitutions": ['defaultKeyStatistics', 'heldPercentInstitutions', 'raw'],
        "sharesShort": ['defaultKeyStatistics', 'sharesShort', 'raw'],
        "sharesShortDate": ['defaultKeyStatistics', 'dateShortInterest', 'raw'],
        "sharesShortPriorMonth": ['defaultKeyStatistics', 'sharesShortPriorMonth', 'raw'],
        "sharesShortPriorMonthDate": ['defaultKeyStatistics', 'sharesShortPreviousMonthDate', 'raw'],
        "lastDividendValue": ['defaultKeyStatistics', 'lastDividendValue', 'raw'],
        "lastDividendDate": ['defaultKeyStatistics', 'lastDividendDate', 'raw'],
        "lastSplitFactor": ['defaultKeyStatistics', 'lastSplitFactor'],
        "lastSplitDate": ['defaultKeyStatistics', 'lastSplitDate', 'raw'],

        "forwardPE": ['defaultKeyStatistics', 'forwardPE', 'raw'],
        "trailingPE": ['summaryDetail', 'trailingPE', 'raw'],
        "pegRatio": ['defaultKeyStatistics', 'pegRatio', 'raw'],
        "priceToBook": ['defaultKeyStatistics', 'priceToBook', 'raw'],
        "grossMargins": ['financialData', 'grossMargins', 'raw'],
        "profitMargins": ['financialData', 'profitMargins', 'raw'],

        "returnOnAssets": ['financialData', 'returnOnAssets', 'raw'],
        "returnOnEquity": ['financialData', 'returnOnEquity', 'raw'],
        "totalDebt": ['financialData', 'totalDebt', 'raw'],
        "debtToEquity": ['financialData', 'debtToEquity', 'raw'],

        "insiderSharesLast6MonthBought": ['netSharePurchaseActivity', 'buyInfoShares', 'raw'],
        "insiderSharesLast6MonthBoughtCount": ['netSharePurchaseActivity', 'buyInfoCount', 'raw'],
        "insiderSharesLast6MonthSold": ['netSharePurchaseActivity', 'sellInfoShares', 'raw'],
        "insiderSharesLast6MonthSoldCount": ['netSharePurchaseActivity', 'sellInfoCount', 'raw'],

        "industry": ['assetProfile', 'industry'],
        "longBusinessSummary": ['assetProfile', 'longBusinessSummary'],
    }

    result = {}

    for key, value in dataPoints.items():
        attribute_value = data
        for attribute in value:
            attribute_value = attribute_value.get(attribute, {})
        result[key] = attribute_value if attribute_value else {}

    earnings_chart = data.get('earnings', {})
    earning_chart_qtrly = None
    revDataQuarterly = None

    if earnings_chart:
        earning_chart_qtrly = earnings_chart.get('earningsChart', {}).get('quarterly',[])
        revDataQuarterly = earnings_chart.get('financialsChart', {}).get('quarterly', [])

    # -2q actual
    if earning_chart_qtrly and len(earning_chart_qtrly) > 1:
        result['epsLastToLastQuarter'] = earning_chart_qtrly[-2].get(
            'actual', {}).get('raw', {}) if earning_chart_qtrly else {}  # -2q
    if revDataQuarterly and len(revDataQuarterly) > 1:
        result['revenueLastToLastQuarter'] = revDataQuarterly[-2].get(
            'revenue', {}).get('raw', {}) if revDataQuarterly else {}

    # -1q (last) actual
    if earning_chart_qtrly and len(earning_chart_qtrly) > 0:
        result['epsLastQuarter'] = earning_chart_qtrly[-1].get('actual', {}).get(
            'raw', {}) if earning_chart_qtrly else {}        # -1q
    if revDataQuarterly and len(revDataQuarterly) > 0: 
        result['revenueLastQuarter'] = revDataQuarterly[-1].get(
            'revenue', {}).get('raw', {}) if revDataQuarterly else {}

    earning_trend_obj = data.get('earningsTrend', {})
    if earning_trend_obj:
        earning_trend = earning_trend_obj.get('trend', [])
        #  0q (current) estimate
        if len(earning_trend) > 0:
            currentQuarterEstimate = earning_trend[0] if earning_trend else {}
            result['epsCurrentQuarterEstimate'] = currentQuarterEstimate.get(
                'earningsEstimate', {}).get('avg', {}).get('raw', {})
            result['epsCurrentQuarterGrowth'] = currentQuarterEstimate.get(
                'earningsEstimate', {}).get('growth', {}).get('raw', {})
            result['revenueCurrentQuarterEstimate'] = currentQuarterEstimate.get(
                'revenueEstimate', {}).get('avg', {}).get('raw', {})
            result['revenueCurrentQuarterGrowth'] = currentQuarterEstimate.get(
                'revenueEstimate', {}).get('growth', {}).get('raw', {})

        #  +1q (next) estimate
        if len(earning_trend) > 1:
            nextQuarterEstimate = earning_trend[1] if earning_trend else {}
            result['epsNextQuarterEstimate'] = nextQuarterEstimate.get(
                'earningsEstimate', {}).get('avg', {}).get('raw', {})
            result['epsNextQuarterGrowth'] = nextQuarterEstimate.get(
                'earningsEstimate', {}).get('growth', {}).get('raw', {})
            result['revenueNextQuarterEstimate'] = nextQuarterEstimate.get(
                'revenueEstimate', {}).get('avg', {}).get('raw', {})
            result['revenueNextQuarterGrowth'] = nextQuarterEstimate.get(
                'revenueEstimate', {}).get('growth', {}).get('raw', {})

        #  0y (current) estimate
        if len(earning_trend) > 2:
            currentYearEstimate = earning_trend[2] if earning_trend else {}
            result['epsCurrentYearEstimate'] = currentYearEstimate.get(
                'earningsEstimate', {}).get('avg', {}).get('raw', {})
            result['epsCurrentYearGrowth'] = currentYearEstimate.get(
                'earningsEstimate', {}).get('growth', {}).get('raw', {})
            result['revenueCurrentYearEstimate'] = currentYearEstimate.get(
                'revenueEstimate', {}).get('avg', {}).get('raw', {})
            result['revenueCurrentYearGrowth'] = currentYearEstimate.get(
                'revenueEstimate', {}).get('growth', {}).get('raw', {})

        revDataAnnual = data.get('earnings', {}).get(
            'financialsChart', {}).get('yearly', [])
        if len(revDataAnnual) > 1:
            # -2y actual
            result['revenueLastToLastYear'] = revDataAnnual[-2].get(
                'revenue', {}).get('raw', {}) if revDataAnnual else {}

        if len(revDataAnnual) > 0:
            # -1y (last) actual
            result['epsLastYearActual'] = currentYearEstimate.get(
                'earningsEstimate', {}).get('yearAgoEps', {}).get('raw', {})
            result['revenueLastYear'] = revDataAnnual[-1].get(
                'revenue', {}).get('raw', {}) if revDataAnnual else {}

        #  +1y (next) estimate
        if len(earning_trend) > 3:
            nextYearEstimate = earning_trend[3] if earning_trend else {}
            result['epsNextYearEstimate'] = nextYearEstimate.get(
                'earningsEstimate', {}).get('avg', {}).get('raw', {})
            result['epsNextYearGrowth'] = nextYearEstimate.get(
                'earningsEstimate', {}).get('growth', {}).get('raw', {})
            result['revenueNextYearEstimate'] = nextYearEstimate.get(
                'revenueEstimate', {}).get('avg', {}).get('raw', {})
            result['revenueNextYearGrowth'] = nextYearEstimate.get(
                'revenueEstimate', {}).get('growth', {}).get('raw', {})

        #  +5y estimate
        if len(earning_trend) > 4:
            next5YearEstimate = earning_trend[4] if earning_trend else {}
            result['epsNext5YearGrowth'] = next5YearEstimate.get(
                'growth', {}).get('raw', {})

        #  -5y estimate
        if len(earning_trend) > 5:
            last5YearEstimate = earning_trend[5] if earning_trend else {}
            result['epsLast5YearGrowth'] = last5YearEstimate.get(
                'growth', {}).get('raw', {})

        #  revenue and earning chart data - Yearly
        revDataAnnualArray = []
        for rev in revDataAnnual:
            revDataAnnualArray.append({
                "date": rev.get('date', {}),
                "revenue": rev.get('revenue', {}).get('raw', {}) / 1000000,
                "earnings": rev.get('earnings', {}).get('raw', {}) / 1000000,
            })
        result['revEarningAnnual'] = revDataAnnualArray

    #  revenue and earning chart data - Quarterly

    revDataQuarterlyArray = []
    if revDataQuarterly:
        for rev in revDataQuarterly:
            revDataQuarterlyArray.append({
                "date": rev.get('date', {}),
                "revenue": rev.get('revenue', {}).get('raw', {}) / 1000000,
                "earnings": rev.get('earnings', {}).get('raw', {}) / 1000000,
            })
    result['revEarningQuarterly'] = revDataQuarterlyArray

    # EPS History and Projections - Quarterly
    earningsHistory = data.get('earningsHistory', {})
    if earningsHistory:
        epsDataQuarterly = earningsHistory.get('history', {})
        epsDataQuarterlyArray = []
        if epsDataQuarterly:
            for rev in epsDataQuarterly:
                epsDataQuarterlyArray.append({
                    "date": rev.get('quarter', {}).get('fmt', {}),
                    "epsActual": rev.get('epsActual', {}).get('raw', {}),
                })

        if earning_trend:
            epsDataQuarterlyArray.append({
                "date": earning_trend[0].get('endDate', '') + " (E)" if earning_trend[0].get('endDate', '') else {},
                "epsActual": earning_trend[0].get('earningsEstimate', {}).get('avg', {}).get('raw', {}),
            })
            epsDataQuarterlyArray.append({
                "date": earning_trend[1].get('endDate', '') + " (E)" if earning_trend[0].get('endDate', '') else {},
                "epsActual": earning_trend[1].get('earningsEstimate', {}).get('avg', {}).get('raw', {}),
            })

        result['epsQuarterly'] = epsDataQuarterlyArray

    return result


def get_etf_overview_data_raw(ticker):
    modules = [
        "assetProfile","fundProfile","summaryDetail","defaultKeyStatistics","price"
    ]
    return get_yahoo_quote_details(ticker, modules)


def get_short_interst_data(ticker):
    sql = """
        SELECT *, short_shares*100/outstanding_shares as short_os_ratio FROM short_interests WHERE symbol = '{}' ORDER BY rep_date DESC;
    """.format(ticker)
    si_data = dbutil.getDataTable(sql)
    return si_data


def get_etf_top_holdings(ticker):
    modules = ["topHoldings"]
    modulesData = get_yahoo_quote_details(ticker, modules)
    top_holdings = [{
        'symbol': x.get('symbol', '').split('.')[0],
        'name': x.get('holdingName', ''),
        'holdingPercent': x.get('holdingPercent', '').get('raw', '')
    } for x in modulesData.get('topHoldings', {}).get('holdings', {})]

    return top_holdings


def get_etf_overview_data(ticker):
    modules = ["price","assetProfile","summaryDetail","defaultKeyStatistics","topHoldings"]
    data = get_yahoo_quote_details(ticker, modules)
    dataPoints = {
        "symbol": ['price', 'symbol'],
        "longName": ['price', 'longName'],
        "regularMarketTime": ['price', 'regularMarketTime'],
        "regularMarketPrice": ['price', 'regularMarketPrice', 'raw'],
        "regularMarketChange": ['price', 'regularMarketChange', 'raw'],
        "regularMarketChangePercent": ['price', 'regularMarketChangePercent', 'raw'],
        "regularMarketPreviousClose": ['price', 'regularMarketPreviousClose', 'raw'],
        "regularMarketOpen": ['price', 'regularMarketOpen', 'raw'],
        "regularMarketDayLow": ['price', 'regularMarketDayLow', 'raw'],
        "regularMarketDayHigh": ['price', 'regularMarketDayHigh', 'raw'],
        "regularMarketVolume": ['price', 'regularMarketVolume', 'raw'],
        "averageDailyVolume3Month": ['price', 'averageDailyVolume3Month', 'raw'],

        "fiftyTwoWeekLow": ['summaryDetail', 'fiftyTwoWeekLow', 'raw'],
        "fiftyTwoWeekHigh": ['summaryDetail', 'fiftyTwoWeekHigh', 'raw'],
        "trailingAnnualDividendRate": ['summaryDetail', 'trailingAnnualDividendRate', 'raw'],
        "trailingAnnualDividendYield": ['summaryDetail', 'trailingAnnualDividendYield', 'raw'],
        "marketCap": ['summaryDetail', 'marketCap', 'raw'],
        "beta": ['summaryDetail', 'beta', 'raw'],
        "dividendRateForward": ['summaryDetail', 'dividendRate', 'raw'],
        "dividendYieldForward": ['summaryDetail', 'dividendYield', 'raw'],
        "fiveYearAvgDividendYield": ['summaryDetail', 'fiveYearAvgDividendYield', 'raw'],

        "lastDividendValue": ['defaultKeyStatistics', 'lastDividendValue', 'raw'],
        "lastDividendDate": ['defaultKeyStatistics', 'lastDividendDate', 'raw'],
        "lastSplitFactor": ['defaultKeyStatistics', 'lastSplitFactor'],
        "lastSplitDate": ['defaultKeyStatistics', 'lastSplitDate', 'raw'],

        "forwardPE": ['defaultKeyStatistics', 'forwardPE', 'raw'],
        "trailingPE": ['summaryDetail', 'trailingPE', 'raw'],

        "industry": ['assetProfile', 'industry'],
        "longBusinessSummary": ['assetProfile', 'longBusinessSummary'],
    }

    result = {}

    for key, value in dataPoints.items():
        attribute_value = data
        for attribute in value:
            attribute_value = attribute_value.get(attribute, {})
        if attribute_value is not None:
            result[key] = attribute_value

    result['topHoldings'] = [{
        'symbol': x.get('symbol', ''),
        'name': x.get('holdingName', ''),
        'holdingPercent': x.get('holdingPercent', '').get('raw', '')
    } for x in data.get('topHoldings', {}).get('holdings', {})]

    return result


@api_rapid.route("/symbol/recommendations/<ticker>", methods=['GET'])
def getSymbolRecommmendations(ticker):
    url = "{}/v6/finance/recommendationsbysymbol/{}".format(
        cfg.RAPID_BASE_API, ticker)
    # querystring = {"modules": "price,summaryDetail,financialData,defaultKeyStatistics"}
    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }
    response = requests.request("GET", url, headers=headers, timeout=10)
    jsonData = json.loads(response.text)
    symbolsData = jsonData['finance']['result'][0]['recommendedSymbols']
    return jsonify(symbolsData)


def filterSelectedColumns(obj, listColumns):
    res_dict = {}
    for typeKey, row in obj.items():
        if typeKey in listColumns and isinstance(row, list):
            row_list = []
            for item in row:
                res = {}
                for key, value in item.items():
                    if (key in listColumns[typeKey]):
                        res.update({key: value["fmt"]})
                row_list.append(res)

            res_dict.update({typeKey: row_list})

    return res_dict


def get_price_field(column, row):
    if row[column]:
        return round(float(row[column].replace(",", "")), 2)
    else:
        return 0


# @api_rapid.route("/symbol/keystats/<ticker>", methods=['GET'])
# def getKeyStats(ticker):
#     data = get_stats_data(ticker)
#     return jsonify(data)


@api_rapid.route("/symbol/overview/<ticker>", methods=['GET'])
def getStockOverview(ticker):
    data = get_overview_data(ticker)
    return jsonify(data)


@api_rapid.route("/symbol/etf_yh_overview/<ticker>", methods=['GET'])
def getETFOverviewData(ticker):
    data = get_etf_overview_data_raw(ticker)
    return jsonify(data)


@api_rapid.route("/symbol/short-interest/<ticker>", methods=['GET'])
def getStockShortInterest(ticker):
    data = get_short_interst_data(ticker)
    return jsonify(data)


@api_rapid.route("/etf/overview/<ticker>", methods=['GET'])
def getETFOverview(ticker):
    data = get_etf_overview_data(ticker)
    return jsonify(data)


@api_rapid.route("/etf/holdings/<ticker>", methods=['GET'])
def getETFHoldings(ticker):
    data = get_etf_top_holdings(ticker)
    return jsonify(data)


@api_rapid.route("/fundamental/peer/<ticker>", methods=['GET'])
def getFundamentalPeersNew(ticker):
    mapping = dbutil.getDataDict("select * from stats_ticker_mapping", "name")
    result = {}
    peerSymbols = dbutil.getPeers(ticker)
    if ticker not in peerSymbols:
        peerSymbols.append(ticker)
    if len(peerSymbols) == 0:
        return jsonify(result)

    formattedSymbols = map(lambda x: "'" + x + "'", peerSymbols)
    formattedSymbols = ','.join(formattedSymbols)
    row_stats = {}
    all_symbol_stats = []
    for peerSymbol in peerSymbols:
        stats_data = get_stats_data(peerSymbol)
        if stats_data != {}:
            all_symbol_stats.append(stats_data)
    for row in all_symbol_stats:
        symbol_row = row['symbol']
        row['52weekrange'] = str(get_price_field("fiftyTwoWeekLow", row)) + " - " + str(
            get_price_field("fiftyTwoWeekHigh", row))
        if 'fiftyTwoWeekHigh' in row and 'regularMarketPrice' in row:
            row['below_high'] = 100 * (
                get_price_field("fiftyTwoWeekHigh", row) - get_price_field("regularMarketPrice",
                                                                           row)) / get_price_field(
                "regularMarketPrice", row)
        if row['regularMarketDayLow']:
            row['todayrange'] = str(get_price_field("fiftyTwoWeekLow", row)) + " - " + str(
                get_price_field("fiftyTwoWeekHigh", row))
        for column, mappingItem in mapping.items():
            group = mappingItem['group']
            display_name = mappingItem['display_name']
            type = mappingItem['type']

            if column in row:
                row_val = row[column]

                if row_val is not None and type == "text" and "-" not in row_val and row_val != 'na':
                    row_val = row_val
                # elif row_val is not None and type == "percentage" and row_val != 'na':
                #     if utils.isNumber(row_val):
                #         row_val = float(row_val) * 100

                if column not in row_stats:
                    row_stats.update(
                        {column: {'group': group, 'data': {}, 'display_name': display_name, 'type': type}})

                if symbol_row == ticker:
                    row_stats[column].update({'symbol_value': row_val})
                else:
                    row_stats[column]['data'].update({symbol_row: row_val})

    peer_data = []
    for column, value in row_stats.items():
        if 'symbol_value' in value:
            row_data = {'name': value['display_name'], 'group': value['group'], 'data': value['data'],
                        'symbol_value': value['symbol_value'], 'type': value['type']}

        else:
            row_data = {'name': value['display_name'], 'group': value['group'], 'data': value['data'],
                        'symbol_value': 'na', 'type': value['type']}
        peer_data.append(row_data)

    peerSymbols.remove(ticker)
    result.update({"peer_symbols": peerSymbols})
    result.update({"peer_data": peer_data})
    return jsonify(result)


@api_rapid.route("/iex/hist_prices", methods=['POST', 'GET'])
def get_history_data():
    identifier = request.args.get('identifier')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    interval = request.args.get('interval')
    start_date_obj = datetimeutil.getdatefromstr_format(
        start_date[:10], "%Y-%m-%d")
    end_date_obj = datetimeutil.getdatefromstr_format(
        end_date[:10], "%Y-%m-%d")
    df = historical_api.get_yahoo_history_data(
        identifier, start_date_obj, end_date_obj, interval)
    return json.dumps((list(df.T.to_dict().values())))


def getSymbolHistoryFromYahoo(symbol, isHistorical):
    try:
        range = "5d"
        if isHistorical:
            range = "10y"
        else:
            range = "5d"
        url = "{}/v8/finance/chart/{}".format(cfg.RAPID_BASE_API, symbol)
        querystring = {"range": range, "interval": "1d"}
        headers = {
            'X-API-KEY': cfg.RAPID_KEY,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
        }
        response = requests.request(
            "GET", url, headers=headers, params=querystring)
        jsonData = json.loads(response.text)

        ohlcData = jsonData['chart']['result'][0]['indicators']['quote'][0]
        timestamps = jsonData['chart']['result'][0]['timestamp']
        dates = map(lambda x: datetime.fromtimestamp(
            x).date().strftime('%Y-%m-%d'), timestamps)

        high = map(lambda x: round(x, 2), corrected_data(ohlcData, 'high'))
        low = map(lambda x: round(x, 2), corrected_data(ohlcData, 'low'))
        opendata = map(lambda x: round(x, 2), corrected_data(ohlcData, 'open'))
        close = map(lambda x: round(x, 2), corrected_data(ohlcData, 'close'))
        volume = map(lambda x: int(x), corrected_data(ohlcData, 'volume'))
        adjcloce_data = jsonData['chart']['result'][0]['indicators']['adjclose'][0]
        adjclose = map(lambda x: round(x, 2),
                       corrected_data(adjcloce_data, 'adjclose'))
        df = pandas.DataFrame(
            {'date': dates, 'high': high, 'low': low, 'open': opendata, 'actualclose': close, 'volume': volume,
             'close': adjclose})
        df['symbol'] = symbol
        df = df.groupby('date').first()
        df['date'] = df.index
        df["date"] = df["date"].apply(lambda x: datetimeutil.getdatefromstr(x))
        df = df[['date', 'open', 'high', 'low',
                 'actualclose', 'volume', 'close', 'symbol']]
        df = df[df['close'] > 0]
        return df
    except Exception as ex:
        print(ex)
        return False


def getSymbolHistoryFromYahooWeekly10Year(symbol):
    try:
        range = "10y"
        url = "{}/v8/finance/chart/{}".format(cfg.RAPID_BASE_API, symbol)
        querystring = {"range": range, "interval": "1wk"}
        headers = {
            'X-API-KEY': cfg.RAPID_KEY,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
        }
        response = requests.request(
            "GET", url, headers=headers, params=querystring)
        jsonData = json.loads(response.text)

        ohlcData = jsonData['chart']['result'][0]['indicators']['quote'][0]
        timestamps = jsonData['chart']['result'][0]['timestamp']
        dates = map(lambda x: datetime.fromtimestamp(
            x).date().strftime('%Y-%m-%d'), timestamps)

        high = map(lambda x: round(x, 2), corrected_data(ohlcData, 'high'))
        low = map(lambda x: round(x, 2), corrected_data(ohlcData, 'low'))
        opendata = map(lambda x: round(x, 2), corrected_data(ohlcData, 'open'))
        close = map(lambda x: round(x, 2), corrected_data(ohlcData, 'close'))
        volume = map(lambda x: int(x), corrected_data(ohlcData, 'volume'))
        adjcloce_data = jsonData['chart']['result'][0]['indicators']['adjclose'][0]
        adjclose = map(lambda x: round(x, 2),
                       corrected_data(adjcloce_data, 'adjclose'))
        df = pandas.DataFrame(
            {'date': dates, 'high': high, 'low': low, 'open': opendata, 'actualclose': close, 'volume': volume,
             'close': adjclose})
        df['symbol'] = symbol
        df = df.groupby('date').first()
        df['date'] = df.index
        df["date"] = df["date"].apply(lambda x: datetimeutil.getdatefromstr(x))
        df = df[['date', 'open', 'high', 'low',
                 'actualclose', 'volume', 'close', 'symbol']]
        df = df[df['close'] > 0]
        return df
    except Exception as ex:
        print(ex)
        return False


def get_yahoo_quote_details(ticker, modules):
    resJSON = {}
    if len(modules) > 0:
        url = "{}/v11/finance/quoteSummary/{}".format(
            cfg.RAPID_BASE_API, ticker)
        headers = {
            'X-API-KEY': cfg.RAPID_KEY,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
        }
        for module in modules:
            querystring = {
                "modules": [module]
            }
            response = requests.request(
                "GET", url, headers=headers, params=querystring, timeout=10)
            quoteSummary = json.loads(response.text)["quoteSummary"]
            result = quoteSummary["result"]
            error = quoteSummary["error"]
            moduleData = result[0][module] if error == None else None
            resJSON[module] = moduleData
    return resJSON 
