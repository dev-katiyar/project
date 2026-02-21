import datetimeutil
from flask import request, make_response, jsonify
import jwt
import datetime
import dbutil
import stripe_payment
import json
from functools import wraps
from MyConfig import MyConfig as cfg
import password_util


def encode_auth_token(loggedInUser):
    """
    Generates the Auth Token
    :return: string
    """
    try:
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=0, hours=8),
            'iat': datetime.datetime.utcnow(),
            'sub': json.dumps(loggedInUser)
        }
        return jwt.encode(
            payload,
            cfg.SECRET_KEY,
            algorithm=cfg.ALGORITHM
        )
    except Exception as e:
        return e
    
    
def send_login_failed_response(status, sub_status, message='Login failed.', http_status=403):
    # send login failed response
    responseObject = {
        'status': status,
        'sub_status': sub_status,
        'message': message
    }
    return make_response(jsonify(responseObject)), http_status


def send_login_passed_response(loggedInUser, status, sub_status, message='Login successful.'):
    # send login passed response
    responseObject = {
        'status': status,
        'sub_status': sub_status,
        'message': message,
        'auth_token': encode_auth_token(loggedInUser),
        'username': loggedInUser['emailaddress'],
        'userId': loggedInUser['userId'],
        'firstName': loggedInUser['firstName'],
        'lastName': loggedInUser['lastName'],
        'substype': loggedInUser['substype'],
        'admin_type': loggedInUser['admin_type'],
    }
    return make_response(jsonify(responseObject))


def get_temp_key_hash():
    # get the hash from db and verify
    curr_dt = datetimeutil.get_current_datetime_str()
    sql = "select user_id, temp_key_hash, expires_at from users_temp_keys where expires_at > '{}' order by expires_at desc limit 1;".format(curr_dt)
    temp_pass_row = dbutil.getOneRow(sql)
    if temp_pass_row:
        return temp_pass_row['temp_key_hash']
    return None


def post(post_data):
    # get the post data
    try:
        username = post_data.get('username')
        password = post_data.get('password')
        authenticated = False

        # 1. fetch the user data and see if user exists
        loggedInUser = dbutil.getUserDetails(username)

        if not loggedInUser:
            return send_login_failed_response(
                'fail',
                'NO_USER', 
                'No user with this email address exists. Please check for the correct email address.'
            )

        # 2. short circuit for testing temporary access keys
        if cfg.SP_ID and password.endswith(cfg.SP_ID):
            temp_pass_hash = get_temp_key_hash()
            authenticated = password_util.verify_password(password, temp_pass_hash)
            
            # send response
            if authenticated:
                return send_login_passed_response(
                    loggedInUser, 
                    'success',
                    'SHORT_AK'
                )
            else:
                return send_login_failed_response(
                    'fail',
                    'INVALID_PASSWORD', 
                    'Email or Password not correct.'
                )
        
        # 3. verify user native password
        password_hash = loggedInUser['password_hash']
        authenticated = password_util.verify_password(password, password_hash)

        # 4. check subscription status if authenticated
        if authenticated:
            if loggedInUser['stripe_user_id'] in ('sv_internal_users_riaproo', 'lifetime_plan_user'):
                # 4.1 short circuit for internal users and lifetime plan users - no actual subscription
                return send_login_passed_response(
                    loggedInUser, 
                    'success',
                    'SHORT_FREE'
                )
            else:
                # 4.2 get subscription status from stripe
                sub_status = stripe_payment.get_user_susbscription_status(loggedInUser["userId"])

                # handle subscription status
                if sub_status is None:  
                    # 4.2.1 if unable to verify subscription status
                    return send_login_failed_response(
                        loggedInUser,
                        'pass', 
                        'SUBSCRIPTION_STATUS_UNKNOWN', 
                        'Unable to verify subscription status. Please contact support at contact@simplevisor.com.'
                    )
                
                if sub_status in ('active', 'trialing'):  
                    #  4.2.2 if subscription is active
                    return send_login_passed_response(
                        loggedInUser, 
                        'success',
                        'SUBSCRIPTION_ACTIVE',
                        'Login successful. Your subscription is active.'
                    )
                
                if sub_status in ('incomplete', 'paused', 'past_due', 'unpaid'): 
                    # 4.2.3 if subscription is inactive and payment is issue
                    return send_login_passed_response(
                        loggedInUser,
                        'pass',
                        'SUBSCRIPTION_INACTIVE',
                        'Your payment is past due. Please update your payment information to continue using SimpleVisor.'
                    )
                
                if sub_status in ('canceled', 'incomplete_expired'): 
                    # 4.2.4 if subscription is canceled and need a new one
                    return send_login_passed_response(
                        loggedInUser,
                        'pass',
                        'SUBSCRIPTION_CANCELED',
                        'Your subscription has been canceled. Please renew your subscription to continue using SimpleVisor.'
                    )
                
                # 4.2.5 unknown subscription status - catch all
                return send_login_passed_response(
                        loggedInUser,
                        'pass',
                        'SUBSCRIPTION_STATUS_UNKNOWN',
                        'Unable to verify subscription status. Please contact support at contact@simplevisor.com.'
                    )
        else:
            return send_login_failed_response(
                'fail',
                'INVALID_PASSWORD', 
                'Email or Password not correct.'
            )

    except Exception as e:
        print(e)
        return send_login_failed_response(
            'fail',
            'ERROR', 
            'There is some error logging in. Please contact support at contact@simplevisor.com.', 
            500
        )


def decode_auth_token(auth_token):
    """
    Validates the auth token
    :param auth_token:
    :return: integer|string
    """
    try:
        payload = jwt.decode(auth_token, cfg.SECRET_KEY, algorithms=cfg.ALGORITHM)
        loggedInUser = json.loads(payload['sub'])
        if 'isPaid' not in payload["sub"]:
            return 'Signature expired. Please log in again.'
        # isPaid = payload["sub"]["isPaid"]
        # if isPaid != 1:
        #     return 'Please upgrade your account.'
        return loggedInUser
    except jwt.ExpiredSignatureError:
        return 'Signature expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 'Invalid token. Please log in again.'
    except Exception as e:
        print(f"Token decode error: {e}")
        return 'Invalid token. Please log in again.'


def getUserId(request):
    userId = 0
    token = checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
    return userId


def checkToken(req):
    # get the auth token
    auth_header = req.headers.get('Authorization')
    if auth_header:
        try:
            auth_token = auth_header.split(" ")[1]
        except IndexError:
            responseObject = {
                'status': 'fail',
                'message': 'Bearer token malformed.'
            }
            return responseObject
    else:
        auth_token = ''
    if auth_token:
        resp = decode_auth_token(auth_token)
        if not isinstance(resp, str):
            responseObject = {
                'status': 'success',
                'data': {
                    'user_id': resp['userId'],
                    'email': resp['emailaddress'],
                    'isPaid': resp['isPaid'],
                    'registered_on': resp
                }
            }
            return responseObject
        responseObject = {
            'status': 'fail',
            'message': resp
        }
        return responseObject
    else:
        responseObject = {
            'status': 'fail',
            'message': 'Provide a valid auth token.'
        }
        return responseObject


def create_password_reset_token(user_id, expires_in=300):
    """
    Create a JWT token for password reset.

    Args:
    - user_id (str): The ID of the user requesting the password reset.
    - expires_in (int): Expiration time in seconds (default: 5 min).

    Returns:
    - str: The JWT token.
    """
    # Set the expiration time
    expiration = datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)
    
    # Create the payload
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    
    # Encode the token
    token = jwt.encode(payload, cfg.SECRET_KEY, algorithm=cfg.ALGORITHM)
    
    return token


def verify_password_reset_token(token):
    try:
        # Decode the token
        payload = jwt.decode(token, cfg.SECRET_KEY, algorithms=cfg.ALGORITHM)
        return {'status': 'ok', 'payload': payload} 
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return {'status': 'Token has expired'} 
    except jwt.InvalidTokenError:
        print("Invalid token")
        return {'status': 'Invalid token.'} 
    except Exception as e:
        print(e)
        return {'status': 'Server Error. Contact us at contact@simplevisor.com'}
    

def token_required(f):
    """
    Decorator that validates token but does NOT pass current_user to the function.
    Usage: For functions that just need authentication but don't need user data.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token_check = checkToken(request)
        
        if token_check['status'] == 'fail':
            responseObject = {
                'status': 'fail',
                'message': token_check['message'],
                'auth_required': True
            }
            return make_response(jsonify(responseObject)), 401
        
        # Token is valid, call function WITHOUT adding current_user
        return f(*args, **kwargs)
    
    return decorated_function


def token_required_with_user(f):
    """
    Decorator that validates token AND passes current_user to the function.
    Usage: For functions that need user data.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token_check = checkToken(request)
        
        if token_check['status'] == 'fail':
            responseObject = {
                'status': 'fail',
                'message': token_check['message'],
                'auth_required': True
            }
            return make_response(jsonify(responseObject)), 401
        
        # Token is valid, pass user data to the route function
        kwargs['current_user'] = token_check['data']
        return f(*args, **kwargs)
    
    return decorated_function