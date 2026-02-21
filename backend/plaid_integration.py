# TODO: User ID need to be sent from front end and passed to LinkTokenCreateRequest to track user in Plaid ecosystem

from MyConfig import MyConfig as cfg
from flask import Blueprint, request, jsonify
import login
import dbutil
import datetimeutil

# Plaid depedencies
import time
import json
import plaid
from plaid.api import plaid_api
from plaid.model.products import Products
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.country_code import CountryCode
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest


# Setting up API endpoints for SV Client App
api_sv_plaid = Blueprint('api_sv_plaid', __name__)


# Important configs to connect with Plaid (Unique for each Customer like SV)
PLAID_CLIENT_ID = cfg.PLAID_CLIENT_ID
PLAID_SECRET = cfg.PLAID_SECRET
PLAID_ENV = cfg.PLAID_ENV
PLAID_PRODUCTS = cfg.PLAID_PRODUCTS
PLAID_COUNTRY_CODES = cfg.PLAID_COUNTRY_CODES
PLAID_REDIRECT_URI = cfg.PLAID_REDIRECT_URI

# finally it should be only 'Production' for both MyConfig and here for clean view
host = plaid.Environment.Sandbox

if PLAID_ENV == 'sandbox':
    host = plaid.Environment.Sandbox

if PLAID_ENV == 'development':
    host = plaid.Environment.Development

if PLAID_ENV == 'production':
    host = plaid.Environment.Production

configuration = plaid.Configuration(
    host=host,
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET,
        'plaidVersion': '2020-09-14'
    }
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

products = []
for product in PLAID_PRODUCTS:
    products.append(Products(product))

# TODO: these need to be stored in plaid table reateld to each user, as needed
access_token = None  # SAVE for each user and their institution
item_id = None  # SAVE for each user and their institution 


# Needed to establish a valid connection between SV App and Plaid 
# This token given by Plaid to be used by Front End Plaid Widget to directly talk to plaid server
# This token sets up the Plaid Front End Widget setting for SV and assure Plaid that its indeed SV talking to them
@api_sv_plaid.route('/plaid/create_link_token', methods=['POST'])
def create_link_token():
    try:
        request = LinkTokenCreateRequest(
            products=products,
            client_name="SimpleVisor",
            country_codes=list(map(lambda x: CountryCode(x), PLAID_COUNTRY_CODES)),
            language='en',
            user=LinkTokenCreateRequestUser(client_user_id=str(time.time()))
        )

    # create link token
        response = client.link_token_create(request)
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        print(e)
        return json.loads(e.body)


# front end widget of Plaid will give public token and some info about account on user login
# this public_token too be exchanged for a permanent access_token for future communiation related to user account
# save accoount info and this access token in DB for each user.
@api_sv_plaid.route('/plaid/set_access_token', methods=['POST'])
def get_access_token():
    user_id = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]

    plaid_metadata = json.loads(request.data)
    public_token = plaid_metadata['public_token']
    user_accounts = plaid_metadata['accounts']
    user_institution = plaid_metadata['institution']
    if len(user_accounts) < 1:
        return jsonify({
            "error": "There are no accounts to be saved to get access token. Contact SimpleVisor Support.", 
            "message": ""
        })
    if user_id == 0:
        return jsonify({
            "error": "No valid SimpleVisor user found. Contact SimpleVisor Support.",
            "message": ""
        })
    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_token = exchange_response['access_token']
        item_id = exchange_response['item_id']
        save_user_account_access_data(user_id, access_token, item_id, user_institution, user_accounts)
        return jsonify({
            "error": "",
            "message": "Account linking was successful.",
            "linked_accounts": user_accounts
        })
    except plaid.ApiException as e:
        print(e)
        return jsonify({
            "error": json.loads(e.body),
            "message": ""
        })


# saves linkage data in SV database for future interaction, unless revoked
def save_user_account_access_data(user_id, access_token, item_id, user_institution, user_accounts):
    try:
        # format sql statements
        sql_list = []
        for user_account in user_accounts:
            sql = """
            INSERT INTO `users_plaid_accounts`
                (`user_id`,
                `item_id`,
                `access_token`,
                `institution_id`,
                `institution_name`,
                `account_id`,
                `account_mask`,
                `account_name`,
                `account_type`,
                `account_subtype`)
                VALUES
                ({}, '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}');
            """.format(
                user_id,
                item_id,
                access_token,
                user_institution['institution_id'],
                user_institution['name'],
                user_account['id'],
                user_account['mask'],
                user_account['name'],
                user_account['type'],
                user_account['subtype'],
            )
            sql_list.append(sql)
        # save in db
        dbutil.execute_query(sql_list)
    except Exception as ex:
        print(ex)


# get user accoungs already linked and saved in SV DB for given user
@api_sv_plaid.route('/plaid/get_linked_user_accounts', methods=['GET'])
def get_linked_user_accounts():
    user_id = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
    if user_id == 0:
        return jsonify({
            "error": "No valid SimpleVisor user found. Contact SimpleVisor Support.",
            "message": ""
        })
    try:
        sql = """
            SELECT * 
            FROM users_plaid_accounts 
            WHERE user_id = {};
        """.format(user_id)
        user_accounts = dbutil.getDataTableNoLimit(sql)
        for u_acc in user_accounts:
            u_acc.pop('user_id')
            u_acc.pop('item_id')
            u_acc.pop('access_token')
        return jsonify({
            "error": "",
            "user_accounts": user_accounts
        })
    except Exception as e:
        print(e)
        return jsonify({
            "error": "There is an issue with the server. Please contact support",
            "message": json.loads(e)
        })


# gets holdings for the linked account for the user via access token
@api_sv_plaid.route('/plaid/get_user_account_holdings', methods=['POST'])
def get_user_account_holdings():
    user_id = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
    if user_id == 0:
        return jsonify({
            "error": "No valid SimpleVisor user found. Contact SimpleVisor Support.",
            "message": ""
        })
    
    post_data = json.loads(request.data)
    account_id = post_data['account_id']

    # get access token from DB
    try:
        sql = """
            SELECT * 
            FROM users_plaid_accounts 
            WHERE account_id = '{}';
        """.format(account_id)
        user_accounts = dbutil.getDataTableNoLimit(sql)
        if len(user_accounts) < 1:
            return jsonify({
                'error': 'No linked account found for the user.',
                'user_account_holdings': []
            })
        user_account = user_accounts[0]
    except Exception as e:
        print(e)
        return jsonify({
            'error': 'Issue in getting user account data from SV DB.',
            'message': json.loads(e)
        })
    # get holding data from Plaid
    try:
        access_token = user_account['access_token']
        holding_request = InvestmentsHoldingsGetRequest(
            access_token=access_token, 
            options={"account_ids": [account_id]}
        )
        response = client.investments_holdings_get(holding_request)
        return jsonify({'error': '', 'user_account_holdings': response.to_dict()})
    except Exception as e:
        print(e)
        return jsonify({
            'error': 'Issue in getting account holdings data from Plaid.',
            'message': json.loads(e)
        })
    

# gets transactoins data for the linked account for the user via access token
@api_sv_plaid.route('/plaid/get_user_account_transactions', methods=['POST'])
def get_user_account_transations():
    user_id = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
    if user_id == 0:
        return jsonify({
            "error": "No valid SimpleVisor user found. Contact SimpleVisor Support.",
            "message": ""
        })
    
    post_data = json.loads(request.data)
    account_id = post_data['account_id']

    # get access token from DB
    try:
        sql = """
            SELECT * 
            FROM users_plaid_accounts 
            WHERE account_id = '{}';
        """.format(account_id)
        user_accounts = dbutil.getDataTableNoLimit(sql)
        if len(user_accounts) < 1:
            return jsonify({
                'error': 'No linked account found for the user.',
                'user_account_transactions': []
            })
        user_account = user_accounts[0]
    except Exception as e:
        print(e)
        return jsonify({
            'error': 'Issue in getting user account data from SV DB.',
            'message': json.loads(e)
        })
    # get holding data from Plaid
    try:
        access_token = user_account['access_token']
        transactions_request = InvestmentsTransactionsGetRequest(
            access_token=access_token, 
            start_date=datetimeutil.getdatefromstr(datetimeutil.getbackdatestr(365)).date(),  # defaults to past 1 year transactions
            end_date=datetimeutil.get_today_date().date(),
            options={"account_ids": [account_id], "count": 500}
        )
        response = client.investments_transactions_get(transactions_request)
        return jsonify({'error': '', 'user_account_transactions': response.to_dict()})
    except Exception as e:
        print(e)
        return jsonify({
            'error': 'Issue in getting account transactions data from Plaid.',
            'message': json.loads(e)
        })
    