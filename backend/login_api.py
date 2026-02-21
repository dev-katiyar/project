import secrets
from flask import Flask
from MyConfig import MyConfig as cfg
from flask import request, make_response, jsonify
import stripe_payment

import dbutil
import json
from datetime import datetime, timedelta
import dateutil.relativedelta
import login
import email_util
import password_util
import datetimeutil

from flask import Blueprint
import requests

api_login = Blueprint('api_login', __name__)


@api_login.route('/get-exit-feedback', methods=['POST'])
def get_user_feedback():
    try:
        # get date range
        post_data = json.loads(request.data)
        period = post_data.get("period", "ytd")
        end_date = datetime.today() + dateutil.relativedelta.relativedelta(days=1)
        start_date = dbutil.getStartDateFromPeriod(period)
        # start_date = datetime.today() + dateutil.relativedelta.relativedelta(days=-4)

        # get exit reasons dict
        reasons_dict = dbutil.get_code_set_dict('user_exit_reasons')

        # get feedback from db
        feedback_sql = """
            SELECT 
                u.firstName,
                u.lastName,
                u.emailAddress,
                u.date as registered_on,
                uef.reasons,
                uef.feedback,
                uef.created_at
            FROM
                users_exit_feedback uef
                    JOIN
                users u ON u.userId = uef.userId
            WHERE uef.created_at >= '{}' AND uef.created_at < '{}'
            ORDER BY uef.created_at DESC
        """.format(start_date.strftime("%Y-%m-%d 00:00:00"), end_date.strftime("%Y-%m-%d 00:00:00"))
    
        feedback_list = dbutil.getDataTable(feedback_sql)

        by_date = {}
        by_reasons = {}

         # Pre-populate by_date with empty lists for all dates in range
        current_date = start_date
        while current_date < end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            by_date[date_str] = []
            current_date = current_date + dateutil.relativedelta.relativedelta(days=1)

        for feedback in feedback_list:
            feedback_reasons = json.loads(feedback['reasons'])
            for reason in feedback_reasons:
                if reason not in by_reasons:
                    by_reasons[reason] = []
                by_reasons[reason].append(feedback)

            feedback_date = feedback['created_at'].strftime("%Y-%m-%d")

            # add number of days at simplevisor
            days_at_sv = (feedback['created_at'].date() - feedback['registered_on']).days
            feedback['days_at_sv'] = days_at_sv

            by_date[feedback_date].append(feedback)

        new_users = get_new_users(start_date, end_date)
        by_date_new_users = {}
        
        # Pre-populate by_date_new_users with empty lists for all dates in range
        current_date = start_date
        while current_date < end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            by_date_new_users[date_str] = []
            current_date = current_date + dateutil.relativedelta.relativedelta(days=1)

        # organize new users by date
        for user in new_users:
            reg_date = user['registered_on'].strftime("%Y-%m-%d")
            by_date_new_users[reg_date].append(user)

        res = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "reasons_dict": reasons_dict,
            "feedback_list": feedback_list,
            "by_date": by_date,
            "by_reasons": by_reasons,
            "by_date_new_users": by_date_new_users,
        }

        return jsonify({"status": "success", "data": res})
        
    except Exception as ex:
        print(ex)
        return jsonify({"status": "server_error", "data": "Something went wrong at server. Please contact support"})


def get_new_users(start_date, end_date):
    try:
        sql = """
            SELECT 
                userId,
                firstName,
                lastName,
                emailAddress,
                date as registered_on
            FROM
                users
            WHERE date >= '{}' AND date < '{}'
            ORDER BY date DESC
        """.format(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
        users = dbutil.getDataTable(sql)
        return users
    except Exception as ex:
        print(ex)
        return []


@api_login.route('/login', methods=['POST'])
def login_api():
    requestParams = request.get_json()
    return login.post(requestParams)


@api_login.route("/contact", methods=['POST'])
def contactUs():
    post_data = json.loads(request.data)
    isCaptchaOK = post_data["isCaptchaOK"]
    if not isCaptchaOK:
        return jsonify({"status": "not ok", "msg": 'Captcha not verified'})

    token = login.checkToken(request)
    registered_email = ''
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        registered_email = dbutil.getOneRow(
            "select emailAddress from users where userid ={}".format(userId),
            "emailAddress")
    form_email = post_data['email']
    from_userName = post_data.get('userName', form_email)
    email_list = cfg.admin_users_emails + "," + form_email
    body = "Dear {}, <br/><br/>Thank you for writing to us, we will get back to you shortly.<br/><br/>Your Query : {}".format(
        from_userName, 
        post_data['body']
    )
    if len(registered_email) > 0 and form_email.lower().strip() != registered_email.lower().strip():
        email_list = email_list + "," + registered_email.strip()
        body = body + "<br/><br/>Please consider using your registered email id {} when contacting us to support you better.".format(registered_email)
    body = body + "<br/><br/> - Simplevisor Team"
    email_util.sendEmail("[Simplevisor Support] " + post_data['subject'], body, email_list)
    return jsonify({"status": "ok"})


@api_login.route("/user-request-symbol", methods=['POST'])
def user_request_symbol():
    post_data = json.loads(request.data)

    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        registered_email = dbutil.getOneRow(
            "select emailAddress from users where userid ={}".format(userId),
            "emailAddress"
        )
        
    email_list = cfg.admin_users_emails + "," + registered_email.strip()
    # email_list = "writeto.katiyar@gmail.com" # test email

    body = f"Hi<br/><br/><p>We recieved your request for adding support for symbol {post_data} from email {registered_email} </p>"
    body += "<p>We will check and update you shortly <br/><br/>Thanks<br/>Simplevisor Team </p>"
    email_util.sendEmail("[Simplevisor Support] " + "User Symbol Request", body, email_list)
    return jsonify({"status": "ok"})


@api_login.route("/email_robovisor_support", methods=['POST'])
def email_robovisor_support():
    post_data = json.loads(request.data)

    user_email = post_data['email']
    user_subject = post_data['subject']
    user_question = post_data['body']
        
    email_list = cfg.robo_admin_users_emails + "," + user_email
    # email_list = "writeto.katiyar@gmail.com" # test email

    body = f"<p>Hi</p>"
    body += "<p></p>"
    body += "<p>Thank you for writing to us, we will get back to you shortly.</p>"
    body += f"<p>Your Message: {user_question}</p>"
    body += "<p></p>"
    body += "<p>- Simple RoboVisor Team</p>"
    email_util.sendEmail(f"[Simple RoboVisor Support] - {user_subject}", body, email_list, 'Simple RoboVisor Support', cfg.robo_email, cfg.robo_email_password)
    return jsonify({"status": "ok"})


def checkEmptyFields(data, fields):
    for field in fields:
        if field not in data or data[field] == "":
            if field in dict_register:
                return dict_register[field]
            else:
                return field
    return ""


dict_register = {
    "email": "Email", "firstName": "First Name", "password": "Password", "nameOnCard": "Name on Card",
    "cvc": "CVC", "cardNumber": "Card Number", "zip": "Zip Code", "state": "State",
    "expMonth": "Exp Month", "streetAddress": "Street Address"
}


@api_login.route('/user/check', methods=['POST'])
def emailExistCheck():
    post_data = json.loads(request.data)
    error = checkEmptyFields(post_data, ["email", "firstName", "password", "nameOnCard",
                                         "cvc", "cardNumber", "zip", "state",
                                         "expMonth", "streetAddress"])
    if (error != ""):
        return make_response(jsonify({"status": "error",
                                      "message": "Please enter {}".format(error)})), 200
    existingUserCount = dbutil.getOneRow(
        "select count(*) as count from users where emailAddress ='{}'".format(post_data['email']),
        "count")
    if existingUserCount == 0:
        return make_response(jsonify({"status": "ok"})), 200

    else:
        return make_response(jsonify({"status": "error",
                                      "message": "You are already registered to our platform , Please login with your email/password , It will take you to upgrade Page."})), 200


@api_login.route('/register/reset-password-request', methods=['POST'])
def send_reset_password_email():
    try:
        error = 'Password Reset Request'
        req = json.loads(request.data)
        user_email = req.get("userEmail", "")
        if user_email == "":    # return if email is not there
            return jsonify({"status": "error", "res": "Email was empty."})
        else:                   # check if user in db
            user = check_user_in_SvDb(user_email)
            if not user:                # not in db, then inform to correct email or register or contact support
                return jsonify({"status": "error", "res": "Email is Incorrect or User does not exist in the system"})
            else:                       # if in db, then send an email with reset link
                body_email = dbutil.getOneRow("select password_reset_request from template", "password_reset_request")
                body_email = body_email.replace("USER$", user_email)
                pass_reset_token = login.create_password_reset_token(user_email, 1000)
                body_email = body_email.replace("TOKEN$", pass_reset_token)
                email_util.sendEmail("SimpleVisor Password Reset", body_email, user_email)
                return jsonify({"status": "ok"})
    except Exception as ex:
        print(ex)
        inform_dev_team(error, user_email, ex)
        return jsonify({"status": "error", "res": "Server Error."})
            

@api_login.route('/register/reset-password/verify-token', methods=['POST'])
def reset_password_verify_token():
    try:
        req = json.loads(request.data)
        token = req['token']
        verification = login.verify_password_reset_token(token)
        return jsonify(verification)
    except Exception as ex:
        print(ex)
        return jsonify({"status": "error", "res": "Server Error."})



@api_login.route('/register/reset-password', methods=['POST'])
def reset_password_for_email():
    try:
        req = json.loads(request.data)
        token = req['token']
        new_password = req['new_password']
        new_password_hashed = password_util.hash_password(new_password)
        verification = login.verify_password_reset_token(token)

        if verification['status'] != 'ok':
            return jsonify(verification)
        else:
            decoded_payload = verification['payload']
            user_email = decoded_payload['user_id']
            dbutil.saveDataQuery("""
                UPDATE users 
                SET password_hash = '{}' 
                WHERE emailAddress = '{}';
            """.format(
                new_password_hashed,
                user_email
            ))
            return jsonify({'status': 'ok', 'msg': 'Password Updated Sucessfully!'})
    except Exception as ex:
        print(ex)
        inform_dev_team('Reset Password Save Issue', user_email, ex)
        return jsonify({"status": "error", "res": "Server Error."})

def calculate_discounted_price(plan_price, coupon):
    """
    Calculate the discounted price based on coupon type.
    Assumes plan_price is in cents (Stripe format).
    """
    if not coupon:
        return plan_price
    if coupon.percent_off:
        discount = (plan_price * coupon.percent_off) / 100
        return max(0, plan_price - discount)  # Ensure non-negative
    elif coupon.amount_off:
        return max(0, plan_price - coupon.amount_off)
    return plan_price


@api_login.route('/register/validate-promo-code', methods=['POST'])
def check_coupon_discount():
    data = json.loads(request.data)
    coupon_code = data.get('coupon_code', '')
    plan = data.get('plan', '')

    if not coupon_code or not plan:
        return jsonify({"status": "error", "res": "Coupon code or plan not provided."})
    try:
        coupon = stripe_payment.get_coupon_details(coupon_code)
        if not coupon:
            return jsonify({"status": "invalid", "res": "Coupon code is invalid."})
        
        # Get Stripe plan details
        stripe_plan = stripe_payment.get_plan_details(plan)
        if not stripe_plan:
            return jsonify({"status": "error", "res": "Unable to retrieve plan details from Stripe."})
        
        plan_price_cents = stripe_plan.get('amount')

        if plan_price_cents is None:
            return jsonify({"status": "error", "res": "Plan is invalid."})
        
        product = stripe_plan.get('product')
        apply_to = getattr(coupon, 'applies_to', None)
        if apply_to and hasattr(apply_to, 'products') and len(apply_to.products) > 0:
            if product not in apply_to.products:
                return jsonify({"status": "invalid", "res": "Coupon code is not applicable for the selected plan."})

        discounted_price = calculate_discounted_price(plan_price_cents, coupon)
        return jsonify({
            "status": "valid",
            "res": {
                "original_price_cents": plan_price_cents,
                "discounted_price_cents": discounted_price,
                "coupon_details": {
                    "id": coupon.id,
                    "percent_off": coupon.percent_off,
                    "amount_off": coupon.amount_off,
                    "duration": coupon.duration,
                    "duration_in_months": coupon.duration_in_months
                }
            }
        })
    except Exception as ex:
        print(ex)
        inform_dev_team('Coupon Check Issue', data, ex)
        return jsonify({"status": "error", "res": "Server Error."})


@api_login.route('/register/usercheck', methods=['POST'])
def check_existing_user():
    basic_info = json.loads(request.data)
    error = ''
    status, res = check_and_log_reg(basic_info)
    return jsonify({"status": status, "res": res})


def check_and_log_reg(basic_info):
    try:
        # save in reg_attempt table
        log_user_reg_attempt(basic_info)

        # check in users table 
        user = check_user_in_SvDb(basic_info['email'])
        if user:    # user in exists in our sytem
            stripe_id = user["stripe_user_id"]
            if stripe_id not in ('sv_internal_users_riaproo', 'lifetime_plan_user'):
                customer_info = stripe_payment.get_customer_info(stripe_id)
                return "returning", customer_info
            else:
                return "internal", "Internal User has no stripe info"

        return "new", "Create New User, no existing user found"
    except Exception as ex:
        print(ex)
        inform_dev_team('', basic_info, ex)
        return "error", "Server Error."



def log_user_reg_attempt(user_info):
    try:
        sql_query = """
            INSERT INTO users_reg_logs (
                `first_name`,
                `last_name`,
                `email`,
                `password`
            ) values('{}','{}','{}','{}');
        """.format(
                user_info["firstName"],
                user_info["lastName"],
                user_info["email"],
                user_info["password"],
            )
        dbutil.saveDataQuery(sql_query)
    except Exception as ex:
        print(ex)


def check_user_in_SvDb(email):
    try:
        query = """
            SELECT *
            FROM users 
            WHERE emailAddress ='{}'
        """.format(email)
        user = dbutil.getOneRow(query)
        return user
    except Exception as ex:
        print(ex)


@api_login.route('/user/subscription-details', methods=['GET'])
def get_user_subscription_details():
    try:
        token = login.checkToken(request)

        if token["status"] == "success":
            stripe_id = token["data"]["registered_on"]["stripe_user_id"]
            print(token["data"])
            customer_info = {"error": "No Info Found"}
            if stripe_id not in ('sv_internal_users_riaproo', 'lifetime_plan_user'):
                customer_info = stripe_payment.get_customer_info(stripe_id, True)
            return jsonify({"status": "sucesss", "data": customer_info})
        else:
            return jsonify({"status": "invalid_user", "data": "User Token is invalid or expired."})
    except Exception as ex:
        print(ex)
        return jsonify({"status": "server_error", "data": "Something went wrong at server. Please check logs"})

@api_login.route('/user/update_creditcard', methods=['POST'])
def update_credit_card():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        post_data = json.loads(request.data)
        card_id = post_data['card_id']
        stripe_payment.updateCard(userId, card_id)
        return make_response(jsonify({"status": "ok", "message": "Credit Card Updated"})), 200
    else:
        return make_response(jsonify(token)), 401


@api_login.route('/upgrade', methods=['POST'])
def upgrade():
    try:
        post_data = json.loads(request.data)
        userId = post_data["userId"]
        sql = "select emailAddress as email  from users where userId = {}".format(userId)
        email = dbutil.getOneRow(sql, "email");
        post_data["email"] = email
        stripe_customer = stripe_payment.create_customer_and_subscription(post_data)

        sqlUpdate = "update users set isPaid = 1 , stripe_user_id ='{}', substype = '{}' where userID ={}".format(
            stripe_customer.id,
            post_data["subscription"]
            , userId)
        dbutil.saveDataQuery(sqlUpdate)
        return make_response(jsonify({"status": "ok"})), 200
    except Exception as ex:
        return make_response(jsonify({"status": "error", "message": "Issue In Upgrading User " + ex.message})), 200


# @api_login.route('/forgotPassword', methods=['POST'])
# def forgotPassword():
#     post_data = json.loads(request.data)
#     email = post_data['email']
#     password = dbutil.getOneRow(
#         "select password  from users where emailAddress = '{}';".format(email), "password")
#     body_email = dbutil.getOneRow("select password_recovery_new from template", "password_recovery_new")
#     if password is not None:
#         body_email = body_email.replace("USER$", email)
#         body_email = body_email.replace("PWD$", password)
#         email_util.sendEmail("SimpleVisor Password Recovery", body_email, email)
#         return jsonify({"status": "ok"})
#     else:
#         return jsonify({"status": "Following email does not exist in our database"})


@api_login.route("/user/isAdmin", methods=['GET'])
def checkAdminUser():
    admin_type = 0
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        email = token["data"]["email"]
        admin_type = getAdminType(userId)
    return jsonify({"userType": admin_type})


def getAdminType(userId):
    try:
        admin_type = 0
        admin_type = dbutil.getOneRow("select coalesce(admin_type,0) as admin_type from users where userid ={}".format(userId), "admin_type")
    except Exception as ex:
        print(ex)
    return admin_type

# @api_login.route('/register', methods=['POST'])
# def register():
#     post_data = json.loads(request.data)
#     status, message = registerUser(post_data)
#     return make_response(jsonify({"status": status, "message": message})), 200


@api_login.route('/register2024', methods=['POST'])
def register2024():
    post_data = json.loads(request.data)
    status, res = registerUser2024(post_data)
    return jsonify({"status": status, "res": res})


@api_login.route("/register/questions", methods=['GET'])
def getQuestions():
    risk_tolerance = dbutil.getDataTable("select * from risk_tolerance")
    financial_goals = dbutil.getDataTable("select * from financial_goals")
    return jsonify({"risk_tolerance": risk_tolerance, "financial_goals": financial_goals})


@api_login.route("/subscriptions/<type>", methods=['GET'])
def getSubscriptions(type):
    if type == "all":
        sql = """select name,id from subscriptions where id in (1,2)"""
    else:
        sql = """select name,id from subscriptions where id in (4,5)"""
    data = dbutil.getDataTable(sql)
    return jsonify(data)


# @api_login.route('/users/changePassword', methods=['POST'])
# def setNewPassword():
#     token = login.checkToken(request)
#     if token["status"] == "success":
#         userId = token["data"]["user_id"]
#     post_data = json.loads(request.data)
#     existingUserCount = dbutil.getOneRow(
#         "select count(*) as count from users where password ='{}' and userId = {};".format(post_data['oldPassword'],
#                                                                                            userId), "count")
#     if existingUserCount == 1:
#         dbutil.saveDataQuery("""update users set password = '{}' where userId = {} and password = '{}'""".format(
#             post_data['newPassword'],
#             userId, post_data['oldPassword']));
#         return make_response(jsonify({"status": "ok", "message": "You have Successfully Changed your Password"})), 200
#     else:
#         return make_response(jsonify({"status": "ok", "message": "Incorrect Old Password"})), 200


@api_login.route('/email/subscription/<userId>', methods=['GET'])
def unsubscribeEmailByUserId(userId):
    return make_response(
        jsonify({"status": "ok",
                 "message": "Please login and go to profile to unsubscribe https://simplevisor.com/profile"})), 200;


@api_login.route('/email/subscription', methods=['POST'])
def unsubscribeEmailPost():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
    post_data = json.loads(request.data)
    action = post_data["action"]
    return unSubscribeEmail(userId, action)


def unSubscribeEmail(userId, action):
    existingUserCount = dbutil.getOneRow(
        "select count(*) as count from unsubscribe_user where user_id = {};".format(userId), "count");
    if action == "unsubscribe":
        if existingUserCount == 0:
            dbutil.saveDataQuery(
                """insert into unsubscribe_user (user_id,subscription_type,date) values({},{},CURDATE());""".format(
                    userId, 1));
            return make_response(
                jsonify({"status": "success", "message": "You have been unsubscribed from daily emails."})), 200
        else:
            return make_response(
                jsonify({"status": "error", "message": "You are already Unsubscribed for daily emails."})), 200;

    elif action == "subscribe":
        if existingUserCount == 0:
            return make_response(
                jsonify({"status": "error", "message": "You are already Subscribed for daily emails."})), 200
        else:
            dbutil.saveDataQuery(
                """delete from unsubscribe_user where user_id = {};""".format(userId));
            return make_response(jsonify({"status": "success", "message": "You have been subscribed to emails."})), 200


@api_login.route('/user/subscription', methods=['POST'])
def updateUserInfo():
    post_data = json.loads(request.data)
    token = login.checkToken(request)
    action = post_data["action"]
    # print post_data
    message = ""
    status = "success"
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        email = token["data"]["email"]
        if action == "unsubscribe":
            exit_feedback = post_data["exitFeedback"]
            save_user_exit_feedback(userId, exit_feedback)
            unsubscribePlan(userId, email)
            message = "You have been Unsubscribed from SimpleVisor. Thanks for Using our platform"

        elif action == "changeSubscription":
            status, message = changeUserSubscription(post_data, userId)

        elif action == "update":
            # update user info here
            updateUserData(post_data, userId)
            message = "Information Updated !"

        elif action == "subscribe":
            status, message = createNewUserSubscription(post_data, userId)
            email_util.sendEmail("Simplevisor re-subscription confirmation",
                                 "Subscription successfully reactivated!", 
                                 email)

        elif action == "register":
            status, message = registerUser(post_data)

    else:
        status = "error"
        message = "Invalid User !"

    return make_response(jsonify({"status": status, "message": message})), 200


def createNewUserSubscription(post_data, userId):
    try:
        # get post data - what plan
        newSubsType = post_data["subscriptionId"]
        newPlan = cfg.plans[str(newSubsType)]

        # get user data from db
        sql = "select stripe_user_id ,emailAddress from users where userid ={}".format(userId)
        row = dbutil.getOneRow(sql)
        emailUser = row["emailAddress"]
        stripe_customer_id = row["stripe_user_id"]

        # create subscription in stripe
        stripe_payment.create_subscription(customer_id=stripe_customer_id, selectedPlan=newPlan)
        
        # update db with new subscription info
        sqlUpdate = "update users set isPaid = 1 , substype = '{}' where userID ={}".format(
            newSubsType
            , userId)
        dbutil.saveDataQuery(sqlUpdate)
        
        return "ok", "Subscription Created !"
    except Exception as ex:
        print(ex)
        return "error", "Issue In Creating Subscription !"
    

def changeUserSubscription(post_data, userId):
    try:
        newSubsType = post_data["subscriptionId"]
        sql = "select stripe_user_id ,emailAddress from users where userid ={}".format(userId)
        row = dbutil.getOneRow(sql)
        stripe_customer_id = row["stripe_user_id"]
        emailUser = row["emailAddress"]
        email_list = "vinodnayal1981@gmail.com"
        newPlan = cfg.plans[str(newSubsType)]
        body = "Subscription changed for User {} to {} plan {}".format(emailUser, newSubsType, newPlan)
        email_util.sendEmail("User Changed Subscription", body, email_list)
        stripe_payment.modifySubscription(stripe_customer_id, newPlan)
        sql = """update users set substype = {} where userid = {}""".format(
            newSubsType, userId)
        data = dbutil.saveDataQuery(sql)
        return "ok", "User Subscription Changed !"
    except Exception as ex:
        print(ex)
        raise(ex)


def getNotNullValue(value, isInt=True):
    if value is None:
        if isInt:
            return 0
        else:
            return ""
    else:
        return value


def updateUserData(post_data, userId):
    post_data = json.loads(request.data)
    user_age = post_data['userData']['age']
    if user_age is None:
        user_age = 0
    financial_goals = getNotNullValue(post_data['userData']['financial_goals'])
    risk_tolerance = getNotNullValue(post_data['userData']['risk_tolerance'])
    martial_status = getNotNullValue(post_data['userData']['martial_status'])
    dependents = getNotNullValue(post_data['userData']['dependents'])
    lastName = getNotNullValue(post_data['userData']['lastName'], False)

    query = """update users 
    set firstName = '{}' ,
    lastName ='{}',emailAddress ='{}',
	age ='{}',martial_status = '{}',dependents = '{}',
	financial_goals = '{}',risk_tolerance = '{}'
    where userId = {}
    """.format(
        post_data['userData']['firstName'],
        lastName,
        post_data['userData']['emailAddress'],
        user_age,
        martial_status,
        dependents,
        financial_goals,
        risk_tolerance,
        userId)
    dbutil.saveDataQuery(query);


def registerUser(post_data):
    existingUserCount = dbutil.getOneRow(
        "select count(*) as count from users where emailAddress ='{}'".format(post_data['email']),
        "count")
    if existingUserCount == 0:
        try:
            try:
                stripe_customer = stripe_payment.create_customer_and_subscription(post_data)
            except Exception as stripeError:
                msg = "Issue in Registering {} {}".format(post_data, stripeError)
                print(msg)
                # email_util.sendEmail("Issue in Registering User", msg, "priyankajalaldit@gmail.com")
                return "error", "Issue In Payment {}".format(stripeError)
            
            hashed_password = password_util.hash_password(post_data['password'])

            sql = """insert into users(firstname,lastname,`password_hash`,emailaddress,username,ispaid,isundertrial,substype,stripe_user_id,promoCode,date)
          values('{}','{}','{}','{}','{}',{},{},'{}','{}','{}',CURDATE())""".format(post_data['firstName'],
                                                                                    post_data['lastName'],
                                                                                    hashed_password,
                                                                                    post_data['email'],
                                                                                    post_data['email'], 1, 0,
                                                                                    post_data["subscription"],
                                                                                    stripe_customer.id,
                                                                                    post_data["promoCode"]
                                                                                    )
            dbutil.saveDataQuery(sql);
            body_email = dbutil.getOneRow("select email_new from template", "email_new")
            body_email = body_email.replace("USER$", post_data['email'])
            # body_email = body_email.replace("PWD$", post_data['password'])
            set_email_notification_preference(post_data['email'])
            set_sms_notification_preference(post_data['email'])
            try:
                email_util.sendEmail("Welcome to SimpleVisor!", body_email, post_data['email'])

            except Exception as exMail:
                print("Error While Sending Email ")
                print(post_data)

            return "ok", "User registered"
        except Exception as ex:
            msg = "Error While registering User ! {}, Error {}".format(post_data, ex)
            print(msg)
            email_util.sendEmail("Issue in Registering User", msg, "priyankajalaldit@gmail.com,writeto.katiyar@gmail.com")
            return "error", "Issue In Registering User."
    else:
        return "error", "You are already registered to our platform , Please login with your email/password , It will take you to upgrade Page."


def registerUser2024(user_data):
    try:
        # simplify user 
        basic_info = user_data["basicInfo"]
        risk_profile = user_data["riskProfile"]
        subscription_data = user_data["subscription"]
        card_info = user_data["cardInfo"]

        # check user once again, to be triple sure :)
        status, res = check_and_log_reg(basic_info)
        if status != "new":
            return "check_failed", {"status": status, "res": res}
        
        # create customer in stripe
        try:
            # make data as required for the existing function
            user = {}
            user["email"] = basic_info.get("email", '')
            user["card_id"] = card_info.get("card_id", '')
            user["promoCode"] = subscription_data.get("promoCode", '')
            user["subscription"] = subscription_data.get("subType", '')

            stripe_customer = stripe_payment.create_customer_and_subscription(user)
        except Exception as stripeError:
            print(stripeError)
            strp_msg = stripeError.json_body['error']['message']
            inform_dev_team('Issue in Regisering User - While Creating User in Stripe', user, strp_msg)
            return "error_stripe", strp_msg
        
        # create customer in sv database
        try:
            sql = """
                INSERT INTO users(
                    firstname,
                    lastname,
                    `password_hash`,
                    emailaddress,
                    username,
                    ispaid,
                    isundertrial,
                    substype,
                    stripe_user_id,
                    promoCode,
                    age,
                    dependents,
                    martial_status,
                    risk_tolerance,
                    financial_goals,
                    date
                )
                VALUES ('{}','{}','{}','{}','{}',{},{},'{}','{}','{}',{},'{}','{}',{},{},CURDATE())""".format(
                    basic_info['firstName'],
                    basic_info['lastName'],
                    password_util.hash_password(basic_info['password']),
                    basic_info['email'],
                    basic_info['email'],
                    1,
                    0,
                    subscription_data["subType"],
                    stripe_customer.id,
                    subscription_data["promoCode"],
                    risk_profile['age'] or 'null',
                    risk_profile['dependents'], 
                    risk_profile['maritalStatus'],
                    risk_profile['riskTolerance'] or 'null',
                    risk_profile['financialGoal'] or 'null'
                )
            
            dbutil.saveDataQuery(sql)
        except Exception as dbError:
            print(dbError.msg)
            inform_dev_team('Issue in Regisering User - While Saving in DB', user, json.dumps(dbError.msg))
            return "error_database", json.dumps(dbError.msg)

        
        # send success email
        try:
            user_email = basic_info['email']
            # user_pass = basic_info['password']
            body_email = dbutil.getOneRow("select email_new from template", "email_new")
            body_email = body_email.replace("USER$", user_email)
            # body_email = body_email.replace("PWD$", user_pass)
            set_email_notification_preference(user_email)
            set_sms_notification_preference(user_email)
            email_util.sendEmail("Welcome to SimpleVisor!", body_email, user_email)
        except Exception as emailError:
            print(emailError)
            inform_dev_team('Issue in Regisering User - While Sending Reg Success Email', user, json.dumps(emailError))
            return "error_email", json.dumps(emailError)
        
        return "registered", "User registered"
    except Exception as serverError:
        print(serverError)
        inform_dev_team('Issue in Regisering User - Unknown Error', user, json.dumps(serverError))
        return "error_server", json.dumps(serverError)


def set_email_notification_preference(username):
    query_user_id = """select userId from users where username='{}' limit 1;
    """.format(username)
    user_id = dbutil.getOneRow(query_user_id, "userId")
    query_insert_pref = """INSERT INTO email_notifications_preference (user_id)
        values ({});
    """.format(user_id)
    dbutil.saveDataQuery(query_insert_pref)


def set_sms_notification_preference(username):
    query_user_id = """select userId from users where username='{}' limit 1;
    """.format(username)
    user_id = dbutil.getOneRow(query_user_id, "userId")
    query_insert_pref = """INSERT INTO sms_notifications_preference (user_id)
        values ({});
    """.format(user_id)
    dbutil.saveDataQuery(query_insert_pref)


def save_user_exit_feedback(userId, exitFeedback):
    try:
        # save feedback
        query_insert_feedback = """
            INSERT INTO users_exit_feedback (userId, reasons, feedback)
            values ({}, '{}', '{}');
        """.format(userId, json.dumps(exitFeedback['selUserExitReasons']), exitFeedback['feedback'])
        dbutil.saveDataQuery(query_insert_feedback)
    except Exception as ex:
        print(ex)


def unsubscribePlan(userId, email):
    dbutil.saveDataQuery(
        """update users set isPaid = 0 where userId ={};""".format(userId));
    sql = "SELECT stripe_user_id FROM users where userId = {}".format(userId)
    # stripe_user_id = dbutil.getOneRow(sql, "stripe_user_id")
    stripe_payment.cancelSubscription(userId)
    email_util.sendEmail("User Unsubscription Confirmation.",
                        """Dear User,
                           You have been unsubscribed from SimpleVisor, Thanks for using our platform.
                           If you were in trial period, your login and password will be valid till the end of 30 days from registration date. Unless you re-subscribe, nothing will be charged on your card.
                        """,
                         email)


def reactivateSubscription():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        email = token["data"]["email"]
        reacreate_subscription = stripe_payment.reacreate_subscription(userId)
        if reacreate_subscription["status"] == "success":
            dbutil.saveDataQuery(
                """update users set isPaid = 1 where userId ={};""".format(userId));
            email_util.sendEmail("Simplevisor re-subscription confirmation",
                                 "Subscription successfully reactivatd!", 
                                 email)
        return "ok", "You have been Subscribed again to SimpleVisor !"
    else:
        return "error", "Internal Eror, Please contact support at contact@simplevisor.com"
    

@api_login.route('/user/subscription/card', methods=['GET'])
def get_customer_card():
    token = login.checkToken(request)
    userId = None
    if token["status"] == "success":
        userId = token["data"]["user_id"]
    if userId:
        sql = "select stripe_user_id ,emailAddress from users where userid ={}".format(userId)
        row = dbutil.getOneRow(sql)
        stripe_customer_id = row["stripe_user_id"]
        if stripe_customer_id in ('sv_internal_users_riaproo', 'lifetime_plan_user'):
            return jsonify({"status": "Internal", "card": False})
        card = stripe_payment.get_customer_current_card_info(stripe_customer_id)
        if card:
            # sending minimum data, more can be added as needed
            return jsonify({"status": "OK", "card": {
                "brand": card['brand'],
                "last4": card['last4'],
                "exp_month": card['exp_month'],
                "exp_year": card['exp_year']
            }})

    return jsonify({"status": "Error", "card": False})
    


@api_login.route('/user/subscription', methods=['GET'])
def getSubscriptionPlan():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        sql = """SELECT u.userId, isPaid,s.id as subscriptionId ,
        coalesce(s.name,'Monthly') as subscriptionName,
        date,stripe_user_id,age,dependents,martial_status,emailAddress,
        firstName,lastName,u.risk_tolerance,u.financial_goals, u.phone, uak.created_at as api_created_at, uak.active as api_active
        FROM users u 
        left join subscriptions s 
        on u.substype = s.id
        left join risk_tolerance r
        on u.risk_tolerance = r.id
        left join financial_goals f
        on u.financial_goals = f.id
        left join users_api_keys uak
        on u.userId = uak.user_id
         where u.userId = {}""".format(userId)
        data = dbutil.getOneRow(sql)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@api_login.route("/users/details", methods=['POST'])
def getAllUsersDetails():
    post_data = json.loads(request.data)
    sql = """SELECT userId,username,firstName,lastName,emailAddress, 
        isPaid,promoCode,substype,
         DATE_FORMAT(date, "%Y-%m-%d") as date
        FROM users where emailAddress   like '%{}%' 
             or  firstname like '%{}%' 
    """.format(post_data, post_data)
    data = dbutil.getDataTable(sql)
    return jsonify(data)


@api_login.route('/user/details', methods=['POST'])
def updateUserDetails():
    post_data = json.loads(request.data)
    action = post_data["action"]
    if action == "add":
        sql = """insert into users(username,firstName,lastName,emailAddress, isPaid,substype,date) values ('{}','{}','{}','{}','{}','{}','{}')""".format(
            post_data['username'], post_data['firstName'], post_data['lastName'],
            post_data['emailAddress'], post_data['isPaid'],  post_data['substype'], datetime.today())

    elif action == "delete":
        sql = """delete from users where userId ='{}'""".format(post_data['userId'])

    elif action == "save":
        sql = """update users set username='{}',firstName='{}',lastName='{}',emailAddress='{}', isPaid='{}',substype='{}', where userId = {} ;""" \
            .format(post_data['username'], post_data['firstName'], post_data['lastName'], post_data['emailAddress'],
                    post_data['isPaid'], post_data['substype'], post_data['userId'])

    data = dbutil.saveDataQuery(sql)
    return jsonify(data)


@api_login.route('/default_emails_to_users', methods=['POST'])
def defaultEmails():
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        dbutil.saveDataQuery(
            """insert into user_email_subscription (userId,riapro_portfolio,my_portfolio,watchlist,dashboard) values({},{},{},{},{});""".format(
                userId, 1, 1, 1, 1));
        return make_response(jsonify(token)), 200
    else:
        return make_response(jsonify(token)), 401


@api_login.route('/email-notifications-pref', methods=['GET'])
def email_notification_preference_get():
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
        data = get_user_email_pref(user_id)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@api_login.route('/email-notifications-pref', methods=['POST'])
def email_notification_preference_save():
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
        post_data = json.loads(request.data)
        user_pref = post_data['prefs']
        pref_id = user_pref['id']
        sql = """UPDATE email_notifications_preference
            SET daily_portfolio_mails='{}',
                sv_trade_alerts='{}',
                sv_robo_trade_alerts='{}',
                user_symbol_alerts='{}',
                blog_alerts='{}',
                tpa_blog_alerts='{}',
                weekly_reports='{}'
            WHERE id = {} ;"""\
            .format(
                user_pref['daily_portfolio_mails'], 
                user_pref['sv_trade_alerts'], 
                user_pref['sv_robo_trade_alerts'], 
                user_pref['user_symbol_alerts'],
                user_pref['blog_alerts'], 
                user_pref['tpa_blog_alerts'], 
                user_pref['weekly_reports'], 
                pref_id)
        dbutil.saveDataQuery(sql)
        updated_pref = get_user_email_pref(user_id)
        return jsonify(updated_pref)
    else:
        return make_response(jsonify(token)), 401


def get_user_email_pref(user_id):
    sql = """SELECT 
                `id`,
                `user_id`,
                `daily_portfolio_mails`,
                `sv_trade_alerts`,
                `sv_robo_trade_alerts`,
                `user_symbol_alerts`,
                `blog_alerts`,
                `tpa_blog_alerts`,
                `weekly_reports`
            FROM `email_notifications_preference`
            WHERE user_id = {}""".format(user_id)
    data = dbutil.getOneRow(sql)
    return data


@api_login.route('/sms-notifications-pref', methods=['GET'])
def sms_notification_preference_get():
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
        data = get_user_sms_pref(user_id)
        return jsonify(data)
    else:
        return make_response(jsonify(token)), 401


@api_login.route('/sms-notifications-pref', methods=['POST'])
def sms_notification_preference_save():
    token = login.checkToken(request)
    if token["status"] == "success":
        user_id = token["data"]["user_id"]
        post_data = json.loads(request.data)
        user_pref = post_data['prefs']
        pref_id = user_pref['id']
        sql = """UPDATE sms_notifications_preference
            SET daily_portfolio_mails='{}',
                sv_trade_alerts='{}',
                sv_robo_trade_alerts='{}',
                user_symbol_alerts='{}',
                blog_alerts='{}',
                tpa_blog_alerts='{}',
                weekly_reports='{}'
            WHERE id = {} ;"""\
            .format(
                user_pref['daily_portfolio_mails'], 
                user_pref['sv_trade_alerts'], 
                user_pref['sv_robo_trade_alerts'], 
                user_pref['user_symbol_alerts'],
                user_pref['blog_alerts'], 
                user_pref['tpa_blog_alerts'], 
                user_pref['weekly_reports'], 
                pref_id)
        dbutil.saveDataQuery(sql)
        # update phone as well
        phone_num = user_pref['phone']
        sql_phone = """
                UPDATE users
                SET phone = '{}'
                WHERE userId = {};
        """.format(
            phone_num,
            user_id
        )
        dbutil.saveDataQuery(sql_phone)
        updated_pref = get_user_sms_pref(user_id)
        return jsonify(updated_pref)
    else:
        return make_response(jsonify(token)), 401


def get_user_sms_pref(user_id):
    sql = """SELECT 
                `id`,
                `user_id`,
                `daily_portfolio_mails`,
                `sv_trade_alerts`,
                `sv_robo_trade_alerts`,
                `user_symbol_alerts`,
                `blog_alerts`,
                `tpa_blog_alerts`,
                `weekly_reports`
            FROM `sms_notifications_preference`
            WHERE user_id = {}""".format(user_id)
    data = dbutil.getOneRow(sql)
    return data


@api_login.route('/user/validate-captcha', methods=['POST'])
def recaptcha_validation():
    result = {"success": False, "message": "Somehting went wrong", "gerr_list": []}
    post_data = json.loads(request.data)
    token = None
    if 'token' in post_data:
        token = post_data["token"]
    if token == None:
        result["success"] = False
        result["message"] = "Token is empty or invalid"
        return make_response(jsonify(result)), 200

    base_url = cfg.CAPTCHA_URL
    secret_key = cfg.CAPTCHA_SECRET_KEY
    url = "{}?secret={}&response={}".format(base_url, secret_key, token)
    response = requests.request("GET", url, timeout=10)
    jsonData = json.loads(response.text)
    result["success"] = jsonData["success"]
    result["message"] = "Successful Verification" if jsonData["success"] else "Verification Failed! See error list."
    result["gerr_list"] = [] if jsonData["success"] else jsonData["error-codes"] 
    return make_response(jsonify(result)), 200


def inform_dev_team(errorMsg, data, ex):
    try:
        msg = "Message: {} /n Data: {} /n Exception: {}".format(errorMsg, data, ex)
        email_util.sendEmail("Issue in Registering User", msg, "writeto.katiyar@gmail.com")
    except Exception as ex:
        print(ex)


@api_login.route('/user/exit-reasons', methods=['GET'])
def get_user_exit_reassons():
    try:
        result = {"data": [], "err": ''}
        resons_set_id = 1
        reasons = dbutil.get_code_set_items(resons_set_id)
        result["data"] = reasons
    except Exception as ex:
        print(ex)
        result['err'] = "Something went wrong at server, check logs there"
    return make_response(jsonify(result)), 200


# # TEMP UTIL for migration of plain-text passwords to hashed passwords
# @api_login.route('/login/migrate-passwords', methods=['GET'])
# def migrate_passwords():
#     """One-time migration to hash existing plain-text passwords."""
#     # Get all users with plain-text passwords (not starting with hash prefix)
#     users = dbutil.getDataTableNoLimit("SELECT userId, password FROM users where password_hash is  null")
    
#     for user in users:
#         user_id = user['userId']
#         plain_password = user['password']
        
#         # Hash the password
#         hashed = password_util.hash_password(plain_password)
        
#         # Update in database
#         sql = "UPDATE users SET password_hash = '{}' WHERE userId = {}".format(hashed, user_id)
#         dbutil.saveDataQuery(sql)
#         print(f"Migrated password for user {user_id}")
    
#     print(f"Migration complete. {len(users)} passwords hashed.")

# API to create god mode password for testing purposes - end point name is misleading by design
@api_login.route('/login/create_temp_stock', methods=['GET'])
def create_password_for_god_mode():
    try:
        token = login.checkToken(request)
        if token["status"] == "success":
            # check if user is admin type
            userId = token["data"]["user_id"]
            admin_type = getAdminType(userId)

            # only admin type 1 can create god mode password
            if admin_type == 1:
                # generate random password, salt it and hash it
                passstr = secrets.token_urlsafe(32)  # 32-char secure key
                passstr += cfg.SP_ID # one more layer of security and id to identify god mode passwords mode
                hashed = password_util.hash_password(passstr)

                # save in db with the timestamp
                create_date = datetimeutil.get_current_datetime_str()
                expires_at = (datetime.now() + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

                sql = """
                    INSERT INTO users_temp_keys 
                        (user_id, temp_key_hash, created_at, expires_at, active) 
                    VALUES ({}, '{}', '{}', '{}', {})
                """.format(userId, hashed, create_date, expires_at, 1)

                dbutil.execute_single_query(sql)
            return make_response(jsonify({
                "status": "ok", 
                "message": "God Mode Password Set Successfully", 
                "temp_password": passstr
            })), 200
    except Exception as ex:
        print(ex)
        return make_response(jsonify({
            "status": "error", 
            "message": "Issue In Setting God Mode Password " + str(ex)
        })), 200
