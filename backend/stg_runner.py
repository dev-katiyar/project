import stg_data_feed
from strategy.indicators import indicator_factory
from strategy.strategies.strategies_dictionary import strategies


def run_strategy(strategy_inputs):
    symbol = strategy_inputs['symbol']
    start_date = strategy_inputs['start_date']
    end_date = strategy_inputs['end_date']
    is_debug = strategy_inputs['isDebug']

    df = stg_data_feed.get_stg_input_df(symbol, start_date, end_date)

    signal_generator = SignalGenerator(df)
    # [AK: 2022-02-25] => Ignoring AND and OR for now. These can be processed in this function
    signal_generator.generate_signals(strategy_inputs['buy_conditions']['strategy_list'], 'buy_score')
    signal_generator.generate_signals(strategy_inputs['sell_conditions']['strategy_list'],'sell_score')
    if 'chart_conditions' in strategy_inputs:
        signal_generator.add_chart_columns(strategy_inputs['chart_conditions'])

    df['symbol'] = symbol
    df['buy_rating'] = df.apply(lambda row: 'Strong Buy' if row['buy_score'] == 1 else ('Buy' if row['buy_score'] <= 0.5 and row['buy_score']> 0 else ''), axis=1)
    df['sell_rating'] = df.apply(lambda row: 'Strong Sell' if row['sell_score'] == 1 else ('Sell' if row['sell_score'] <= 0.5 and row['sell_score']> 0  else ''), axis=1)
    df['action'] = df.apply(lambda row: 'Strong Sell' if row['sell_rating'] == 'Strong Sell' else ('Strong Buy' if row['buy_rating'] == "Strong Buy" else ''), axis=1)

    if is_debug == False:
        df = df[['symbol', 'close', 'action']]

    return df


class SignalGenerator():
    def __init__(self, df) -> None:
        self.df = df

    def generate_signals(self, conditions, res_col):
        self.df[res_col] = 0
        count = 0

        # for each and condition
        for condition in conditions:
            stg_type = condition['selected_strategy']['type']

            signal_col = ''
            if stg_type == 'double':
                signal_col = self.add_double_type_signal(condition)
            if stg_type == 'pattern':  # [AK 2022-02-25]: may merge with single, lets see
                signal_col = self.add_pattern_type_signal(condition)
            if stg_type == 'strategy': 
                signal_col = self.add_strategy_type_signal(condition)

            if signal_col != '':
                self.df[res_col] = self.df[res_col] + self.df[signal_col] * 1
                count += 1
        
        if count > 0:
            self.df[res_col] = self.df[res_col] / count
            print(self.df)
    
    def add_double_type_signal(self, condition):
        # set up left indicator cols
        left_key = condition['key']
        left_setting = arryOfObjToDict(condition['settings'])
        left_ind_obj = indicator_factory.factory.get_indicator(left_key)()
        left_col = left_ind_obj.add_ind_cols(self.df, left_setting)

        # set up right indicator cols
        right_option = condition['selected_strategy']['selected_option']
        right_key = right_option['key']
        right_setting = arryOfObjToDict(right_option['settings'])
        if right_setting == {}:
            right_setting = left_setting   # [AK 2022-03-06]: little risky, e.g. macd signal will used macd settings
        right_ind_obj = indicator_factory.factory.get_indicator(right_key)()
        right_col = right_ind_obj.add_ind_cols(self.df, right_setting)
        
        # add signal col and return its name
        strategy_key = condition['selected_strategy']['key']
        return left_ind_obj.operate(self.df, strategy_key, left_col, right_col)


    def add_pattern_type_signal(self, condition):
        # set up left indicator cols
        left_key = condition['key']
        left_setting = arryOfObjToDict(condition['settings'])
        left_ind_obj = indicator_factory.factory.get_indicator(left_key)()
        left_col = left_ind_obj.add_ind_cols(self.df, left_setting)

        # set up right cols
        right_option = condition['selected_strategy']['selected_option']
        right_key = right_option['key']
        right_setting = arryOfObjToDict(right_option['settings'])
        right_setting['col'] = left_col
        right_ind_obj = indicator_factory.factory.get_indicator(right_key)()
        right_col = right_ind_obj.add_ind_cols(self.df, right_setting)

        strategy_key = condition['selected_strategy']['key']
        strategy_settings = arryOfObjToDict(condition['selected_strategy']['settings'])
        pattern_ticks = strategy_settings['ticks'] if 'ticks' in strategy_settings else 5

        return left_ind_obj.pattern(self.df, strategy_key, right_key, right_col, pattern_ticks)

     # not very generic as of now, only one setting supported, but should serve the purpose
    def add_strategy_type_signal(self, condition): 
        left_key = condition['key']
        left_setting = condition['settings']

        strategy_key = condition['selected_strategy']['key']
        conditions = strategies[strategy_key]

        strategy_settings = arryOfObjToDict(condition['selected_strategy']['settings'])
        ticks = strategy_settings['ticks'] if 'ticks' in strategy_settings else 5

        for condition in conditions:
            if condition['key'] == left_key:
                condition['settings'] = left_setting
                for setting in condition['settings']:
                    if setting['key'] == 'ticks':
                        setting['key'] = ticks
        
        # set up left indicator cols
        res_col = left_key + strategy_key
        return self.generate_strategy_signal(conditions, res_col)

    def generate_strategy_signal(self, conditions, res_col):  # can be merged with similar funciotn above and AND and OR are sorted
        self.df[res_col] = True

        # for each and condition
        for condition in conditions:
            stg_type = condition['selected_strategy']['type']

            signal_col = ''
            if stg_type == 'double':
                signal_col = self.add_double_type_signal(condition)
            if stg_type == 'pattern':  # [AK 2022-02-25]: may merge with single, lets see
                signal_col = self.add_pattern_type_signal(condition)
            if stg_type == 'strategy': 
                signal_col = self.add_strategy_type_signal(condition)

            if signal_col != '':        
                self.df[res_col] = self.df[res_col] & self.df[signal_col]

        return res_col

    def add_chart_columns(self, chart_conditions):
        if(chart_conditions):
            conditions = chart_conditions['strategy_list']
            for condition in conditions:
                # set up left indicator cols
                left_key = condition['key']
                left_setting = arryOfObjToDict(condition['settings'])
                left_ind_obj = indicator_factory.factory.get_indicator(left_key)()
                left_ind_obj.add_ind_cols(self.df, left_setting)


# to convert settings array to a dictionary
def arryOfObjToDict(arr):
    return {x['key']: x['value'] for x in arr}
