from strategy.indicators.indicator import Indicator
from collections import deque
from scipy.signal import argrelextrema
import numpy as np

# indentification of indicator, internal and external usage
key = 'higherlows'

# no signature, as this cannot be left_option

class HigherLows(Indicator):
    def __init__(self) -> None:
        super().__init__(key)

    def add_ind_cols(self, df, setting):
        try:
            target_col = setting['col']
            order = setting['order']
            count = 2

            col_name = target_col + self.key
            if col_name not in df.columns.tolist():
                minimas = self.get_higher_lows(df[target_col].values, order, count)
                df[col_name] = ''
                for min in minimas:
                  low1_label = df.index[min[0]]
                  low2_label = df.index[min[1]]
                  df[col_name][min[1]] = tuple([low1_label, low2_label])
            return col_name

        except Exception as e:
            print(e)

    def get_higher_lows(self, arr: np.array, order=5, K=2):
        # Get lows
        low_idx = argrelextrema(arr, np.less, order=5)[0]
        lows = arr[low_idx]
        # Ensure consecutive lows are higher than previous lows
        extrema = []
        ex_deque = deque(maxlen=K)
        for i, idx in enumerate(low_idx):
            if i == 0:
                ex_deque.append(idx)
                continue
            if lows[i] < lows[i-1]:
                ex_deque.clear()

            ex_deque.append(idx)
            if len(ex_deque) == K:
                extrema.append(list(ex_deque.copy()))

        return extrema

    def operate(self, df, operator, left_col, right_col):
      if hasattr(self, operator):
          return getattr(self, operator)(df, operator, left_col, right_col)
      else:
          raise Exception('Operator {} not supported'.format(operator))
