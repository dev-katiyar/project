import datetime
import re

def isNumber(value):
    if re.match(r'^[-+]?[0-9]*\.?[0-9]+$', str(value)) is not None:
        return True
    else:
        return False


def getDateTime(date_str):
    # link = "https://docs.python.org/2/library/datetime.html"
    # sample = "Fri, 06 Jul 2018 20:09:00 +0000"
    datetime_object = datetime.strptime(date_str, '%a, %d %b %Y %H:%M:%S %z')
    return datetime_object


def getDateTimeFromString(date_str, format_str):
    datetime_object = datetime.datetime.strptime(date_str, format_str)
    return datetime_object


def getArrayFromColumn(listData, column):
    listSymbols = []
    for data in listData:
        listSymbols.append(data[column])
    return listSymbols


def getSymbolListFromString(symbols):
    symbolList = symbols.split(",")
    return list(map(lambda x: x.upper(), symbolList))


def getFormattedStr(date_data, format='%a %d %b %H:%M'):
    return datetime.datetime.strftime(date_data, format)


def removeNonAscii(s):
    if s:
        #return s.encode("utf-8")
        return s.decode("ascii", errors="ignore").encode()
    else:
        ''

def convertToUtf(s):
    if s:
        return s.encode("utf-8")
    else:
        ''


def removeNonAsciiFromColumn(data, column):
    data = map(lambda row: removeNonAsciiFromRow(row, column), data)
    return data


def removeNonAsciiFromRow(row, column):
    row[column] = removeNonAscii(row[column])
    return row


def getMillionBillion(value):
    mcap = "na"
    TRILLION = 1000000000000
    BILLION = 1000000000
    MILLION = 1000000

    if value == "" or value == "na" or value == "nm":
        mcap = "na"
    else:
        mcap = float(value)
        if mcap / TRILLION > 1:
            mcap = str(round(mcap / TRILLION, 2)) + " T"
        elif mcap / BILLION > 1:
            mcap = str(round(mcap / BILLION, 2)) + " B"
        elif mcap / MILLION > 1:
            mcap = str(round(mcap / MILLION, 2)) + " M"
    return mcap


def getColorsFromName(key):
    colors = {"Cash": "orange", "US Equities": "green", "ETF": "blue", "Technology": "green"}
    if key in colors:
        return colors[key]
    else:
        return None


def getListFromDictByPercentage(dict):
    list = []
    for key, value in dict.items():
        color = getColorsFromName(key)
        if color is not None:
            list.append({"name": key, "percentage": value["percentage"], "color": color})
        else:
            list.append({"name": key, "percentage": value["percentage"]})
    return list


def getListFromDict(dict):
    list = []
    for key, value in dict.items():
        list.append({"name": key, "percentage": value})
    return list

def getBoolean(value):
    if value.lower() =="true":
        return True
    else:
        return False