from flask import Blueprint, jsonify
import dataframe_utils
import dbutil
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


api_fred_data = Blueprint('api_fred_data', __name__)

@api_fred_data.route("/fred_api/oas_data/historical/<symbol>/<period>", methods=['GET'])
def get_oas_historical_data_symbol(symbol, period='20year'):
    ## get list of symbols
    sym_name_map = get_symbol_map_dict()
    sym = sym_name_map[symbol]
    
    df = dbutil.get_symbol_historical_oas_data([symbol], period, sym_name_map)

    if df is None:
        return jsonify({'error': 'Issue in getting the data from mongo'})
    
    data = []
    for index, row in df.iterrows():
        spread = row[sym]
        date = row['date']
        data.append({
            "symbol": sym,
            "date": date,
            "spread": spread
        })

    period_mean = df[sym].mean()
    period_max = df[sym].max()
    period_min = df[sym].min()

    res = {
        "data": data,
        "stats": {
            "min": period_min,
            "mean": period_mean,
            "max": period_max,
        }
    }

    return jsonify(res)


@api_fred_data.route("/fred_api/oas_data/intra_credit_yield_spreads", methods=['GET'])
def get_oas_intra_credit_yield_spread():
    res = {}
    
    ## get list of symbols
    sym_name_map = get_symbol_map_dict()

    symbols_db = list(sym_name_map.keys())

    # send to front end for use if needed
    res['sym_name_map'] = sym_name_map

    ## get 20 year raw data from mongo
    df = dbutil.get_symbol_historical_oas_data(symbols_db, '20year', sym_name_map)

    if df is None:
        return jsonify({'error': 'Issue in getting the data from mongo'})
    
    symbols = list(sym_name_map.values())
    symbol_first = symbols[0]

    
    ## calculate intra credit spread - last
    row_first = df.iloc[0].to_dict()
    ics_last = prepare_intra_credit_spread_last(row_first, symbols)
    intra_credit_spread_last = {
        'date': row_first['date'],
        'data': dict_to_array(ics_last)
    }

    # firt row for AAA
    intra_credit_spread_last['data'] = [{'symbol': symbol_first}] + intra_credit_spread_last['data']

    res['intra_credit_spread_last'] = intra_credit_spread_last

    ## calculate intra credit spread - change from last 4 weeks
    # get date for 4 week back
    date_first_str = row_first['date']
    date_first = datetime.strptime(date_first_str, "%Y-%m-%d")
    date_4wk_back = date_first - timedelta(weeks=4)
    date_4wk_back_str = date_4wk_back.strftime("%Y-%m-%d")

    # calulate ics - 4 weeks back
    row_4wk = df[df['date'] <= date_4wk_back_str].iloc[0]
    ics_4wk = prepare_intra_credit_spread_last(row_4wk, symbols)
    
    # calculate change - since last 4 weeks
    ics_change_4wk = calculate_ics_diff(ics_last, ics_4wk)
    intra_credit_spread_change_4wk = {
        'date': row_first['date'],
        'data': dict_to_array(ics_change_4wk)
    }

    # first row for AAA
    intra_credit_spread_change_4wk['data'] = [{'symbol': symbol_first}] + intra_credit_spread_change_4wk['data']
    
    res['intra_credit_spread_change_4wk'] = intra_credit_spread_change_4wk

    ## Spread Pecentile over time periods
    hist_dates = get_hist_dates(date_first)
    symb_dt_min_max_dict = get_min_max_dt_range(df, symbols, hist_dates)
    sym_oas_percentiles = {'date': row_first['date']}
    sym_oas_percentiles['data'] = prepare_oas_percentile(symbols, row_first, hist_dates, symb_dt_min_max_dict)
    
    res['sym_oas_percentiles'] = sym_oas_percentiles

    res['symbols'] = symbols
    res['periods'] = hist_dates

    return jsonify(res)


def get_symbol_map_dict():
    sqlMap = "SELECT symbol, name FROM symbol_lists WHERE category = 'oas';"
    return dbutil.get_two_col_dict(sqlMap, 'symbol', 'name')


def prepare_intra_credit_spread_last(symbol_values, symbols):
    grid = {}
    for i in range(1, len(symbols)):
        key_i = symbols[i]
        grid[key_i] = {}
        for j in range(i):
            key_j = symbols[j]
            grid[key_i][key_j] = symbol_values[key_i] - symbol_values[key_j]

    return grid


def calculate_ics_diff(dict1, dict2):
    diff = {}
    for k1 in dict1:
        if k1 in dict2:
            diff[k1] = {}
            for k2 in dict1[k1]:
                if k2 in dict2[k1]:
                    diff[k1][k2] = dict1[k1][k2] - dict2[k1][k2]
    return diff


def get_hist_dates(start_date):
    return [
        {'key': '3 Month', 'date': (start_date - relativedelta(months=3)).strftime("%Y-%m-%d")},
        {'key': '1 Year', 'date': (start_date - relativedelta(years=1)).strftime("%Y-%m-%d")},
        {'key': '5 Year', 'date': (start_date - relativedelta(years=5)).strftime("%Y-%m-%d")},
        {'key': '20 Year', 'date': (start_date - relativedelta(years=20)).strftime("%Y-%m-%d")},
    ]


def get_min_max_dt_range(df, symbols, hist_dates):
    symb_dt_min_max_dict = {}
    for symbol in symbols:
        symb_col = df[symbol]
        dt_min_max = {}
        for hist_date in hist_dates:
            min_max = {
                "min": symb_col[symb_col.index >= hist_date['date']].min(),
                "max": symb_col[symb_col.index >= hist_date['date']].max()
            }
            dt_min_max[hist_date['key']] = min_max
        symb_dt_min_max_dict[symbol] = dt_min_max
    return symb_dt_min_max_dict


def prepare_oas_percentile(symbols, row_first, hist_dates, symb_dt_min_max_dict):
    res = []
    for symbol in symbols:
        sym_percentiles = {'symbol': symbol}
        dt_min_max = symb_dt_min_max_dict[symbol]
        sym_val = row_first[symbol]
        sym_percentiles['current_oas'] = sym_val
        for hist_date in hist_dates:
            min_max = dt_min_max[hist_date['key']]
            sym_min = min_max['min']
            sym_max = min_max['max']
            range = (sym_max - sym_min)
            if range == 0:
                sym_percentiles[hist_date['key']] = None
                continue
            sym_percentiles[hist_date['key']] = (sym_val - sym_min)/range
        res.append(sym_percentiles)
    return res

def dict_to_array(in_dict):
    result = []
    for outer_key, inner_dict in in_dict.items():
        inner_dict['symbol'] = outer_key
        result.append(inner_dict)
    return result
