from numpy import sign
from strategy.indicators.indicator import Indicator
from talib import MACD
from strategy.indicators import indicator_defaults as defaults

# indentification of indicator, internal and external usage
key = 'macdsignal'

# no signature, as this cannot be left_option, as per new approach 

class svMACDSignal(Indicator):
    def __init__(self) -> None:
        super().__init__(key)


    def add_ind_cols(self, df, setting):
        try:
            fast_period = setting['fastperiod']
            slow_period = setting['slowperiod']
            signal_period = setting['signalperiod']

            col_name = 'macd' + str(fast_period) + str(slow_period) + str(signal_period)
            if col_name not in df.columns.tolist():
                df[col_name], df[col_name + 'signal'], df[col_name + 'hist'] = MACD(df['close'], fast_period, slow_period, signal_period)
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

    def pattern(self, df, operator, pattern_name, right_col):
        if hasattr(self, pattern_name):
            return getattr(self, pattern_name)(df, operator, right_col)

    def higherhighs(self, df, operator, right_col):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
        return signal_col

    def higherlows(self, df, operator, right_col):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
        return signal_col

    def lowerhighs(self, df, operator, right_col):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
        return signal_col

    def lowerlows(self, df, operator, right_col):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
        return signal_col

