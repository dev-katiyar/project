from flask import Blueprint, request, jsonify
import json
from dateutil import parser, relativedelta
import datetimeutil
import numpy as np
import historical_api
from util import strategy_util
import dataframe_utils
from dao import mongodb
import rapid_api

api_strategy = Blueprint('api_strategy', __name__)


# API to take care of RIA Pro Strategy
@api_strategy.route('/strategy/riapro', methods=['POST', 'GET'])
def process_riapro_strategy():
    try:
        riapro_strategy_inputs = json.loads(request.data)

        # COMMON INPUTS
        model_inputs = riapro_strategy_inputs["model_inputs"]
        symbol = model_inputs["symbol"]
        start_date = parser.parse(model_inputs["start_date"]).strftime("%Y-%m-%d")
        end_date = parser.parse(model_inputs["end_date"]).strftime("%Y-%m-%d")
        start_date = datetimeutil.getdatefromstr(start_date)
        end_date = datetimeutil.getdatefromstr(end_date)
        sample_frequency = model_inputs["sample_frequency"]
        df_downloaded = rapid_api.getSymbolHistoryFromYahoo(symbol, True)
        mongodb.import_df(df_downloaded, "symbolshistorical", symbol)

        # GET INPUT DF
        df = get_strategy_input_df(symbol, start_date, end_date, sample_frequency)

        # GET OUTPUT DF
        ria_pro_inputs = riapro_strategy_inputs["ria_pro_inputs"]  # ## Strategy specific indicator inputs
        test_period = df.loc[start_date: end_date, "close"].count()  # model_inputs["test_period"] - REMOVE?
        df['close'] = df['actualclose']   # close is adjusted close, we need actual close price
        result_df = strategy_util.get_riapro_strategy_output(df, ria_pro_inputs, test_period)

        return jsonify(dataframe_utils.getDict(result_df))  # dbutil.df_to_json(result_df)
    except Exception as ex:
        print("Problem in running the strategy: {}".format(ex))
        return jsonify({"status": "failed", "message": "No data for this ticker !"})


@api_strategy.route('/strategy/riapro-pair', methods=['POST', 'GET'])
def process_riapro_strategy_pair():
    try:
        riapro_strategy_inputs = json.loads(request.data)

        # COMMON INPUTS
        model_inputs = riapro_strategy_inputs["model_inputs"]
        symbol1 = model_inputs["symbol1"]
        symbol2 = model_inputs["symbol2"]
        start_date = parser.parse(model_inputs["start_date"]).strftime("%Y-%m-%d")
        end_date = parser.parse(model_inputs["end_date"]).strftime("%Y-%m-%d")
        start_date = datetimeutil.getdatefromstr(start_date)
        end_date = datetimeutil.getdatefromstr(end_date)
        sample_frequency = model_inputs["sample_frequency"]

        # GET YAHOO DATA and SAVE/UPDATE MONGO DB
        df_sym1 = rapid_api.getSymbolHistoryFromYahoo(symbol1, True)
        df_sym2 = rapid_api.getSymbolHistoryFromYahoo(symbol2, True)
        mongodb.import_df(df_sym1, "symbolshistorical", symbol1)
        mongodb.import_df(df_sym2, "symbolshistorical", symbol2)

        # GET INPUT DF
        df = get_strategy_input_pair_df(symbol1, symbol2, start_date, end_date, sample_frequency)

        # GET OUTPUT DF
        ria_pro_inputs = riapro_strategy_inputs["ria_pro_inputs"]  # ## Strategy specific indicator inputs
        test_period = df.loc[start_date: end_date, "close"].count()  # model_inputs["test_period"] - REMOVE?
        df['close'] = df['actualclose']   # close is adjusted close, we need actual close price
        result_df = strategy_util.get_riapro_strategy_output(df, ria_pro_inputs, test_period)

        return jsonify(dataframe_utils.getDict(result_df))  # dbutil.df_to_json(result_df)
    except Exception as ex:
        print("Problem in running the strategy: {}".format(ex))
        return jsonify({"status": "failed", "message": "No data for this ticker !"})


# API to take care of RIA Pro Strategy 2024 for SPY ONLY
@api_strategy.route('/strategy/riapro2024', methods=['POST', 'GET'])
def process_riapro_strategy_2024():
    try:
        riapro_strategy_inputs = json.loads(request.data)

        # COMMON INPUTS
        model_inputs = riapro_strategy_inputs["model_inputs"]
        symbol = model_inputs["symbol"]
        start_date = parser.parse(model_inputs["start_date"]).strftime("%Y-%m-%d")
        end_date = parser.parse(model_inputs["end_date"]).strftime("%Y-%m-%d")
        start_date = datetimeutil.getdatefromstr(start_date)
        end_date = datetimeutil.getdatefromstr(end_date)
        sample_frequency = model_inputs["sample_frequency"]
        df_downloaded = rapid_api.getSymbolHistoryFromYahoo(symbol, True)  # TODO make a fn for weekly data
        mongodb.import_df(df_downloaded, "symbolshistorical", symbol)  # TODO we might not have to save it for weekly

        # GET INPUT DF
        df = get_strategy_input_df(symbol, start_date, end_date, sample_frequency) # TODO might not need, if weekl

        # GET OUTPUT DF
        ria_pro_inputs = riapro_strategy_inputs["ria_pro_inputs"]  # ## Strategy specific indicator inputs
        test_period = df.loc[start_date: end_date, "close"].count()  # model_inputs["test_period"] - REMOVE?
        df['close'] = df['actualclose']   # close is adjusted close, we need actual close price
        result_df = strategy_util.get_riapro_strategy_output2024(df, ria_pro_inputs, test_period)

        return jsonify(dataframe_utils.getDict(result_df))  # dbutil.df_to_json(result_df)
    except Exception as ex:
        print("Problem in running the strategy: {}".format(ex))
        return jsonify({"status": "failed", "message": "No data for this ticker !"})


# GETS APPROPRIATE DF BASED ON MODEL INPUTS
def get_strategy_input_df(symbol, start_date, end_date, sample_frequency):
    if sample_frequency == "days":
        df_start_date = start_date + relativedelta.relativedelta(days=-110)  # Min-38 max-70 trade days input periods
        df = historical_api.getsymbol_data(symbol, df_start_date, end_date)
    elif sample_frequency == "weeks":
        df_start_date = start_date + relativedelta.relativedelta(days=-570)  # Min-38 max-70 trade weeks input periods
        df = historical_api.getsymbol_data(symbol, df_start_date, end_date)
        df = get_weekly_df_from_daily_df(df)

    return df


# GETS APPROPRIATE DF BASED ON MODEL INPUTS - PAIR
def get_strategy_input_pair_df(symbol1, symbol2, start_date, end_date, sample_frequency):
    df_sym1 = get_strategy_input_df(symbol1, start_date, end_date, sample_frequency)
    df_sym2 = get_strategy_input_df(symbol2, start_date, end_date, sample_frequency)
    relevant_cols = ['low', 'high', 'actualclose', 'volume']
    for col in relevant_cols:
        df_sym1[col] = df_sym1[col] / df_sym2[col]
    return df_sym1


# RESAMPLES DAILY DF FOR WEEKLY DF
def get_weekly_df_from_daily_df(df):
    df_weekly = df.resample('W-MON', label='left', closed='left').agg({
        'actualclose': lambda x: x.iloc[-1] if len(x) > 0 else None,
        'close': lambda x: x.iloc[0] if len(x) > 0 else None,
        'high': np.max,
        'low': np.min,
        'open': lambda x: x.iloc[0] if len(x) > 0 else None,
        'volume': sum,
        'symbol': lambda x: x.iloc[0] if len(x) > 0 else None})
    return df_weekly
