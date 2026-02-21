from flask import Blueprint, jsonify, request
import json
from historical_api import get_spark_data_from_yahoo
import pandas as pd
import datetime
from dao import mongodb
import math

api_factor_analysis = Blueprint('api_factor_analysis', __name__)


@api_factor_analysis.route("/factor-analysis/pair-zscores-chart", methods=['GET', 'POST'])
def get_factor_analysis_pair_zscore_chart():
    # get input params
    post_data = json.loads(request.data)
    dict_type = post_data['dictType']
    tickers = post_data['tickers']
    zScoreInputs = post_data['zScoreInputs']
    ref_period = zScoreInputs['refPeriod'] # may be fixed
    zscore_periods = zScoreInputs['scorePeriods']

    result_dict = {}
    if len(tickers) > 0 and len(tickers) == 2:
        # get price data from yahoo/mongodb
        calc_symbols = [] 
        calc_symbols = ['SPY'] + tickers
        fa_data = get_data_for_factor_analysis(calc_symbols, dict_type, False)  # this API does not get new data
        price_data = fa_data["price_data"]
        close_df = pd.DataFrame(price_data)
        close_df["date"] = pd.to_datetime(close_df["date"])
        close_df.set_index("date", inplace=True)
        close_df = close_df.loc[:, calc_symbols]
        # close_df = get_data_from_yahoo(calc_symbols)

        if close_df is not None:
            # excess return over past periods calc
            # filter_date = datetime.datetime(2023, 2, 27)            # temp
            # close_df = close_df.loc[close_df.index <= filter_date]  # temp
            close_df = close_df.sort_values(by=['date'], ascending=False)

            # z-score and percentile calc
            [sym1, sym2] = tickers
            excess_ret_df = get_daily_excess_return(close_df, 1) # 1 is for daily return
            result_dict['correlation'] = excess_ret_df[sym1].corr(excess_ret_df[sym2])
            result_dict['scores'] = get_zscore_percentile_pair(excess_ret_df, sym1, sym2, zscore_periods, ref_period)

    return jsonify(result_dict)

@api_factor_analysis.route("/factor-analysis/excess-returns", methods=['GET', 'POST'])
def get_factor_analysis_excess_returns():
    # get input params
    post_data = json.loads(request.data)
    dict_type = post_data['dictType']
    tickers = post_data['tickers']
    lookBackPeriods = post_data['lookBackPeriods']
    corrPeriods = post_data['corrPeriods']
    zScoreInputs = post_data['zScoreInputs']
    refresh_data = post_data["reloadLiveData"]  # gets fresh price data, if set to True

    result_dict = {}
    if len(tickers) > 0:
        calc_symbols = []   # not already saved in DB

        # TODO: weekly/daily data switch

        # get price data from yahoo/mongodb
        calc_symbols = ['SPY'] + tickers
        fa_data = get_data_for_factor_analysis(calc_symbols, dict_type, refresh_data)
        price_data = fa_data["price_data"]
        close_df = pd.DataFrame(price_data)
        close_df["date"] = pd.to_datetime(close_df["date"])
        close_df.set_index("date", inplace=True)

        # close_df = get_data_from_yahoo(calc_symbols)

        if close_df is not None:
            # prepare data
            # filter_date = datetime.datetime(2023, 2, 27)            # temp
            # close_df = close_df.loc[close_df.index <= filter_date]  # temp
            close_df = close_df.sort_values(by=['date'], ascending=False)
            # close_df = close_df.head(260)

            # excess return over past periods calc
            excess_period_returns = get_period_excess_returns(close_df, lookBackPeriods)
            result_dict['excess_period_returns'] = excess_period_returns

            # excess return correlation calc
            excess_ret_df = get_daily_excess_return(close_df, 1) # 1 is for daily return
            corrDict = {}
            for corrPeriod in corrPeriods:
                corrDict[str(corrPeriod)] = get_corr_matrix_days(excess_ret_df, corrPeriod).to_dict()
            result_dict['corr_matrices'] = corrDict

            # z-score and percentile calc
            zscore_res_dict = {}
            if fa_data["fa_data"] == None:
                ref_period = zScoreInputs['refPeriod'] # may be fixed
                zscore_periods = zScoreInputs['scorePeriods']  
                corr_dict_ref = get_corr_matrix_days(excess_ret_df, ref_period).to_dict()
                for row_sym, row_corr in corr_dict_ref.items():
                    zscore_res_dict[row_sym] = {}
                    for col_sym, row_col_corr in row_corr.items():
                        zscore_res_dict[row_sym][col_sym] = {'corr': row_col_corr}
                        if row_sym != col_sym:
                            scores = get_zscore_percentile_pair(excess_ret_df, row_sym, col_sym, zscore_periods, ref_period)
                            zscore_res_dict[row_sym][col_sym].update(scores[0])
                if dict_type in ['factor_analysis', 'factor_analysis_sector']:
                    save_zscore_data_in_mongo(zscore_res_dict, dict_type)
            else:
                zscore_res_dict = fa_data["fa_data"]
            result_dict['scores_rank'] = zscore_res_dict
            # result_dict['time_saved'] = str(datetime.datetime.now())

            # caching the results in db
            # mongodb.save_data('factor_analysis_scores', result_dict)
            # print("Factor Analysis Data Saved at ", str(datetime.datetime.now()))
            result_dict["update_date"] = fa_data["update_date"]
    return jsonify(result_dict)


def get_zscore_percentile_pair(df_ex_ret, sym1, sym2, look_back_days, ref_period):
    # res_dict = {}
    df_score = pd.DataFrame()
    df_score['ex_ret'] = df_ex_ret[sym1] - df_ex_ret[sym2]
    df_score['date'] = df_score.index.strftime('%Y-%m-%d')
    
    for period in look_back_days:
        key_period_ret = str(period) + '_ret'
        df_score[key_period_ret] = df_score['ex_ret'].rolling(period).sum().shift(-period+1)
        mean = df_score[key_period_ret][:ref_period].mean()
        std_dev = df_score[key_period_ret][:ref_period].std()
        # res_dict['mean_'+str(ref_period)] = mean
        # res_dict['std_'+str(ref_period)] = std_dev
        key_period_zscore = str(period) + '_zscore'
        df_score[key_period_zscore] = (df_score[key_period_ret] - mean)/std_dev
        key_period_rank = str(period) + '_rank'
        df_score[key_period_rank] = df_score[key_period_zscore].rank(pct=True) * 100
        df_score = df_score.drop(key_period_ret, axis=1)
    df_score = df_score.drop(['ex_ret'], axis=1)
    df_score = df_score.head(253).fillna(0)
    scores = df_score.to_dict(orient="records")
    # res_dict["sco res"] = scores
    # res_dict.update(scores[0])
    return  scores


def get_corr_matrix_days(df, days):
    return df[:days].corr()


def get_daily_excess_return(df, period):
    spy_col = 'SPY'
    df_ex_ret = pd.DataFrame()
    # SPY returns 
    df_ex_ret[spy_col] = df[spy_col]/df[spy_col].shift(-period) - 1
    # remaining symbols
    for col_name in df.columns:
        if col_name != spy_col:
            ticker_col = col_name
            df_ex_ret[ticker_col] = (df[col_name]/df[col_name].shift(-period) - 1) - df_ex_ret[spy_col]
    df_ex_ret = df_ex_ret.drop(spy_col, axis=1)
    return df_ex_ret


def get_period_excess_returns(df, periods):
    resultArr = []
    for col_name in df.columns:
        if col_name != 'SPY':
            row = {'symbol': col_name }
            end_index = 0
            for period in periods:
                start_index = end_index + period
                end_date = df.index[end_index].strftime('%Y-%m-%d')
                start_date = df.index[start_index].strftime('%Y-%m-%d')
                dict_key = start_date + '_' + end_date + '_' + str(period)
                spy_ret = (df['SPY'].iloc[end_index]/df['SPY'].iloc[start_index]) - 1
                symbol_ret = (df[col_name].iloc[end_index]/df[col_name].iloc[start_index]) - 1
                row[dict_key] = None if math.isnan(symbol_ret - spy_ret) else symbol_ret - spy_ret
                end_index = start_index
            resultArr.append(row)
            
    return resultArr


def get_data_for_factor_analysis(symbols, dict_type, refresh = False ):
    try:
        if refresh:
            yahoo_data = get_data_from_yahoo(symbols)
            yahoo_data['date'] = yahoo_data.index.strftime('%Y-%m-%d')
            if yahoo_data is not None:
                price_data = yahoo_data.to_dict(orient="records")
                current_datetime = datetime.datetime.now()
                current_datetime_string = current_datetime.strftime("%Y-%m-%d %H:%M:%S")
                fa_data = {
                    'update_date': current_datetime_string,
                    'price_data': price_data,
                    'fa_data': None
                }
                if dict_type not in ['factor_analysis', 'factor_analysis_sector']:
                   return fa_data; 
                save_fa_data_to_mongo(fa_data, dict_type)
        saved_fa_data = get_fa_data_from_mongo(dict_type)
        if saved_fa_data is None:
            get_data_for_factor_analysis(symbols, dict_type, True)
        return saved_fa_data
    except Exception as ex:
        print("Not able to get data for the given symbols: ", symbols)
        print(ex)


def save_fa_data_to_mongo(fa_data, dict_type):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        db_chartlab[dict_type].update_one({}, {"$set": fa_data}, upsert=True)
    except  Exception as ex:
        print("Factor Analysis data failed at: ", fa_data['update_date'])
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()


def get_fa_data_from_mongo(dict_type):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        fa_data = db_chartlab[dict_type].find_one({})
        if fa_data is None:
            return None
        fa_data.pop("_id")

        return fa_data
    except Exception as ex:
        print("Error in getting factor Analysis Data from MongoDB")
        print(ex)
    finally:
        con_mongo.close()


def save_zscore_data_in_mongo(zscores, dict_type):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        db_chartlab[dict_type].update_one({}, {"$set": {"fa_data": zscores}}, upsert=True)
    except  Exception as ex:
        print("Factor Analysis zscore data update failed for: ", zscores)
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()


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
