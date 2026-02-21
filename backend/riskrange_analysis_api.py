from flask import Blueprint, jsonify, request
import json
from historical_api import get_spark_data_from_yahoo
import pandas as pd
import datetime
from dao import mongodb
import talib
import dbutil


api_riskrange_analysis = Blueprint('api_riskrange_analysis', __name__)


@api_riskrange_analysis.route("/riskrange-analysis-etf", methods=['GET', 'POST'])
def get_riskrange_analysis_etf():
    # get input params
    post_data = json.loads(request.data)
    dict_type = 'riskrange_analysis'
    tickers = post_data['tickers']

    res = {}

    try:
        if len(tickers) > 0:
            rra_data = calculate_riskrange_etf(tickers)
            if rra_data is not None:
                res = {}
                res["status"] = "ok"
                res["data"] = rra_data
            return res
        return jsonify(res)
    except Exception as ex:
        print(ex)
        res["status"] = "error"
        res["data"] = "Server error. Contact support"
        return jsonify(res)


@api_riskrange_analysis.route("/riskrange-analysis", methods=['GET', 'POST'])
def get_riskrange_analysis():
    # get input params
    post_data = json.loads(request.data)
    dict_type = 'riskrange_analysis'
    tickers = post_data['tickers']
    refresh_data = post_data["reloadLiveData"]  # gets fresh price data, if set to True

    res = {}
    try:
        if len(tickers) > 0:
            # in case no refresh needed, send data if we have it
            if not refresh_data: 
                res = prepare_risk_range_response(dict_type)
                if res is not None:
                    return jsonify(res)
            
            # calculate and save latest, if refresh or if no saved data
            calculate_and_save_riskrange(tickers, dict_type)
            # at this point data will be there
            res = prepare_risk_range_response(dict_type)
        return jsonify(res)
    except Exception as ex:
        print(ex)
        res["status"] = "error"
        res["data"] = "Server error. Contact support"
        return jsonify(res)
    

def prepare_risk_range_response(dict_type):
    res = None
    rra_and_price_data = get_rra_data_from_mongo(dict_type)
    # sending analysis data as of now. No pricing data, maybe later needed for charting etc.
    rra_data = rra_and_price_data.get('rra_data', None)
    update_date = rra_and_price_data.get('update_date', None)
    if rra_data is not None:
        res = {}
        res["status"] = "ok"
        res["data"] = rra_data
        res["update_date"] = update_date
    return res

def calculate_riskrange_etf(symbols):
    try:
        ref_ticker = 'IVV'
        yahoo_data = get_data_from_yahoo(symbols)
        yahoo_data['date'] = yahoo_data.index.strftime('%Y-%m-%d')
        if yahoo_data is not None:
            price_data = yahoo_data.to_dict(orient="records")
            # calcuate risk range
            rra_data = calculate_risk_range(price_data, ref_ticker)
            return rra_data
    except Exception as ex:
        print("Not able to get data or calcualte risk range the given symbols: ", symbols)
        print(ex)

def calculate_and_save_riskrange(symbols, dict_type):
    try:
        ref_ticker = 'IVV'
        yahoo_data = get_data_from_yahoo(symbols)
        yahoo_data['date'] = yahoo_data.index.strftime('%Y-%m-%d')
        if yahoo_data is not None:
            price_data = yahoo_data.to_dict(orient="records")
            # calcuate risk range
            rra_data = calculate_risk_range(price_data, ref_ticker)

            # # prepare for saving, if we need to save all
            current_datetime = datetime.datetime.now()
            current_datetime_string = current_datetime.strftime("%Y-%m-%d %H:%M:%S")
            rra_all_data = {
                'update_date': current_datetime_string,
                'price_data': price_data,
                'rra_data': rra_data
            }
            save_rra_data_to_mongo(rra_all_data, dict_type)
    except Exception as ex:
        print("Not able to get data or calcualte risk range the given symbols: ", symbols)
        print(ex)


def calculate_risk_range(price_data, ref_ticker):
    close_df = pd.DataFrame(price_data)
    close_df["date"] = pd.to_datetime(close_df["date"])
    close_df.set_index("date", inplace=True)

    rr_all = {}

    if close_df is not None:
        # calculate for ref ticker (IVV if ref as on 2024-12-21)
        ref_obj = {}

        ser_weekly_prices = close_df[ref_ticker].resample('W').last()
        
        ser_1w_chg = (ser_weekly_prices/ser_weekly_prices.shift(1)) - 1
        ser_4w_chg = (ser_weekly_prices/ser_weekly_prices.shift(4)) - 1
        ser_12w_chg = (ser_weekly_prices/ser_weekly_prices.shift(12)) - 1
        ser_24w_chg = (ser_weekly_prices/ser_weekly_prices.shift(24)) - 1
        ser_52w_chg = (ser_weekly_prices/ser_weekly_prices.shift(52)) - 1

        ref_obj["rel_1w_chg"] = ser_1w_chg.iloc[-1]
        ref_obj["rel_4w_chg"] = ser_4w_chg.iloc[-1]
        ref_obj["rel_12w_chg"] = ser_12w_chg.iloc[-1]
        ref_obj["rel_24w_chg"] = ser_24w_chg.iloc[-1]
        ref_obj["rel_52w_chg"] = ser_52w_chg.iloc[-1]

        rr_all[ref_ticker] = ref_obj

        # calculate for all the tickers
        tickers = close_df.columns.tolist()

        # get symbol: beta dict for the symbols
        sql = """
            select symbol,  IFNULL(beta, '1') AS beta 
            from symbol_fundamentals 
            where symbol in ({});""".format(
                ", ".join([f"'{item}'" for item in tickers])
            )
        ticker_beta_dict = dbutil.getKeyValuePair(sql, "symbol", "beta")
        
        for ticker in tickers:
            if ticker != ref_ticker:
                rr_all[ticker] = {}
            
            ticker_obj = rr_all[ticker]

            # ticker
            ticker_obj['symbol'] = ticker

            # price 
            last = close_df[ticker].iloc[-1]
            ticker_obj['last'] = last

            # returns 
            if ticker != ref_ticker:
                ser_weekly_prices = close_df[ticker].resample('W').last()

                ser_1w_chg = (ser_weekly_prices/ser_weekly_prices.shift(1)) - 1
                ser_4w_chg = (ser_weekly_prices/ser_weekly_prices.shift(4)) - 1
                ser_12w_chg = (ser_weekly_prices/ser_weekly_prices.shift(12)) - 1
                ser_24w_chg = (ser_weekly_prices/ser_weekly_prices.shift(24)) - 1
                ser_52w_chg = (ser_weekly_prices/ser_weekly_prices.shift(52)) - 1

                ticker_obj["rel_1w_chg"] = ser_1w_chg.iloc[-1] - ref_obj["rel_1w_chg"]
                ticker_obj["rel_4w_chg"] = ser_4w_chg.iloc[-1] - ref_obj["rel_4w_chg"]
                ticker_obj["rel_12w_chg"] = ser_12w_chg.iloc[-1] - ref_obj["rel_12w_chg"]
                ticker_obj["rel_24w_chg"] = ser_24w_chg.iloc[-1] - ref_obj["rel_24w_chg"]
                ticker_obj["rel_52w_chg"] = ser_52w_chg.iloc[-1]- ref_obj["rel_52w_chg"]

            # averages 
            ser_weekly_prices = close_df[ticker].resample('W').last()
            ser_short_avg = 1.0 * talib.SMA(ser_weekly_prices, 14)     # 13 weeks - Lance 50 days
            ser_long_avg = 1.0 * talib.SMA(ser_weekly_prices, 35)      # 34 weeks - Lance 200 day

            short_avg = ser_short_avg.iloc[-1]
            long_avg = ser_long_avg.iloc[-1]
            ticker_obj['short_avg'] = short_avg
            ticker_obj['long_avg'] = long_avg

            #  deviations or price form the moving averages and crossover
            dev_short_avg = last/short_avg - 1 
            dev_long_avg = last/long_avg - 1 

            ticker_obj['dev_short_avg'] = dev_short_avg
            ticker_obj['dev_long_avg'] = dev_long_avg

            if long_avg > short_avg:
                avg_cross_signal = "Bearish"
            else: 
                avg_cross_signal = "Bullish"

            ticker_obj['avg_cross_signal'] = avg_cross_signal

            # month end price
            ser_monthly_prices = close_df[ticker].resample('ME').last()
            month_end_price = ser_monthly_prices.iloc[-2]
            # month_end_key = ser_monthly_prices.index[-1]

            # this is used, if the month end is a weekend
            # price_month_num = month_end_key.month
            # today_month_num = datetime.datetime.today().month

            # if price_month_num == today_month_num:
            #     month_end_price = ser_monthly_prices.iloc[-2]
            
            ticker_obj['month_end_price'] = month_end_price

            # beta
            beta = float(ticker_beta_dict[ticker])
            ticker_obj['beta'] = beta

            # risk range
            if ticker != ref_ticker:
                factor = 0.025 + (beta/100)
            else:
                factor = 0.025

            rr_high = month_end_price * (1 + factor)
            rr_low = month_end_price * (1 - factor)

            ticker_obj['rr_high'] = rr_high
            ticker_obj['rr_low'] = rr_low

            risk_range = rr_high - rr_low
            rr_high_to_price_distance = rr_high - last
            rr_high_dist_pct_of_range = rr_high_to_price_distance / risk_range
            
            if rr_high_dist_pct_of_range >= 0.8:
                risk = 'low'
            elif rr_high_dist_pct_of_range < 0:
                risk = 'high'
            else: 
                risk = 'normal'

            ticker_obj['risk'] = risk

            ticker_obj['range'] = risk_range

            # add ticker row data to result object
            rr_all[ticker] = ticker_obj
    
    return rr_all


def get_data_from_yahoo(symbols):
    # get data in batches, as yahoo support max of 5 symbols at a time
    batches = [symbols[i:i+5] for i in range(0, len(symbols), 5)]
    batch_0 = batches[0]
    close_df = get_spark_data_from_yahoo(batch_0)
    if close_df is None:
        print('No Yahoo Data')
        return None
    close_df = close_df.tail(500)
    for i in range(1, len(batches)):
        batch_df = get_spark_data_from_yahoo(batches[i]).tail(500)
        if batch_df is None:
            print('No Yahoo Data')
            return None
        close_df = pd.concat([close_df, batch_df], axis=1)
    return close_df


def get_rra_data_from_mongo(dict_type):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        rra_data = db_chartlab[dict_type].find_one({})
        if rra_data is None:
            return {}
        rra_data.pop("_id")

        return rra_data
    except Exception as ex:
        print("Error in getting Risk Range Analysis Data from MongoDB")
        print(ex)
    finally:
        con_mongo.close()


def save_rra_data_to_mongo(rra_data, dict_type):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        db_chartlab[dict_type].update_one({}, {"$set": rra_data}, upsert=True)
    except  Exception as ex:
        print("Risk Range Analysis data failed at: ", rra_data['update_date'])
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()
