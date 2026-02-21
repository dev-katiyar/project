# format is {'key': [condition1, condition2, ...]} defaults used but replaced by theuser
# all conditions are 'AND'

# TODO: AK 2022-03-08 - use indicator defaults for consistency
# TODO: AK 2022-03-08 - figure out how ca sb gt lt strategies can be put here or else where to be used by all indicators and strategies

strategies = {
    'rsibud': [
        {
            "key": "rsi",
            "name": "MACD",
            "settings": [
                {
                    "key": "timeperiod",
                    "value": 14
                }
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "higherlows",
                    "name": "Higher Lows",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
        {
            "key": "close",
            "name": "Price",
            "settings": [
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "lowerlows",
                    "name": "Lower Lows",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
    ],
    'rsibed': [
        {
            "key": "rsi",
            "name": "RSI",
            "settings": [
                {
                    "key": "timeperiod",
                    "value": 14
                }
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "lowerhighs",
                    "name": "Lower Highs",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
        {
            "key": "close",
            "name": "Price",
            "settings": [
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "higherhighs",
                    "name": "Higher Highs",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
    ],
    'macdbud': [
        {
            "key": "macd",
            "name": "MACD",
            "settings": [
                {
                    "key": "fastperiod",
                    "value": 12
                },
                {
                    "key": "slowperiod",
                    "value": 26
                },
                {
                    "key": "signalperiod",
                    "value": 12
                }
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "higherlows",
                    "name": "Higher Lows",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
        {
            "key": "close",
            "name": "Price",
            "settings": [
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "lowerlows",
                    "name": "Lower Lows",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
    ],
    'macdbed': [
        {
            "key": "macd",
            "name": "MACD",
            "settings": [
                {
                    "key": "fastperiod",
                    "value": 12
                },
                {
                    "key": "slowperiod",
                    "value": 26
                },
                {
                    "key": "signalperiod",
                    "value": 12
                }
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "lowerhighs",
                    "name": "Lower Highs",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
        {
            "key": "close",
            "name": "Price",
            "settings": [
            ],
            "selected_strategy": {
                "key": "pattern",
                "type": "pattern",
                "settings": [],
                "selected_option": {
                    "key": "higherhighs",
                    "name": "Higher Highs",
                    "settings": [
                        {
                            "key": "order",
                            "value": 5
                        },
                        {
                            "key": "ticks",
                            "value": 5
                        }
                    ]
                }
            }
        },
    ]
}
