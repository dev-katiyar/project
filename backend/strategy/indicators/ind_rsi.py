from strategy.indicators.indicator import Indicator
from talib import RSI
from strategy.indicators import indicator_defaults as defaults

# indentification of indicator, internal and external usage
key = 'rsi'

# this signature defined what kind of conditions this indicator supports and hence UI elements
rsi_signature = {
    **defaults.rsi_defaults,
    'strategies': [
        {'key': 'ca', 'name': 'crosses above', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults]},
        {'key': 'cb', 'name': 'crosses below', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults]},
        {'key': 'gt', 'name': 'greater than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
        {'key': 'lt', 'name': 'less than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
        {'key': 'pattern', 'name': 'forms', 'type': 'pattern', 'settings': [], 'options': [defaults.higherhighs_defaults, defaults.higherlows_defaults, defaults.lowerhighs_defaults, defaults.lowerlows_defaults]},
        {'key': 'rsibud', 'name': 'Bullish Divergent', 'type': 'strategy', 'settings': [{"key": "ticks", "value": 5}]},
        {'key': 'rsibed', 'name': 'Bearish Divergent', 'type': 'strategy', 'settings': [{"key": "ticks", "value": 5}]}
    ]
}


class svRSI(Indicator):
    def __init__(self) -> None:
        super().__init__(key)

    def add_ind_cols(self, df, setting):
        try:
            timeperiod = setting['timeperiod']

            col_name = key + str(timeperiod)
            if col_name not in df.columns.tolist():
                df[col_name] = RSI(df['close'], timeperiod)
            print(df.tail(10))

            return col_name

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
        df[signal_col] = (diff.shift(1) <= 0) & (diff > 0)
        return signal_col

    # can be put into an operator factory or static class
    def cb(self, df, operator, left_col, right_col):
        diff = df[left_col] - df[right_col]
        signal_col = left_col + operator + right_col
        df[signal_col] = (diff.shift(1) >= 0) & (diff < 0)
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

    def pattern(self, df, operator, pattern_name, right_col, ticks):
        if hasattr(self, pattern_name):
            return getattr(self, pattern_name)(df, operator, right_col, ticks)

    def higherhighs(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker -= 1

        return signal_col

    def higherlows(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker -= 1
        return signal_col

    def lowerhighs(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker -= 1
        return signal_col

    def lowerlows(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i + past_ticks < length:
                df[signal_col].iat[i + past_ticks] = True
                ticks_tracker -= 1
        return signal_col
