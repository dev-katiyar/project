from strategy.indicators.indicator import Indicator
from strategy.indicators import indicator_defaults as defaults

# indentification of indicator, internal and external usage
key = 'close'

# this signature defined what kind of conditions this indicator supports and hence UI elements
close_signature = {
    **defaults.close_defaults,
    'strategies': [
        {'key': 'ca', 'name': 'cross above', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, defaults.sma_defaults, ]},
        {'key': 'cb', 'name': 'cross below', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, defaults.sma_defaults, ]},
        {'key': 'gt', 'name': 'greater than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, defaults.sma_defaults, ]},
        {'key': 'lt', 'name': 'less than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, defaults.sma_defaults, ]},
        {'key': 'pattern', 'name': 'forms', 'type': 'pattern', 'settings': [{ "key": "ticks", "value": 5 }], 'options': [defaults.higherhighs_defaults, defaults.higherlows_defaults, defaults.lowerhighs_defaults, defaults.lowerlows_defaults]},
    ]
}

class Close(Indicator):
    def __init__(self) -> None:
        super().__init__(key)


    def add_ind_cols(self, df, setting):
        try:
            if self.key not in df.columns.tolist():
                raise Exception('Input data must have {}'.format(self.key))
            print(df.tail(10))
            return self.key
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
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker -= 1
        return signal_col

    def higherlows(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker -= 1
        return signal_col

    def lowerhighs(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker -= 1
        return signal_col

    def lowerlows(self, df, operator, right_col, ticks):
        past_ticks = 5  # this can be setting of operator, make it for all operators
        signal_col = operator + right_col
        df[signal_col] = False
        length = len(df)
        ticks_tracker = 0
        for i in range(0, length):
            if df[right_col].iat[i] and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker = ticks
            if ticks_tracker and i+past_ticks < length:
                df[signal_col].iat[i+past_ticks] = True
                ticks_tracker -= 1
        return signal_col
