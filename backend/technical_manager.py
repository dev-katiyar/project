import trend_manager
import constants


def getRatingText(rating):
    rating_text = "Hold"
    if (rating >= 9):
        rating_text = "StrongBuy"
    elif (rating >= 7):
        rating_text = "Buy"
    elif (rating >= 5):
        rating_text = "Hold"
    elif (rating >= 3):
        rating_text = "Sell"
    else:
        rating_text = "StrongSell"

    return rating_text


def getNetRatingText(value):
    if (value == constants.Hold):
        return "Hold"
    elif (value == constants.Sell):
        return "Sell"
    elif (value == constants.StrongSell):
        return "StrongSell"
    elif (value == constants.Buy):
        return "Buy"
    elif (value == constants.StrongBuy):
        return "StrongBuy"


def calc_mom_text(row):
    if (row['mom'] > 0 and row['mom'] > row['mom_sma']):
        return 'Bullish'
    elif (row['mom'] < row['mom_sma']):
        return 'Bearish'
    else:
        return 'Neutral'


def calc_bull_bear_power(row):
    if ((row['bear'] < 0) and
            (row['bear'] < row['bear_sma']) and
            (row['bull'] > row['bull_sma']) and
            (row['bull'] > 0)):
        return 'Bullish'
    elif (row['bear'] > row['bear_sma'] and
          row['bull'] < row['bull_sma']):
        return 'Bearish'
    else:
        return 'Neutral'


def getOscilator(symbol, df, name, value_column, text_column):
    trend = getLatestValueFromDf(df, text_column)
    oscillator = {"symbol": symbol, "name": name, "value": getLatestValueFromDf(df, value_column),
                  "action": getActionFromTrend(trend), "trend": trend, "typeid": 1}
    return oscillator


def getActionFromTrend(trend):
    action = "Hold"
    buyTrends = ["Oversold", "Buy", "VeryBullish", "Bullish"]
    sellTrends = ["Overbought", "Sell", "VeryBearish", "Bearish"]
    if trend in buyTrends:
        action = "Buy"
    elif trend in sellTrends:
        action = "Sell"
    return action


def getMovingAvg(symbol, df, name, value_column):
    mov_avg = getLatestValueFromDf(df, value_column)
    close_price = getLatestValueFromDf(df, "close")
    text = "Buy"
    type = "Bullish"
    if (close_price < mov_avg):
        text = "Sell"
        type = "Bearish"

    oscillator = {"symbol": symbol, "name": name, "value": getLatestValueFromDf(df, value_column),
                  "action": text, "trend": type, "typeid": 2}
    return oscillator


def getLatestValueFromDf(df, column):
    return df[column].iloc[0]


def common_text(value):
    text = 'Neutral'
    if (value <= 20):
        text = 'Oversold'
    elif (value >= 80):
        text = 'Overbought'
    else:
        text = 'Neutral'
    return text


def stock_rsi_text(value):
    text = 'Neutral'
    if (value <= 0.2):
        text = 'Oversold'
    elif (value >= 0.80):
        text = 'Overbought'
    else:
        text = 'Neutral'
    return text


def macd_text(value):
    if (value > 0):
        return 'Bullish'
    elif value == 0:
        return 'Bearish'
    else:
        return 'Neutral'


def cci_text(value):
    text = 'Neutral'
    if (value >= 100):
        text = 'Overbought'
    elif (value <= -100):
        text = 'Oversold'
    else:
        text = 'Neutral'
    return text


def wpr_text(value):
    text = 'Neutral'
    if (value >= -20):
        text = 'Overbought'
    elif (value <= -80):
        text = 'Oversold'
    else:
        text = 'Neutral'
    return text


def getTechnicals(df_symbol, symbol):
    if len(df_symbol.index) > 0:
        df_symbol['rsi_text'] = df_symbol.apply(lambda row: common_text(row['rsi']), axis=1)
        df_symbol['adx_text'] = df_symbol.apply(lambda row: common_text(row['adx']), axis=1)
        df_symbol['rsi_stock_text'] = df_symbol.apply(lambda row: common_text(row['rsi_fastk']), axis=1)
        df_symbol['stock_text'] = df_symbol.apply(lambda row: common_text(row['slowd']), axis=1)
        df_symbol['wpr_text'] = df_symbol.apply(lambda row: wpr_text(row['wpr']), axis=1)
        df_symbol['macd_text'] = df_symbol.apply(lambda row: macd_text(row['macdhist']), axis=1)
        df_symbol['cci_text'] = df_symbol.apply(lambda row: cci_text(row['cci']), axis=1)
        df_symbol['bull_bear_text'] = df_symbol.apply(calc_bull_bear_power, axis=1)
        df_symbol['mom_text'] = df_symbol.apply(calc_mom_text, axis=1)
        df_symbol['short_trend'] = df_symbol.apply(trend_manager.Short_term, axis=1)
        df_symbol['short_trend_text'] = df_symbol['short_trend'].apply(trend_manager.getTrendName)

        df_symbol['medium_trend'] = df_symbol.apply(trend_manager.Intermediate_term, axis=1)
        df_symbol['medium_trend_text'] = df_symbol['medium_trend'].apply(trend_manager.getTrendName)

        df_symbol['long_trend'] = df_symbol.apply(trend_manager.Long_term, axis=1)
        df_symbol['long_trend_text'] = df_symbol['long_trend'].apply(trend_manager.getTrendName)
        df_latest = df_symbol.tail(1)
        rating = getLatestValueFromDf(df_symbol, "rating")
        rating_text = getRatingText(rating)
        oscillators = []
        oscillators.append(getOscilator(symbol, df_latest, "Relative Strength Index (14)", "rsi", "rsi_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Avg Directional Index (14)", "adx", "adx_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Stochastic RSI Fast (3, 3, 14, 14)", "rsi_fastk", "rsi_stock_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Stochastic %K (14, 3, 3)", "slowd", "stock_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Williams Percentage Range", "wpr", "wpr_text"))
        oscillators.append(getOscilator(symbol, df_latest, "MACD(12,26)", "macd", "macd_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Commodity Channel Index(20)", "cci", "cci_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Bull Bear Power", "bull", "bull_bear_text"))
        oscillators.append(getOscilator(symbol, df_latest, "Momentum (10)", "mom", "mom_text"))
        # oscillators.append(getOscilator(symbol, df_latest, "Short Term Trend", "short_trend_text", "short_trend_text"))
        # oscillators.append(getOscilator(symbol, df_latest, "Medium Term Trend", "short_trend_text", "medium_trend_text"))
        # oscillators.append(getOscilator(symbol, df_latest, "Long Term Trend", "short_trend_text", "long_trend_text"))

        movingAvgs = []
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (5)", "sma5"))
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (9)", "sma9"))
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (20)", "sma20"))
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (50)", "sma50"))
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (100)", "sma100"))
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (150)", "sma150"))
        movingAvgs.append(getMovingAvg(symbol, df_latest, "SMA (200)", "sma200"))
        return oscillators, movingAvgs, rating, rating_text
    else:
        return [], []
