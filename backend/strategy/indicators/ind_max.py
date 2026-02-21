from strategy.indicators.indicator import Indicator
from talib import MAX

# indentification of indicator, internal and external usage
key = 'max'

# no signature, as this cannot be left_option

class svMAX(Indicator):
    def __init__(self) -> None:
        super().__init__(key)

    def add_ind_cols(self, df, setting):
        try:
            col = setting['col']
            period = setting['timeperiod']
            col_name = col + self.key + str(period)
            if self.key not in df.columns.tolist():
                df[col_name] = MAX(df[col], period)
            print(df.tail(10))
            return col_name
        except Exception as e:
            print(e)
