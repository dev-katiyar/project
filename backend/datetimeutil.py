import datetime

#https://docs.python.org/2/library/datetime.html

def getdatetime(date):
    return datetime.datetime(date.year, date.month, date.day, 0, 0, 0)


def getdate(datetime):
    return datetime.date()


def getdatewithzero(datetime):
    return getdatetime(datetime.date())


def getcurtimestr():
    return datetime.datetime.now().strftime("%Y%m%d%I%M%S")


def getcurdatestr():
    return datetime.datetime.now().strftime("%Y-%m-%d")


def getbackdatestr(days):
    back_date = datetime.date.today() - datetime.timedelta(days=days)
    return back_date.strftime("%Y-%m-%d")

def getdatefromstr(strdate):
    return datetime.datetime.strptime(strdate, '%Y-%m-%d')


def getdatefromstr_format(strdate, format):
    return datetime.datetime.strptime(strdate, format)


def format_date(date, format):
    return date.strftime(format)


def getdatestr(date):
    return date.strftime("%Y-%m-%d")


def getdatestr_format(date, format):
    return date.strftime(format)


def get_today_date():
    return datetime.datetime.now()


def get_business_day_str(date):
    """returns last business day, if today is business days returns that"""
    if date.weekday() == 5:
        date = date - datetime.timedelta(days=1)
    if date.weekday() == 6:
        date = date - datetime.timedelta(days=2)
    return date.strftime("%Y-%m-%d")


def get_business_day_pastweeks_str(date, n_weeks):
    """returns same business day from last n_week number of weeks as date, n > 1"""
    if n_weeks == 0:
        return []
    list_dates = [get_business_day_str(date)]
    for i in range(1, n_weeks):
        week_back = date - datetime.timedelta(weeks=i)
        week_back_business_str = get_business_day_str(week_back)
        list_dates.append(week_back_business_str)
    return list_dates


def get_current_datetime_str():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
