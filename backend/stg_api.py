from flask import Blueprint, request, jsonify
import stg_runner
import dataframe_utils
from strategy.indicators import indicator_directory
from dateutil import parser, relativedelta
import datetimeutil
import json
import login
from dao import mongodb
import constants
import warnings

warnings.filterwarnings('ignore')
# import login


api_stg = Blueprint('api_stg', __name__)


#  returns list of indicators and other UI elements
@api_stg.route('/stg/indicators_test', methods=['GET'])
def get_indicators():
    f = open('backend/strategy_samples/indicators.json')
    ui = json.load(f)
    return jsonify(ui)


#  returns list of indicators
@api_stg.route('/stg/indicators', methods=['GET'])
def get_strategy_ui():
    return jsonify(indicator_directory.indicators)


@api_stg.route('/stg/runstrategy', methods=['POST', 'GET'])
def runStrategy():
    strategy_inputs = json.loads(request.data)
    # strategy_inputs = vinod_inputs
    start_date = parser.parse(strategy_inputs["start_date"]).strftime("%Y-%m-%d")
    end_date = parser.parse(strategy_inputs["end_date"]).strftime("%Y-%m-%d")
    strategy_inputs['start_date'] = datetimeutil.getdatefromstr(start_date)
    strategy_inputs['end_date'] = datetimeutil.getdatefromstr(end_date)
    print(strategy_inputs)
    strategy_output = stg_runner.run_strategy(strategy_inputs)
    return jsonify(dataframe_utils.getDict(strategy_output))


@api_stg.route('/stg/preset', methods=['POST'])
def saveUserStrategy():
    myUserId = login.getUserId(request)
    post_data = json.loads(request.data)
    name = post_data["name"].strip()
    id = "{}-{}".format(myUserId, name)
    post_data["id"] = id
    post_data["userId"] = myUserId
    mongodb.save_one_row("strategy", post_data)
    return jsonify({"status": "ok", "success": "1", "reason": "Strategy Saved Successfully!", "id": id})


@api_stg.route('/stg/model/preset', methods=['GET'])
def getModelStrategies():
    userId = constants.MODEL_USER_ID
    strategies = mongodb.get_data("strategy", {"userId": userId})
    return jsonify(strategies)


@api_stg.route('/stg/preset', methods=['GET'])
def getSavedStrategies():
    userId = login.getUserId(request)
    strategies = mongodb.get_data("strategy", {"userId": userId})
    return jsonify(strategies)


@api_stg.route('/stg/preset/<id>', methods=['GET'])
def getSavedStrategiesById(id):
    strategies = mongodb.get_data("strategy", {"id": id})
    return jsonify(strategies[0])


@api_stg.route("/stg/preset", methods=['DELETE'])
def deletePreset():
    id = request.args.get('id')
    mongodb.delete("strategy", id)
    return jsonify({"status": "ok", "success": "1", "reason": "Strategy Deleted Successfully!", "id": id})


# NOTES - all of below can be deleteds
"""
- SMA can be of any column, so settings can have one key 'col' which can tell, SMA of what.
- SMA is setting numbers as string, in place of number, check. 
- Pattern of each 'selected_option' should be same
    -- all should have 'settings', even empty [] is fine.
- naming for strategy - co to ca > gt < lt etc. and other minor key changes
- In future, 'selected_strategy' will have its onw setting, mostly empty, but also like how many ticks. Can have type as well, as below
- to do: 'strategy_type' inside 'selected_strategy' To help take a call, on how to handle it 
    -- single: one indicator adds all rquired columns, then signal generated. MACD & MACD Signal, STOCH and STOCH Signal, BRESSERT and Bressert Signal....
    -- double: two indicators add their columns, then signal generated. SMA & SMA, SMA & Close, SMA & EMA....
    -- pattern: special pattern class or pattern inicator adds cols, then signal generated. Higher Highs, Candles, Increasing, Decreasing...
    -- strategy: mutiple indicators are combined using AND (maybe with OR in future). signal generated and then combined.
- to do: AND OR. Nested AND OR
"""

vinod_inputs = {
    "symbol": "SPY",
    "start_date": "2021-02-25T02:06:33.333Z",
    "end_date": "2022-02-25T02:06:33.298Z",
    "buy_operator": "",
    "sell_operator": "",
    "buy_conditions": {
        "selected_condition": "and",
        "strategy_list": [
            {
                "key": "macd",
                "name": "MACD",
                "settings": [
                    {
                        "key": "fastperiod",
                        "value": 12
                    },
                    {
                        "key": "slowperiod",
                        "value": 26
                    },
                    {
                        "key": "signalperiod",
                        "value": 12
                    }
                ],
                "selected_strategy": {
                    "key": "bd",
                    "type": "strategy",
                    "settings": [
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            },
            {
                "key": "macd",
                "name": "MACD",
                "settings": [
                    {
                        "key": "fastperiod",
                        "value": 12
                    },
                    {
                        "key": "slowperiod",
                        "value": 26
                    },
                    {
                        "key": "signalperiod",
                        "value": 12
                    }
                ],
                "selected_strategy": {
                    "key": "higherhighs",
                    "type": "pattern",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            },
            {
                "key": "macd",
                "name": "Macd",
                "settings": [
                    {
                        "key": "fastperiod",
                        "value": 12
                    },
                    {
                        "key": "slowperiod",
                        "value": 26
                    },
                    {
                        "key": "signalperiod",
                        "value": 12
                    }
                ],
                "selected_strategy": {
                    "key": "ca",
                    "type": "single",
                    "settings": [],
                    "selected_option": {
                        "key": "signal",
                        "name": "Signal"
                    }
                }
            },
            {
                "key": "sma",
                "name": "SMA",
                "settings": [
                    {
                        "key": "timeperiod",
                        "value": 20
                    },
                    {
                        "key": "col",
                        "value": 'close'
                    }
                ],
                "selected_strategy": {
                    "key": "cb",
                    "type": "double",
                    "settings": [],
                    "selected_option": {
                        "key": "sma",
                        "name": "SMA",
                        "settings": [
                            {
                                "key": "timeperiod",
                                "value": 55
                            },
                            {
                                "key": "col",
                                "value": 'close'
                            }
                        ]
                    }
                }
            }
        ]
    },
    "sell_conditions": {
        "selected_condition": "and",
        "strategy_list": [
            # {
            #     "key": "close",
            #     "name": "Price",
            #     "settings": [
            #     ],
            #    "selected_strategy": {
            #         "key": "higherlows",
            #         "type": "pattern",
            #         "settings": [
            #             {
            #                 "key": "order",
            #                 "value": 5
            #             },
            #             {
            #                 "key": "pastticks",
            #                 "value": 5
            #             }
            #         ]
            #     }
            # },
            {
                "key": "macd",
                "name": "Macd",
                "settings": [
                    {
                        "key": "fastperiod",
                        "value": 12
                    },
                    {
                        "key": "slowperiod",
                        "value": 26
                    },
                    {
                        "key": "signalperiod",
                        "value": 12
                    }
                ],
                "selected_strategy": {
                    "key": "cb",
                    "type": "single",
                    "settings": [],
                    "selected_option": {
                        "key": "signal",
                        "name": "Signal"
                    }
                }
            },
            {
                "key": "sma",
                "name": "SMA",
                "settings": [
                    {
                        "key": "timeperiod",
                        "value": 20
                    },
                    {
                        "key": "col",
                        "value": 'close'
                    }
                ],
                "selected_strategy": {
                    "key": "ca",
                    "type": "double",
                    "settings": [],
                    "selected_option": {
                        "key": "sma",
                        "name": "SMA",
                        "settings": [
                            {
                                "key": "timeperiod",
                                "value": 55
                            },
                            {
                                "key": "col",
                                "value": 'close'
                            }
                        ]
                    }
                }
            }
        ]
    }
}
