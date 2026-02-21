from MyConfig import MyConfig as cfg
from flask import request, jsonify, Blueprint
from datetime import datetime
import requests
import json
import utils


api_eod = Blueprint('api_eod', __name__)


@api_eod.route("/eod/fundamentals/<ticker>", methods=['GET'])
def get_stock_fundmentals_data(ticker):
    # https://eodhistoricaldata.com/api/fundamentals/AAPL.US?api_token=631699490830d9.32948631
    url = "{}fundamentals/{}?api_token={}".format(
        cfg.EOD_BASE_API, 
        ticker,
        cfg.EOD_API_KEY
        )
    
    response = requests.request("GET", url, timeout=10)
    jsonData = json.loads(response.text)
    result = {ticker: jsonData}
    return result


@api_eod.route("/eod/insider-transactions/<ticker>", methods=['GET'])
def get_stock_insider_data(ticker):
    data = get_insider_data(ticker)
    if data and data.get("insiderTransactions") and len(data.get("insiderTransactions")) > 0:
        inside_txns = data.get("insiderTransactions")
        inside_txns = filter(
            lambda txn:
            txn.get("transactionAmount") and int(txn.get("transactionAmount")) > 0,
            inside_txns
        )
        data["insiderTransactions"] = list(inside_txns)
    return jsonify(data)


# date_raw: "Fri, 28 Oct 2022 10:20:00 GMT"
# link: "https://www.bizjournals.com/philadelphia/news/2022/02/02/exelon-peco-spin-out-complete.html?ana=yahoo"
# symbol: "CEG"
# time: "Fri 28 Oct 10:20"
# title: "PECO undergoes rebranding after parent Exelon completes split into two companies"
@api_eod.route("/eod/news/<symbol>", methods=['GET'])
def getNewsForSymbol(symbol):
    news = get_news_for_symbol(symbol)
    result = []
    for neww in news:
        result.append({
            "symbol": symbol,
            "date_raw": neww["date"],
            "title": neww["title"],
            "link": neww["link"],
            "time": utils.getFormattedStr(utils.getDateTimeFromString(str(neww["date"]), "%Y-%m-%dT%H:%M:%S+00:00")), 
        })
    # "date": "2022-10-19T13:27:48+00:00",
    return jsonify(result)


def get_insider_data(ticker):
    # https://eodhistoricaldata.com/api/insider-transactions?api_token=631699490830d9.32948631&code=AAPL&from=2020-01-01&to=2022-09-14
    from_date = '2020-01-01'   # we can send this from the front end. TBD
    to_date = str(datetime.now().date())
    url = "{}insider-transactions?api_token={}&code={}&from={}&to={}".format(
        cfg.EOD_BASE_API, 
        cfg.EOD_API_KEY, 
        ticker, 
        from_date,
        to_date)
    
    response = requests.request("GET", url, timeout=10)
    jsonData = json.loads(response.text)
    result = {"insiderTransactions": jsonData}
    return result


def get_news_for_symbol(symbol):
    # https://eodhistoricaldata.com/api/news?api_token=demo&s=AAPL&offset=0&limit=10
    if symbol == '':
        return []
    url = "{}news?api_token={}&s={}&offset={}&limit={}".format(
        cfg.EOD_BASE_API,
        cfg.EOD_API_KEY,
        symbol,
        0,
        15
    )
    response = requests.request("GET", url, timeout=10)
    result = json.loads(response.text)
    return result


def get_dividend_for_symbol(symbol):
    # https://eodhistoricaldata.com/api/div/AAPL.US?api_token=631699490830d9.32948631&fmt=json&from=2000-01-01
    if symbol == '':
        return []
    url = "{}div/{}?api_token={}&fmt=json".format(
        cfg.EOD_BASE_API,
        symbol,
        cfg.EOD_API_KEY,
    )
    response = requests.request("GET", url, timeout=10)
    result = json.loads(response.text)
    return result


def get_historical_price(symbol, from_date, freq):
    # https://eodhistoricaldata.com/api/eod/MCD.US?from=2017-01-05&period=d&fmt=json&api_token=631699490830d9.32948631
    if symbol == '':
        return []
    url = "{}eod/{}?api_token={}&fmt=json&period={}&from={}".format(
        cfg.EOD_BASE_API,
        symbol,
        cfg.EOD_API_KEY,
        freq,
        from_date,
    )
    response = requests.request("GET", url, timeout=10)
    result = json.loads(response.text)
    return result
