from click import option
from strategy.indicators.indicator import Indicator
from talib import SMA
from strategy.indicators import indicator_defaults as defaults

# indentification of indicator, internal and external usage
key = 'sma'

# this signature defined what kind of conditions this indicator supports and hence defines UI
sma_signature = {
    **defaults.sma_defaults,
    'strategies': [
        {'key': 'ca', 'name': 'cross above', 'type': 'double', 'settings': [], 'options': [defaults.close_defaults, defaults.sma_defaults, ]},
        {'key': 'cb', 'name': 'cross below', 'type': 'double', 'settings': [], 'options': [defaults.close_defaults, defaults.sma_defaults, ]},
        {'key': 'gt', 'name': 'greater than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
        {'key': 'lt', 'name': 'less than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
    ]
}

class svSMA(Indicator):
    def __init__(self) -> None:
        super().__init__(key)


    def add_ind_cols(self, df, setting):
        try:
            col = 'close'
            period = setting['timeperiod']

            col_name = self.key + str(period)
            if col_name not in df.columns.tolist():
                df[col_name] = SMA(df[col], period)
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
