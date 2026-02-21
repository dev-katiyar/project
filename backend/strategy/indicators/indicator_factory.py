from strategy.indicators import ind_sma
from strategy.indicators import ind_close
from strategy.indicators import ind_max
from strategy.indicators import ind_macd
from strategy.indicators import ind_macdsignal
from strategy.indicators import ind_higherhighs
from strategy.indicators import ind_higherlows
from strategy.indicators import ind_lowerhighs
from strategy.indicators import ind_lowerlows
from strategy.indicators import ind_cmf
from strategy.indicators import ind_fixed
from strategy.indicators import ind_stoch
from strategy.indicators import ind_stochsignal
from strategy.indicators import ind_svmf
from strategy.indicators import ind_svmfsignal
from strategy.indicators import ind_rsi


class IndicatorFactory:

    def __init__(self):
        self._indicators = {}

    def register_indicator(self, ind_key, indicator):
        self._indicators[ind_key] = indicator

    def get_indicator(self, ind_key):
        indicator = self._indicators.get(ind_key)
        if not indicator:
            # raise ValueError(indicator)
            print('Indicator {} not in Dictionary'.format(ind_key))
        return indicator


factory = IndicatorFactory()

factory.register_indicator(ind_sma.key, ind_sma.svSMA)
factory.register_indicator(ind_close.key, ind_close.Close)
factory.register_indicator(ind_max.key, ind_max.svMAX)
factory.register_indicator(ind_macd.key, ind_macd.svMACD)
factory.register_indicator(ind_macdsignal.key, ind_macdsignal.svMACDSignal)
factory.register_indicator(ind_higherhighs.key, ind_higherhighs.HigherHighs)
factory.register_indicator(ind_higherlows.key, ind_higherlows.HigherLows)
factory.register_indicator(ind_lowerhighs.key, ind_lowerhighs.LowerHighs)
factory.register_indicator(ind_lowerlows.key, ind_lowerlows.LowerLows)
factory.register_indicator(ind_cmf.key, ind_cmf.CMF)
factory.register_indicator(ind_fixed.key, ind_fixed.Fixed)
factory.register_indicator(ind_stoch.key, ind_stoch.Stochastic)
factory.register_indicator(ind_stochsignal.key, ind_stochsignal.StochasticSignal)
factory.register_indicator(ind_svmf.key, ind_svmf.svMF)
factory.register_indicator(ind_svmfsignal.key, ind_svmfsignal.svMFSignal)
factory.register_indicator(ind_rsi.key, ind_rsi.svRSI)
