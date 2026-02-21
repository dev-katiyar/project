from __future__ import print_function
from flask import jsonify
import pandas as pd
import requests
import numpy as np
from MyConfig import MyConfig as cfg
import pymongo
from datetime import datetime
import json
import datetimeutil


def corrected_data(ohlcData, columnname):
    return map(lambda x: x if x is not None else 0, ohlcData[columnname])


# data for trading view chart - with code specific for yahoo API
def get_yahoo_chart_data(ticker, range, interval):
    url = "{}/v8/finance/chart/{}".format(cfg.RAPID_BASE_API, ticker)
    querystring = { "range": range, "interval": interval }    # language (e.g. en) and region (e.g. US) are also available
    headers = { 
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request("GET", url, headers=headers, params=querystring, timeout=10)
    jsonData = json.loads(response.text)

    if jsonData is None or 'chart' not in jsonData or jsonData['chart']['result'] is None or 'timestamp' not in jsonData['chart']['result'][0]:
        print("NO Data  for {}".format(ticker))
        print(jsonData)
        return jsonify({})

    ohlcData = jsonData['chart']['result'][0]['indicators']['quote'][0]
    timestamp_data = jsonData['chart']['result'][0]['timestamp']
    open_data = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'open')))
    high_data = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'high')))
    low_data = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'low')))
    close_data = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'close')))
    volume_data = list(map(lambda x: int(x), corrected_data(ohlcData, 'volume')))

    if 'adjclose' in ohlcData:
        adjcloce_data = jsonData['chart']['result'][0]['indicators']['adjclose'][0]
        close_data = list(map(lambda x: round(x, 2), corrected_data(adjcloce_data, 'adjclose')))

    # remove data point if there is a zero price
    indexes_to_delete = []
    for index, value in enumerate(close_data):
        if value == 0:
            indexes_to_delete.append(index)
            
    if len(indexes_to_delete) > 0:
        for i in sorted(indexes_to_delete, reverse=True):
            del timestamp_data[i]
            del open_data[i]
            del high_data[i]
            del low_data[i]
            del close_data[i]
            del volume_data[i]

    ohlcv_dict = {
        'timestamp': timestamp_data, 'open': open_data, 'high': high_data, 
        'low': low_data, 'close': close_data, 'volume': volume_data,
    }
    return ohlcv_dict


# array of possible symbols for a query
def get_yf_autocomplete_list(query):
    if query == '':
        return []
    else:
        url = "{}/v6/finance/autocomplete".format(cfg.RAPID_BASE_API)
        querystring = { "lang": 'en', "query": query }  # other option of region e.g. 'US' is also available
        headers = { 
            'X-API-KEY': cfg.RAPID_KEY,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36' 
        }

        response = requests.request("GET", url, headers=headers, params=querystring, timeout=10)
        return json.loads(response.text).get('ResultSet', {}).get('Result', [])


# array of possible symbols for a query
def get_yf_symbol_quote(ticker):
    if ticker == '':
        return {}
    else:   # https://yfapi.net/v6/finance/quote?region=US&lang=en&symbols=AAPL
        url = "{}/v6/finance/quote".format(cfg.RAPID_BASE_API)
        querystring = { "lang": 'en', "symbols": ticker }  # other option of region e.g. 'US' is also available
        headers = { 
            'X-API-KEY': cfg.RAPID_KEY,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
        }

        response = requests.request("GET", url, headers=headers, params=querystring, timeout=10)
        quote = json.loads(response.text).get('quoteResponse', {}).get('result', [])
        if quote:
            return quote[0]
        else:
            return {}


def get_yahoo_history_data(identifier, start_date_obj, end_date_obj, interval):
    current_date = datetime.now()
    if end_date_obj > current_date:
        end_date_obj = current_date
    if interval != "1day":  # for charting
        day_diff = (end_date_obj - start_date_obj).days
        interval = "1d"
        if day_diff < 10:
            range = "5d"
            interval = "5m"
        elif day_diff < 100:
            range = "5d"
            interval = "5m"
        elif day_diff < 400:
            range = "3mo"
        elif day_diff < 500:
            range = "6mo"
        elif day_diff < 500:
            range = "6m"
        elif day_diff < 2115:
            range = "1y"
        elif day_diff < 4000:
            range = "5y"
        else:
            range = "max"
            interval = "1wk"
    else:  # for strategy
        range = "5d"
        interval = "1d"

    # if interval == 'minute':
    #     interval = "5m"
    # else:
    #     interval = "1d"

    url = "{}/v8/finance/chart/{}".format(cfg.RAPID_BASE_API, identifier)

    querystring = {"range": range, "interval": interval}

    headers = {
        'X-API-KEY': cfg.RAPID_KEY,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
    }

    response = requests.request("GET", url, headers=headers, params=querystring, timeout=10)

    jsonData = json.loads(response.text)
    if jsonData is None or 'chart' not in jsonData or jsonData['chart']['result'] is None:
        print("NO Data  for {}".format(identifier))
        print(jsonData)
        return jsonify({})
    if 'timestamp' not in jsonData['chart']['result'][0]:
        print("NO Data  for {}".format(identifier))
        print(jsonData)
        return jsonify({})
    ohlcData = jsonData['chart']['result'][0]['indicators']['quote'][0]
    timestamps = jsonData['chart']['result'][0]['timestamp']
    date_formatted = list(map(lambda x: datetime.fromtimestamp(x).strftime('%Y-%m-%d %H:%M'), timestamps))
    high = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'high')))
    low = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'low')))
    opendata = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'open')))
    close = list(map(lambda x: round(x, 2), corrected_data(ohlcData, 'close')))
    volume = list(map(lambda x: int(x), corrected_data(ohlcData, 'volume')))
    if 'adjclose' in ohlcData:
        adjcloce_data = jsonData['chart']['result'][0]['indicators']['adjclose'][0]
        adjclose = list(map(lambda x: round(x, 2), corrected_data(adjcloce_data, 'adjclose')))
    else:
        adjclose = close
    df = pd.DataFrame(
        {'date': date_formatted, 'high': high, 'low': low, 'open': opendata, 'actualclose': close, 'volume': volume,
         'close': adjclose})
    df['symbol'] = identifier
    df = df[['date', 'open', 'high', 'low', 'actualclose', 'volume', 'close', 'symbol']]
    # replace zero with nan and forward fill
    df = df.replace(0, np.nan)
    df = df.ffill()
    return df


# AK[2021-05-13] : Added another function to get symbol OHLC-V for a symbol from 'automation' project
def getsymbol_data(symbol, start_date, end_date, appendToday=False):
    # connection to server
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    try:
        db_chartlab = con_mongo.chartlab
        prices_data = db_chartlab.symbolshistorical.find({"$and": [{'symbol': symbol},
                                                                   {"date": {"$gte": start_date}},
                                                                   {"date": {"$lte": end_date}}]}).sort("date", 1)

        prices_df = pd.DataFrame(list(prices_data))
        if not prices_df.empty:
            if (len(prices_df)) > 0:
                # Remove duplicates where both symbol and date are the same, keeping the last entry
                prices_df = prices_df.reset_index().drop_duplicates(subset=['symbol', 'date'], keep='last').set_index('date')
                if '_id' in prices_df.columns:
                    prices_df = prices_df.drop(['_id'], axis=1)
        else:
            return None

        prices_df = prices_df.reset_index().drop_duplicates(subset='date', keep='last').set_index('date')

        prices_df = prices_df.dropna()

        if appendToday:
            lastDate = prices_df.index[-1]
            currentDate = datetime.now()
            day_diff = end_date - lastDate
            if (day_diff.days >= 1):
                interval = "1day"
                df_5day = get_yahoo_history_data(symbol, start_date, end_date, interval)
                df_today = df_5day.tail(1)
                df_today["date"] = currentDate
                df_today = df_today.set_index('date')
                prices_df = pd.concat([prices_df,df_today])
        return prices_df
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


# [AK: 2022-06-22] Added to get only close data, faster
def get_spark_data_from_yahoo(symbols):
    try:
        url = "{}/v8/finance/chart/{}".format(cfg.RAPID_BASE_API, 'Z')
        querystring = { "range": '5y', "interval": '1d', 'comparisons':  ','.join(symbols)}
        headers = { 
            'X-API-KEY': cfg.RAPID_KEY,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36' 
        }

        response = requests.request("GET", url, headers=headers, params=querystring, timeout=10)
        jsonData = json.loads(response.text)

        if jsonData is None or 'chart' not in jsonData or jsonData['chart']['result'] is None:
            print("NO Data  for symbols")
            print(jsonData)
            return jsonify({})

        if 'timestamp' not in jsonData['chart']['result'][0] or 'comparisons' not in jsonData['chart']['result'][0]:
            print("NO Data for symbols")
            print(jsonData)
            return jsonify({})
        
        close_dict = {}
        timestamps = jsonData['chart']['result'][0]['timestamp']
        close_dict['date'] = map(lambda x: datetime.fromtimestamp(x).date().strftime('%Y-%m-%d'), timestamps)
        symbols_data = jsonData['chart']['result'][0]['comparisons']

        for symbol_data in symbols_data:
            yf_symbol = symbol_data['symbol']
            if yf_symbol in symbols:
                close_dict[yf_symbol] = list(map(lambda x: round(x, 2), corrected_data(symbol_data, 'close')))
            

        df = pd.DataFrame(close_dict)
        df = df.replace(0, np.nan)
        df = df.ffill()
        df['date'] = df["date"].apply(lambda x: datetimeutil.getdatefromstr(x))
        df = df.set_index('date')

        return df
    except Exception as ex:
        print(ex)
        return None