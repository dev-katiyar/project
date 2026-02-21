from strategy.indicators.indicator import Indicator
from collections import deque
from scipy.signal import argrelextrema
import numpy as np

# indentification of indicator, internal and external usage
key = 'lowerhighs'

# no signature, as this cannot be left_option

class LowerHighs(Indicator):
    def __init__(self) -> None:
        super().__init__(key)

    def add_ind_cols(self, df, setting):
        try:
            target_col = setting['col']
            order = setting['order']
            count = 2

            col_name = target_col + self.key
            if col_name not in df.columns.tolist():
                maximas = self.get_lower_highs(df[target_col].values, order, count)
                df[col_name] = ''
                for max in maximas:
                  high1_label = df.index[max[0]]
                  high2_label = df.index[max[1]]
                  df[col_name][max[1]] = tuple([high1_label, high2_label])
            return col_name

        except Exception as e:
            print(e)

    def get_lower_highs(self, arr: np.array, order=5, K=2):
        # Get highs
        high_idx = argrelextrema(arr, np.greater, order=5)[0]
        highs = arr[high_idx]
        # Ensure consecutive highs are lower than previous highs
        extrema = []
        ex_deque = deque(maxlen=K)
        for i, idx in enumerate(high_idx):
            if i == 0:
                ex_deque.append(idx)
                continue
            if highs[i] > highs[i-1]:
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
