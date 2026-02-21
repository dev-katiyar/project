import constants


def getTrendName(value):
    if (value == constants.Neutral):
        return "Neutral"
    elif (value == constants.Bearish):
        return "Bearish"
    elif (value == constants.VeryBearish):
        return "VeryBearish"
    elif (value == constants.Bullish):
        return "Bullish"
    elif (value == constants.VeryBullish):
        return "VeryBullish"


def Short_term(latest_row):
    score = 0
    close = latest_row['close']
    sma3 = latest_row['sma3']
    sma5 = latest_row['sma5']
    sma9 = latest_row['sma9']
    sma13 = latest_row['sma13']
    sma20 = latest_row['sma20']
    sma13 = latest_row['sma13']
    rsi = latest_row['rsi']
    macdhist = latest_row['macdhist']
    macd = latest_row['macd']

    score = score + 1 if sma3 >= sma9 else score - 1
    score = score + 1 if sma5 >= sma13 else score - 1
    score = score + 1 if sma5 >= sma20 else score - 1
    score = score + 1 if close >= sma9 else score - 1
    score = score + 1 if close >= sma20 else score - 1
    score = score - 1 if rsi >= 80 else score
    score = score + 1 if rsi <= 20 else score
    score = score + 1 if macdhist >= 0 else score - 1
    score = score + 1 if macd >= 0 else score - 1
    trend = constants.Neutral

    trend = constants.Neutral
    if score >= 4:
        trend = constants.VeryBullish
    elif score >= 1:
        trend = constants.Bullish
    elif score >= 0:
        trend = constants.Neutral
    elif trend >= -2:
        trend = constants.Bearish
    else:
        trend = constants.VeryBearish
    return trend


def Intermediate_term(latest_row):
    score = 0
    close = latest_row['close']
    sma25 = latest_row['sma25']
    sma13 = latest_row['sma13']
    sma50 = latest_row['sma50']
    sma90 = latest_row['sma90']

    score = score + 1 if sma25 >= sma90 else score - 1
    score = score + 1 if sma13 >= sma50 else score - 1
    score = score + 1 if close >= sma50 else score - 1
    score = score + 1 if close >= sma90 else score - 1
    # range from -4 to 4

    trend = constants.Neutral
    if score >= 3:
        trend = constants.VeryBullish
    elif score >= 1:
        trend = constants.Bullish
    elif score >= 0:
        trend = constants.Neutral
    elif trend >= -2:
        trend = constants.Bearish
    else:
        trend = constants.VeryBearish
    return trend


def Long_term(latest_row):
    score = 0
    close = latest_row['close']
    sma36 = latest_row['sma36']
    sma50 = latest_row['sma50']
    sma150 = latest_row['sma150']
    sma200 = latest_row['sma200']

    score = score + 1 if sma36 >= sma150 else score - 1
    score = score + 1 if sma50 >= sma200 else score - 1
    score = score + 1 if close >= sma50 else score - 1
    score = score + 1 if close >= sma200 else score - 1

    trend = constants.Neutral
    if score >= 3:
        trend = constants.VeryBullish
    elif score >= 1:
        trend = constants.Bullish
    elif score >= 0:
        trend = constants.Neutral
    elif trend >= -2:
        trend = constants.Bearish
    else:
        trend = constants.VeryBearish
    return trend
