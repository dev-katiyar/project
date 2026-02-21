import utils
from flask import request, jsonify
import dbutil
import chardet
from flask import Blueprint

api_dividend = Blueprint('api_dividend', __name__)


@api_dividend.route("/dividend/high/yield", methods=['GET'])
def getDividendHighYield():
    sql = """select d.symbol,ls.companyname,d.pay_date,d.yield,d.payout_freq,
            d.annual_dividend,d.ex_dividend_date , 
            live.last,live.price_change as priceChange, live.change_pct as changePct,
            sl.PiotroskiFScore,sl.MohanramScore,sl.relative_strength,
            coalesce(sl.ZacksRank ,"N/A") as ZacksRank ,  tech.rating 
            from dividend_high_yield d
             join list_symbol ls on ls.symbol = d.symbol
             join live_symbol live on live.symbol = d.symbol
            left join stats_latest sl on sl.symbol = d.symbol
            left join technicals_symbol tech on  tech.symbol = d.symbol
            where d.yield > 1
            order by d.annual_dividend desc limit 500"""
    data = dbutil.getDataTable(sql)
    return jsonify(data)


@api_dividend.route("/earning/history/date_range/<searchSymbol>,<fromDate>,<toDate>", methods=['GET'])
def getEarningHistoryDate(searchSymbol, fromDate, toDate):
    searchSymbol = searchSymbol.strip()
    sql = ""
    if searchSymbol == "" or searchSymbol == "NotApplicable":
        sql = """select eh.symbol,eh.date,eh.estimate,eh.reported,eh.surprise,ls.companyname from earning_history as eh 
            join list_symbol as ls on ls.symbol=eh.symbol  
            where eh.date between "{}" and "{}" """.format(fromDate, toDate)
    else:
        sql = """select eh.symbol,eh.date,eh.estimate,eh.reported,eh.surprise,ls.companyname from earning_history as eh 
            join list_symbol as ls on ls.symbol=eh.symbol  
            where eh.date between "{}" and "{}" and eh.symbol ='{}'""".format(fromDate, toDate, searchSymbol)
    # print sql
    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_dividend.route("/earning/history/date/<date>", methods=['GET'])
def getEarningDateData(date):
    sql = """select eh.symbol,eh.date,eh.estimate,eh.reported,eh.surprise,ls.companyname from earning_history as eh 
            join list_symbol as ls on ls.symbol=eh.symbol where eh.date = '{}';""".format(date)
    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_dividend.route("/earning/history/<symbols>", methods=['GET', 'POST'])
def getEarningHistory(symbols):
    earnings = dbutil.getEarnings(symbols.split(","))
    return jsonify(earnings)


@api_dividend.route("/earning/history", methods=['GET', 'POST'])
def getUpcomingEarningHistoryBy():
    symbols = request.args.get('symbols').split(",")
    upcoming = request.args.get('upcoming')
    upcoming = utils.getBoolean(upcoming)
    earnings = dbutil.getEarnings(symbols, upcoming)
    return jsonify(earnings)


@api_dividend.route("/test/companyname", methods=['GET'])
def testCompanyName():
    sql = ""
    sql = """select companyname,alternate_name,symbol from  list_symbol where isactive =1
        """
    data = dbutil.getDataTable(sql)
    # data = utils.removeNonAsciiFromColumn(data, "companyname")
    error_symbols = []
    for row in data:
        if row["companyname"]:
            encoding = chardet.detect(row["companyname"])
            encoding2 = chardet.detect(row["alternate_name"])
            if encoding['encoding'] != 'ascii' or encoding2['encoding'] != 'ascii':
                error_symbols.append(row["symbol"])
                print(utils.removeNonAscii(row["alternate_name"]))
    print(error_symbols)
    return jsonify(data)


def removeAscii():
    pass


@api_dividend.route("/dividend/history", methods=['GET', 'POST'])
def getDividendHistory():
    symbols = request.args.get('symbols').split(",")
    upcoming = request.args.get('upcoming')
    upcoming = utils.getBoolean(upcoming)
    dividend = dbutil.getDividend(symbols, upcoming)
    return jsonify(dividend)


@api_dividend.route("/dividend/history/<symbols>", methods=['GET', 'POST'])
def getDividendHistoryBySymbol(symbols):
    dividend = dbutil.getDividend(symbols.split(","))
    return jsonify(dividend)


# get dividends on a particular date
@api_dividend.route("/dividend/history/date/<date>", methods=['GET'])
def getExDividendDateData(date):
    sql = """ select dh.symbol,dh.yield,dh.ex_dividend_date,dh.pay_date,
            dh.next_payout,ls.companyname from dividend_history dh
            join list_symbol as ls on ls.symbol=dh.symbol
            where dh.ex_dividend_date = '{}';""".format(date)
    data = dbutil.getDataTable(sql)
    data = utils.removeNonAsciiFromColumn(data, "companyname")

    return jsonify(data)


@api_dividend.route("/dividend/history/date_range/<searchSymbol>,<fromDate>,<toDate>", methods=['GET'])
def getExDividend(searchSymbol, fromDate, toDate):
    searchSymbol = searchSymbol.strip()
    sql = ""
    if searchSymbol == "" or searchSymbol == "NotApplicable":
        sql = """select ls.companyname,dh.pay_date,dh.symbol,dh.yield,dh.ex_dividend_date,dh.next_payout from dividend_history dh
        join list_symbol as ls on ls.symbol=dh.symbol
        where ex_dividend_date BETWEEN '{}' AND '{}' and ls.isactive =1 order by ex_dividend_date desc
        """.format(fromDate, toDate)

    else:
        sql = """select ls.companyname,dh.* from dividend_history dh
        join list_symbol as ls on ls.symbol=dh.symbol
        where ex_dividend_date BETWEEN '{}' AND '{}' and  ls.isactive =1 and dh.symbol like '%{}%';""".format(fromDate,
                                                                                                              toDate,
                                                                                                              searchSymbol)

    data = dbutil.getDataTable(sql)
    data = utils.removeNonAsciiFromColumn(data, "companyname")

    return jsonify(data)


@api_dividend.route("/dividend_and_earning/history/date_range/<fromDate>,<toDate>", methods=['GET'])
def getDividendHistoryDate(fromDate, toDate):
    sql = """select concat (cast(count(*)as char)," Stocks Ex dividends Dates") as title, 
            ex_dividend_date as date,"dividend" as type from dividend_history where ex_dividend_date between "{}" and "{}" 
           group by ex_dividend_date 
           
           union
           
           select concat (cast(count(*)as char)," Stocks Earnings") as title, date as date,"earning" as type 
           from earning_history where date between "{}" and "{}" 
           group by date 
           
           union 
           select concat (cast(count(*)as char)," Splits") as title, date as date,"splits" as type 
           from splits where date between "{}" and "{}" 
           group by date ;
           
           """.format(fromDate, toDate, fromDate, toDate, fromDate, toDate)

    data = dbutil.getDataTable(sql)

    return jsonify(data)


@api_dividend.route("/dividend/best", methods=['GET'])
def getBestDividend():
    sql = """select ls.companyname,db.symbol,db.yield,db.ex_dividend_date,db.pay_date from dividend_best db 
            join list_symbol as ls on ls.symbol=db.symbol
            order by yield desc;"""
    data = dbutil.getDataTable(sql)
    return jsonify(data)


@api_dividend.route("/splits/history/date/<date>", methods=['GET'])
def getSplitsByDate(date):
    sql = """ select dh.symbol,dh.date,dh.split_factor,
            ls.companyname from splits dh
            left join list_symbol as ls on ls.symbol=dh.symbol
            where dh.date = '{}';""".format(date)

    data = dbutil.getDataTable(sql)
    data = utils.removeNonAsciiFromColumn(data, "companyname")

    return jsonify(data)


@api_dividend.route("/splits/history/date_range/<searchSymbol>,<fromDate>,<toDate>", methods=['GET'])
def getSplitsDateRange(searchSymbol, fromDate, toDate):
    searchSymbol = searchSymbol.strip()
    sql = ""
    if searchSymbol == "" or searchSymbol == "NotApplicable":
        sql = """select ls.companyname,dh.* from splits dh
        left join list_symbol as ls on ls.symbol=dh.symbol
        where date BETWEEN '{}' AND '{}';""".format(fromDate, toDate)

    else:
        sql = """select ls.companyname,dh.* from splits dh
        left join list_symbol as ls on ls.symbol=dh.symbol
        where date BETWEEN '{}' AND '{}' and dh.symbol ='{}';""".format(fromDate, toDate, searchSymbol)

    data = dbutil.getDataTable(sql)

    return jsonify(data)
