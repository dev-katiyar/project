# default settings for each indicator

close_defaults = {
    'key': 'close',
    'name': 'Price',
    'settings': [],
}

cmf_defaults = {
    'key': 'cmf',
    'name': 'Chaikin Money Flow',
    'settings': [
        {'key': 'timeperiod', 'value': 14}
    ]
}

fixed_defaults = {
    'key': 'fixed',
    'name': 'Fixed Value',
    'settings': [
        {'key': 'value', 'value': 0.00}
    ]
}

higherhighs_defaults = {
    'key': 'higherhighs',
    'name': 'Higher Highs',
    'settings': [
        {'key': 'order', 'value': 5},
        {'key': 'ticks', 'value': 5}
    ]
}

higherlows_defaults = {
    'key': 'higherlows',
    'name': 'Higher Lows',
    'settings': [
        {'key': 'order', 'value': 5},
        {'key': 'ticks', 'value': 5}
    ]
}

lowerhighs_defaults = {
    'key': 'lowerhighs',
    'name': 'Lower Highs',
    'settings': [
        {'key': 'order', 'value': 5},
        {'key': 'ticks', 'value': 5}
    ]
}

lowerlows_defaults = {
    'key': 'lowerlows',
    'name': 'Lower Lows',
    'settings': [
        {'key': 'order', 'value': 5},
        {'key': 'ticks', 'value': 5}
    ]
}

macd_defaults = {
    'key': 'macd',
    'name': 'MACD',
    'settings': [
        {'key': 'fastperiod', 'value': 12},
        {'key': 'slowperiod', 'value': 26},
        {'key': 'signalperiod', 'value': 9}
    ]
}

macdsignal_defaults = {
    'key': 'macdsignal',
    'name': 'Signal',
    'settings': []
}

max_defaults = {
    'key': 'max',
    'name': 'Maximum',
    'settings': [
        {'key': 'timeperiod', 'value': 5},
        {'key': 'col', 'value': 'close'}
    ]
}

sma_defaults = {
    'key': 'sma',
    'name': 'SMA',
    'settings': [
        {'key': 'timeperiod', 'value': 20}
    ]
}

stoch_defaults = {
    'key': 'stoch',
    'name': 'Stochastic',
    'settings': [
        {'key': 'timeperiod', 'value': 14},
        {'key': 'fastk_period', 'value': 9},
        {'key': 'fastd_period', 'value': 5}
    ]
}

stochsignal_defaults = {
    'key': 'stochsignal',
    'name': 'Signal',
    'settings': []
}

svmf_defaults = {
    'key': 'svmf',
    'name': 'SV Money Flow',
    'settings': [
        {'key': 'timeperiod', 'value': 14},
        {'key': 'fastk_period', 'value': 9},
        {'key': 'fastd_period', 'value': 5}
    ]
}

svmfsignal_defaults = {
    'key': 'svmfsignal',
    'name': 'Flow Signal',
    'settings': []
}

rsi_defaults = {
    'key': 'rsi',
    'name': 'RSI',
    'settings': [
        {'key': 'timeperiod', 'value': 14}
    ]
}