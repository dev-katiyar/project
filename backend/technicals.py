from flask import jsonify
import dbutil
import alert_constants
from flask import Blueprint

api_technicals = Blueprint('api_technicals', __name__)


def calculate_rsi_values(row):
    p = row['rsi']
    r = alert_constants.Neutral
    rsi_text = 'Neutral'
    action = 'Hold'
    if (p < 20):
        r = alert_constants.ExtremelyOversold
        rsi_text = 'ExtremelyOversold'
        action = 'Buy'
    elif (p >= 20 and p <= 30):
        r = alert_constants.Oversold
        rsi_text = 'Oversold'
        action = 'Buy'
    elif (p > 30 and p <= 45):
        r = alert_constants.ApproachingOversold
        rsi_text = 'ApproachingOversold'
        action = 'Buy'
    elif (p > 45 and p <= 55):
        r = alert_constants.Neutral
        rsi_text = 'Neutral'
        action = 'Neutral'
    elif (p > 55 and p <= 70):
        r = alert_constants.ApproachingOverbought
        rsi_text = 'ApproachingOverbought'
        action = 'Sell'
    elif (p > 70 and p <= 80):
        r = alert_constants.Overbought
        rsi_text = 'Overbought'
        action = 'Sell'
    elif (p > 80):
        r = alert_constants.ExtremelyOverbought
        rsi_text = 'ExtremelyOverbought'
        action = 'Sell'

    return {"r": r, "action": action}



def buySellAction(key, row):
    if key == "rsi":
        return calculate_rsi_values(row)['action']
    if "sma" in key:
        if row['close'] - row[key] > 0:
            return "Buy"
        elif row['close'] - row[key] == 0:
            return "Hold"
        else:
            return "Sell"
    else:
        return "Sell"


@api_technicals.route("/technicals/<symbol>", methods=['POST', 'GET'])
def getTechnicals(symbol):
    sql = """select * from df_technicals_extended where symbol ='AAPL'"""
    data = dbutil.getOneRow(sql)
    movAvg = []
    oscillator = []
    oscillator_keys = {"mom": "Momentum (10)",
                       "macd": "MACD Level (12, 26)",
                       "rsi": "Relative Strength Index (14)",
                       "cci": "COMMODITY CHANNEL INDEX (20)",
                       "adx": "Average Directional Index (14)",
                       "ultimate_osc": "Ultimate Oscillator (7, 14, 28)",
                       "wpr": "WILLIAMS %R",
                       "slowk": "Stocastic %K",
                       "bull_bear_power": "Bull Bear Power "

                       }
    movAvg_keys = {"sma5": "Simple Moving Avg(5)",
                   "sma9": "Simple Moving Avg(9)",
                   "sma25": "Simple Moving Avg(25)",
                   "sma36": "Simple Moving Avg(36)",
                   "sma90": "Simple Moving Avg(90)",
                   "sma150": "Simple Moving Avg(150)",
                   "ema5": "Exponential Moving Avg(5)",
                   "ema9": "Exponential Moving Avg(9)",
                   "ema25": "Exponential Moving Avg(25)",
                   "ema36": "Exponential Moving Avg(36)",
                   "ema90": "Exponential Moving Avg(90)",
                   "ema150": "Exponential Moving Avg(150)"

                   }
    for k, v in data.items():
        if k in movAvg_keys:
            action = buySellAction(k, data)
            movAvg.append({"key": movAvg_keys[k], "value": v, "action": action})
        if k in oscillator_keys:
            action = buySellAction(k, data)
            oscillator.append({"key": oscillator_keys[k], "value": v, "action": action})
    return jsonify({
        "movAvg": movAvg,
        "oscillator": oscillator})
