from flask import Blueprint, jsonify
import json
import dbutil
import pandas as pd
import dataframe_utils

api_super_investor = Blueprint('api_super_investor', __name__)

@api_super_investor.route("/holdings/<investor_code>", methods=['GET', ''])
def get_holdings(investor_code):
    sql = """
        SELECT 
            si.code as investor_code, 
            si.name as investor_name, 
            sih.rep_date, 
            sih.rep_symbol, 
            sih.rep_qty, 
            sih.rep_price, 
            coalesce(sec.name, 'Other') as sector
        FROM super_investors_holdings AS sih
            LEFT JOIN list_symbol AS ls ON sih.rep_symbol = ls.symbol
	        LEFT JOIN sectors AS sec ON ls.sectorid = sec.id
            LEFT JOIN super_investors AS si ON sih.portfolio_code = si.code
        WHERE sih.portfolio_code = "{}" AND 
			sih.rep_date = (SELECT last_rep_date FROM super_investors WHERE code = '{}');
    """.format(investor_code, investor_code)
    holdings = dbutil.getDataTable(sql)
    holdings_df = pd.DataFrame(holdings)

        # get list of unique investors in this holdings data
    unique_investors = holdings_df[['investor_code', 'investor_name']].drop_duplicates()
    investor_list = unique_investors.to_dict('records')

    if holdings_df.empty:
        return jsonify([])
    holdings_df["rep_value"] = holdings_df["rep_qty"] * holdings_df["rep_price"]
    holdings_df["rep_portf_total_value"] = holdings_df["rep_value"].sum()
    holdings_df["rep_pcnt"] = holdings_df["rep_value"] / holdings_df["rep_portf_total_value"]
    
    res = {
        "status": "ok",
        "holdings": list(holdings_df.T.to_dict().values()),
        "investors": investor_list
    }
    return json.dumps(res)


@api_super_investor.route("/holdings/report-dates", methods=['GET', ''])
def get_holdings_reporting_dates():
    sql = """
        SELECT DISTINCT
            rep_date
        FROM
            super_investors_holdings
        ORDER BY rep_date DESC
        LIMIT 5;
    """
    dbutil_response = dbutil.getDataTable(sql)
    print(dbutil_response)
    return json.dumps(dbutil_response)


@api_super_investor.route("/holdings/all/<report_date>", methods=['GET', ''])
def get_holdings_all(report_date):
    date_string = "(SELECT max(last_rep_date) FROM super_investors)"
    if report_date:
        date_string = "'{}'".format(report_date)

    sql = """
        SELECT 
            si.code as investor_code, 
            si.name as investor_name, 
            sih.rep_date, 
            sih.rep_symbol, 
            sih.rep_qty, 
            sih.rep_price, 
            coalesce(sec.name, 'Other') as sector
        FROM super_investors_holdings AS sih
            LEFT JOIN list_symbol AS ls ON sih.rep_symbol = ls.symbol
            LEFT JOIN sectors AS sec ON ls.sectorid = sec.id
            LEFT JOIN super_investors AS si ON sih.portfolio_code = si.code
        WHERE sih.rep_date = {};
    """.format(date_string)
    
    holdings = dbutil.getDataTableNoLimit(sql)
    holdings_df = pd.DataFrame(holdings)
    
    # get list of unique investors in this holdings data
    unique_investors = holdings_df[['investor_code', 'investor_name']].drop_duplicates()
    investor_list = unique_investors.to_dict('records')

    # aggregate holdings by symbol across all investors
    holdings_df["rep_value"] = holdings_df["rep_qty"] * holdings_df["rep_price"]
    holdings_df = holdings_df.groupby("rep_symbol").agg({
        "rep_symbol": 'max',
        "rep_date": 'max',
        "rep_qty": 'sum',
        "rep_value": 'sum',
        "rep_price": 'max',
        "sector": 'max'
    })
    holdings_df["rep_price"] = holdings_df["rep_value"] / holdings_df["rep_qty"]
    holdings_df["rep_portf_total_value"] = holdings_df["rep_value"].sum()
    holdings_df["rep_pcnt"] = holdings_df["rep_value"] / holdings_df["rep_portf_total_value"]

    res = {
        "status": "ok",
        "holdings": list(holdings_df.T.to_dict().values()),
        "investors": investor_list
    }
    return json.dumps(res)


@api_super_investor.route("/super-investors", methods=['GET', ''])
def get_super_investors():
    sql = """SELECT code, name, `order` FROM super_investors ORDER BY `order`;"""
    super_investors_list = dbutil.getDataTable(sql)
    return jsonify(super_investors_list)


@api_super_investor.route("/super-investors-transactions/<investor_code>", methods=['GET', ''])
def get_super_investor_transactions(investor_code):
    sql = """
        SELECT si.name, sit.rep_date, sit.rep_symbol_name, sit.rep_qty, sit.rep_price, sit.rep_side
        FROM super_investors_transactions AS sit
            LEFT JOIN super_investors AS si ON si.code COLLATE utf8mb4_unicode_ci = sit.portfolio_code COLLATE utf8mb4_unicode_ci
        WHERE sit.portfolio_code COLLATE utf8mb4_unicode_ci = '{}' 
            AND CAST(sit.rep_date AS CHAR) > CAST((SELECT last_rep_date FROM super_investors where code COLLATE utf8mb4_unicode_ci = '{}') AS CHAR);
    """.format(investor_code, investor_code)
    super_investors_transactions_list = dbutil.getDataTable(sql)
    return jsonify(super_investors_transactions_list)


@api_super_investor.route("/super-investors-transactions/all", methods=['GET', ''])
def get_super_investor_transactions_all():
    sql = """
        SELECT si.name, sit.rep_date, sit.rep_symbol_name, sit.rep_qty,
            sit.rep_price, sit.rep_side 
        FROM super_investors_transactions AS sit
        LEFT JOIN super_investors AS si ON si.code COLLATE utf8mb4_unicode_ci = sit.portfolio_code COLLATE utf8mb4_unicode_ci;
    """
    super_investors_transactions_list = dbutil.getDataTable(sql)
    return jsonify(super_investors_transactions_list)
