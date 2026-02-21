from datetime import datetime
from shutil import ExecError
import time
from flask import Blueprint, jsonify, request
import historical_api
import bisect
import dbutil
from dao import mongodb

api_tv = Blueprint('api_tv', __name__)

@api_tv.route("/tv/config", methods=['GET'])
def getTvChartConfig():
    data = {
        "supports_search": True, 
        "supports_group_request": False,
        "supports_marks": False,
        "supports_timescale_marks": False,
        "supports_time": True,
        "exchanges": [],
        "symbols_types": [], 
        "has_weekly_and_monthly": True,
        "weekly_multipliers": ["1"],
        "monthly_multipliers": ["1", "3"],
        "supported_resolutions": [
            # "1", 
            # "5", 
            # "15", 
            "1D",
            "1W", 
            "1M",
            "3M",
        ]
    }

    return jsonify(data)


@api_tv.route("/tv/time", methods=['GET'])
def getCurrentTime():
    data = round(time.time())
    return jsonify(data)


# SEARCH SYMBOLS FOR QUERY STRING
@api_tv.route("/tv/search", methods=['GET'])
def get_search_result():
    query = request.args.get('query', '').replace(" ", "").replace(".", "").replace("-", "")
    symbol_list = historical_api.get_yf_autocomplete_list(query=query)

    # PREPARE IN TV API FORMAT
    symbol_list_resp = []
    for item in symbol_list:
        symbol_list_resp.append({
            "symbol": item['symbol'],
            "full_name": item['name'],
            "description": item['name'],
            "exchange": item['exchDisp'],
            "ticker": item['symbol'],
            "type": item['typeDisp']
        })

    return jsonify(symbol_list_resp)


# GET SYMBOL INFO FOR GIVEN TICKER
@api_tv.route("/tv/symbols", methods=['GET'])
def getSymbols():
    # ARGS FROM URL
    symbol = request.args.get('symbol', '')
    if symbol == '':
        return jsonify('Type something to being serach')
    quote = historical_api.get_yf_symbol_quote(symbol)
    if quote:
        symbol_info = {
            "name": quote.get('symbol', symbol),
            "ticker": quote.get('symbol', symbol),
            "description": quote.get('longName', ''),
            "type": quote.get('typeDisp', ''),
            # "exchange-traded": quote.get('fullExchangeName', ),
            # "exchange-listed": quote.get('fullExchangeName', ),
            # "timezone": quote.get('exchangeTimezoneName', ),
            "minmov": 1,
            "minmov2": 0,
            "pointvalue": 1,
            # "session": "0930-1630",
            "supported_resolutions": [
                # "1",
                # "5",
                # "15",
                "1D",
                "1W",
                "1M",
                "3M",
            ],
            "pricescale": 100,  
           
        }
        return jsonify(symbol_info)
    else: 
        return jsonify({})

# HISTORIAL DATA - (WORKING FOR 1 DAY DATA)
@api_tv.route("/tv/history", methods=['GET'])
def getSearchSymbols():
    # GET INPUTS FROM TV FRONT END
    symbol = request.args.get('symbol', '')
    resolution = request.args.get('resolution', '')
    from_time = int(request.args.get('from', 0))
    to_time = int(request.args.get('to', 0))
    countback = int(request.args.get('countback', 0))
    if symbol == '':
        return jsonify({"s": "error", "errmsg": 'No Symbol'})

    try: 
        yf_interval = get_yf_res_from_tv_res(resolution)
        yf_range = get_yf_interval_from_tv_range(yf_interval, from_time, to_time, countback)
        
        # OHLC DATA FROM YAHOO FINANCE 
        ohlcv_dict = historical_api.get_yahoo_chart_data(symbol, yf_range, yf_interval)
        
        if(not ohlcv_dict):
            return jsonify({ "s": "no_data" })

        timestamp_list = ohlcv_dict.get('timestamp', [])
        if len(timestamp_list) == 0:
            return jsonify({ "s": "no_data" })
        
        # GET API Compatible 'FROM' and 'TO' TO RETURN THE BAR DATA
        to_index = bisect.bisect_right(timestamp_list, to_time)
        if countback and to_index >= countback:
            from_index = to_index - countback
        else:
            from_index = bisect.bisect_left(timestamp_list, from_time)


        # Handling nextTime, in case no data is found for the given range. 
        # if len(timestamp_list[from_index:to_index]) == 0:
        #     return { "s": "no_data", 'nextTime':timestamp_list[-1] }

        if to_index - from_index == 0:
            return jsonify({ "s": "no_data" })

        # PREPARE DATA IN TV API FORMAT
        ohlcv_dict = {
            "t": ohlcv_dict.get('timestamp', [])[from_index : to_index],
            "o": ohlcv_dict.get('open', [])[from_index : to_index],
            "h": ohlcv_dict.get('high', [])[from_index : to_index],
            "l": ohlcv_dict.get('low', [])[from_index : to_index],
            "c": ohlcv_dict.get('close', [])[from_index : to_index],
            "v": ohlcv_dict.get('volume', [])[from_index : to_index],
            "s": 'ok',
        }

        if len(ohlcv_dict.get('t', [])) == 0:
            return jsonify({ "s": "no_data" })
            
        return jsonify(ohlcv_dict)
    except Exception as ex:
        print(ex)
        return jsonify({ "s": "no_data" })


@api_tv.route("/tv/marks", methods=['GET'])
def getChartMarks():
    symbol = request.args.get('symbol', '')
    resolution = request.args.get('resolution', '')
    time_from = request.args.get('from', '')
    time_to = request.args.get('to', '')
    if symbol == '':
        return jsonify('Error')
    data = temp_marks_data
    
    # {
    #     "symbol": symbol,                   # temp
    #     "resolution": resolution,           # temp
    #     "time_from": time_from,             # temp
    #     "time_to": time_to,                 # temp
    # }
    return jsonify(data)


@api_tv.route("/tv/timescale_marks", methods=['GET'])
def getChartTimeScaleMarks():
    symbol = request.args.get('symbol', '')
    resolution = request.args.get('resolution', '')
    time_from = request.args.get('from', '')
    time_to = request.args.get('to', '')
    if symbol == '':
        return jsonify('Error')
    data = temp_timemarks_data
    
    # {
    #     "symbol": symbol,                   # temp
    #     "resolution": resolution,           # temp
    #     "time_from": time_from,             # temp
    #     "time_to": time_to,                 # temp
    # }
    return jsonify(data)

# SAVING CHART LAYOUT
@api_tv.route("/tv/1.1/charts", methods=['POST'])
def save_user_chart_layout():
    # URL ARGS Extraction
    clientId = request.args.get('client', 'simplevisor.com')
    userId = request.args.get('user', 'sv_unknown_user')
    chartId = request.args.get('chart', '')

    # POST DATA Extraction
    post_data = request.values
    name = post_data.get('name', 'noname')
    content = post_data.get("content", '')
    symbol = post_data.get("geography_id", 'AAPL')
    resolution = post_data.get("resolution", 'D')
    timestamp = int(datetime.now().timestamp())

    if chartId == '':       # create a new doc
        return save_chart(clientId, userId, content, name, resolution, symbol, timestamp)
    else:                   # update existing
        return rewrite_chart(clientId, userId, content, name, resolution, symbol, timestamp, int(chartId))


# GET LIST OF CHART LAYOUTS OF USER or CONTENT OF CAHRT
@api_tv.route("/tv/1.1/charts", methods=['GET'])
def get_user_chart_layout():
    # URL ARGS extraction
    clientId = request.args.get('client', 'simplevisor.com')
    userId = request.args.get('user', 'sv_unknown_user')
    chartId = request.args.get('chart', '')
    # GET
    try:
        if chartId == '':
            return get_user_layouts_list(clientId, userId)
        else:
            return get_chart_content(clientId, userId, chartId)
    except Exception as ex:
        return jsonify({"status": "error"})


# DELETE CHART LAYOUT
@api_tv.route("/tv/1.1/charts", methods=['DELETE'])
def delete_user_chart_layout():
    # URL ARGS extraction
    clientId = request.args.get('client', 'simplevisor.com')
    userId = request.args.get('user', 'sv_unknown_user')
    chartId = request.args.get('chart', '')
    # DELETE
    try:
        if chartId == '':
            return jsonify({"status": "error"})
        else:
            return delete_chart_layout(clientId, userId, int(chartId))
    except Exception as ex:
        return jsonify({"status": "error"})


# SAVING STUDY TEMPLATE
@api_tv.route("/tv/1.1/study_templates", methods=['POST'])
def save_user_study_templates():
    # URL ARGS Extraction
    clientId = request.args.get('client', 'simplevisor.com')
    userId = request.args.get('user', 'sv_unknown_user')

    # POST DATA Extraction
    post_data = request.values
    name = post_data.get('name', 'noname')
    content = post_data.get("content", '')
    # UPSEERT - update or insert
    return save_study_template(clientId, userId, content, name)    


# GET LIST OF STUDY TEMPLATES OF USER or CONTENT OF STUDY
@api_tv.route("/tv/1.1/study_templates", methods=['GET'])
def get_user_study_templates():
    # URL ARGS extraction
    clientId = request.args.get('client', 'simplevisor.com')
    userId = request.args.get('user', 'sv_unknown_user')
    template = request.args.get('template', '')

    # GET
    try:
        if template == '':
            return get_user_study_template_list(clientId, userId)
        else:
            return get_study_template_content(clientId, userId, template)
    except Exception as ex:
        return jsonify({"status": "error"})


# DELETE STUDY TEMPLATE
@api_tv.route("/tv/1.1/study_templates", methods=['DELETE'])
def delete_user_study_template():
    # URL ARGS extraction
    clientId = request.args.get('client', 'simplevisor.com')
    userId = request.args.get('user', 'sv_unknown_user')
    template = request.args.get('template', '')
    # DELETE
    try:
        if template == '':
            return jsonify({"status": "error"})
        else:
            return delete_study_template(clientId, userId, template)
    except Exception as ex:
        return jsonify({"status": "error"})

def save_chart(clientId, userId, content, name, resolution, symbol, timestamp):
    try:
        # GET NEXT INT ID - for saving the user layout. there could be better way 
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        dataCursor = db_chartlab['tv_chart_layouts'].find({}, {'id':1, '_id':0}).sort([("id", -1)]).limit(1)
        max_id = 1
        for item in dataCursor:
            max_id = item['id']

        # SAVE
        mongodb.save_one_row("tv_chart_layouts", {
            'clientId': clientId,
            'userId': userId,
            'id': max_id + 1,
            'content': content,
            'name': name,
            'resolution': resolution,
            'symbol': symbol,
            'timestamp': timestamp,
        })
        
        # PREPARE DATA IN TV API FORMAT
        chart_save_done = {
            "status": "ok",
            "id": max_id
        }
        return jsonify(chart_save_done)
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def rewrite_chart(clientId, userId, content, name, resolution, symbol, timestamp, chartId):
    try: 
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        db_chartlab['tv_chart_layouts'].update_one(
            {'id': chartId, 'clientId': clientId, 'userId': userId}, 
            {'$set': {
                'content': content,
                'timestamp': timestamp,
                'name': name,
                'symbol': symbol,
                'resolution': resolution,
            }})
        
        # PREPARE DATA IN TV API FORMAT
        chart_rewrite_done = {
            "status": "ok",
        }
        return jsonify(chart_rewrite_done)
    except  Exception as ex:
        print(ex)
    finally:
        con_mongo.close()
                        

def get_user_layouts_list(clientId, userId): 
    try:   
        user_layouts_list = mongodb.get_data_specific_cols("tv_chart_layouts", 
        {"clientId": clientId, "userId": userId},
        {"_id":0, "clientId": 0, "userId": 0, "content": 0})

        # PREPARE DATA IN TV API FORMAT
        user_layouts_list_data = {
            "data": user_layouts_list,
            "status": "ok"
        }

        return jsonify(user_layouts_list_data)
    except Exception as ex:
        return jsonify({"status": "error"})


def get_chart_content(clientId, userId, chartId):
    try:   
        chart_content = mongodb.get_data_specific_cols("tv_chart_layouts", 
        {"clientId": clientId, "userId": userId, "id": int(chartId)}, 
        {"_id":0, "clientId": 0, "userId": 0, "resolution": 0, "symbol": 0})

        if len(chart_content) > 0:
            # PREPARE DATA IN TV API FORMAT
            chart_content_data = {
                "data": chart_content[0],
                "status": "ok"
            }

            return jsonify(chart_content_data)
        else: 
            return jsonify({"status": "error"})
    except Exception as ex:
        return jsonify({"status": "error"})


def delete_chart_layout(clientId, userId, chartId):
    try:
        con_mongo = mongodb.getDbConnection()
        db = con_mongo.chartlab
        db['tv_chart_layouts'].delete_many({
            'clientId': clientId,
            'userId': userId,
            'id': chartId,
        })

        chart_delete_done = {
            "status": "ok",
        }
        return jsonify(chart_delete_done)
    except Exception as ex:
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()


def save_study_template(clientId, userId, content, name):
    try:
        con_mongo = mongodb.getDbConnection()
        db_chartlab = con_mongo.chartlab
        db_chartlab['tv_study_templates'].update_one(
            {'clientId': clientId, 'userId': userId, 'name': name}, 
            {'$set': {
                'clientId': clientId,
                'userId': userId,
                'content': content,
                'name': name,
            }},
            upsert=True)
        
        return jsonify( {"status": "ok",})
    except  Exception as ex:
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()


def get_user_study_template_list(clientId, userId):
    try:   
        user_study_template_list = mongodb.get_data_specific_cols("tv_study_templates", 
        {"clientId": clientId, "userId": userId},
        {"_id":0, "clientId": 0, "userId": 0, "content": 0})

        # PREPARE DATA IN TV API FORMAT
        user_study_template_list_data = {
            "data": user_study_template_list,
            "status": "ok"
        }

        return jsonify(user_study_template_list_data)
    except Exception as ex:
        return jsonify({"status": "error"})


def get_study_template_content(clientId, userId, template):
    try:   
        study_template_content = mongodb.get_data_specific_cols("tv_study_templates", 
        {"clientId": clientId, "userId": userId, "name": template}, 
        {"_id":0, "clientId": 0, "userId": 0})

        if len(study_template_content) > 0:
            # PREPARE DATA IN TV API FORMAT
            study_template_content_data = {
                "name": template,
                "data": study_template_content[0],
                "status": "ok"
            }

            return jsonify(study_template_content_data)
        else: 
            return jsonify({"status": "error"})
    except Exception as ex:
        return jsonify({"status": "error"})


def delete_study_template(clientId, userId, template):
    try:
        con_mongo = mongodb.getDbConnection()
        db = con_mongo.chartlab
        db['tv_study_templates'].delete_many({
            'clientId': clientId,
            'userId': userId,
            'name': template,
        })

        return jsonify({"status": "ok"})
    except Exception as ex:
        print(ex)
        return jsonify({"status": "error"})
    finally:
        con_mongo.close()


# GET RESOLUTION ARG
# global dict to avoid frequent creation and destruction
tv_yf_res_dict = {
    "1": "1m",
    "5": "5m",
    "15": "15m",
    "1D": "1d",
    "1W": "1wk",
    "1M": "1mo",
    "3M": "3mo",
}


def get_yf_res_from_tv_res(tv_resolution):
    global tv_yf_res_dict
    return tv_yf_res_dict.get(tv_resolution, "1d")


# GET RANGE ARG
tv_res_to_sec = {
    "1": 60,
    "5": 300,
    "15": 900,
    "1D": 86400,
    "1W": 604800,
    "1M": 2678400,
}


def get_yf_interval_from_tv_range(yf_interval, from_time, to_time, countback):
    to_date_obj = datetime.now()
    if countback:   # priority as per TV API doc - attempt to get adj from date
        countback_sec = int(tv_res_to_sec.get(yf_interval, 24 * 60 * 60) * countback * 1.6)     # add 1.5 time, to account for stock market holiday..check for day data
        from_time = to_time - countback_sec

    if from_time < 0:
        from_time = 0
        
    from_date_obj = datetime.fromtimestamp(from_time)
    day_diff = (to_date_obj - from_date_obj).days
    if day_diff <= 1:
        return "1d"
    if day_diff <= 5:
        return "5d"
    if day_diff <= 30:
        return "1mo"
    if day_diff <= 90:
        return "3mo"
    if day_diff <= 180:
        return "6mo"
    if day_diff <= 365:
        return "1y"
    if day_diff <= 5 * 365:
        return "5y"
    if day_diff <= 10 * 365:
        return "10y"
    else:
        return "max"


temp_timemarks_data = [
    {
        "id": "tsm1",
        "time": 1522108800,
        "color": "red",
        "label": "A",
        "tooltip": ""
    },
    {
        "id": "tsm2",
        "time": 1521763200,
        "color": "blue",
        "label": "D",
        "tooltip": [
            "Dividends: $0.56",
            "Date: Fri Mar 23 2018"
        ]
    },
    {
        "id": "tsm3",
        "time": 1521504000,
        "color": "green",
        "label": "D",
        "tooltip": [
            "Dividends: $3.46",
            "Date: Tue Mar 20 2018"
        ]
    },
    {
        "id": "tsm4",
        "time": 1520812800,
        "color": "#999999",
        "label": "E",
        "tooltip": [
            "Earnings: $3.44",
            "Estimate: $3.60"
        ]
    },
    {
        "id": "tsm7",
        "time": 1519516800,
        "color": "red",
        "label": "E",
        "tooltip": [
            "Earnings: $5.40",
            "Estimate: $5.00"
        ]
    }
]


temp_marks_data = {
    "id": [
        0,
        1,
        2,
        3,
        4,
        5
    ],
    "time": [
        1522108800,
        1521763200,
        1521504000,
        1521504000,
        1520812800,
        1519516800
    ],
    "color": [
        "red",
        "blue",
        "green",
        "red",
        "blue",
        "green"
    ],
    "text": [
        "Red",
        "Blue",
        "Green + Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        "Red again",
        "Blue",
        "Green"
    ],
    "label": [
        "A",
        "B",
        "CORE",
        "D",
        "EURO",
        "F"
    ],
    "labelFontColor": [
        "white",
        "white",
        "red",
        "#FFFFFF",
        "white",
        "#000"
    ],
    "minSize": [
        14,
        28,
        7,
        40,
        7,
        14
    ]
}
