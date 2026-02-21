from flask import request, make_response, jsonify
import dbutil
import login
from flask import Blueprint
import json

api_dynamic_columns = Blueprint('api_dynamic_columns', __name__)


# it returns user specific views and common views
@api_dynamic_columns.route("/user_views", methods=['GET'])
def getUserViews():
    myUserId = login.getUserId(request)
    sql = """ select u.*,v.name as view_name from universe_columns u join views_columns vc
        on vc.field= u.field 
        join views v on v.id = vc.view_id where v.user_id ={} or v.user_id is null""".format(myUserId)
    data = dbutil.getDataTable(sql)
    return jsonify(data);


# it returns diffrent common  views
@api_dynamic_columns.route("/views", methods=['GET'])
def getViews():
    sql = """ select u.*,v.name as view_name from universe_columns u join views_columns vc
        on vc.field= u.field 
        join views v on v.id = vc.view_id where v.user_id is null"""
    data = dbutil.getDataTable(sql)
    return jsonify(data);


@api_dynamic_columns.route("/universe_columns", methods=['GET'])
def getViewColumns():
    sql = "select * from universe_columns;"
    categories = dbutil.getDataTable(sql)
    return jsonify(categories);


@api_dynamic_columns.route("/views", methods=['POST'])
def saveViews():
    myUserId = login.getUserId(request)
    post_data = json.loads(request.data)
    if (len(post_data['fields']) == 0) or len(post_data) < 2:
        return jsonify({"status": "error", "success": "1", "reason": "Fields or Name Missing!"})
    else:
        sql = """insert into views(name,user_id)
               values('{}',{})""".format(post_data['name'], myUserId)
        view_id = dbutil.insertQuery(sql)
        all_rows = []
        for column_name in post_data['fields']:
            all_rows.append((column_name, view_id))
        if len(all_rows) > 0:
            sql = """ insert into views_columns (
                field,view_id) 
                values (%s,%s)           
            """
            dbutil.insert_many_rows(sql, all_rows)
        return jsonify({"status": "ok", "success": "1", "reason": "Saved Successfully!"})
