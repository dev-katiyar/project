from strategy.indicators.indicator import Indicator
from talib import SMA, EMA, STOCH, MAX, MIN
from strategy.indicators import indicator_defaults as defaults

# indentification of indicator, internal and external usage
key = 'stochsignal'

# no signature, as this cannot be left_option, as per new approach 

class StochasticSignal(Indicator):
    def __init__(self) -> None:
        super().__init__(key)


    def add_ind_cols(self, df, setting):
        try:
            timeperiod = setting['timeperiod']
            fastk_period = setting['fastk_period']
            fastd_period = setting['fastd_period']

            col_name = 'stoch' + str(timeperiod) + str(fastk_period) + str(fastd_period)
            if col_name not in df.columns.tolist():
                ### TA LIB ###
                # df[col_name] = ADOSC(df['high'], df['low'], df['actualclose'], df['volume'], fast_period, slow_period)

                ### Mike ###
                df["min_of_low"] = MIN(df["low"], timeperiod)
                df["max_of_high"] = MAX(df["high"], timeperiod)
                df["rel_dev_from_close"] = (df["close"] - df["min_of_low"]) / (df["max_of_high"] - df["min_of_low"])
                df[col_name] = EMA(df["rel_dev_from_close"], fastk_period) * 100

                # STOCHASTIC SIGNAL LINE
                df[col_name + 'signal'] = EMA(df[col_name], fastd_period)
                df.drop(['min_of_low', 'max_of_high', 'rel_dev_from_close'], axis=1, inplace=True)

            print(df.tail(10))
            return col_name + 'signal'

        except Exception as e:
            print(e)

    
    def operate(self, df, operator, left_col, right_col):
        if hasattr(self, operator):
            return getattr(self, operator)(df, operator, left_col, right_col)
        else:
            raise Exception('Operator {} not supported'.format(operator))


    # can be put into an operator factory or static class 
    def ca(self, df, operator, left_col, right_col):
        diff = df[left_col] - df[right_col]
        signal_col = left_col + operator + right_col
        df[signal_col] = (diff.shift(1) <= 0)  & (diff > 0)
        return signal_col

    # can be put into an operator factory or static class
    def cb(self, df, operator, left_col, right_col):
        diff = df[left_col] - df[right_col]
        signal_col = left_col + operator + right_col
        df[signal_col] = (diff.shift(1) >= 0)  & (diff < 0)
        return signal_col

    # can be put into an operator factory or static class
    def gt(self, df, operator, left_col, right_col):
        diff = df[left_col] - df[right_col]
        signal_col = left_col + operator + right_col
        df[signal_col] = diff > 0
        return signal_col

    # can be put into an operator factory or static class
    def lt(self, df, operator, left_col, right_col):
        diff = df[left_col] - df[right_col]
        signal_col = left_col + operator + right_col
        df[signal_col] = diff < 0
        return signal_col
