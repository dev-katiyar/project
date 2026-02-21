import json
import dbutil
from dao import mongodb
from flask import Blueprint
from flask import request, jsonify
import login
import constants
import numpy

api_screen = Blueprint('api_screen', __name__)

technical_join = "technicals_symbol on technicals_symbol.symbol=list_symbol.symbol"
live_symbol_join = "live_symbol on live_symbol.symbol=list_symbol.symbol"
MULTIPLIERS = {"B": 1000000000, "M": 1000000, "%": 0.01}
CUSTOM_SELECTED = "-2"


# returns presets by a userId
def getPresets(userId):
    presets = mongodb.get_data("presets", {"userId": userId})
    return presets


# gets presets for model user
@api_screen.route("/screen/model/preset", methods=['GET'])
def getModelPreset():
    presets = getPresets(constants.MODEL_USER_ID)  # lance userId
    return jsonify(presets)


# get presets for current User
@api_screen.route("/screen/preset", methods=['GET'])
def getUserPreset():
    myUserId = login.getUserId(request)
    presets = getPresets(myUserId)
    return jsonify(presets)


# get presets for current User
@api_screen.route("/screen/preset/<id>", methods=['GET'])
def getUserPresetById(id):
    myUserId = login.getUserId(request)
    presets = mongodb.get_data("presets", {"userId": myUserId, "id": id})
    return jsonify(presets)


@api_screen.route("/screen/model_preset/<id>", methods=['GET'])
def getPresetById(id):
    filterData = mongodb.get_data("presets", {"id": id})
    # print (filterData)
    return jsonify(filterData)


# delete presets
@api_screen.route("/screen/preset", methods=['DELETE'])
def deletePreset():
    id = request.args.get('id')
    mongodb.delete("presets", id)
    return jsonify({"status": "ok", "success": "1", "reason": "Preset Deleted Successfully!", "id": id})


# save presets
@api_screen.route("/screen/preset", methods=['POST'])
def saveUserPreset():
    myUserId = login.getUserId(request)
    post_data = json.loads(request.data)
    name = post_data["name"].strip()
    id = "{}-{}".format(myUserId, name)
    post_data["id"] = id
    post_data["userId"] = myUserId
    # presets = {"userId": myUserId, "name": name, "preSets": post_data, "id": id}
    mongodb.save_one_row("presets", post_data)
    return jsonify({"status": "ok", "success": "1", "reason": "Preset Saved Successfully!", "id": id})


# update preset with supplied filters
@api_screen.route("/screen/preset/update/<id>", methods=['POST'])
def updateUserPreset(id):
    post_data = json.loads(request.data)
    collection_filter = {'id': str(id)}
    update = {
        "$set": {
            'values': post_data
        }
    }
    mongodb.update_data_one("presets", collection_filter, update)
    return jsonify({"status": "ok", "success": "1", "reason": "Preset Updated Successfully!", "id": id})


@api_screen.route("/screen/filter", methods=['GET'])
def getScreenFilter():
    filterData = mongodb.get_data("filters", {})
    return jsonify(filterData)


def removeInvalidSelectedValues(row):
    if (row["type"] == "dropdown" and "multiple" in row):
        display_values_ids = list(map(lambda row: row["id"], row["display_values"]))
        valid_selected_values = list(filter(lambda row: row in display_values_ids, row["selected_value"]))
        row["selected_value"] = valid_selected_values
    return row


def invalidFilters(row):
    result = False
    if (row["type"] == "dropdown"):
        result = row["selected_value"] == "-1" and row["multiple"]

    return not result


def get_symbols_for_preset_values(preset):
    values = preset['values']
    join_condition = list(map(lambda x: createJoinCondition(x), values))
    flat_list = [item for sublist in join_condition for item in sublist]

    joinList = list(set(flat_list))
    if technical_join not in joinList:
        joinList.append(technical_join)
    if live_symbol_join not in joinList:
        joinList.append(live_symbol_join)

    values = list(filter(lambda row: invalidFilters(row), values))
    values = list(map(lambda row: removeInvalidSelectedValues(row), values))

    where_conditions = list(filter(lambda row: row != "", list(map(lambda row: createWhereCondition(row), values))))
    where_conditions.append("list_symbol.isactive = 1")
    where_conditions.append("live_symbol.last > 1")
    where_conditions.append("DATEDIFF(now(),live_symbol.time) < 7")
    # where_conditions.append("technicals_symbol is not null")
    where_condition_formatted = ""
    if (len(where_conditions) > 0):
        where_condition_formatted = " and ".join(where_conditions)
        where_condition_formatted = " where {}".format(where_condition_formatted)

    sortBy = ""
    limit = ""

    if ("sortBy" in preset):
        if preset["sortBy"].split(" ")[0] != "-1":
            sql = """select field as id ,name,join_column from screen_sort_columns;"""
            sortByFull = preset["sortBy"]
            sortByVal = sortByFull.split(" ")[0]
            sortColumnsDict = dbutil.getDataDict(sql, "id")
            join_sort_column = sortColumnsDict[sortByVal]['join_column']
            if join_sort_column:
                if join_sort_column not in joinList:
                    joinList.append(join_sort_column)
            sortBy = "order by {}".format(sortByFull)
    if ("limit" in preset):
        if preset["limit"] != "-1":
            limit = "limit {}".format(preset["limit"])
    else:
        limit = "limit 1000"
    formattedJoinCondition = ""
    if (len(joinList) > 0):
        formattedJoinCondition = " join " + " join ".join(joinList)
    sql = """SELECT distinct list_symbol.symbol as symbol FROM list_symbol
		    {}  {} {} {}""".format(formattedJoinCondition, where_condition_formatted, sortBy, limit)
    print (sql)
    symbols = dbutil.getDataArray(sql)
    return symbols


# returns filtered tickers
@api_screen.route("/screen/filter", methods=['POST'])
def getScreenSymbols():
    preset = json.loads(request.data)
    # print(post_data["values"])
    symbols = get_symbols_for_preset_values(preset)

    return jsonify(symbols)


def createWhereCondition(row):
    if row["table"] == "multiple":
        return ""
    else:
        if row["type"] == "slider":
            selected_slider_values = row["selected_slider_values"]
            min = selected_slider_values[0]
            max = selected_slider_values[1]
            field = row["field"]
            return "{} >= {} and {} <= {}".format(field, min, field, max)
        else:
            if "allow_custom" in row and row["selected_value"] == CUSTOM_SELECTED:
                # print (row)
                fieldName = "{}.{}".format(row["table"], row["field"])
                minValue = float(row["minValue"])
                maxValue = float(row["maxValue"])
                # if (row["rangeText"] == "B"):
                multiplier = 1
                if (row["range_text"] in MULTIPLIERS):
                    multiplier = MULTIPLIERS[row["range_text"]]
                maxValue = maxValue * multiplier
                minValue = minValue * multiplier
                return "{} >= {} and {} <= {}".format(fieldName, minValue, fieldName, maxValue)
            else:

                if "multiple" in row and len(row["selected_value"]) > 0:
                    selected_values = row["selected_value"]
                    if "=" in selected_values[0]:
                        column = row["selected_value"][0].split("=")[0].strip()
                        in_condition = list(map(lambda x: "'{}'".format(x.split("=")[1]), selected_values))
                        in_condition_formatted = ",".join(in_condition)
                        return "{} in ({})".format(column, in_condition_formatted)
                    else:
                        column = selected_values[0].split("in")[0].strip()
                        value_list = list(map(
                            lambda x: x.split("in")[1].strip().replace("(", "").replace(")", "").split(","),
                            selected_values))
                        flat_list = list(numpy.concatenate(value_list).flat)
                        in_condition_formatted = ",".join(flat_list)
                        return "{} in ({})".format(column, in_condition_formatted)
                else:
                    return row["selected_value"]


def createJoinCondition(row):
    if row["table"] == "multiple":
        joinTableName = row["selected_value"]
        joinCondition = "{} on {}.symbol = list_symbol.symbol".format(joinTableName, joinTableName)
        return [joinCondition]
    else:
        joinCondition = row["join_condition"]
        return list(map(lambda item: item.strip(), joinCondition.split(",")))


@api_screen.route("/screen/sort_columns", methods=['GET'])
def getScreenSortColumns():
    sql = """select field as id ,name from screen_sort_columns;"""
    sortColumns = dbutil.getDataTable(sql)
    return jsonify(sortColumns)


@api_screen.route("/screen/images", methods=['GET'])
def getScreenImages():
    sql = "select image_name as id ,image_name from screener_image;"
    data = dbutil.getDataTable(sql)
    return jsonify(data)

# gets presets top symbols for model user
@api_screen.route("/screen/model/preset/data/<screens_limit>/<symbols_limit>", methods=['GET'])
def getModelScreensSymbolData(screens_limit, symbols_limit):
    screens_limit = int(screens_limit) if screens_limit else 5
    symbols_limit = int(symbols_limit) if symbols_limit else 5

    # get model presets
    presets = mongodb.get_data("presets", {"userId": constants.MODEL_USER_ID})  # lance userId

    # limit based on the API call
    presets = presets[0:screens_limit] if len(presets) > screens_limit else presets

    # get preset response data
    res_data = get_preset_res_data(presets, symbols_limit)

    return jsonify(res_data)

# gets presets top symbols for normal user
@api_screen.route("/screen/user/preset/data/<screens_limit>/<symbols_limit>", methods=['GET'])
def getUserScreensSymbolData(screens_limit, symbols_limit):
    screens_limit = int(screens_limit) if screens_limit else 5
    symbols_limit = int(symbols_limit) if symbols_limit else 5

    # get user presets
    myUserId = login.getUserId(request)
    presets = mongodb.get_data("presets", {"userId": myUserId})  # logged in user id

    # limit based on the API call
    presets = presets[0:screens_limit] if len(presets) > screens_limit else presets

    # get preset response data
    res_data = get_preset_res_data(presets, symbols_limit)

    return jsonify(res_data)

# gets presets top symbols for model user
@api_screen.route("/screen/preset/data/<preset_id>", methods=['GET'])
def get_preset_data_by_id(preset_id):
    try:
        preset_data = {}
        presets = mongodb.get_data("presets", {"id": preset_id})
        if len(presets) == 0:
            return jsonify({
                'msg': 'Server Error',
                'error': 'no preset found for the id'
            })
        preset = presets[0]
        symbols = get_symbols_for_preset_values(preset)

        preset_data = {
            "preset_id": preset['id'],
            "preset_name": preset['name'],
            "limit": preset.get('limit', None),
            "sortBy": preset.get('sortBy', None),
            'values': preset['values'],
            "preset_symbols": symbols
        }
        res_data = {
            "msg": "OK", 
            "preset_data": preset_data
        }
    except Exception as e:
        print(e)
        res_data = {
            "msg": "Server Error",
            "error": e,
            "preset_data": preset_data
        }
    return jsonify(res_data)

    
def get_preset_res_data(presets, symbols_limit):
    preset_data = []
    try:
        # get symbols for each preset
        for preset in presets:
            symbol_data = get_screen_top_symbols(preset, symbols_limit)
            preset_data.append({
                "preset_id": preset['id'],
                "preset_name": preset['name'],
                "limit": preset.get('limit', None),
                "sortBy": preset.get('sortBy', None),
                'values': preset['values'],
                "preset_top_symbols": symbol_data
            })
        res_data = {
            "msg": "OK", 
            "preset_data": preset_data
        }
    except Exception as e:
        print(e)
        res_data = {
            "msg": "Server Error",
            "error": e,
            "preset_data": preset_data
        }
    return res_data

def get_screen_top_symbols(preset, symbols_limit):
    values = preset["values"]
    join_condition = list(map(lambda x: createJoinCondition(x), values))
    flat_list = [item for sublist in join_condition for item in sublist]

    joinList = list(set(flat_list))
    if technical_join not in joinList:
        joinList.append(technical_join)
    if live_symbol_join not in joinList:
        joinList.append(live_symbol_join)

    values = list(filter(lambda row: invalidFilters(row), values))
    values = list(map(lambda row: removeInvalidSelectedValues(row), values))

    where_conditions = list(filter(lambda row: row != "", list(map(lambda row: createWhereCondition(row), values))))
    where_conditions.append("list_symbol.isactive = 1")
    where_conditions.append("live_symbol.last > 1")
    where_conditions.append("DATEDIFF(now(),live_symbol.time) < 7")

    where_condition_formatted = ""
    if (len(where_conditions) > 0):
        where_condition_formatted = " and ".join(where_conditions)
        where_condition_formatted = " where {}".format(where_condition_formatted)

    sortBy = "order by CONVERT(market_cap_raw, FLOAT) desc"
    limit = "limit {}".format(symbols_limit)

    formattedJoinCondition = ""
    if (len(joinList) > 0):
        formattedJoinCondition = " join " + " join ".join(joinList)
    sql = """SELECT DISTINCT 
                list_symbol.symbol as symbol, 
                live_symbol.last as price,
                live_symbol.price_change as priceChange ,
                live_symbol.change_pct as priceChangePct,
                CONVERT(market_cap_raw, FLOAT) as market_cap 
            FROM list_symbol
		    {} {} {} {}""".format(formattedJoinCondition, where_condition_formatted, sortBy, limit)
    symbolsData = dbutil.getDataTable(sql)
    return symbolsData
