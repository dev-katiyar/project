from urllib.request import Request, urlopen
from flask import Flask
from flask_cors import CORS
import requests
import utils
import datetimeutil
from flask import request, make_response, jsonify
import stripe_payment
import dbutil
import json
from datetime import datetime, timedelta
import login
from model_portfolio_api import api_model_portfolio
from retirement_401k_api import api_401k
from login_api import api_login
from symbol_api import api_symbol
from portfolio_api import api_portfolio
from test_api import api_test
from dividend_api import api_dividend
from ai_regimes_api import api_ai_regimes
from technicals import api_technicals
from tpa_api import api_tpa
from options import api_options
import pytz
from algo_trading import api_algotrading
from investing import api_investing
from screen import api_screen
from rapid_api import api_rapid
from eod_api import api_eod
from tv_api import api_tv
from relative_analysis_api import api_relative_analysis
from absolute_analysis_api import api_absolute_analysis
from futures_data_api import api_futures
from strategy_api import api_strategy
from stg_api import api_stg
from super_investor_api import api_super_investor
from dynamic_columns import api_dynamic_columns
import dataframe_utils
from dao import mongodb
import certifi
from model_portfolio_api import get_model_portfolio_symbols
from factor_analysis_api import api_factor_analysis
from riskrange_analysis_api import api_riskrange_analysis
# from plaid_integration import api_sv_plaid
from news_feed_api import api_newsrss
from MyConfig import MyConfig as cfg
from ai_agents_api import api_ai_agents
from fred_data_api import api_fred_data
import fnmatch
#from backtesting_api import api_backtesting
import secrets
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB total request
app.config['MAX_FORM_MEMORY_SIZE'] = 100 * 1024 * 1024  # 100MB for form fields (Flask 2.3+)

# For older Flask/Werkzeug versions, also set this:
from werkzeug.formparser import FormDataParser
FormDataParser.max_form_memory_size = 100 * 1024 * 1024  # 100MB

CORS(app, resources={r"/*": {"origins": "*"}})  # for Cors Issue
app.register_blueprint(api_401k)
app.register_blueprint(api_model_portfolio)
app.register_blueprint(api_login)
app.register_blueprint(api_symbol)
app.register_blueprint(api_portfolio)
app.register_blueprint(api_test)
app.register_blueprint(api_dividend)
app.register_blueprint(api_ai_regimes)
app.register_blueprint(api_technicals)
app.register_blueprint(api_tpa)
app.register_blueprint(api_options)
app.register_blueprint(api_algotrading)
app.register_blueprint(api_rapid)
app.register_blueprint(api_eod)
app.register_blueprint(api_tv)
app.register_blueprint(api_relative_analysis)
app.register_blueprint(api_absolute_analysis)
app.register_blueprint(api_investing)
app.register_blueprint(api_futures)
app.register_blueprint(api_screen)
app.register_blueprint(api_strategy)
app.register_blueprint(api_stg)
app.register_blueprint(api_dynamic_columns)
app.register_blueprint(api_super_investor)
app.register_blueprint(api_factor_analysis)
app.register_blueprint(api_riskrange_analysis)
# app.register_blueprint(api_sv_plaid)
app.register_blueprint(api_newsrss)
app.register_blueprint(api_ai_agents)
app.register_blueprint(api_fred_data)
# app.register_blueprint(api_backtßesting)


# Define routes that don't need authentication
PUBLIC_ROUTES = [
    '/login*', 
    '/register2024*',
    '/register/usercheck*',
    '/subscriptions/all*',
    '/user/validate-captcha*',
    '/user/tpaAmdin*',
    '/register/reset-password-request*',
    '/register/reset-password/verify-token*',
    '/register/reset-password*',
    '/weekly_report*',
    '/contact*',
    '/email_robovisor_support*',
    '/forgotPassword*',
    '/states*',
    '/upgrade*',
    '/tv*',
    '/relative-analysis-sectors*',
    '/register/validate-promo-code*',
]

# Routes that can be accessed via API keys (subset of non-public routes)
API_KEY_ROUTES = [
    '/modelportfolio/read*',  # Example: Historical data
    '/factor-analysis/excess-returns*',
    '/riskrange-analysis*'
]

@app.before_request
def check_authentication():
    # Skip authentication for OPTIONS requests (CORS preflight)
    if request.method == 'OPTIONS':
        return None

    # Skip authentication for public routes
    for route in PUBLIC_ROUTES:
        if fnmatch.fnmatch(request.path, route):
            return None
    
    # check if api key is there 
    api_key = request.headers.get('X-API-Key')
    if api_key:
        user_data, msg = validate_api_key(api_key)
        if msg:
            responseObject = {
                'status': 'fail',
                'message': msg,
                'auth_required': True
            }
            return make_response(jsonify(responseObject)), 401
        
        is_valid_api_route = validate_api_route(request.path)
        if user_data and is_valid_api_route:
            return None  # Allow access
        else:
            responseObject= {
                'status': 'fail',
                'auth_required': True
            }
            if not user_data:
                responseObject['message'] = 'Invalid API key'
            else:
                responseObject['message'] = 'Invalid API Route',
            return make_response(jsonify(responseObject)), 401

    # Check token for all other routes
    token_check = login.checkToken(request)
    
    if token_check['status'] == 'fail':
        responseObject = {
            'status': 'fail',
            'message': token_check['message'],
            'auth_required': True
        }
        return make_response(jsonify(responseObject)), 401
    
    # Store user data in Flask's g object for use in routes, we can use if needed
    from flask import g
    g.current_user = token_check['data']
    
    return None  # Continue to the route

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers',
                         'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods',
                         'GET,PUT,POST,DELETE,OPTIONS')
    response.headers['Access-Control-Expose-Headers'] = 'x-wp-total, x-wp-totalpages'
    return response


# Check if route is valid for API access
def validate_api_route(route):
    for route in API_KEY_ROUTES:
        if fnmatch.fnmatch(request.path, route):
            return True

# Helper function to validate API key
def validate_api_key(api_key):
    try:
        msg = None
        # Get all active API keys from DB
        sql = "SELECT user_id, api_key_hash, expires_at FROM users_api_keys WHERE active = 1"
        results = dbutil.getDataTable(sql)

        if not results:
            msg = 'No active API keys found'
            return None, msg

        for row in results:
            if check_password_hash(row['api_key_hash'], api_key):
                # Check expiration
                if row['expires_at'] and datetimeutil.get_today_date() > row['expires_at']:
                    msg = 'API key has expired'
                    return None, msg
                
                # Fetch user details (user details for loggging only to track misuse)
                user_sql = """
                    SELECT userId, emailaddress, isPaid, substype 
                    FROM users 
                    WHERE userId = {}""".format(row['user_id'])
                user_data = dbutil.getOneRow(user_sql, None)
                
                if user_data:
                    user = {
                        'user_id': user_data['userId'],
                        'email': user_data['emailaddress'],
                        'isPaid': user_data['isPaid'],
                        'substype': user_data.get('substype', ''),
                    }
                    print(user)
                    return user, msg
        return None, msg
    except Exception as e:
        print(f"API key validation error: {e}")
        msg = 'Error validating API key'
        return None, msg


# New route for generating API keys (requires token auth)
@app.route("/generate-api-key", methods=['GET'])
def generate_api_key():
    # This route requires token auth (handled by before_request)
    from flask import g
    user_id = g.current_user['user_id']
    
    # Generate a secure API key
    api_key = secrets.token_urlsafe(64)  # 64-char secure key
    api_key_hash = generate_password_hash(api_key)
    
    # Check if user already has an active key
    existing_sql = """
        SELECT COUNT(*) as count 
        FROM users_api_keys 
        WHERE user_id = {}
        AND active = 1""".format(user_id)
    count = dbutil.getOneRow(existing_sql, "count")

    create_date = datetimeutil.getcurtimestr()

    # if exists then update
    if count > 0:
        sql = """
            UPDATE users_api_keys SET
                `api_key_hash` = '{}',
                `created_at` = '{}',
                `active` = {}
            WHERE `user_id` = {};""".format(api_key_hash, create_date, 1, user_id)
    else:
        # Insert into DB
        sql = """
            INSERT INTO users_api_keys 
                (user_id, api_key_hash, created_at, active) 
            VALUES ({}, '{}', '{}', {})""".format(user_id, api_key_hash, create_date, 1)
    dbutil.execute_single_query(sql)
    
    # Return the plain key (user must store it securely; not retrievable later)
    return jsonify({"status": "success", "api_key": api_key, "message": "Key Generated. Store this key securely. It won't be shown again once you leave this page."})


@app.route("/wp-json/wp/v2/media/<mediaId>", methods=['GET'])
def getWordPressMedia(mediaId):
    proj = {
        'data.id': 1, 'data.media_details.width': 1, 'data.media_details.height': 1,
        'data.source_url': 1, 'data.media_details.file': 1
    }
    data = mongodb.get_data_specific_cols(
        "wordpressMedia", {"mediaId": int(mediaId)}, proj)
    if len(data) > 0:
        return jsonify(data[0]["data"])
    else:
        try:
            # saveMedia(int(mediaId))
            data = mongodb.get_data(
                "wordpressMedia", {"mediaId": int(mediaId)})
        except Exception as ex:
            print(ex)

        finally:
            if len(data) > 0:
                return jsonify(data[0]["data"])
            else:
                return {}  # we can return some default placeholder image can be sent


@app.route("/wp-json/wp/v2/posts", methods=['GET'])
def getWordPress():
    categories = request.args.getlist('categories')
    categories = categories[len(categories) - 1]
    per_page = int(request.args.get('per_page'))
    offset = int(request.args.get('offset'))
    print(per_page)
    proj = {
        'data.id': 1, 'data.date': 1, 'data.title.rendered': 1,
        'data.content.rendered': 1, 'data.excerpt.rendered': 1,
        'data.author': 1, 'data.featured_media': 1, 'data.link': 1,
        'data.yoast_head_json.twitter_misc.Written by': 1,
        'data.yoast_head_json.og_image': 1,
    }
    data = mongodb.get_data_specific_cols(
        "wordpress_aug22", {"category": categories}, proj)
    size = len(data[0]["data"])
    endIndex = offset + per_page
    if (endIndex >= size):
        endIndex = size
    result = data[0]["data"][offset: endIndex]
    resp = make_response(jsonify(result))
    resp.headers['x-wp-total'] = size
    resp.headers['x-wp-totalpages'] = int(size / per_page) if per_page else 1
    resp.headers['access-control-expose-headers'] = 'x-wp-total, x-wp-totalpages'
    return resp


@app.route("/wp-json/wordpress-popular-posts/v1/popular-posts", methods=['GET'])
def getWordPressPopular():
    proj = {
        'data.id': 1, 'data.date': 1, 'data.title.rendered': 1,
        'data.content.rendered': 1, 'data.excerpt.rendered': 1,
        'data.author': 1, 'data.featured_media': 1, 'data.link': 1,
        'data.yoast_head_json.twitter_misc.Written by': 1,
        'data.yoast_head_json.og_image': 1,
    }
    data = mongodb.get_data_specific_cols("wordpressPopular_aug22", {}, proj)
    size = len(data[0]["data"])
    limit = int(request.args.get('limit'))
    offset = int(request.args.get('offset'))
    endIndex = offset + limit
    if (endIndex >= size):
        endIndex = size - 1
    result = data[0]["data"][offset: endIndex]
    return jsonify(result)


@app.route("/wp-json/wp/v2/recent_posts/<limit>", methods=['GET'])
def getWordPressRecentLimited(limit):
    proj = {
        'data.id': 1, 'data.date': 1, 'data.title.rendered': 1,
        'data.content.rendered': 1, 'data.excerpt.rendered': 1,
        'data.author': 1, 'data.featured_media': 1, 'data.link': 1,
        'data.yoast_head_json.twitter_misc.Written by': 1,
        'data.yoast_head_json.og_image': 1, 'data.category': 1,
    }
    data = mongodb.get_aggregated_top_posts("wordpress_aug22", proj, int(limit))
    return jsonify(data)


@app.route("/wp-json/wp/v2/get_newest_posts/<category>/<limit>", methods=['GET'])
def getWordPressRecentLimitedForCategory(category, limit):
    proj = {
        'data.id': 1, 'data.date': 1, 'data.title.rendered': 1,
        'data.content.rendered': 1, 'data.excerpt.rendered': 1,
        'data.author': 1, 'data.featured_media': 1, 'data.link': 1,
        'data.yoast_head_json.twitter_misc.Written by': 1, "_id": 0,
        'data.yoast_head_json.og_image': 1, 'data.category': 1,
    }
    data = mongodb.get_specified_number_of_post_projected("wordpress_aug22", category, proj, int(limit))
    return jsonify(data)


@app.route("/states", methods=['GET'])
def getStates():
    states = dbutil.getDataTable(
        "select name as name , name as code  from us_states")
    return jsonify(states)


@app.route("/techAlerts/<symbols>", methods=['POST', 'GET'])
def getTechAlerts(symbols):
    alerts = dbutil.getTechAlerts(symbols.split(","))
    return jsonify(alerts)


@app.route("/techAlertsNew", methods=['POST', 'GET'])
def getTechAlertsNew():
    symbols = ""
    if request.method == 'POST':
        data = json.loads(request.data)
        symbols = data["symbols"]
    else:
        symbols = request.args.get('symbols')
    alerts = dbutil.getTechAlerts(symbols.split(","))
    return jsonify(alerts)


@app.route("/coupouns", methods=['GET'])
def getCoupouns():
    coupons = stripe_payment.get_all_coupouns()
    return jsonify(coupons)


@app.route("/symbol/historical", methods=['POST', 'GET'])
def getHistoricalData():
    symbols = ""
    period = ""
    if request.method == 'POST':
        data = json.loads(request.data)
        symbols = data["symbols"]
        period = data["period"]
    else:
        symbols = request.args.get('symbols')
        period = request.args.get("period")

    data = dbutil.getSymbolHistoricalDiff(
        utils.getSymbolListFromString(symbols), period)
    # data.to_json(orient='records')
    return jsonify(dataframe_utils.getDict(data))


@app.route("/symbol/historicalprice", methods=['POST', 'GET'])
def getHistoricaPricelData():
    symbols = ""
    period = ""
    if request.method == 'POST':
        data = json.loads(request.data)
        symbols = data["symbols"]
        period = data["period"]
    else:
        symbols = request.args.get('symbols')
        period = request.args.get("period")

    data = dbutil.getSymbolHistoricalPrice(
        utils.getSymbolListFromString(symbols), period)
    # data.to_json(orient='records')
    return jsonify(dataframe_utils.getDict(data))


@app.route("/newsDetail/", methods=['POST', 'GET'])
def getDetailNews():
    sql = """select * from news_details 
   WHERE STR_TO_DATE(SUBSTR(substring_index(pubdate,",",-1),1,12)  , "%d %M %Y")
  BETWEEN DATE_SUB(NOW(), INTERVAL 5 DAY) AND NOW();"""

    newsData = dbutil.getDataList(sql,
                                  "source")

    return jsonify(newsData)


@app.route("/newsDetail/currentDate", methods=['POST', 'GET'])
def getCurrentDateNews():
    sql = """select source,pubDate,title,link from news_details where pubDate in
    (select pubDate from news_details where STR_TO_DATE(SUBSTR(substring_index(pubdate,",",-1),1,12)  , "%d %M %Y")
    = CURDATE()) order by pubDate desc;"""

    newsData = dbutil.getDataTable(sql)
    if len(newsData) == 0:
        sql = """select source,pubDate,title,link from news_details where pubDate in
        (select pubDate from news_details where STR_TO_DATE(SUBSTR(substring_index(pubdate,",",-1),1,12)  , "%d %M %Y")
        = CURDATE() - INTERVAL 1 DAY) order by pubDate desc;"""
        newsData = dbutil.getDataTable(sql)

    for item in newsData:
        pubDate = item['pubDate'].replace("\r", "").replace(
            "\n", "").replace("+", "-").split("-")[0]
        pubDate = pubDate + " GMT"
        try:
            item['pubDate'] = convertToEst(pubDate)
        except Exception as e:
            print(e)
        # pubDate[17:22]
        # item.pubDate.strftime('%I:%M%p')
    return jsonify(newsData)


def convertToEst(time):
    gmt = pytz.timezone('GMT')
    eastern = pytz.timezone('US/Eastern')
    convertedDate = datetime.strptime(time, '%a, %d %b %Y %H:%M:%S GMT')
    dategmt = gmt.localize(convertedDate)
    dateeastern = dategmt.astimezone(eastern)
    d = dateeastern.strftime('%a, %d %I:%M%p')
    return d


@app.route("/notablemoves", methods=['POST', 'GET'])
def getNotableMoveSymbolByType():
    sql = """ select name,typeid,sign from notable_moves_types order by ui_order"""

    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/notablemoves/<typeid>", methods=['POST', 'GET'])
def getNotableMoveSymbolDetail(typeid):
    sqlQuery = """select  query from notable_moves_types where typeid={} """.format(
        typeid)

    common_filters = """
     and assets.asset_id in (1,2,3)         
     and list_symbol.isactive = 1 and live_symbol.last > 10 and  live_symbol.last <5000 10 and DATEDIFF(now(),live_symbol.time) < 7         
     and  live_symbol.market_cap_raw >= 1e+08 and list_symbol.sectorid is not null        
     and length(live_symbol.symbol)< 5
    """
    sqlSymbols = dbutil.getOneRow(sqlQuery, "query")
    data = dbutil.getDataArray(sqlSymbols, "symbol")
    return jsonify(data)

@app.route("/notablemoves_etf", methods=['POST', 'GET'])
def getNotableMoveSymbolByTypeETF():
    sql = """ select name,typeid,sign from notable_moves_types_etf order by ui_order"""

    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/notablemoves_etf/<typeid>", methods=['POST', 'GET'])
def getNotableMoveSymbolDetailETF(typeid):
    sqlQuery = """select  query from notable_moves_types_etf where typeid={} """.format(
        typeid)

    common_filters = """
     and assets.asset_id in (1,2,3)         
     and list_symbol.isactive = 1 and live_symbol.last > 10 and  live_symbol.last <5000 10 and DATEDIFF(now(),live_symbol.time) < 7         
     and  live_symbol.market_cap_raw >= 1e+08 and list_symbol.sectorid is not null        
     and length(live_symbol.symbol)< 5
    """
    sqlSymbols = dbutil.getOneRow(sqlQuery, "query")
    data = dbutil.getDataArray(sqlSymbols, "symbol")
    return jsonify(data)


@app.route("/multicharts/<types>", methods=['POST', 'GET'])
def getMultichartsByType(types):
    formattedTypes = types.split(",")
    formattedTypes = ','.join(formattedTypes)
    sql = """select typeid as id ,description as name from list_types  where typeid in ({})""".format(
        formattedTypes)
    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/multicharts", methods=['POST', 'GET'])
def getMulticharts():
    sql = """select typeid as id ,description as name from  list_types"""

    data = dbutil.getDataTable(sql)
    return jsonify(data)


# Returns capitalized symbol list from comma seperated values


@app.route("/sectors", methods=['GET'])
def getSectorsList():
    sql = """select name,id from sectors"""
    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/etf_info", methods=['GET'])
def getEtfInfo():
    sector = dbutil.getDataTable("select name,id from etf_sector")
    asset = dbutil.getDataTable("select name,id from etf_asset")
    geography = dbutil.getDataTable("select name,id from etf_geography")
    result = {"sector": sector, "asset": asset, "geography": geography}
    return jsonify(result)


@app.route("/etf_symbols", methods=['POST'])
def getEtfSymbols():
    post_data = json.loads(request.data)

    condition = []
    asset_id = int(post_data["asset_id"])
    sector_id = int(post_data["sector_id"])
    geography_id = int(post_data["geography_id"])

    if asset_id != 0:
        condition.append("etf_asset_id ={}".format(asset_id))
    if sector_id != 0:
        condition.append("etf_sector_id ={}".format(sector_id))
    if geography_id != 0:
        condition.append("etf_geography_id ={}".format(geography_id))

    if len(condition) == 0:
        condition_query = ''
    else:
        condition_query = ' and ' + ' and '.join(condition)

    query = """SELECT technicals_symbol.symbol as symbol
         FROM technicals_symbol LEFT JOIN list_symbol
         ON list_symbol.symbol= technicals_symbol.Symbol LEFT JOIN live_symbol 
         ON live_symbol.symbol= technicals_symbol.Symbol
         Left Join stats_latest ON stats_latest.symbol= technicals_symbol.Symbol
         where list_symbol.assetid in (24,22,25) and list_symbol.isactive =1  and change_pct !=0 and change_pct is not null and abs((last - price_Monthly)/price_Monthly) < 3 {}""".format(
        condition_query)

    # sql = "select symbol from list_symbol where assetid= 24 and {}  {} ".format(condition_query)

    symbols = dbutil.getDataArray(query)
    return jsonify(symbols)


@app.route("/industries", methods=['GET'])
def getIndustryList():
    sql = """select industryname as name,industryid as id from industries"""
    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/sectors/<symbols>", methods=['POST', 'GET'])
def getSectors(symbols):
    formattedSymbols = map(lambda x: "'" + x + "'", symbols.split(","))
    formattedSymbols = ','.join(formattedSymbols)
    sql = """select s.name,count(*) as count from list_symbol ls 
  join sectors s on ls.sectorid = s.id
  where ls.symbol in ({})
  group by s.name """.format(formattedSymbols)
    data = dbutil.getDataTable(sql)
    total = sum(item["count"] for item in data)

    for item in data:
        percentage = round((100 * item["count"]) / total, 2)
        item.update({"percentage": percentage})

    return jsonify(data)


@app.route("/lookup", methods=['POST', 'GET'])
def getTickerLook():
    identifier = request.args.get('t')
    asset_type = request.args.get('e')

    searchLetter = identifier.replace(" ", "").replace(
        ".", "").replace("-", "") + "%"
    filter_query = ""
    if asset_type is not None:
        filter_query = "and a.asset_type ='{}'".format(asset_type)

    sql = """select  symbol , companyname as name,ifnull(exchange,'') as exchange ,
      ifnull(asset_type,'') as asset_type 
        from list_symbol  l
        left join assets a on l.assetid = a.asset_id
        where replace(replace(replace(symbol,' ',''),'-',''),'.','') LIKE '{}' and isactive =1  {}
        
        union
        
        select  symbol , companyname as name ,ifnull(exchange,'') as exchange,
        ifnull(asset_type,'') as asset_type
        from list_symbol l
        left join assets a on l.assetid = a.asset_id
        
        where  replace(companyname,' ','') like '{}'and isactive =1  {}
        order by symbol limit 50;""".format(
        searchLetter, filter_query, searchLetter, filter_query)
    # left join assets a on l.assetid = a.asset_id

    data = dbutil.getDataTable(sql)
    formatted_data = dbutil.convertToSeperated(
        data, ["symbol", "name", "exchange", "asset_type"])
    response = {"payload": {
        "symbols": formatted_data
    }}
    return jsonify(response)


@app.route("/search/<searchLetter>", methods=['POST', 'GET'])
def getSearchResults(searchLetter):
    searchLetter = searchLetter.replace(
        " ", "").replace(".", "").replace("-", "") + "%"

    sql = """select symbol, companyname as name, ifnull(assetId,1000) as assetId, ifnull(ass.asset_type,'') as asset_type 
        from list_symbol ls 
        left join assets ass on ls.assetId = ass.asset_id
        where replace(replace(replace(symbol,' ',''),'-',''),'.','')
        LIKE '{}' and isactive =1
        
        union
        
        select  symbol, companyname as name, ifnull(assetId,1000) as assetId, ifnull(ass.asset_type,'') as asset_type
        from list_symbol ls left join assets ass on ls.assetId = ass.asset_id
        where  replace(companyname,' ','') like '{}'and isactive =1  
        order by assetid ,symbol limit 40;""".format(
        searchLetter, searchLetter)

    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/search-spy/<searchLetter>", methods=['POST', 'GET'])
def getSearchSpyResults(searchLetter):
    searchLetter = searchLetter.replace(" ", "").replace(".", "").replace("-", "") + "%"

    sql = """
        SELECT
            ls.symbol, 
            companyname AS name, 
            IFNULL(assetId,1000) AS assetId, 
            IFNULL(ass.asset_type,'') AS asset_type 
        FROM spy_symbol sp
            LEFT JOIN list_symbol ls ON sp.symbol = ls.symbol
            LEFT JOIN assets ass ON ls.assetId = ass.asset_id
        WHERE replace(replace(replace(ls.symbol,' ',''),'-',''),'.','') LIKE '{}' 
            AND isactive =1

        UNION

        SELECT 
            ls.symbol, 
            companyname AS name, 
            IFNULL(assetId,1000) AS assetId, 
            IFNULL(ass.asset_type,'') AS asset_type
        FROM spy_symbol sp 
            LEFT JOIN list_symbol ls ON sp.symbol = ls.symbol
            LEFT JOIN assets ass ON ls.assetId = ass.asset_id
        WHERE replace(companyname,' ','') like '{}' 
            AND isactive =1  

        ORDER BY assetid, symbol 
        LIMIT 40;""".format(searchLetter, searchLetter)

    data = dbutil.getDataTable(sql)
    return jsonify(data)


@app.route("/search_live/<searchLetter>", methods=['POST', 'GET'])
def getSearchResultsFromFeed(searchLetter):
    try:
        res = {}
        searchFor = searchLetter.replace(" ", "").replace(".", "").replace("-", "")

        BASE_URL = cfg.POLYGON_API_BASEURL
        API_KEY = cfg.POLYGON_API_KEY
        count = 50
        url = f"{BASE_URL}/v3/reference/tickers?search={searchFor}&active=true&limit={count}&apiKey={API_KEY}"
        
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            res["status"] = "ok"
            all_results = data.get("results", [])
            filtered_results = [d for d in all_results if d.get("market") and d.get("market") in ('stocks', 'indices')]
            res["data"] = filtered_results[:20]
        else:
            msg = f"Error: {response.status_code}, {response.text} while fetching data for: {searchFor}"
            print(msg)
            res["status"] = "error"
            res["data"] = msg
            raise Exception(msg)
        
        return jsonify(res)
    except Exception as ex:
        print(ex)
        return jsonify(res)


@app.route("/sector/yearly/<symbol>", methods=['POST', 'GET'])
def getSectorPerfYearly(symbol):
    sql = """select ls.symbol as symbol
            from list_symbol ls
            left join live_symbol l on l.symbol =ls.symbol
            left join sectors s on s.id=ls.sectorid
            left join technicals_symbol t on ls.symbol= t.symbol
            where s.symbol  = '{}' and  (l.last-t.price_Yearly)/(t.price_Yearly) <  500 and l.last > 10
            order by (l.last-t.price_Yearly)/(t.price_Yearly)  desc limit 10;
            
            """.format(symbol)

    data = dbutil.getDataArray(sql, "symbol")

    return jsonify(data)

@app.route("/sector/yearly_bottom/<symbol>", methods=['POST', 'GET'])
def getSectorBottomPerfYearly(symbol):
    sql = """select ls.symbol as symbol
            from list_symbol ls
            left join live_symbol l on l.symbol =ls.symbol
            left join sectors s on s.id=ls.sectorid
            left join technicals_symbol t on ls.symbol= t.symbol
            where s.symbol  = '{}' and  (l.last-t.price_Yearly)/(t.price_Yearly) <  500 and l.last > 10
            order by (l.last-t.price_Yearly)/(t.price_Yearly)  asc limit 10;
            
            """.format(symbol)

    data = dbutil.getDataArray(sql, "symbol")

    return jsonify(data)


@app.route('/sector/daily_top/<sector>', methods=['GET'])
def getSectorTopPerfDaily(sector):
    sql = """
        SELECT 
            spy.symbol, sec.name AS name, liv.change_pct
        FROM
            spy_symbol spy
                JOIN
            list_symbol ls ON spy.symbol = ls.symbol
                JOIN
            sectors sec ON ls.sectorid = sec.id
                JOIN
            live_symbol liv ON liv.symbol = spy.symbol
                AND change_pct IS NOT NULL
        WHERE 
            sec.symbol = '{}' 
            AND liv.last > 10
        ORDER BY liv.change_pct DESC
        LIMIT 10;
    """.format(sector)

    data = dbutil.getDataArray(sql, "symbol")

    return jsonify(data)

@app.route('/sector/daily_bottom/<sector>', methods=['GET'])
def getSectorBottomPerfDaily(sector):
    sql = """
        SELECT 
            spy.symbol, sec.name AS name, liv.change_pct
        FROM
            spy_symbol spy
                JOIN
            list_symbol ls ON spy.symbol = ls.symbol
                JOIN
            sectors sec ON ls.sectorid = sec.id
                JOIN
            live_symbol liv ON liv.symbol = spy.symbol
                AND change_pct IS NOT NULL
        WHERE 
            sec.symbol = '{}' 
            AND liv.last > 10
        ORDER BY liv.change_pct ASC
        LIMIT 10;
    """.format(sector)

    data = dbutil.getDataArray(sql, "symbol")

    return jsonify(data)


@app.route("/industry/yearly/<symbol>", methods=['POST', 'GET'])
def getIndustryPerfYearly(symbol):
    sql = """select ls.symbol from sector_industry_symbol si
join list_symbol ls on ls.industryid=si.industryid
left join live_symbol l on l.symbol =ls.symbol
left join technicals_symbol t on ls.symbol= t.symbol
 where si.symbol  = '{}' and  (l.last-t.price_Yearly)/(t.price_Yearly) <  500 and l.last > 10
 order by (l.last-t.price_Yearly)/(t.price_Yearly)  desc limit 10;""".format(symbol)

    data = dbutil.getDataArray(sql, "symbol")

    return jsonify(data)


@app.route('/sector/industryMapping', methods=['GET'])
def getSectorIndustryMapping():
    sqlSector = """select s.symbol,s.short_name as name,s.id as sectorid , t.rating from sectors  s
    join technicals_symbol t on t.symbol = s.symbol
    where s.symbol is not null and s.id not in (20,21)"""
    sqlIndustry = """select si.symbol,si.sectorid,i.industryname,t.rating from sector_industry_symbol si 
                   join industries i on si.industryid = i.industryid
                   join technicals_symbol t on t.symbol = si.symbol"""
    sectorData = dbutil.getDataTable(sqlSector)
    industryData = dbutil.getDataList(sqlIndustry, "sectorid")
    for sectorItem in sectorData:
        sectorId = sectorItem["sectorid"]
        if sectorId in industryData:
            sectorItem["industryData"] = industryData[sectorId]

    return jsonify(sectorData)


@app.route('/heatmap/<type>', methods=['GET'])
def getHeatMapByType(type):
    sqlSector = """select sp.symbol,s.name as name,live.change_pct
                  from spy_symbol sp
                  join list_symbol l on sp.symbol = l.symbol
                  join sectors s on l.sectorid = s.id
                  join live_symbol live
                  on live.symbol = sp.symbol and change_pct is not null """

    result = []
    sectorData = dbutil.getDataList(sqlSector, "name")
    for sector, data in sectorData.items():
        symbolList = []
        data.sort(key=lambda x: float(x['change_pct']))
        for symbolData in data[-10:]:
            symbolList.append(symbolData["symbol"])
        for symbolData in data[0:10]:
            symbolList.append(symbolData["symbol"])

        result.append({"sector": sector, "data": symbolList})

    return jsonify(result)


@app.route('/spy/technical', methods=['GET'])
def getSpyTechnical():
    sqlSector = """select * from spy_technical"""
    data = dbutil.getOneRow(sqlSector)
    return jsonify(data)


@app.route("/scan/filters", methods=['GET'])
def getScanFilters():
    data = dbutil.getScanFilters()
    return jsonify(data)


@app.route("/peer/<symbol>", methods=['GET'])
def getPeerSymbols(symbol):
    peerSymbols = dbutil.getPeers(symbol)
    peerSymbols.append(symbol)
    return jsonify(peerSymbols)


@app.route("/scan/symbols", methods=['POST'])
def getScanSymbols():
    scan_ids = json.loads(request.data)
    scan_ids = map(lambda x: "'" + x + "'", scan_ids.split(","))
    scan_ids = ','.join(scan_ids)
    sql = """select s.Condition as filters from scan_filter s where id in ({})""".format(
        scan_ids)

    conditionStatements = dbutil.getDataArray(sql, "filters")
    conditionStatements = " and ".join(conditionStatements)
    query = """SELECT technicals_symbol.symbol as symbol
         FROM technicals_symbol LEFT JOIN list_symbol
         ON list_symbol.symbol= technicals_symbol.Symbol LEFT JOIN live_symbol 
         ON live_symbol.symbol= technicals_symbol.Symbol
         Left Join stats_latest ON stats_latest.symbol= technicals_symbol.Symbol
         where ({}) and list_symbol.isactive =1  and 
         change_pct !=0 and change_pct is not null 
         and abs((last - price_Monthly)/price_Monthly) < 3 
         order by CAST(last AS DECIMAL(10,6)) desc""".format(
        conditionStatements)
    symbols = dbutil.getDataArray(query, "symbol")
    return jsonify(symbols)


@app.route('/analyst/<symbol>', methods=['GET'])
def getAnalyst(symbol):
    symbol = symbol.upper()
    result = {"error": ""}
    data = dbutil.get_data_by_collection("analyst_rating", {"symbol": symbol})
    if data is not None:
        analyst_rating = data["rating"]
        result["analyst_rating"] = analyst_rating
    else:
        result["error"] = "No data for symbol {}".format(symbol)
    return jsonify(result)


@app.route("/dashboard/params/<date>", methods=['GET'])
def getDashboardParams(date):
    date = date[0:10]
    sql = """select date,fear_greed ,technical as technical 
    from history_fear_technical where date >='{}'""".format(date)
    data = dbutil.getDataTable(sql)
    for item in data:
        item["date"] = datetimeutil.getdatestr(item["date"])
    return jsonify(data)


@app.route("/dashboard/params", methods=['POST'])
def saveDashBoardParams():
    params_dict = json.loads(request.data)
    date = params_dict["date"][0:10]
    sql_check = "select count(*) as count from history_fear_technical where date ='{}'".format(date)
    count = dbutil.getOneRow(sql_check, "count")
    if count == 0:
        sql = """insert into history_fear_technical(date,fear_greed,technical)
               values('{}',{},{})""".format(date, params_dict["fear_greed"], params_dict["technical"])
        dbutil.execute_single_query(sql)
        return jsonify({"message": "Saved Data"})
    else:
        sql = """update  history_fear_technical 
        set fear_greed={},
        technical= {}
        where date ='{}'""".format(params_dict["fear_greed"], params_dict["technical"], date)
        dbutil.execute_single_query(sql)
        return jsonify({"message": "Updated Data"})


@app.route("/technical_market", methods=['GET'])
def getTechnicalMarket():
    sql = "select * from technical_market;"

    marketData = dbutil.getDataTable(sql)
    return jsonify(marketData)


# def checkIfUserActive(request):
#     token = login.checkToken(request)
#     if token["status"] == "success":
#         userId = token["data"]["user_id"]
#         sqlIsPaid = "select ispaid from users where userid ={}".format(userId)
#         isPaid = dbutil.getOneRow(sqlIsPaid, "ispaid")
#         if isPaid != 1:
#             isPaid = stripe_payment.isUserActive(userId)
#             if isPaid != 1:
#                 responseObject = {
#                     'status': 'fail',
#                     'message': 'Provide a valid auth token.'
#                 }
#                 return jsonify(responseObject)


# @app.route("/dashboard_commentary_data/<size>", methods=['GET'])
# def getDashboardCommentaryData(size):
#     checkIfUserActive(request)
#     sqlCommentary = "select * from dashboard_commentary limit {};".format(size)
#     dashboard_commentary = dbutil.getDataTable(sqlCommentary)

#     result = {"dashboard": dashboard_commentary}
#     return jsonify(result)


# @app.route("/dashboard_alert_data/<size>", methods=['GET'])
# def getDashboardAlertData(size):
#     checkIfUserActive(request)
#     sqlAlert = "select * from dashboard_portfolio_alerts limit {};".format(
#         size)
#     portfolio_alert = dbutil.getDataTable(sqlAlert)

#     result = {"dashboard": portfolio_alert}
#     return jsonify(result)


# @app.route("/dashboard_videos_data/<size>", methods=['GET'])
# def getDashboardVideosData(size):
#     checkIfUserActive(request)
#     sqlVideos = "select * from dashboard_videos limit {};".format(size)
#     dashboard_videos = dbutil.getDataTable(sqlVideos)

#     result = {"dashboard": dashboard_videos}
#     return jsonify(result)


# @app.route("/dashboard_daily_data/<size>", methods=['GET'])
# def getDashboardDailyData(size):
#     checkIfUserActive(request)
#     sqlDaily = "select * from dashboard_daily limit {};".format(size)
#     dashboard_daily = dbutil.getDataTable(sqlDaily)

#     result = {"dashboard": dashboard_daily}
#     return jsonify(result)


@app.route("/dashboard_chart_data/<size>", methods=['GET'])
def getDashboardChartData(size):
    sqlChart = "select * from dashboard_chart limit {};".format(size)
    dashboard_chart = dbutil.getDataTable(sqlChart)

    result = {"dashboard": dashboard_chart}
    return jsonify(result)


@app.route("/users_symbol_alerts", methods=['POST'])
def saveUserSymbolAlerts():
    token = login.checkToken(request)
    query = ""

    if token["status"] == "success":
        userId = token["data"]["user_id"]
        post_data = json.loads(request.data)
        symbol = post_data["symbol"]
        high_target = post_data["high_target"] or 'null'
        low_target = post_data["low_target"] or 'null'
        daily_high = post_data["daily_high"] or 'null'
        deleted = post_data["deleted"] or False
        daily_low = post_data["daily_low"] or 'null'
        insert_query = """ insert into symbol_alerts(user_id,symbol,high_target,low_target,daily_high,daily_low,deleted)
            values ({},'{}',{},{},{},{},{})
            """.format(userId, symbol, high_target, low_target, daily_high, daily_low, deleted)

        count_query = """
            select count(*) as count from symbol_alerts where symbol ='{}' and user_id ={}
            """.format(symbol, userId)
        alert_count = dbutil.getOneRow(count_query, "count")
        if alert_count > 0:
            update_query = """ update  symbol_alerts
                set high_target = {},
                low_target ={},
                daily_high = {},
                daily_low = {},
                deleted = {}
                where symbol ='{}' and user_id ={}
                """.format(high_target, low_target, daily_high, daily_low, deleted, symbol, userId)
            updated_count = dbutil.execute_single_query(update_query)
        else:
            dbutil.execute_single_query(insert_query)

        return jsonify({"staus": "ok"})

    else:
        return make_response(jsonify(token)), 401


# TODO: mostly likely not in use
@app.route("/users_symbol_alerts", methods=['GET'])
def getUserSymbolAlerts():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        query = """
            SELECT 
                t1.user_id,
                t1.symbol,
                sa.id,
                sa.high_target,
                sa.low_target,
                sa.daily_high,
                sa.daily_low,
                sa.sma_crossover,
                sa.deleted
            FROM
                (SELECT DISTINCT
                    symbol, user_id
                FROM
                    symbol_alerts
                WHERE
                    user_id = {} UNION SELECT DISTINCT
                    symbol, m.user_id
                FROM
                    transactions t
                JOIN model_portfolio m ON m.portfolioid = t.portfolioid
                WHERE
                    m.user_id = {} UNION SELECT DISTINCT
                    symbol, userid
                FROM
                    watchlist_details wd
                JOIN watchlist_compostion wc ON wc.watchlist_id = wd.watchlist_id
                WHERE
                    userid = {}) t1
                    LEFT JOIN
                symbol_alerts sa ON t1.symbol = sa.symbol
                    AND sa.user_id = t1.user_id
            WHERE
                sa.user_id IS NULL OR sa.deleted != 1
            ORDER BY id DESC;
        """.format(userId, userId, userId)
        data = dbutil.getDataTable(query)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@app.route("/users_symbol_alerts_history", methods=['GET'])
def getUserHistoricalSymbolAlertsMet():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        query = """select sat.type as type ,value as target, h.symbol,
            time as date, last ,price_change , change_pct
            from symbol_alerts_history h
            join symbol_alerts sa on h.symbol = sa.symbol and sa.user_id = h.user_id
            join symbol_alerts_types sat on h.alert_type = sat.id
            where h.user_id ={} order by time desc
                """.format(userId)
        data = dbutil.getDataTable(query)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@app.route("/backtest/stub", methods=['GET'])
def getBacktestData():
    response = {"portfolioName": ["Portfolio1", "Portfolio2", "Portfolio3", "S&P500"],
                "performance":
                    [{"name": "Portfolio1", "initialBalance": 10000, "finalBalance": 7764999, "CAGR": 49.68,
                      "stdev": 53.80,
                      "bestYear": 361.97, "worstYear": -51.95, "maxDrawdown": -71.96,
                      "sharpeRatio": 0.99, "sortinoRatio": 1.94, "mktCorrelation": 0.30},

                     {"name": "Portfolio2", "initialBalance": 10000, "finalBalance": 2207506, "CAGR": 38.69,
                      "stdev": 33.40,
                      "bestYear": 201.36, "worstYear": -56.91, "maxDrawdown": -56.91,
                      "sharpeRatio": 1.12, "sortinoRatio": 2.00, "mktCorrelation": 0.50},

                     {"name": "Portfolio3", "initialBalance": 10000, "finalBalance": 7764999, "CAGR": 45.14,
                      "stdev": 59.74,
                      "bestYear": 396.73, "worstYear": -60.56, "maxDrawdown": -79.90,
                      "sharpeRatio": 0.90, "sortinoRatio": 1.69, "mktCorrelation": 0.27},

                     {"name": "S&P500", "initialBalance": 10000, "finalBalance": 8764999, "CAGR": 54.14,
                      "stdev": 69.74,
                      "bestYear": 496.73, "worstYear": -30.56, "maxDrawdown": -49.90,
                      "sharpeRatio": 1.90, "sortinoRatio": 2.69, "mktCorrelation": 1.27}
                     ],
                "yearly":
                    [{"year": 2005, "portfolio1": 123.26, "portfolio2": 115.19, "portfolio3": 91.96, "S&P500": 101.96},
                     {"year": 2006, "portfolio1": 13.26, "portfolio2": 18.19,
                         "portfolio3": -4.96, "S&P500": 90.96},
                     {"year": 2007, "portfolio1": 133.26, "portfolio2": 44.19,
                         "portfolio3": 2.96, "S&P500": 80.16},
                     {"year": 2008, "portfolio1": -56.26, "portfolio2": -
                         53.19, "portfolio3": 12.96, "S&P500": 40.86},
                     {"year": 2009, "portfolio1": 146.26, "portfolio2": 93.32,
                         "portfolio3": 84.96, "S&P500": 86.90},
                     {"year": 2010, "portfolio1": 53.06, "portfolio2": -4.19, "portfolio3": 291.96, "S&P500": 100.19}],
                "daily":
                    [{"date": "Jan 02, 2005", "portfolio1": 1000.0, "portfolio2": 1000.0, "S&P500": 1001.0},
                     {"date": "Jan 03, 2016", "portfolio1": 1005,
                         "portfolio2": 1010, "S&P500": 1011.0},
                     {"date": "Jan 02, 2007", "portfolio1": 1021,
                         "portfolio2": 1054, "S&P500": 1021.0},
                     {"date": "Jan 03, 2008", "portfolio1": 1032,
                         "portfolio2": 1065, "S&P500": 1045.10},
                     {"date": "Jan 02, 2009", "portfolio1": 1076,
                         "portfolio2": 1079, "S&P500": 1087.0},
                     {"date": "Jan 03, 2010", "portfolio1": 2000, "portfolio2": 2010, "S&P500": 2011}]

                }
    return jsonify(response)


@app.route("/performance/stub", methods=['GET'])
def getPerformanceData():
    response = {"daily":
                [{"name": "AAPL", "day1": 1.04, "day5": -6.57, "week1": -2.54,
                  "day10": -1.53, "day15": -2.59},
                 {"name": "Technology", "day1": 1.03, "day5": -6.31, "week1": -2.51,
                  "day10": -1.21, "day15": -2.49},
                 {"name": "S&P", "day1": 0.08, "day5": -3.31, "week1": -3.51,
                  "day10": -0.21, "day15": -4.49}
                 ],

                "yearly":
                    [{"name": "AAPL", "ytd": 27.13, "year1": -2.47, "year2": 24.30,
                      "year3": 17.38, "year4": 24.66, "year5": 36.01},
                     {"name": "Technology", "ytd": 7.13, "year1": -12.47, "year2": 4.30,
                      "year3": 7.38, "year4": 2.66, "year5": 6.01},
                     {"name": "S&P", "ytd": 2.13, "year1": -3.47, "year2": 2.30,
                      "year3": 1.38, "year4": 4.66, "year5": 3.01}
                     ],
                "quaterly":
                    [{"name": "AAPL", "quater1": 18.54, "quater2": 10.42, "quater3": 14.19,
                      "quater4": 10.71},
                     {"name": "Technology", "quater1": 27.13, "quater2": 24.81, "quater3": 8.01,
                      "quater4": 28.39},
                     {"name": "S&P", "quater1": 27.13, "quater2": 8.52, "quater3": 14.19,
                      "quater4": 17.38}
                     ]

                }
    return jsonify(response)


def saveMedia(mediaId):
    try:
        TIMEOUT = 20
        url = "https://realinvestmentadvice.com/wp-json/wp/v2/media/{}".format(
            mediaId)
        req = Request(url, headers={'user-agent': 'my-app/0.0.1'})
        page = urlopen(req, timeout=TIMEOUT, cafile=certifi.where())
        page_data = page.read()
        result = json.loads(page_data)
        print(result)
        data = {"mediaId": mediaId, "data": result}
        mongodb.deleteCollection("wordpressMedia", "mediaId", mediaId)
        mongodb.save_data("wordpressMedia", data)
    except Exception as ex:
        print(ex)

@app.route("/weekly_report", methods=['GET'])
def get_weekly_report():
    try:
        report_date = get_saturday_date()
        # report_date = datetime.today()
        weekly_report_data = mongodb.get_data(
            "weekly_reports", {"date": str(report_date.date())})

        if len(weekly_report_data) > 0:
            weekly_report_data = weekly_report_data[0]
            return jsonify(weekly_report_data)
        else: 
            return jsonify({})
    except Exception as ex:
        print(ex)
        return jsonify({})
    

@app.route("/snpsymbols", methods=['GET'])
def get_all_snpsymbols():
    try:
        sql = """select sp.symbol, ls.alternate_name as name from spy_symbol sp left join list_symbol ls on sp.symbol = ls.symbol;"""
        data = dbutil.getDataTable(sql)
        return jsonify({"status": "ok", "data": data})
    except Exception as ex:
        print(ex)
        return jsonify({"stauts": "error"})
    

@app.route("/anomaly/<symbol>", methods=['GET'])
def get_anomaly_data(symbol):
    try:
        sql = """select Date, Close, Anomaly from symbol_anomaly where symbol = '{}' order by date desc limit 2000;""".format(symbol)
        data = dbutil.getDataTableNoLimit(sql)
        data.reverse()
        return jsonify({"status": "ok", "data": data})
    except Exception as ex:
        print(ex)
        return jsonify({"stauts": "error"})
    

@app.route("/snpsymbols/filter/<date>", methods=['GET'])
def get_filtered_snpsymbols(date):
    try:
        # format date as in db table
        dt = datetime.strptime(date, '%a, %d %b %Y %H:%M:%S %Z')
        formatted_date = dt.strftime('%Y-%m-%d %H:%M:%S')
        sql = """select DISTINCT(sa.symbol), ls.alternate_name as name from 
            symbol_anomaly sa 
	        left join list_symbol ls on sa.symbol = ls.symbol 
            where Anomaly = -1 and Date > '{}';""".format(formatted_date)
        data = dbutil.getDataTable(sql)
        data = sorted(data, key=lambda row: row['symbol'])
        return jsonify({"status": "ok", "data": data})
    except Exception as ex:
        print(ex)
        return jsonify({"stauts": "error"})


@app.route("/snp-trade-signals/filter/<modelKey>/<days>", methods=['GET'])
def get_filtered_snpsymbols_trade_signals(modelKey, days):
    try:
        # get date to filter from and format date as in db table
        days = int(days)
        date_today = datetimeutil.get_today_date()
        date_days_back = date_today - timedelta(days=days)
        formatted_date = date_days_back.strftime('%Y-%m-%d %H:%M:%S')

        signal_table = "ai_signals__" + modelKey
        sql = """select 
	                DISTINCT(sigTbl.ticker) as ticker, 
                    ls.alternate_name as name
                from 
                    {} sigTbl 
                    left join list_symbol ls on sigTbl.ticker = ls.symbol 
                where `Signal` is not null and Date > '{}';""".format(signal_table, formatted_date)
        data = dbutil.getDataTable(sql)
        data = sorted(data, key=lambda row: row['ticker'])

        ### AK: Removed as asked by team. We need to have some other metric to denote what does it mean to have succesful signal vs failed signal. Avg is not good. It was placeholder anyways
        # sql_returns_temp = """select Ticker, Date, avg_rerturn, Predicted_Signal from symbol_xgboost_signals2 where ticker = '{}' and Predicted_Signal = 2 order by date desc limit 5;"""
        # for row in data:
        #     row['last5_avg_returns'] = []
        #     sql_returns = sql_returns_temp.format(row['ticker'])
        #     data_returns = dbutil.getDataTableNoLimit(sql_returns)
        #     for row_ret in data_returns:
        #         row['last5_avg_returns'].append({
        #             "ret": row_ret['avg_rerturn'], 
        #             "pred": row_ret['Predicted_Signal'],
        #             "date": row_ret['Date'],
        #         })
        return jsonify({"status": "ok", "data": data})
    except Exception as ex:
        print(ex)
        return jsonify({"stauts": "error"})
    

@app.route("/snp-trade-signals//<modelKey>/<ticker>", methods=['GET'])
def get_snp_trade_signal_data(modelKey, ticker):
    try:
        signal_table = "ai_signals__" + modelKey

        sqlAllData = """
            select 
                Date, 
                Close,
                `Signal`,
                RSI, 
                MACD, 
                MACD_Signal, 
                MACD_histogram 
            from {} 
            where ticker = '{}' 
            order by Date desc 
            limit 2000;
        """.format(signal_table, ticker)
        data = dbutil.getDataTableNoLimit(sqlAllData)
        data.reverse()

        # sqlGetSummary = """
        #     SELECT
        #         Ticker,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 3_day_return > 0 THEN 3_day_return ELSE NULL END) AS 3_day_avg_pos,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 5_day_return > 0 THEN 5_day_return ELSE NULL END) AS 5_day_avg_pos,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 10_day_return > 0 THEN 10_day_return ELSE NULL END) AS 10_day_avg_pos,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 20_day_return > 0 THEN 20_day_return ELSE NULL END) AS 20_day_avg_pos,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 60_day_return > 0 THEN 60_day_return ELSE NULL END) AS 60_day_avg_pos
        #     FROM symbol_xgboost_signals2

        #     UNION ALL

        #     SELECT
        #         Ticker,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 3_day_return < 0 THEN 3_day_return ELSE NULL END) AS 3_day_avg_neg,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 5_day_return < 0 THEN 5_day_return ELSE NULL END) AS 5_day_avg_neg,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 10_day_return < 0 THEN 10_day_return ELSE NULL END) AS 10_day_avg_neg,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 20_day_return < 0 THEN 20_day_return ELSE NULL END) AS 20_day_avg_neg,
        #         AVG(CASE WHEN Predicted_Signal = 2 AND 60_day_return < 0 THEN 60_day_return ELSE NULL END) AS 60_day_avg_neg
        #     FROM symbol_xgboost_signals2;
        # """
        # avg_rows = dbutil.getDataTableNoLimit(sqlGetSummary)
        return jsonify({"status": "ok", "data": data})
    except Exception as ex:
        print(ex)
        return jsonify({"stauts": "error"})
    

@app.route("/get-symbols", methods=['POST'])
def get_symbols_for_categories():
    token = login.checkToken(request)
    if token["status"] == "success":
        try:
            result_dict = {}
            post_data = json.loads(request.data)
            categories = post_data["categories"]
            categories_sql = "', '".join(categories)
            sql = """
                SELECT symbol, name, category FROM symbol_lists
                WHERE category IN ('{}');
            """.format(categories_sql)

            category_dict = dbutil.getDataList(sql, "category")
            for category in categories:
                result_dict[category] = {}
                cat_symbols = category_dict[category]
                for cat_item_obj in cat_symbols:
                    item_symb = cat_item_obj["symbol"]
                    item_name = cat_item_obj["name"]
                    result_dict[category][item_symb] = item_name
        
            return jsonify({"status": "ok", "data": result_dict})
        except Exception as ex:
            print(ex)
            return jsonify({"stauts": "error", "data": "issue while getting the data from the database"})
    return jsonify({"stauts": "error", "data": "user is not authenticated"})


# sends data back in prpoer key value format
@app.route("/get-symbols2", methods=['POST'])
def get_symbols_for_categories2():
    token = login.checkToken(request)
    if token["status"] == "success":
        try:
            result_dict = {}
            post_data = json.loads(request.data)
            categories = post_data["categories"]
            categories_sql = "', '".join(categories)
            sql = """
                SELECT symbol, name, category, subCategory, sortOrder FROM symbol_lists
                WHERE category IN ('{}');
            """.format(categories_sql)

            category_dict = dbutil.getDataList(sql, "category")
            return jsonify({"status": "ok", "data": category_dict})
        except Exception as ex:
            print(ex)
            return jsonify({"stauts": "error", "data": "issue while getting the data from the database"})
    return jsonify({"stauts": "error", "data": "user is not authenticated"})


def get_saturday_date():
    today = datetime.now()
    if today.weekday() == 5:
        return today
    else:
        idx = (today.weekday() + 1) % 7 
        return today - timedelta( 7 + idx - 6)


if __name__ == "__main__":
    app.run()
