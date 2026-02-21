
from flask import Blueprint, jsonify, request
import json
from backtesting import run_algo

api_backtesting = Blueprint('api_backtesting', __name__)


@api_backtesting.route("/backtest-basic", methods=['GET', 'POST'])
def get_backtest_run_data():
    post_data = json.loads(request.data)

    symbols = post_data['symbols']
    bt_out_df = run_algo(symbols)
    last_row_dict = bt_out_df.tail(1).to_dict(orient='records')[0]

    last_row_dict['transactions'] = []
    last_row_dict['orders'] = []

    # accumulate all in one dict
    for index, row in bt_out_df.iterrows():
        transactions = row['transactions']
        orders = row['orders']
        last_row_dict['transactions'].extend(transactions)
        last_row_dict['orders'].extend(orders)

    # to avoid seialization issues
    for tran in last_row_dict['transactions']:
        tran['sid'] = tran['sid'].symbol
    for ord in last_row_dict['orders']:
        ord['sid'] = ord['sid'].symbol
    for pos in last_row_dict['positions']:
        pos['sid'] = pos['sid'].symbol
    return jsonify(last_row_dict)

