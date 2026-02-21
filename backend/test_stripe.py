import stripe
from MyConfig import MyConfig as cfg
import dbutil
import pandas as pd
from flask import jsonify
import json



stripe.api_key = cfg.stripe_private_key
customer = stripe.Customer.retrieve("cus_MBtOROIOLgZwEI")
customer_json = json.dumps(customer)

# get paid users as of now 
sql = "select userId, emailAddress, substype, stripe_user_id from users where isPaid = 1 and stripe_user_id != 'sv_internal_users_riaproo' and stripe_user_id != 'lifetime_plan_user';"

paidUser20240816 = dbutil.getDataTableNoLimit(sql)
paidUser20240816_df = pd.DataFrame(paidUser20240816)

paidUser20240816_df['Subs'] = ''
paidUser20240816_df['Subs_Status'] = ''
paidUser20240816_df['Subs_Cancel'] = ''
paidUser20240816_df['Cards'] = ''
paidUser20240816_df['Cards_Exp'] = ''

for index, cust in paidUser20240816_df.iterrows():
    print(f"Email: {cust['emailAddress']}")
    cust_stp_id = cust['stripe_user_id']
    if cust_stp_id not in ('sv_internal_users_riaproo', 'lifetime_plan_user'):
        strp_cust = stripe.Customer.retrieve(cust_stp_id)

        subscriptions = strp_cust['subscriptions']['data']
        if len(subscriptions) > 0:
            subs = ''
            subs_sts = ''
            subs_cancel = ''
            plans = ''
            for sub in subscriptions:
                sub_id = sub['id']
                sub_status = sub['status']
                plan_name = sub['plan']['name']
                subs += sub_id + '_'
                subs_sts += sub_status + '_'
                plans += plan_name + '_'
                subs_cancel += str(sub['cancel_at_period_end']) + '_'
            paidUser20240816_df.at[index, 'Subs'] = subs
            paidUser20240816_df.at[index, 'Subs_Status'] = subs_sts
            paidUser20240816_df.at[index, 'Subs_Cancel'] = subs_cancel

        cards = strp_cust['sources']['data']
        if len(cards) > 0:
            cards_last4 = ''
            cards_exp = ''
            for card in cards:
                cards_last4 += str(card['last4']) + '_'
                cards_exp += str(card['exp_month']) + '-' + str(card['exp_year']) + '_'
        paidUser20240816_df.at[index, 'Cards'] = cards_last4
        paidUser20240816_df.at[index, 'Cards_Exp'] = cards_exp

paidUser20240816_df.to_csv("customers1.csv", index=False)



# customer = stripe.Customer.retrieve("cus_QfQn6zEGS1fziy")
# # print customer["subscriptions"]
# subscription_id = customer["subscriptions"]["data"][0]["id"]
# subscription = stripe.Subscription.retrieve(subscription_id)

# print (subscription.id)
# print (subscription['items']['data'][0].id)
# #exit()
# cancel_at_period_end = True
# stripe.Subscription.modify(
#     subscription.id,
#     cancel_at_period_end=False,
#     proration_behavior='create_prorations',
#     items=[{
#         'id': subscription['items']['data'][0].id,
#         'plan': 'plan_HJW6zclDN4iwNp',
#     }]
#     # plan plan_HJW6zclDN4iwNp
# )

customer_jsoon = {
  "id": "cus_QfQn6zEGS1fziy",
  "object": "customer",
  "account_balance": 0,
  "address": None,
  "balance": 0,
  "created": 1723737003,
  "currency": "usd",
  "default_currency": "usd",
  "default_source": "card_1Po5w7BMoAW2pb45kNBMJB9g",
  "delinquent": False,
  "description": None,
  "discount": None,
  "email": "sanjaycurrie@gmail.com",
  "invoice_prefix": "02ECD116",
  "invoice_settings": {
    "custom_fields": None,
    "default_payment_method": None,
    "footer": None,
    "rendering_options": None
  },
  "livemode": True,
  "metadata": {},
  "name": None,
  "next_invoice_sequence": 2,
  "phone": None,
  "preferred_locales": [],
  "shipping": None,
  "sources": {
    "object": "list",
    "data": [
      {
        "id": "card_1Po5w7BMoAW2pb45kNBMJB9g",
        "object": "card",
        "address_city": None,
        "address_country": None,
        "address_line1": None,
        "address_line1_check": None,
        "address_line2": None,
        "address_state": None,
        "address_zip": None,
        "address_zip_check": None,
        "brand": "Visa",
        "country": "US",
        "customer": "cus_QfQn6zEGS1fziy",
        "cvc_check": "unavailable",
        "dynamic_last4": None,
        "exp_month": 2,
        "exp_year": 2028,
        "fingerprint": "SWWAb6BKst3z9BJx",
        "funding": "credit",
        "last4": "7889",
        "metadata": {},
        "name": None,
        "tokenization_method": None,
        "wallet": None
      }
    ],
    "has_more": False,
    "total_count": 1,
    "url": "/v1/customers/cus_QfQn6zEGS1fziy/sources"
  },
  "subscriptions": {
    "object": "list",
    "data": [
      {
        "id": "sub_1Po5w9BMoAW2pb45LjvGiEFr",
        "object": "subscription",
        "application": None,
        "application_fee_percent": None,
        "automatic_tax": { "enabled": False, "liability": None },
        "billing": "charge_automatically",
        "billing_cycle_anchor": 1726329005,
        "billing_cycle_anchor_config": None,
        "billing_thresholds": None,
        "cancel_at": None,
        "cancel_at_period_end": False,
        "canceled_at": None,
        "cancellation_details": {
          "comment": None,
          "feedback": None,
          "reason": None
        },
        "collection_method": "charge_automatically",
        "created": 1723737005,
        "currency": "usd",
        "current_period_end": 1726329005,
        "current_period_start": 1723737005,
        "customer": "cus_QfQn6zEGS1fziy",
        "days_until_due": None,
        "default_payment_method": None,
        "default_source": None,
        "default_tax_rates": [],
        "description": None,
        "discount": None,
        "discounts": [],
        "ended_at": None,
        "invoice_customer_balance_settings": {
          "consume_applied_balance_on_void": True
        },
        "invoice_settings": {
          "account_tax_ids": None,
          "issuer": { "type": "self" }
        },
        "items": {
          "object": "list",
          "data": [
            {
              "id": "si_QfQnmEKGfQgc4f",
              "object": "subscription_item",
              "billing_thresholds": None,
              "created": 1723737005,
              "discounts": [],
              "metadata": {},
              "plan": {
                "id": "plan_DCswPGER9UqWTx",
                "object": "plan",
                "active": True,
                "aggregate_usage": None,
                "amount": 2999,
                "amount_decimal": "2999",
                "billing_scheme": "per_unit",
                "created": 1531257276,
                "currency": "usd",
                "interval": "month",
                "interval_count": 1,
                "livemode": True,
                "metadata": {},
                "meter": None,
                "name": "SimpleVisor Monthly",
                "nickname": "Monthly",
                "product": "prod_DCstq0WCyPSc8L",
                "statement_descriptor": "RIA Pro Payment",
                "tiers": None,
                "tiers_mode": None,
                "transform_usage": None,
                "trial_period_days": 31,
                "usage_type": "licensed"
              },
              "price": {
                "id": "plan_DCswPGER9UqWTx",
                "object": "price",
                "active": True,
                "billing_scheme": "per_unit",
                "created": 1531257276,
                "currency": "usd",
                "custom_unit_amount": None,
                "livemode": True,
                "lookup_key": None,
                "metadata": {},
                "nickname": "Monthly",
                "product": "prod_DCstq0WCyPSc8L",
                "recurring": {
                  "aggregate_usage": None,
                  "interval": "month",
                  "interval_count": 1,
                  "meter": None,
                  "trial_period_days": 31,
                  "usage_type": "licensed"
                },
                "tax_behavior": "unspecified",
                "tiers_mode": None,
                "transform_quantity": None,
                "type": "recurring",
                "unit_amount": 2999,
                "unit_amount_decimal": "2999"
              },
              "quantity": 1,
              "subscription": "sub_1Po5w9BMoAW2pb45LjvGiEFr",
              "tax_rates": []
            }
          ],
          "has_more": False,
          "total_count": 1,
          "url": "/v1/subscription_items?subscription=sub_1Po5w9BMoAW2pb45LjvGiEFr"
        },
        "latest_invoice": "in_1Po5w9BMoAW2pb45qTTvlgrw",
        "livemode": True,
        "metadata": {},
        "next_pending_invoice_item_invoice": None,
        "on_behalf_of": None,
        "pause_collection": None,
        "payment_settings": {
          "payment_method_options": None,
          "payment_method_types": None,
          "save_default_payment_method": "off"
        },
        "pending_invoice_item_interval": None,
        "pending_setup_intent": None,
        "pending_update": None,
        "plan": {
          "id": "plan_DCswPGER9UqWTx",
          "object": "plan",
          "active": True,
          "aggregate_usage": None,
          "amount": 2999,
          "amount_decimal": "2999",
          "billing_scheme": "per_unit",
          "created": 1531257276,
          "currency": "usd",
          "interval": "month",
          "interval_count": 1,
          "livemode": True,
          "metadata": {},
          "meter": None,
          "name": "SimpleVisor Monthly",
          "nickname": "Monthly",
          "product": "prod_DCstq0WCyPSc8L",
          "statement_descriptor": "RIA Pro Payment",
          "tiers": None,
          "tiers_mode": None,
          "transform_usage": None,
          "trial_period_days": 31,
          "usage_type": "licensed"
        },
        "quantity": 1,
        "schedule": None,
        "start": 1723737005,
        "start_date": 1723737005,
        "status": "trialing",
        "tax_percent": None,
        "test_clock": None,
        "transfer_data": None,
        "trial_end": 1726329005,
        "trial_settings": {
          "end_behavior": { "missing_payment_method": "create_invoice" }
        },
        "trial_start": 1723737005
      }
    ],
    "has_more": False,
    "total_count": 1,
    "url": "/v1/customers/cus_QfQn6zEGS1fziy/subscriptions"
  },
  "tax_exempt": "none",
  "tax_ids": {
    "object": "list",
    "data": [],
    "has_more": False,
    "total_count": 0,
    "url": "/v1/customers/cus_QfQn6zEGS1fziy/tax_ids"
  },
  "tax_info": None,
  "tax_info_verification": None,
  "test_clock": None
}
