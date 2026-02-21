import talib  # https://mrjbq7.github.io/ta-lib/


def get_riapro_strategy_output(df, ria_pro_inputs, test_period):
    # ### RIA PRO INDICATOR INPUTS ### #
    ria_inputs = ria_pro_inputs["ria_inputs"]

    ria_num_of_periods = ria_inputs["ria_num_of_periods"]
    ria_smoothening_ema_period = ria_inputs["ria_smoothening_ema_period"]
    ria_trigger_ema_period = ria_inputs["ria_trigger_ema_period"]

    # STOCHASTIC OSCILLATOR - ROUND 1
    df["min_of_low"] = talib.MIN(df["low"], ria_num_of_periods)
    df["max_of_high"] = talib.MAX(df["high"], ria_num_of_periods)
    df["rel_dev_from_close"] = (df["actualclose"] - df["min_of_low"]) / (df["max_of_high"] - df["min_of_low"])
    df["x"] = talib.EMA(df["rel_dev_from_close"], ria_smoothening_ema_period) * 100

    # STOCHASTIC OSCILLATOR - ROUND 2
    df["min_of_x"] = talib.MIN(df["x"], ria_num_of_periods)
    df["max_of_x"] = talib.MAX(df["x"], ria_num_of_periods)
    df["rel_dev_from_x"] = (df["x"] - df["min_of_x"]) / (df["max_of_x"] - df["min_of_x"])
    df["ria"] = talib.EMA(df["rel_dev_from_x"], ria_smoothening_ema_period) * 100  # DSS BRESSERT (RIA PRO IND)

    # DSS BRESSERT (RIA PRO) SIGNAL LINE
    df["ria_trigger"] = talib.EMA(df["ria"], ria_trigger_ema_period)

    # NET BRESSERT (RIA PRO) AS OSCILLATOR
    df["ria_diff"] = df["ria"] - df["ria_trigger"]
    # ### STOCHASTIC INDICATOR INPUTS ### #
    stoch_inputs = ria_pro_inputs["stoch_inputs"]

    stoch_num_of_periods = stoch_inputs["stoch_num_of_periods"]
    stoch_smoothening_ema_period = stoch_inputs["stoch_smoothening_ema_period"]
    stoch_trigger_ema_period = stoch_inputs["stoch_trigger_ema_period"]

    # STOCHASTIC OSCILLATOR
    df["min_of_low"] = talib.MIN(df["low"], stoch_num_of_periods)
    df["max_of_high"] = talib.MAX(df["high"], stoch_num_of_periods)
    df["rel_dev_from_close"] = (df["actualclose"] - df["min_of_low"]) / (df["max_of_high"] - df["min_of_low"])
    df["stoch"] = talib.EMA(df["rel_dev_from_close"], stoch_smoothening_ema_period) * 100

    # STOCHASTIC SIGNAL LINE
    df["stoch_trigger"] = talib.EMA(df["x"], stoch_trigger_ema_period)

    # STOCHASTIC AS OSCILLATOR
    df["stoch_diff"] = df["stoch"] - df["stoch_trigger"]

    df.drop(['min_of_low', 'max_of_high', 'rel_dev_from_close',
             'min_of_x', 'max_of_x', 'rel_dev_from_x'], axis=1, inplace=True)

    # ### MONEY FLOW INDICATOR INPUTS ### #
    mfi_inputs = ria_pro_inputs["mfi_inputs"]
    mfi_num_of_periods = mfi_inputs["mfi_num_of_periods"]
    df["money_flow_multiplier"] = 1.0 * ((df["actualclose"] - df["low"]) - (df["high"] - df["actualclose"])) / (
            df["high"] - df["low"])
    df["money_flow_volume"] = df["money_flow_multiplier"] * df["volume"]
    df["cmf"] = 1.0 * talib.SMA(df["money_flow_volume"], mfi_num_of_periods) / talib.SMA(df["volume"],
                                                                                         mfi_num_of_periods)
    df.drop(['money_flow_multiplier', 'money_flow_volume'], axis=1, inplace=True)

    # ### MACD INPUTS ### #
    macd_inputs = ria_pro_inputs["macd_inputs"]
    macd_fast_period = macd_inputs["macd_fast_period"]
    macd_slow_period = macd_inputs["macd_slow_period"]
    macd_trigger_period = macd_inputs["macd_trigger_period"]

    df["macd"], df["macd_trigger"], df["macd_diff"] = talib.MACD(df["actualclose"], macd_fast_period,
                                                                macd_slow_period, macd_trigger_period)

    # ## BUY SELL SIGNALS ## #

    df['ria_buy_signal'] = (df["ria_diff"].shift(1) <= 0) & (df['ria_diff'] > 0)
    df['ria_sell_signal'] = (df["ria_diff"].shift(1) >= 0) & (df['ria_diff'] < 0)

    # ## BUY SELL RATING CALCULATIONS ## # TODO: STOCH WEIGHTS STOCH BUY SELL SIGNAL ride on RIA. Separate them
    weights = {"ria_buy_sell_weight": stoch_inputs["stoch_buy_sell_weight"],
               "mfi_buy_sell_weight": mfi_inputs["mfi_buy_sell_weight"],
               "macd_buy_sell_weight": macd_inputs["macd_buy_sell_weight"]}


    def get_buy_rating(row, weights):
        # global buy_waiting_confirmaiton
        if row['ria_buy_signal']:
            # buy_waiting_confirmaiton = 0
            return 2
        else:
            return 0


    def get_sell_rating(row, weights):
        # global sell_waiting_confirmation
        if row['ria_sell_signal']:
            return 2
        else:
            return 0

    df['buy_rating'] = df.apply(lambda row: get_buy_rating(row, weights), axis=1)  # Slow Op - see how to fix
    df['sell_rating'] = df.apply(lambda row: get_sell_rating(row, weights), axis=1)  # Slow Op - see how to fix
    # df['close'] = df['actualclose']   # close is adjusted close, we need actual close price

    df.drop(['ria_buy_signal', 'ria_sell_signal', 'open', 'high', 'low', 'volume'], axis=1, inplace=True)
    
    return df.tail(test_period)


def get_riapro_strategy_output2024(df, ria_pro_inputs, test_period):
    # ### RIA PRO INDICATOR INPUTS ### #
    ria_inputs = ria_pro_inputs["ria_inputs"]

    ria_num_of_periods = ria_inputs["ria_num_of_periods"]
    ria_smoothening_ema_period = ria_inputs["ria_smoothening_ema_period"]
    ria_trigger_ema_period = ria_inputs["ria_trigger_ema_period"]

    # STOCHASTIC OSCILLATOR - ROUND 1
    df["min_of_low"] = talib.MIN(df["low"], ria_num_of_periods)
    df["max_of_high"] = talib.MAX(df["high"], ria_num_of_periods)
    df["rel_dev_from_close"] = (df["actualclose"] - df["min_of_low"]) / (df["max_of_high"] - df["min_of_low"])
    df["x"] = talib.EMA(df["rel_dev_from_close"], ria_smoothening_ema_period) * 100

    # STOCHASTIC OSCILLATOR - ROUND 2
    df["min_of_x"] = talib.MIN(df["x"], ria_num_of_periods)
    df["max_of_x"] = talib.MAX(df["x"], ria_num_of_periods)
    df["rel_dev_from_x"] = (df["x"] - df["min_of_x"]) / (df["max_of_x"] - df["min_of_x"])
    df["ria"] = talib.EMA(df["rel_dev_from_x"], ria_smoothening_ema_period) * 100  # DSS BRESSERT (RIA PRO IND)

    # DSS BRESSERT (RIA PRO) SIGNAL LINE
    df["ria_trigger"] = talib.EMA(df["ria"], ria_trigger_ema_period)

    # NET BRESSERT (RIA PRO) AS OSCILLATOR
    df["ria_diff"] = df["ria"] - df["ria_trigger"]
    # min_net_ria = df["net_ria"].iloc[-test_period:].min()
    # max_net_ria = df["net_ria"].iloc[-test_period:].max()
    # range_ria = max_net_ria - min_net_ria
    # df["normal_net_ria"] = (1 - (max_net_ria - df["net_ria"]) / range_ria) * 100.00
    # df.drop(['min_of_low', 'max_of_high', 'rel_dev_from_close',
    #          'min_of_x', 'max_of_x', 'rel_dev_from_x', 'net_ria'], axis=1, inplace=True)

    # ### STOCHASTIC INDICATOR INPUTS ### #
    stoch_inputs = ria_pro_inputs["stoch_inputs"]

    stoch_num_of_periods = stoch_inputs["stoch_num_of_periods"]
    stoch_smoothening_ema_period = stoch_inputs["stoch_smoothening_ema_period"]
    stoch_trigger_ema_period = stoch_inputs["stoch_trigger_ema_period"]

    # STOCHASTIC OSCILLATOR
    df["min_of_low"] = talib.MIN(df["low"], stoch_num_of_periods)
    df["max_of_high"] = talib.MAX(df["high"], stoch_num_of_periods)
    df["rel_dev_from_close"] = (df["actualclose"] - df["min_of_low"]) / (df["max_of_high"] - df["min_of_low"])
    df["stoch"] = talib.EMA(df["rel_dev_from_close"], stoch_smoothening_ema_period) * 100

    # STOCHASTIC SIGNAL LINE
    df["stoch_trigger"] = talib.EMA(df["x"], stoch_trigger_ema_period)

    # STOCHASTIC AS OSCILLATOR
    df["stoch_diff"] = df["stoch"] - df["stoch_trigger"]

    df.drop(['min_of_low', 'max_of_high', 'rel_dev_from_close',
             'min_of_x', 'max_of_x', 'rel_dev_from_x'], axis=1, inplace=True)

    # ### MONEY FLOW INDICATOR INPUTS ### #
    mfi_inputs = ria_pro_inputs["mfi_inputs"]
    mfi_num_of_periods = mfi_inputs["mfi_num_of_periods"]
    df["money_flow_multiplier"] = 1.0 * ((df["actualclose"] - df["low"]) - (df["high"] - df["actualclose"])) / (
            df["high"] - df["low"])
    df["money_flow_volume"] = df["money_flow_multiplier"] * df["volume"]
    df["cmf"] = 1.0 * talib.SMA(df["money_flow_volume"], mfi_num_of_periods) / talib.SMA(df["volume"],
                                                                                         mfi_num_of_periods)
    df.drop(['money_flow_multiplier', 'money_flow_volume'], axis=1, inplace=True)

    # ### SMA ### #
    sma_inputs = ria_pro_inputs["sma_inputs"]
    sma1_period = sma_inputs["sma1_num_of_period"]
    sma2_period = sma_inputs["sma2_num_of_period"]
    sma1_key = 'sma'+ str(sma1_period)
    sma2_key = 'sma'+ str(sma2_period)
    df[sma1_key] = 1.0 * talib.SMA(df["actualclose"], sma1_period)
    df[sma2_key] = 1.0 * talib.SMA(df["actualclose"], sma2_period)
    df['sma_diff'] = df[sma1_key] - df[sma2_key]

    # ### MACD 1 INPUTS ### #
    macd1_inputs = ria_pro_inputs["macd1_inputs"]
    macd1_fast_period = macd1_inputs["macd_fast_period"]
    macd1_slow_period = macd1_inputs["macd_slow_period"]
    macd1_trigger_period = macd1_inputs["macd_trigger_period"]

    df["macd1"], df["macd1_trigger"], df["macd1_diff"] = talib.MACD(
        df["actualclose"], 
        macd1_fast_period,
        macd1_slow_period, 
        macd1_trigger_period
    )

    # ### MACD 2 INPUTS ### #
    macd2_inputs = ria_pro_inputs["macd2_inputs"]
    macd2_fast_period = macd2_inputs["macd_fast_period"]
    macd2_slow_period = macd2_inputs["macd_slow_period"]
    macd2_trigger_period = macd2_inputs["macd_trigger_period"]

    df["macd2"], df["macd2_trigger"], df["macd2_diff"] = talib.MACD(
        df["actualclose"], 
        macd2_fast_period,
        macd2_slow_period, 
        macd2_trigger_period
    )

    # ### RSI INPUTS ### #
    rsi_inputs = ria_pro_inputs["rsi_inputs"]
    rsi_period = rsi_inputs["rsi_period"]
    df["rsi" + str(rsi_period)] = talib.RSI(df["actualclose"])

    # ### MACD INPUTS ### #
    macd_inputs = ria_pro_inputs["macd_inputs"]
    macd_fast_period = macd_inputs["macd_fast_period"]
    macd_slow_period = macd_inputs["macd_slow_period"]
    macd_trigger_period = macd_inputs["macd_trigger_period"]

    df["macd"], df["macd_trigger"], df["macd_diff"] = talib.MACD(df["actualclose"], macd_fast_period,
                                                                macd_slow_period, macd_trigger_period)

    # ## BUY SELL SIGNALS ## #
    ria_condition_buy_below = ria_inputs["ria_condition_buy_below"]
    ria_condition_sell_above = ria_inputs["ria_condition_sell_above"]
    stoch_buy_trigger_diff_cross = stoch_inputs["stoch_buy_trigger_diff_cross"]
    stoch_sell_trigger_diff_cross = stoch_inputs["stoch_buy_trigger_diff_cross"]

    # df['ria_buy_signal'] = (df["stoch_diff"].shift(1) < stoch_buy_trigger_diff_cross) & \
    #                        (df['stoch_diff'] > stoch_buy_trigger_diff_cross) & \
    #                        (df['ria_trigger'] < ria_condition_buy_below)
    # df['ria_sell_signal'] = (df["stoch_diff"].shift(1) > stoch_sell_trigger_diff_cross) & \
    #                         (df['stoch_diff'] < stoch_sell_trigger_diff_cross) & \
    #                         (df['ria_trigger'] > ria_condition_sell_above)

    df['sma_buy_signal'] = (df['sma_diff'].shift(1) <= 0)  & (df['sma_diff'] > 0)
    df['sma_sell_signal'] = (df["sma_diff"].shift(1) >= 0)  & (df['sma_diff'] < 0)

    # df['mf_buy_signal'] = (df["cmf"] > 0.05)
    # df['mf_sell_signal'] = (df["cmf"] < 0.05)

    # df['macd_buy_signal'] = (df["macd_diff"] > 0.0)
    # df['macd_sell_signal'] = (df["macd_diff"] < 0.0)

    # df['macd_buy_signal'] = (df["macd_diff"].shift(1) <= 0) & (df['macd_diff'] > 0)
    # df['macd_sell_signal'] = (df["macd_diff"].shift(1) >= 0) & (df['macd_diff'] < 0)

    # ## BUY SELL RATING CALCULATIONS ## # TODO: STOCH WEIGHTS STOCH BUY SELL SIGNAL ride on RIA. Separate them
    # weights = {"ria_buy_sell_weight": stoch_inputs["stoch_buy_sell_weight"],
    #            "mfi_buy_sell_weight": mfi_inputs["mfi_buy_sell_weight"],
    #            "macd_buy_sell_weight": macd_inputs["macd_buy_sell_weight"]}

    # global buy_waiting_confirmaiton
    # buy_waiting_confirmaiton = 0
    
    def get_buy_rating(row):
        # global buy_waiting_confirmaiton
        if row['sma_buy_signal'] and (row['macd_diff'] >= 0):
            return 2
        if row['sma_buy_signal']:
            # buy_waiting_confirmaiton = 0
            return 1
        # if buy_waiting_confirmaiton and (row['macd_diff'] > 0):
        #     buy_waiting_confirmaiton = 0
        #     return 2
        # if buy_waiting_confirmaiton and row['ria_sell_signal']:
        #     buy_waiting_confirmaiton = 0
        #     return 0
        # if row['ria_buy_signal'] and (row['macd_diff'] < 0):
        #     buy_waiting_confirmaiton = 1
        #     return 0
        else:
            return 0

    # global sell_waiting_confirmation
    # sell_waiting_confirmation = 0

    def get_sell_rating(row):
        # global sell_waiting_confirmation
        if row['sma_sell_signal'] and (row['macd_diff'] < 0):
            return 2
        if row['sma_sell_signal']:
            # sell_waiting_confirmation = 0
            return 1
        # if sell_waiting_confirmation and (row['macd_diff'] < 0):
        #     sell_waiting_confirmation = 0
            # return 2  
        # if sell_waiting_confirmation and row['ria_buy_signal']:
        #     sell_waiting_confirmation = 0
        #     return 0
        # if row['ria_sell_signal'] and (row['macd_diff'] > 0):
        #     sell_waiting_confirmation = 1
        #     return 0
        else:
            return 0

    df['buy_rating'] = df.apply(lambda row: get_buy_rating(row), axis=1)  # Slow Op - see how to fix
    df['sell_rating'] = df.apply(lambda row: get_sell_rating(row), axis=1)  # Slow Op - see how to fix
    # df['close'] = df['actualclose']   # close is adjusted close, we need actual close price

    df.drop(['sma_buy_signal', 'sma_sell_signal', 'open', 'high', 'low', 'volume'], axis=1, inplace=True)
    
    return df.tail(test_period)
