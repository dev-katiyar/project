from fileinput import close
import json
import math
from flask import Blueprint, jsonify, request
from historical_api import get_spark_data_from_yahoo
import talib
import time
import dataframe_utils
import pandas as pd
from itertools import combinations

api_absolute_analysis = Blueprint('api_absolute_analysis', __name__)


@api_absolute_analysis.route("/absolute-analysis", methods=['GET', 'POST'])
def get_absolute_anaysis():
    # Extract Post
    post_data = json.loads(request.data)

    symbol1 = post_data["symbol1"]

    symbols = [symbol1]
    close_df = get_spark_data_from_yahoo(symbols)
    if close_df is None:
        return jsonify({'msg': 'No Yahoo Data'})
    close_df = compute_absolute_scores(close_df, symbol1)

    close_df = close_df.tail(252)
    first_row = close_df.iloc[0]
    start_price1 = first_row[symbol1] if not pd.isna(first_row[symbol1]) else get_start_price(close_df, symbol1)
    close_df[symbol1] = round(100 * (close_df[symbol1] - start_price1) / start_price1, 2)

    return jsonify(dataframe_utils.getDictWithNulls(close_df))


def get_start_price(df, symbol):
    col = df[symbol]
    start_value = None
    for val in col.values:
        if not pd.isna(val):
            start_value = val
            break
    return start_value


@api_absolute_analysis.route("/absolute-analysis-sectors", methods=['GET', 'POST'])
def get_absolute_anaysis_all_sectors():
  # Extract Post
    post_data = json.loads(request.data)
    if len(post_data) > 0:
        symbols = ['SPY'] + post_data

        close_df = get_data_from_yahoo(symbols)
        # get absolute analysis for all symbols
        for symbol in symbols:
            close_df = compute_absolute_scores(close_df, symbol)

        close_df = close_df.tail(252)
        first_row = close_df.iloc[0]
        for symbol in symbols:
            start_price = first_row[symbol] if not pd.isna(first_row[symbol]) else get_start_price(close_df, symbol)
            close_df[symbol] = round(
                100 * (close_df[symbol] - start_price) / start_price, 2)

        return jsonify(dataframe_utils.getDictWithNulls(close_df))


@api_absolute_analysis.route("/absolute-analysis-holdings", methods=['GET', 'POST'])
def get_absolute_sector_holdings():
  # Extract Post
    post_data = json.loads(request.data)
    if len(post_data) > 0:
        symbols = post_data
        symbols = [sym.replace('.', '-') for sym in symbols]

        close_df = get_data_from_yahoo(symbols)
        res = {}
        # get absolute analysis for all symbol combinations
        for symbol1 in symbols:
            close_df = compute_absolute_scores(close_df, symbol1)

        close_df = close_df.tail(252)
        first_row = close_df.iloc[0]
        for symbol in symbols:
            start_price = first_row[symbol] if not pd.isna(first_row[symbol]) else get_start_price(close_df, symbol)
            close_df[symbol] = round(
                100 * (close_df[symbol] - start_price) / start_price, 2)

        return jsonify(dataframe_utils.getDictWithNulls(close_df))


def get_data_from_yahoo(symbols):
    # get data in batches, as yahoo support max of 5 symbols at a time
    batches = [symbols[i:i+5] for i in range(0, len(symbols), 5)]
    batch_0 = batches[0]
    close_df = get_spark_data_from_yahoo(batch_0).tail(500)
    if close_df is None:
        return jsonify({'msg': 'No Yahoo Data'})
    for i in range(1, len(batches)):
        batch_df = get_spark_data_from_yahoo(batches[i]).tail(500)
        if batch_df is None:
            return jsonify({'msg': 'No Yahoo Data'})
        close_df = pd.concat([close_df, batch_df], axis=1)
    return close_df


def compute_absolute_scores(close_df, symbol1):
    try:
        ratio_col = symbol1 + '_ratio'
        close_df[ratio_col] = close_df[symbol1]

        # SMA - 20 DAY
        close_df['20_day_sma'] = 1.0 * talib.SMA(close_df[ratio_col], 20)

        close_df["20_day_bull_alert"] = 0
        close_df.loc[(close_df[ratio_col]/close_df['20_day_sma'] - 1)
                     > 0.025, '20_day_bull_alert'] = 1
        close_df["20_day_bear_alert"] = 0
        close_df.loc[(close_df[ratio_col]/close_df['20_day_sma'] - 1)
                     < -0.025, '20_day_bear_alert'] = -1

        # SMA - 50 DAY
        close_df['50_day_sma'] = 1.0 * talib.SMA(close_df[ratio_col], 50)

        close_df["50_day_bull_alert"] = 0
        close_df.loc[(close_df[ratio_col]/close_df['50_day_sma'] - 1)
                     > 0.04, '50_day_bull_alert'] = 1
        close_df["50_day_bear_alert"] = 0
        close_df.loc[(close_df[ratio_col]/close_df['50_day_sma'] - 1)
                     < -0.04, '50_day_bear_alert'] = -1

        # SMA - 200 day
        close_df['200_day_sma'] = 1.0 * talib.SMA(close_df[ratio_col], 200)

        close_df["200_day_bull_alert"] = 0
        close_df.loc[(close_df[ratio_col]/close_df['200_day_sma'] - 1)
                     > 0.05, '200_day_bull_alert'] = 1
        close_df["200_day_bear_alert"] = 0
        close_df.loc[(close_df[ratio_col]/close_df['200_day_sma'] - 1)
                     < -0.05, '200_day_bear_alert'] = -1

        # 20/50 SMA Crossover Related
        close_df["20_50_cross"] = -1
        close_df.loc[close_df["20_day_sma"] >
                     close_df["50_day_sma"], "20_50_cross"] = 1
        close_df["20_50_5_day_change"] = 0.25
        close_df.loc[close_df['20_day_sma'] - close_df["50_day_sma"] < close_df['20_day_sma'].shift(
            4) - close_df["50_day_sma"].shift(4), '20_50_5_day_change'] = -0.25
        close_df["20_50_20_day_change"] = 0.25
        close_df.loc[close_df['20_day_sma'] - close_df["50_day_sma"] < close_df['20_day_sma'].shift(
            19) - close_df["50_day_sma"].shift(19), '20_50_20_day_change'] = -0.25

        # 50/200 SMA crossover Related
        close_df["50_200_cross"] = -1
        close_df.loc[close_df["50_day_sma"] >
                     close_df["200_day_sma"], "50_200_cross"] = 1
        close_df["50_200_5_day_change"] = 0.25
        close_df.loc[close_df['50_day_sma'] - close_df["200_day_sma"] < close_df['50_day_sma'].shift(
            4) - close_df["200_day_sma"].shift(4), '50_200_5_day_change'] = -0.25
        close_df["50_200_20_day_change"] = 0.25
        close_df.loc[close_df['50_day_sma'] - close_df["200_day_sma"] < close_df['50_day_sma'].shift(
            19) - close_df["200_day_sma"].shift(19), '50_200_20_day_change'] = -0.25

        # MACD related
        close_df["macd"], close_df["macd_trigger"], close_df["macd_diff"] = talib.MACD(
            close_df[ratio_col])

        close_df["macd_trigger_cross"] = -1
        close_df.loc[close_df["macd"] >
                     close_df["macd_trigger"], "macd_trigger_cross"] = 1
        close_df["macd_trigger_5_day_change"] = 0.25
        close_df.loc[close_df['macd'] - close_df["macd_trigger"] < close_df['macd'].shift(
            4) - close_df["macd_trigger"].shift(4), 'macd_trigger_5_day_change'] = -0.25
        close_df["macd_trigger_20_day_change"] = 0.25
        close_df.loc[close_df['macd'] - close_df["macd_trigger"] < close_df['macd'].shift(
            19) - close_df["macd_trigger"].shift(19), 'macd_trigger_20_day_change'] = -0.25

        # RSI related
        close_df["rsi"] = talib.RSI(close_df[ratio_col])

        close_df["rsi_score"] = (close_df["rsi"] - 50)/20
        close_df["rsi_3_day_change"] = 0.25
        close_df.loc[close_df['rsi'] -
                     close_df['rsi'].shift(2) < 0, 'rsi_3_day_change'] = -0.25
        close_df["rsi_10_day_change"] = 0.25
        close_df.loc[close_df['rsi'] -
                     close_df['rsi'].shift(9) < 0, 'rsi_10_day_change'] = -0.25

        # WILLIAM related
        close_df["willr"] = talib.WILLR(
            close_df[ratio_col], close_df[ratio_col], close_df[ratio_col], 36)

        close_df["willr_score"] = (close_df["willr"] + 50)/20
        close_df["willr_3_day_change"] = 0.25
        close_df.loc[close_df['willr'] -
                     close_df['willr'].shift(2) > 0, 'willr_3_day_change'] = -0.25
        close_df["willr_10_day_change"] = 0.25
        close_df.loc[close_df['willr'] -
                     close_df['willr'].shift(9) > 0, 'willr_10_day_change'] = -0.25

        score_col = symbol1 + '_score'
        close_df[score_col] = close_df['20_50_cross'] + close_df['20_50_5_day_change'] + close_df['20_50_20_day_change'] + \
            close_df['50_200_cross'] + close_df['50_200_5_day_change'] + close_df['50_200_20_day_change'] + \
            close_df['macd_trigger_cross'] + close_df['macd_trigger_5_day_change'] + close_df['macd_trigger_20_day_change'] + \
            close_df['rsi_score'] + close_df['rsi_3_day_change'] + close_df['rsi_10_day_change'] + \
            close_df['willr_score'] + close_df['willr_3_day_change'] + close_df['willr_10_day_change'] + \
            close_df['20_day_bull_alert'] + close_df['20_day_bear_alert'] + \
            close_df['50_day_bull_alert'] + close_df['50_day_bear_alert'] + \
            close_df['200_day_bull_alert'] + close_df['200_day_bear_alert']

        close_df.drop([
            '20_50_cross', '20_50_5_day_change', '20_50_20_day_change',
            '50_200_cross', '50_200_5_day_change', '50_200_20_day_change',
            '20_day_sma', '50_day_sma', '200_day_sma',
            'macd', 'macd_diff', 'macd_trigger', 'rsi', 'willr',
            'macd_trigger_cross', 'macd_trigger_5_day_change', 'macd_trigger_20_day_change',
            'rsi_score', 'rsi_3_day_change', 'rsi_10_day_change',
            'willr_score', 'willr_3_day_change', 'willr_10_day_change',
            '20_day_bull_alert', '20_day_bear_alert',
            '50_day_bull_alert', '50_day_bear_alert',
            '200_day_bull_alert', '200_day_bear_alert',
            ratio_col
        ], axis=1, inplace=True)
        close_df[score_col] = (close_df[score_col]/13.5).round(2)
        return close_df
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in procesing data {}".format(ex)})

