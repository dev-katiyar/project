from flask import  jsonify
import dbutil
import yfinance as yf

from flask import Blueprint

api_test = Blueprint('api_test', __name__)

@api_test.route("/test_watchlist/<watchlistId>", methods=['POST','GET'])
def getWatchListSymbolDetails(watchlistId):
    sql="""select ls.symbol,ls.last,ls.price_change,ls.change_pct from watchlist_compostion wc
           join live_symbol ls on wc.symbol = ls.symbol where wc.watchlist_id = {}""".format(watchlistId)
    watchlistData = dbutil.getDataTable(sql)
    return jsonify(watchlistData)

def test_yahoo_delayed_api():
    ticker = yf.Ticker("AAPL")
    info = ticker.info

    print(info['sector'])     # e.g., Technology
    print(info['industry'])   # e.g., Consumer Electronics
    print(info['longName'])   # e.g., Apple Inc.
