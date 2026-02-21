from flask import Flask
from flask import jsonify
import json

app = Flask(__name__)


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


@app.route('/stg/indicators_test', methods=['GET'])
def get_indicators():
    f = open('backend/strategy_samples/indicators.json')
    ui = json.load(f)
    return jsonify(ui)

if __name__ == "__main__":
    app.run()
