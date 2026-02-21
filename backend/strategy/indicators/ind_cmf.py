from strategy.indicators.indicator import Indicator
from talib import ADOSC, EMA, SMA
from strategy.indicators import indicator_defaults as defaults

# indentification of indicator, internal and external usage
key = 'cmf'

# this signature defined what kind of conditions this indicator supports and hence UI elements
cmf_signature = {
    **defaults.cmf_defaults,
    'strategies': [
        {'key': 'ca', 'name': 'cross above', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
        {'key': 'cb', 'name': 'cross below', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
        {'key': 'gt', 'name': 'greater than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
        {'key': 'lt', 'name': 'less than', 'type': 'double', 'settings': [], 'options': [defaults.fixed_defaults, ]},
    ]
}

class CMF(Indicator):
    def __init__(self) -> None:
        super().__init__(key)


    def add_ind_cols(self, df, setting):
        try:
            timeperiod = setting['timeperiod']

            col_name = self.key + str(timeperiod)
            if col_name not in df.columns.tolist():
                ### TA LIB ###
                # df[col_name] = ADOSC(df['high'], df['low'], df['actualclose'], df['volume'], fast_period, slow_period)
                
                ### Other Guy ###
                # ad = ((2 * df['close'] - df['high'] - df['low']) / (df['high'] - df['low'])) * df['volume']  
                # cmf = (EMA(ad, fast_period) - EMA(ad, slow_period))
                # df[col_name] = cmf

                ### Mike ###
                df["money_flow_multiplier"] = 1.0 * ((df["actualclose"] - df["low"]) - (df["high"] - df["actualclose"])) / (df["high"] - df["low"])
                df["money_flow_volume"] = df["money_flow_multiplier"] * df["volume"]
                df[col_name] = 1.0 * SMA(df["money_flow_volume"], timeperiod) / SMA(df["volume"], timeperiod)
                df.drop(['money_flow_multiplier', 'money_flow_volume'], axis=1, inplace=True)

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
