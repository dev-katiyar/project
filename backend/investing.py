from flask import jsonify
from flask import Blueprint
import dbutil
import pandas as pd
import technical_manager
import pivot_points
import constants

api_investing = Blueprint('api_investing', __name__)


@api_investing.route("/investing/technicals/<symbol>", methods=['GET'])
def getInvestingTechnicals(symbol):
    technicals = dbutil.getDataTable(
        """select * from technicals_symbol
            where symbol='{}' """.format(symbol))
    df = pd.DataFrame(technicals)
    if (df is None or df.empty):
        return jsonify({})
    oscillators, movingAvgs, rating, rating_text = technical_manager.getTechnicals(df, symbol)
    pivotPoints = pivot_points.calculatePivotPoints(df)
    result = {"technicals": oscillators, "movingAverage": movingAvgs, "pivotPoints": pivotPoints,
              "score": {"rating": rating, "rating_text": rating_text}}
    return jsonify(result)


@api_investing.route("/screener/main", methods=['GET'])
def getMainScreen():
    screens = [
        {"name": "The Bull Cartel", "id": 1, "description": "Companies with a good quarterly growth..."},
        {"name": "Growth Stocks", "id": 2, "description": "A stock screen to find stocks with high growth ..."},
        {"name": "Magic Formula", "id": 3, "description": "Based on famous Magic Formula."},
        {"name": "Loss to Profit Companies", "id": 4, "description": "Companies which had a turnaround..."},
        {"name": "Bluest of the Blue Chips", "id": 5,
         "description": "Large Caps (Mkt Cap > 3000 Crs) with solid profit... "},
        {"name": "High Growth High RoE Low PE", "id": 6, "description": "Undervalued companies"},
    ]

    return jsonify(screens)


@api_investing.route("/screener", methods=['GET'])
def getScreenIndicators():
    screensIndicators = [
        {"name": "P/E", "id": 1, "display_type": "Slider", "operation": "true", "type_id": 1, "min": 0, "max": 150},
        {"name": "Market Cap", "id": 2, "display_type": "Dropdown", "operation": "false", "type_id": 2,
         "values1": [{"id": 1, "name": "Small ($300mln to $2bln)"},
                     {"id": 2, "name": "Mid ($2mln to $10bln)"},
                     {"id": 2, "name": "Large ($10mln to $200bln)"},
                     {"id": 1, "name": "Mega ($200bln and more)"}]},
        {"name": "RSI", "id": 3, "display_type": "Dropdown", "operation": "true", "type_id": 2,
         "values1": [{"id": 1, "name": "Oversold"},
                     {"id": 2, "name": "Overbought"},
                     {"id": 3, "name": "Extremely Oversold"},
                     {"id": 4, "name": "Extremely Overbought"}]},
        {"name": "Crossover Mov Avg", "id": 4, "display_type": "MultiDropdown", "operation": "true", "type_id": 2,
         "values1": [{"id": 1, "name": "20 Day Moving Avg"},
                     {"id": 2, "name": "50 Day Moving Avg"},
                     {"id": 3, "name": "100 Day Moving Avg"},
                     {"id": 4, "name": "150 Day Moving Avg"},
                     {"id": 4, "name": "Price"}],
         "values2": [{"id": 1, "name": "Crosses Above"},
                     {"id": 2, "name": "Crosses Below"}],
         "values3": [{"id": 1, "name": "20 Day Moving Avg"},
                     {"id": 2, "name": "50 Day Moving Avg"},
                     {"id": 3, "name": "100 Day Moving Avg"},
                     {"id": 4, "name": "150 Day Moving Avg"},
                     {"id": 5, "name": "Price"}]}
    ]
    return jsonify(screensIndicators)


@api_investing.route("/broadMarkets", methods=['GET'])
def getBroadMarkets():
    sql = """select b.*,t.type as name,b.name as companyname,
    l.price_change,l.change_pct ,l.last,t.ui_order
    from broad_markets b join broad_markets_types t
    on b.market_type = t.id
    join live_symbol l on l.symbol = b.symbol where t.id !=1
    """
    data = dbutil.getDataDictMultipleRows(sql, "name", "change_pct")
    return jsonify(data)
