from strategy.indicators.indicator import Indicator
from collections import deque
from scipy.signal import argrelextrema
import numpy as np


# add col with highs tuples
def add_higher_high_cols(df, strategy_key, strategy_settings, col):
    order = strategy_settings['order']
    col_name = col + strategy_key

    if col_name not in df.columns.tolist():
        maximas = get_higher_highs(df[col].values, order, 2)
        df[col_name] = ''
        for max in maximas:
            high1_label = df.index[max[0]]
            high2_label = df.index[max[1]]
            df[col_name][max[1]] = tuple([high1_label, high2_label])
    return col_name


def get_higher_highs(arr: np.array, order=5, K=2):
    # Get highs
    high_idx = argrelextrema(arr, np.greater, order=5)[0]
    highs = arr[high_idx]
    # Ensure consecutive highs are higher than previous highs
    extrema = []
    ex_deque = deque(maxlen=K)
    for i, idx in enumerate(high_idx):
        if i == 0:
            ex_deque.append(idx)
            continue
        if highs[i] < highs[i-1]:
            ex_deque.clear()

        ex_deque.append(idx)
        if len(ex_deque) == K:
            extrema.append(list(ex_deque.copy()))

    return extrema
