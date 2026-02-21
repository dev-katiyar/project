from __future__ import print_function
from flask import request, make_response, jsonify
from flask import Blueprint

api_algotrading = Blueprint('algotrading', __name__)


@api_algotrading.route("/algotrading/strategies/entry", methods=['POST', 'GET'])
def getBuyStrategies():
    try:

        strategies = [
            {
                "id": 1,
                "name": "RSI",
                "display": [
                    {
                        "name": "Period",
                        "value": "14",
                        "type": "text"
                    },
                    {
                        "name": "Overbought",
                        "value": "80",
                        "type": "text"
                    },
                    {
                        "name": "Oversold",
                        "value": "20",
                        "type": "text"
                    }
                ],
                "display_seq": ["Period"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Oversold"
                    },
                    {
                        "id": 2,
                        "name": "Overbought"
                    }
                ],
                "buy_condition_id": 1,
            },
            {
                "id": 2,
                "name": "Macd",
                "display": [
                    {
                        "name": "Long Period",
                        "value": "26",
                        "type": "text"
                    },
                    {
                        "name": "Short Period",
                        "value": "12",
                        "type": "text"
                    },
                    {
                        "name": "Signal Period",
                        "value": "9",
                        "type": "text"
                    }
                ],
                "display_seq": ["Long Period", "Short Period", "Signal Period"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Bullish CrossOver"
                    },
                    {
                        "id": 1,
                        "name": "Bullish Divergence"
                    }
                ],
                "buy_condition_id": 1
            },
            {
                "id": 3,
                "name": "Moving Avg",
                "display": [
                    {
                        "name": "Long Period",
                        "value": "200",
                        "type": "text"
                    },
                    {
                        "name": "Short Period",
                        "value": "50",
                        "type": "text"
                    },
                    {
                        "name": "Type",
                        "value": "1",
                        "type": "dropdown",
                        "values": [
                            {
                                "id": 1,
                                "name": "Simple"
                            },
                            {
                                "id": 2,
                                "name": "Exponential"
                            }
                        ]
                    }
                ],
                "display_seq": ["Long Period","Short Period", "Type"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Long period Moving Avg crosses above Short Period",
                        "details":"$1 days moving average crosses above $2 moving average"
                    },
                    {
                        "id": 2,
                        "name": "Long period crosses above Price",
                        "details":"$1 days moving average crosses above price"
                    },{
                        "id": 3,
                        "name": "Short period Moving Avg crosses above Long Period",
                        "details":"$2 days moving average crosses above $1 moving average"
                    }
                ],
                "buy_condition_id": 1
            }
        ]
        return jsonify(strategies)

    except Exception as e:
        print(e)


@api_algotrading.route("/algotrading/strategies/exit", methods=['POST', 'GET'])
def getSellStrategies():
    try:

        strategies = [
            {
                "id": 4,
                "name": "Stop Position",
                "display": [
                    {
                        "name": "Drops Below",
                        "value": "10",
                        "type": "text"
                    }
                ],
                "display_seq": ["Drops Below"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Drops Below specified percentage"
                    }
                ],
                "buy_condition_id": 1,
            },
            {
                "id": 1,
                "name": "RSI",
                "display": [
                    {
                        "name": "Period",
                        "value": "14",
                        "type": "text"
                    },
                    {
                        "name": "Overbought",
                        "value": "80",
                        "type": "text"
                    },
                    {
                        "name": "Oversold",
                        "value": "20",
                        "type": "text"
                    }
                ],
                "display_seq": ["Period"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Oversold"
                    },
                    {
                        "id": 2,
                        "name": "Overbought"
                    }
                ],
                "buy_condition_id": 1,
            },
            {
                "id": 2,
                "name": "Macd",
                "display": [
                    {
                        "name": "Long Period",
                        "value": "26",
                        "type": "text"
                    },
                    {
                        "name": "Short Period",
                        "value": "12",
                        "type": "text"
                    },
                    {
                        "name": "Signal Period",
                        "value": "9",
                        "type": "text"
                    }
                ],
                "display_seq": ["Long Period", "Short Period", "Signal Period"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Bearish CrossOver"
                    },
                    {
                        "id": 1,
                        "name": "Bearish Divergence"
                    }
                ],
                "buy_condition_id": 1
            },
            {
                "id": 3,
                "name": "Moving Avg",
                "display": [
                    {
                        "name": "Long Period",
                        "value": "200",
                        "type": "text"
                    },
                    {
                        "name": "Short Period",
                        "value": "50",
                        "type": "text"
                    },
                    {
                        "name": "Type",
                        "value": "1",
                        "type": "dropdown",
                        "values": [
                            {
                                "id": 1,
                                "name": "Simple"
                            },
                            {
                                "id": 2,
                                "name": "Exponential"
                            }
                        ]
                    }
                ],
                "display_seq": ["Long Period","Short Period", "Type"],
                "buy_conditions": [
                    {
                        "id": 1,
                        "name": "Long period Moving Avg crosses below Short Period",
                        "details":"$1 days moving average crosses above $2 moving average"
                    },
                    {
                        "id": 2,
                        "name": "Long period crosses below Price",
                        "details":"$1 days moving average crosses above price"
                    },{
                        "id": 3,
                        "name": "Short period Moving Avg crosses below Long Period",
                        "details":"$2 days moving average crosses above $1 moving average"
                    }
                ],
                "buy_condition_id": 1
            }
        ]
        return jsonify(strategies)

    except Exception as e:
        print(e)

@api_algotrading.route("/algotrading/strategies/transactions", methods=['POST', 'GET'])
def getTransactions():
    try:

        transactions = [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "side":'Buy',
                "qty": 16,
                "date": "2020-09-12",
                "price":45.3075
            },
            {
                "symbol": "NFLX",
                "name": "Netflix.",
                "side":'Sell',
                "qty": 20,
                "date": "2020-09-25",
                "price":43.075
            },
            {
                "symbol": "IAU",
                "name": "Aishares Gold Trust",
                "side":'Buy',
                "qty": 78,
                "date": "2020-09-15",
                "price":12.72
            },
            {
                "symbol": "UNH  ",
                "name": "United Health Group Inc.",
                "side":'Buy',
                "qty": 8,
                "date": "2020-10-12",
                "price":4241.513
            }
            ]
        return jsonify(transactions)

    except Exception as e:
      print(e)

@api_algotrading.route("/algotrading/strategies/performance", methods=['POST', 'GET'])
def getPerformance():
    try:

        performance = [
            {
                "year": "2012",
                "backtest": 20,
                "snp":10,
                "nsd": -5
            },
            {
                "year": "2014",
                "backtest": -10,
                "snp":18,
                "nsd": 20
            },
            {
                "year": "2018",
                "backtest": 25,
                "snp":-8,
                "nsd": 15
            },
            {
                "year": "2020",
                "backtest": 30,
                "snp":10,
                "nsd": 15
            }
        ]
        return jsonify(performance)

    except Exception as e:
        print(e)
