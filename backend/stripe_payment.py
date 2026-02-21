import stripe
from MyConfig import MyConfig as cfg
import dbutil

stripe.api_key = cfg.stripe_private_key


def get_all_coupouns():
    coupons = stripe.Coupon.list(limit=300)
    # coupons.data[0].name.lower()
    coupons_dict = {}
    for coupon in coupons:
        if coupon.name:
            coupons_dict.update({coupon.name.lower(): coupon})

    return coupons_dict


def get_coupon_details(coupon_code):
    try:
        coupon_details = None
        all_coupons = get_all_coupouns()
        if coupon_code.lower() in all_coupons:
            coupon_details = all_coupons[coupon_code.lower()]
            coupon_details = stripe.Coupon.retrieve(all_coupons[coupon_code.lower()].id, expand=['applies_to'])
        return coupon_details
    except Exception as ex:
        print("Issue in Retrieving Coupon Details for Coupon Code {} , Issue {}".format(coupon_code, ex))
        return None

def get_plan_details(plan_id):
    try:
        plan = stripe.Plan.retrieve(cfg.plans[str(plan_id)])
        return plan
    except Exception as ex:
        print("Issue in Retrieving Plan Details for Plan ID {} , Issue {}".format(plan_id, ex))
        return None

def modifySubscription(customer_id, newPlan):
    try: 
        subscriptions = stripe.Subscription.list(customer=customer_id, limit=1)
        if subscriptions.data and len(subscriptions.data) > 0:
            subscription = subscriptions.data[0]
            # subscription = stripe.Subscription.retrieve(subscription_id)
            stripe.Subscription.modify(
                subscription.id,
                cancel_at_period_end=False,
                proration_behavior='create_prorations',
                items=[{
                    'id': subscription['items']['data'][0].id,
                    'plan': newPlan,
                }]
        )
    except Exception as ex:
        print("Issue in Modifying Subscription, Issue {}".format(ex))
        raise (ex)


def create_customer_and_subscription(user):
    try:
        coupons = get_all_coupouns()
        coupon = None
        customer = stripe.Customer.create(email=user["email"], source=user["card_id"])
        user_coupoun = user["promoCode"].lower()
        if user_coupoun in coupons:
            coupon = coupons[user_coupoun]
        if str(user["subscription"]) == "3":
            oneTimeCharge(user, customer, coupon)
        else:
            plans = cfg.plans
            userPlan = plans[str(user["subscription"])]
            if coupon:
                subscription = stripe.Subscription.create(
                    customer=customer.id,
                    items=[{'plan': userPlan, 'discounts': [{'coupon': coupon.stripe_id}]}],
                    trial_period_days=30
                )
            else:
                print("Creating Subscription for User {} {}".format(customer, userPlan))
                subscription = stripe.Subscription.create(
                    customer=customer.id,
                    items=[{'plan': userPlan}],
                    trial_period_days=30
                )
        return customer
    except Exception as ex:
        print("Issue in Creating Subscription {} , Issue {}".format(user, ex))
        raise (ex)


def create_subscription(customer_id, selectedPlan):
    customer = stripe.Customer.retrieve(customer_id)
    subscription = stripe.Subscription.create(
        customer=customer.id,
        items=[{'plan': selectedPlan}],
        trial_period_days=0
    )


def oneTimeCharge(user, customer, coupon):
    life_time_charge = 299900
    if coupon != "":
        life_time_charge = 249900
        charge = stripe.Charge.create(
            customer=customer.id,
            amount=life_time_charge,
            currency='usd',
            description='Founders Lifetime RIA Pro Plan'
        )
    else:
        charge = stripe.Charge.create(
            customer=customer.id,
            amount=life_time_charge,
            currency='usd',
            description='Founders Lifetime RIA Pro Plan'
        )


def getStripeCustomerId(userId):
    sql = "select stripe_user_id ,emailAddress from users where userid ={}".format(userId)
    stripe_customer_id = dbutil.getOneRow(sql, "stripe_user_id")
    user_email = dbutil.getOneRow(sql, "emailAddress")
    if stripe_customer_id is None or stripe_customer_id == "":
        user_list = stripe.Customer.list(email=user_email)
        if len(user_list) == 1:
            stripr_customer_id = user_list[0].id
    return stripe_customer_id


def cancelSubscription(userId):
    try:
        customer_id = getStripeCustomerId(userId)
        subscriptions = stripe.Subscription.list(customer=customer_id)
        # subscription_data_list = stripe_customer['subscriptions']['data']
        for subscription in subscriptions.data:
            response = stripe.Subscription.modify(
                subscription.id,
                cancel_at_period_end=True
            )
    except Exception as ex:
        print(ex)
        return None


def redActivateSubscription(userId):
    try:
        customer_id = getStripeCustomerId(userId)
        subscriptions = stripe.Subscription.list(customer=customer_id, limit=1)

        if subscriptions.data and len(subscriptions.data) > 0:
            subscription_data = subscriptions.data[0]
            response = stripe.Subscription.modify(
                subscription_data.id,
                cancel_at_period_end=False
            )
            return response
        return None
    except Exception as ex:
        print(ex)
        return None


def reacreate_subscription(userId):
    try:
        customer_id = getStripeCustomerId(userId)
        subscriptions = stripe.Subscription.list(customer=customer_id, limit=1, status='all')

        if subscriptions.data and len(subscriptions.data) > 0:
            subscription_data = subscriptions.data[0]
            # subscription_data.delete()
        
        # Create a new subscription with the same plan
        new_subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{
                'price': subscription_data['items']['data'][0]['price']['id'],
            }],
            trial_period_days=0,  # Set trial period in days
        )
        return new_subscription
    except Exception as ex:
        print(ex)
        return None


def updateCard(userId, newCardToken):
    customer_id = getStripeCustomerId(userId)

    # Create a PaymentMethod from the token
    payment_method = stripe.PaymentMethod.create(
        type='card',
        card={'token': newCardToken}
    )
    
    # Attach the payment method to the customer
    payment_method = stripe.PaymentMethod.attach(
        payment_method.id,
        customer=customer_id,
    )
    
    # Set it as the default payment method
    stripe.Customer.modify(
        customer_id,
        invoice_settings={
            'default_payment_method': payment_method.id,
        },
    )
    
    return payment_method


def get_user_susbscription_status(userId):
    sub_status = None
    try:
        customer_id = getStripeCustomerId(userId)
        subscriptions = stripe.Subscription.list(customer=customer_id, status='all', limit=1)
        if subscriptions.data and len(subscriptions.data) > 0:
            subscription_data = subscriptions.data[0]
            if subscription_data['status']:
                sub_status = subscription_data['status']
    except Exception as ex:
        print(f"Error checking subscription status: {ex}")
        sub_status = None
    return sub_status

# helper function to find item from a list
# def find_item_by_name(list_of_obj, target_prop_val):
#     for obj in list_of_obj:
#         if obj.id == target_prop_val:
#             return obj
#     return None


def get_customer_current_card_info(customer_id):
    customer = stripe.Customer.retrieve(customer_id)
    return get_default_card_of_customer(customer)
    

# helper fucntion to extract default card from stripe customer dict
def get_default_card_of_customer(customer):
    try:
        # Use the newer Payment Methods API
        payment_methods = stripe.PaymentMethod.list(
            customer=customer.id,
            type='card'
        )
        
        if payment_methods.data and len(payment_methods.data) > 0:
            # Get the default payment method or the first one
            default_pm = None
            
            # Check if customer has a default payment method set
            if hasattr(customer, 'invoice_settings') and customer.invoice_settings.get('default_payment_method'):
                default_pm_id = customer.invoice_settings.default_payment_method
                for pm in payment_methods.data:
                    if pm.id == default_pm_id:
                        default_pm = pm
                        break
            
            # If no default found, use the first payment method
            if not default_pm:
                default_pm = payment_methods.data[0]
            
            # Return card details in the same format as the old sources API
            if default_pm and default_pm.card:
                return {
                    'id': default_pm.id,
                    'brand': default_pm.card.brand,
                    'last4': default_pm.card.last4,
                    'exp_month': default_pm.card.exp_month,
                    'exp_year': default_pm.card.exp_year
                }
        
        return None
    except Exception as ex:
        print(f"Error retrieving payment methods: {ex}")
        return None
    

# helper function to extract default subscription from stripe customer dict
def get_default_susbscription_of_customer(customer):
    # Retrieve subscriptions separately using customer ID
    # customer["id"] = "cus_T6gyrayYS2hYBs"
    subscriptions = stripe.Subscription.list(customer=customer.id, limit=1)
    
    if subscriptions.data and len(subscriptions.data) > 0:
        return subscriptions.data[0]
    return None


# get customer dict for the given stripe id
def get_customer_info(stripe_id, get_all = False):
    customer = {
        "error": None,
        "email": None,
        "card": None,
        "subs_status": None,
        "canceled_at": None,
        "subscription": None,
    }
    try:
        stripe_customer = stripe.Customer.retrieve(stripe_id)
        subscription = get_default_susbscription_of_customer(stripe_customer)
        card = get_default_card_of_customer(stripe_customer)

        customer["error"] = ""
        customer["email"] = stripe_customer["email"]
        if not subscription:
            customer["subs_status"] = "Expired or Cancelled"
        else:
            customer["subs_status"] = subscription["status"]
            customer["canceled_at"] = subscription["canceled_at"]
            
        if get_all:
            customer["card"] = card
            customer["subscription"] = subscription
        return customer
    except Exception as ex:
        print(ex)
        customer['error'] = "Stripe Error"
        return customer
