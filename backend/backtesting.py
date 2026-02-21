from zipline.examples import buyapple
from zipline.api import order, record, symbol
from zipline import run_algorithm
import pandas as pd
import pandas_datareader.data as web

g_symbols = []

def initialize(context):
    context.symbols = g_symbols


def handle_data(context, data):
    symbols = context.symbols
    # right now only for one symbol
    current_symbol = symbols[0]
    order(symbol(current_symbol), 10)
    record(current_symbol=data.current(symbol(current_symbol), 'price'))

def run_algo(symbols):
    global g_symbols 
    g_symbols = symbols
    start = pd.Timestamp(year=2017, month=5, day=1)
    end = pd.Timestamp(year=2017, month=5, day=31)

    sp500 = web.DataReader('SP500', 'fred', start, end).SP500
    benchmark_returns = sp500.pct_change()

    result = run_algorithm(start=start,
                       end=end,
                       initialize=initialize,
                       handle_data=handle_data,
                       capital_base=100000,
                       benchmark_returns=benchmark_returns,
                       bundle='quandl',
                       data_frequency='daily')

    return result
