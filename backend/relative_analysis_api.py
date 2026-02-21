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
from absolute_analysis_api import compute_absolute_scores
import dbutil
import datetimeutil

api_relative_analysis = Blueprint('api_realtive_analysis', __name__)

def format_date(d):
    print(type(d))
    return d.strftime("%Y-%m-%d")

# this can be moved to its API file, if more APIs needed in future. Self Sustaining (fills DB and uses it)
@api_relative_analysis.route("/relative-absolute-analysis-sectors", methods=['GET', 'POST'])
def get_relative__absoolute_analysis_all_sectors():
  # Extract Post
    post_data = json.loads(request.data)
    tickers = post_data["tickers"]
    tail_length = post_data["tail_len"]
    if len(tickers) > 0:
        number_of_weeks = math.ceil(tail_length/7)  # can come from front end 
        symbols = []
        result_dict = {}
        # check if relative score data in the DB already 
        today_date = datetimeutil.get_today_date()
        end_date = datetimeutil.get_business_day_str(today_date)
        list_week_dates = datetimeutil.get_business_day_pastweeks_str(today_date, number_of_weeks)
        start_date = list_week_dates[-1] 
        for symbol in tickers:
            scores = dbutil.get_relative_scores(symbol, 'SPY', start_date, end_date)
            if len(scores) == 0 or scores[0]["date"] != end_date:
                symbols.append(symbol)
            else: 
                # result_dict[symbol] = [score for score in scores if score['date'] in list_week_dates]
                result_dict[symbol] = scores

        if len(symbols) == 0:
            return jsonify(result_dict)
            
        # calculate the score, if not in the db
        symbols = ['SPY'] + symbols

        close_df = get_data_from_yahoo(symbols)
        # for saving scpore in db
        df_relative = pd.DataFrame(columns=['date','symbol','vs_symbol','relative_score', 'absolute_score'])
        # get relative absolute analysis for all symbols
        for symbol in symbols:
            if symbol in close_df.columns:
                if symbol != 'SPY':
                    close_df = compute_relative_scores(close_df, symbol, 'SPY')
                    close_df = compute_absolute_scores(close_df, symbol)
                    df_temp = pd.DataFrame({
                        "date": [x.strftime("%Y-%m-%d") for x in close_df.index],
                        "symbol": symbol,
                        "vs_symbol": 'SPY',
                        "relative_score": list(close_df[symbol+'_SPY_score']),
                        "absolute_score": list(close_df[symbol+'_score'])
                    })
                else: 
                    close_df = compute_absolute_scores(close_df, symbol)
                    df_temp = pd.DataFrame({
                        "date": [x.strftime("%Y-%m-%d") for x in close_df.index],
                        "symbol": symbol,
                        "vs_symbol": symbol,
                        "relative_score": 0,
                        "absolute_score": list(close_df[symbol+'_score'])
                    })
                df_relative = pd.concat([df_relative, df_temp.tail(100)])
                result_dict[symbol] = df_temp[df_temp["date"] >= start_date].sort_values(by=['date'], ascending=False).to_dict('records')
        print(df_relative)
        dbutil.save_dataframe(df_relative[['date', 'symbol', 'vs_symbol', 'relative_score', 'absolute_score']], 'relative_analysis_history_temp')
        dbutil.updatInsertRelativeScores()

        return jsonify(result_dict)


@api_relative_analysis.route("/relative-analysis", methods=['GET', 'POST'])
def get_relative_anaysis():
    # Extract Post
    post_data = json.loads(request.data)

    symbol1 = post_data["symbol1"]
    symbol2 = post_data["symbol2"]

    symbols = [symbol1, symbol2]
    close_df = get_spark_data_from_yahoo(symbols)
    if close_df is None:
        return jsonify({'msg': 'No Yahoo Data'})
    close_df = compute_relative_scores(close_df, symbol1, symbol2)

    close_df = close_df.tail(252)
    first_row = close_df.iloc[0]
    start_price1 = first_row[symbol1] if not pd.isna(first_row[symbol1]) else get_start_price(close_df, symbol1)
    close_df[symbol1] = round(
        100 * (close_df[symbol1] - start_price1) / start_price1, 2)
    start_price2 = first_row[symbol2] if not pd.isna(first_row[symbol2]) else get_start_price(close_df, symbol2)
    close_df[symbol2] = round(
        100 * (close_df[symbol2] - start_price2) / start_price2, 2)

    return jsonify(dataframe_utils.getDictWithNulls(close_df))


@api_relative_analysis.route("/relative-analysis-sectors", methods=['GET', 'POST'])
def get_relative_anaysis_all_sectors():
  # Extract Post
    post_data = json.loads(request.data)
    if len(post_data) > 0:
        symbols = ['SPY'] + post_data

        close_df = get_data_from_yahoo(symbols)
        # get relative analysis for all symbols
        for symbol in symbols:
            if symbol != 'SPY':
                close_df = compute_relative_scores(close_df, symbol, 'SPY')

        close_df = close_df.tail(252)
        first_row = close_df.iloc[0]
        for symbol in symbols:
            start_price = first_row[symbol] if not pd.isna(first_row[symbol]) else get_start_price(close_df, symbol)
            close_df[symbol] = round(
                100 * (close_df[symbol] - start_price) / start_price, 2)

        return jsonify(dataframe_utils.getDictWithNulls(close_df))


@api_relative_analysis.route("/relative-analysis-holdings", methods=['GET', 'POST'])
def get_relative_sector_holdings():
  # Extract Post
    post_data = json.loads(request.data)
    if len(post_data) > 0:
        symbols = post_data
        symbols = [sym.replace('.', '-') for sym in symbols]

        close_df = get_data_from_yahoo(symbols)
        res = {}
        # get relative analysis for all symbol combinations
        symbol_pairs = combinations(symbols, 2)
        for symbol1, symbol2 in symbol_pairs:
            close_df = compute_relative_scores(close_df, symbol1, symbol2)
            # print(close_df.tail(10))

        close_df = close_df.tail(252)
        first_row = close_df.iloc[0]
        for symbol in symbols:
            start_price = first_row[symbol] if not pd.isna(first_row[symbol]) else get_start_price(close_df, symbol)
            if start_price == None:
                continue
            close_df[symbol] = round(
                100 * (close_df[symbol] - start_price) / start_price, 2)

        return jsonify(dataframe_utils.getDictWithNulls(close_df))
    

def get_start_price(df, symbol):
    col = df[symbol]
    start_value = None
    for val in col.values:
        if not pd.isna(val):
            start_value = val
            break
    return start_value


def get_data_from_yahoo(symbols):
    # get data in batches, as yahoo support max of 5 symbols at a time
    batches = [symbols[i:i+5] for i in range(0, len(symbols), 5)]
    batch_0 = batches[0]
    close_df = get_spark_data_from_yahoo(batch_0)
    if close_df is None:
        return jsonify({'msg': 'No Yahoo Data'})
    close_df = close_df.tail(500)
    for i in range(1, len(batches)):
        batch_df = get_spark_data_from_yahoo(batches[i]).tail(500)
        if batch_df is None:
            return jsonify({'msg': 'No Yahoo Data'})
        close_df = pd.concat([close_df, batch_df], axis=1)
    return close_df


def compute_relative_scores(close_df, symbol1, symbol2):
    try:
        ratio_col = symbol1 + '_' + symbol2 + '_ratio'
        close_df[ratio_col] = close_df[symbol1]/close_df[symbol2]

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

        score_col = symbol1 + '_' + symbol2 + '_score'
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
        # close_df[ratio_col] = (close_df[ratio_col]).round(2)
        # close_df = close_df.rename(columns={score_col: symbol2}, errors="raise")
        # print(close_df.tail(10))
        return close_df
    except Exception as ex:
        return jsonify({"status": "failed", "message": "Problem in procesing data {}".format(ex)})


# other calc columns, might be needed later.
        # close_df[symbol1 + '_pct_chg'] = close_df[symbol1]/close_df[symbol1].shift(1) - 1
        # close_df[symbol2 + '_pct_chg'] = close_df[symbol2]/close_df[symbol2].shift(1) - 1

        # close_df['20_day_excess_pct'] = (close_df[symbol1]/close_df[symbol1].shift(19) - 1) - (close_df[symbol2]/close_df[symbol2].shift(19) - 1)
        # close_df['50_day_excess_pct'] = (close_df[symbol1]/close_df[symbol1].shift(49) - 1) - (close_df[symbol2]/close_df[symbol2].shift(49) - 1)
        # close_df['100_day_excess_pct'] = (close_df[symbol1]/close_df[symbol1].shift(99) - 1) - (close_df[symbol2]/close_df[symbol2].shift(99) - 1)
        # close_df['36_day_max'] = 1.0 * talib.MAX(close_df['ratio'], 36)
        # close_df['36_day_min'] = 1.0 * talib.MIN(close_df['ratio'], 36)
        # close_df['100_day_sma'] = 1.0 * talib.SMA(close_df['ratio'], 100)
        # close_df['total_score_200_day_avg'] = 1.0 * talib.SMA(close_df['total_score'], 201)
        # close_df['total_score_200_day_std_dev'] = 1.0 * talib.STDDEV(close_df['total_score'], 201)

        # close_df['sigma'] = (close_df['total_score'] - close_df['total_score_200_day_avg']) / close_df['total_score_200_day_std_dev']
        # sigma = close_df.iloc[-1]['sigma']
