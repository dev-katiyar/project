import os
import json
from dotenv import load_dotenv

# Try to load .env file if it exists (development)
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
class MyConfig:
    # mongo db
    mongodb_host = os.getenv('MONGODB_HOST', 'localhost')
    mongodb_port = int(os.getenv('MONGODB_PORT', 27017))

    # mysql db
    mysqldb_host = os.getenv('MYSQLDB_HOST', 'localhost')
    mysqldb_port = int(os.getenv('MYSQLDB_PORT', 3306))
    mysqldb_user = os.getenv('MYSQLDB_USER')
    mysqldb_passwd = os.getenv('MYSQLDB_PASSWD')
    mysqldb_db = os.getenv('MYSQLDB_DB')

    # mysql db ai
    mysqldb_ai_host = os.getenv('MYSQLDB_AI_HOST', 'mysqldbai')
    mysqldb_ai_port = int(os.getenv('MYSQLDB_AI_PORT', 3306))
    mysqldb_ai_user = os.getenv('MYSQLDB_AI_USER')
    mysqldb_ai_passwd = os.getenv('MYSQLDB_AI_PASSWD')
    mysqldb_ai_db = os.getenv('MYSQLDB_AI_DB')

    # send from notification emails
    email = os.getenv('EMAIL')
    email_password = os.getenv('EMAIL_PASSWORD')
    robo_email = os.getenv('ROBO_EMAIL')
    robo_email_password = os.getenv('ROBO_EMAIL_PASSWORD')

    # sent to support emails
    admin_users_emails = os.getenv('ADMIN_USERS_EMAILS')
    robo_admin_users_emails = os.getenv('ROBO_ADMIN_USERS_EMAILS')

    # stripe
    stripe_private_key = os.getenv('STRIPE_PRIVATE_KEY')
    test_stripe_private_key = os.getenv('TEST_STRIPE_PRIVATE_KEY')
    plans = json.loads(os.getenv('PLANS'))
    test_plans = json.loads(os.getenv('TEST_PLANS'))

    # Yahoo Finance Data API
    RAPID_KEY = os.getenv('RAPID_KEY')
    RAPID_BASE_API = os.getenv('RAPID_BASE_API')

    # EOD Finance Data API
    EOD_BASE_API = os.getenv('EOD_BASE_API')
    EOD_API_KEY = os.getenv('EOD_API_KEY')

    # IEX API
    IEX_API_KEY = os.getenv('IEX_API_KEY')

    # Polygon API
    POLYGON_API_BASEURL = os.getenv('POLYGON_API_BASEURL')
    POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')

    # Google Captcha Challenge
    CAPTCHA_SECRET_KEY = os.getenv('CAPTCHA_SECRET_KEY')
    CAPTCHA_URL = os.getenv('CAPTCHA_URL')

    # plaid
    PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
    PLAID_SECRET = os.getenv('PLAID_SECRET')
    PLAID_ENV = os.getenv('PLAID_ENV')
    PLAID_PRODUCTS = os.getenv('PLAID_PRODUCTS') 
    PLAID_COUNTRY_CODES = os.getenv('PLAID_COUNTRY_CODES')
    PLAID_REDIRECT_URI = os.getenv('PLAID_REDIRECT_URI')

    # JWT
    SECRET_KEY=os.getenv('SECRET_KEY')
    ALGORITHM=os.getenv('ALGORITHM')

    # IMPERSONATE USER FOR TESTING
    SP_ID=os.getenv('SP_ID')
