from flask import jsonify
import json
import datetime
import urllib
from flask import Blueprint
from MyConfig import MyConfig as cfg
import datetimeutil

api_options = Blueprint('api_options', __name__)

url_iex_stocks = "https://cloud.iexapis.com/stable/stock"


@api_options.route("/symbol/option_old/<symbol>", methods=['GET', 'POST'])
def getSymbolOptionsExpiration(symbol):
    url = "{}/{}/options?token={}".format(url_iex_stocks, symbol, cfg.IEX_API_KEY)
    data = urllib.urlopen(url, timeout=30).read()
    feed_data = json.loads(data)
    response = []
    for year_month in feed_data:
        year = int(str(year_month)[:4])
        month = int(str(year_month)[4:6])
        month_name = datetime.date(year, month, 1).strftime('%B')
        response.append({"id": year_month, "name": "{},{}".format(month_name, year)})

    print(response)
    return jsonify(response)


@api_options.route("/symbol/option_old/<symbol>/<expiration>", methods=['GET', 'POST'])
def getSymbolOptions(symbol, expiration):
    url = url = "{}/{}/options/{}?token={}".format(url_iex_stocks, symbol, expiration, cfg.IEX_API_KEY)
    data = urllib.urlopen(url, timeout=30).read()
    calls = []
    puts = []
    feed_data = json.loads(data)
    feed_data = map(lambda option: formatOptions(option), feed_data)
    # list1.map(f)  map(f,list1)

    return jsonify({"calls": filter(lambda item: (item['side'] == "call"), feed_data),
                    "puts": filter(lambda item: (item['side'] == "put"), feed_data)})


def formatOptions(option):
    del option['lastUpdated']
    temp = datetimeutil.getdatefromstr_format(option['expirationDate'], '%Y%m%d')
    option['expirationDate'] = datetimeutil.format_date(temp, "%B ,%d %Y")
    return option
