#import json
from flask import Blueprint, request, jsonify
#from urllib2 import Request, urlopen
#from BeautifulSoup import BeautifulSoup

api_futures = Blueprint('api_futures', __name__)


@api_futures.route('/futures/summarydata', methods=['GET'])
def load_futures_data():
    try:
        # url = "https://finviz.com/futures.ashx"
        # req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        #
        # page = urlopen(req).read()
        # page_soup = BeautifulSoup(page)
        #
        # # print("Parsing groups obj...")
        # data = page_soup.findAll("script")[17].text
        # groups_begining = data[data.index("var groups")+12:]
        # groups_string = groups_begining[:groups_begining.index(";")]
        # groups_array = json.loads(groups_string)
        #
        # # print("Parsing tiles obj...")
        # tiles_begining = data[data.index("var tiles")+12:]
        # tiles_string = tiles_begining[:tiles_begining.index(";")]
        # tiles_obj = json.loads(tiles_string)
        #
        # futures_data = []
        #
        # # print("Creating Futures quote result...")
        # for group in groups_array:
        #     for contract in group["contracts"]:
        #         quote = tiles_obj[contract["ticker"]]
        #         quote["asset"] = group["ticker"]
        #         futures_data.append(quote)
        #
        # # print(futures_data)
        return jsonify([])
    except Exception as ex:
        print(ex)
