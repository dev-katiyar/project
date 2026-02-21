from strategy.indicators.indicator import Indicator

# indentification of indicator, internal and external usage
key = 'fixed'

# no signature, as this cannot be left_option

class Fixed(Indicator):
    def __init__(self) -> None:
        super().__init__(key)

    def add_ind_cols(self, df, setting):
        try:
            value = setting['value']
            col_name = self.key + str(value)
            if self.key not in df.columns.tolist():
                df[col_name] = value
            print(df.tail(10))
            return col_name
        except Exception as e:
            print(e)
