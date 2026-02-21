# need to run - pip install scikit-learn
import yfinance as yf
from sklearn.ensemble import IsolationForest
import ta
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime
import dbutil


def get_anamoly_analysis(ticker):
    try:
        # Define the stock ticker and the date range (since year 2000 as of now)
        # ticker = 'AAPL'  # Apple Inc. as an example
        start_date = '2000-01-01'
        end_date = datetime.now().date()
        print(end_date)

        # Fetch the stock data from Yahoo Finance
        stock_data = yf.download(ticker, start=start_date, end=end_date)

        # Drop NaN values created by pct_change
        stock_data.dropna(inplace=True)

        # Create features out of stock OHLC data
        ## RSI
        stock_data['RSI'] = ta.momentum.rsi(stock_data['Close'], window=14)

        ## Price
        stock_data['NormalizedPrice'] = (stock_data['Close'] - stock_data['Close'].mean()) / stock_data['Close'].std()

        ## SMAs
        stock_data['SMA10'] = stock_data['Close'].rolling(window=10).mean()
        stock_data['SMA50'] = stock_data['Close'].rolling(window=50).mean()
        stock_data['SMACrossOver'] = stock_data["SMA10"] > stock_data["SMA50"]
        stock_data['Momentum'] = stock_data['SMA10'] - stock_data['SMA50']

        ## ROC and Second derivative of the ROC (Acceleration)
        roc_period = 5  # You can adjust this period
        stock_data['ROC'] = stock_data['Close'].diff(roc_period) / stock_data['Close'].shift(roc_period) * 100
        stock_data['Price_Acceleration'] = stock_data['ROC'].diff() 
        stock_data['Price_Jerk'] = stock_data['Price_Acceleration'].diff()

        ## Volume
        stock_data['Volume_sma'] = stock_data['Volume'].rolling(window=10).mean()
        stock_data['Volume_crossover'] = (stock_data['Volume_sma'] - stock_data['Volume']) / stock_data['Volume_sma']
        stock_data['Volume_chg'] = stock_data['Volume'].pct_change(periods=3)
        stock_data['NormalizedVolume'] = (stock_data['Volume'] - stock_data['Volume'].mean()) / stock_data['Volume'].std()
        stock_data['Volume_diff'] = stock_data['Volume'].diff(roc_period) / stock_data['Volume'].shift(roc_period) * 100
        stock_data['Volume_Acceleration'] = stock_data['Volume_diff'].diff()
        stock_data['Volume_Jerk'] = stock_data['Volume_Acceleration'].diff()

        ## Returns
        stock_data['Returns'] = stock_data['Close'].pct_change()
        stock_data['Returns_chg'] = stock_data['Close'].pct_change(periods=3)

        ## MACD
        short_window = 12
        long_window = 26
        signal_window = 9
        stock_data['EMA12'] = stock_data['Close'].ewm(span=short_window, adjust=False).mean()
        stock_data['EMA26'] = stock_data['Close'].ewm(span=long_window, adjust=False).mean()
        stock_data['MACD'] = stock_data['EMA12'] - stock_data['EMA26']
        stock_data['Signal Line'] = stock_data['MACD'].ewm(span=signal_window, adjust=False).mean()

        ## Rolling volatility (standard deviation of returns)
        volatility_window = 21  # Typically, 21 trading days in a month
        stock_data['Volatility'] = stock_data['Returns'].rolling(window=volatility_window).std()

        ## Bollinger Bands
        stock_data['BB_Middle'] = stock_data['Close'].rolling(window=20).mean()
        stock_data['BB_Upper'] = stock_data['BB_Middle'] + 2 * stock_data['Close'].rolling(window=20).std()
        stock_data['BB_Lower'] = stock_data['BB_Middle'] - 2 * stock_data['Close'].rolling(window=20).std()

        ## Average True Range (ATR)
        stock_data['ATR'] = ta.volatility.average_true_range(stock_data['High'], stock_data['Low'], stock_data['Close'],
                                                            window=14)

        # clean up
        stock_data.dropna(inplace=True)

        # Feature Columns for training and anamoly detection
        features_column = ['Volume_chg', 'RSI', 'Close', 'Volume', 'Volume_crossover', 'Returns', 'Momentum',
                        'Volatility', 'MACD', 'Signal Line', 'BB_Upper', 'BB_Lower', 'ATR',
                        'Price_Jerk', 'Price_Acceleration', 'Volume_Jerk', 'Volume_Acceleration', 'RSI']
        features = stock_data[features_column]

        # df for saving in DB
        df_save = stock_data[["Close"]].copy()

        # Scaling before training (normalizing)
        scaler = MinMaxScaler()
        features = scaler.fit_transform(features)

        # Initialize the Isolation Forest model
        model = IsolationForest(contamination=0.02, random_state=42)  # 1% of data points are expected to be anomalies

        # Fit the model to the data
        model.fit(features)

        # Predict anomalies (1 for normal, -1 for anomalies)
        stock_data['Anomaly'] = model.predict(features)

        # save relevant columns to mysql db
        df_save["symbol"] = ticker
        df_save["Anomaly"] = stock_data["Anomaly"].copy()
        df_save = df_save.reset_index()
        df_save.rename(columns={'index': 'Date'}, inplace=True)

        dbutil.insert_dataframe(df_save[['Date', 'symbol', 'Close', 'Anomaly']], 'symbol_anomaly')
    except Exception as ex:
        print(ex)

list_exclude = ['ACGL', 'AMCR', 'AMD', 'ODFL', 'CHTR', 'VRTX', 'GILD', 'XEL','CHD', 'DECK', 'DXCM', 'BKR','DOC', 'CCI', 'NDAQ', 'GEN', 'HUBB', 'MNST', 'MNST', 'TTWO', 'CNC', 'WTW','PFG', 'SW']
sql = "select sp.symbol, ls.alternate_name from spy_symbol sp left join list_symbol ls on sp.symbol = ls.symbol;"
symbol_dict = dbutil.get_two_col_dict(sql, 'symbol', 'alternate_name')
dbutil.truncate_table('symbol_anomaly')
for symbol, name in symbol_dict.items():
    if symbol not in list_exclude:
        get_anamoly_analysis(symbol)
