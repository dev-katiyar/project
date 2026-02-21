from flask import request, jsonify
import dbutil
import login
from flask import Blueprint

api_tpa = Blueprint('api_tpa', __name__)
blog_table = "tpa_blogs"


@api_tpa.route("/user/tpaAmdin", methods=['GET'])
def checkTPAAdminUser():
    userType = 0
    viewType = 'non_user'  # need to register
    token = login.checkToken(request)
    if token["status"] == "success":
        userId = token["data"]["user_id"]
        email = token["data"]["email"]
        data = dbutil.getOneRow("""
        select  coalesce(admin_type,0) as admin_type,substype from users where userid ={}
            """.format(userId))
        admin_type = data["admin_type"]
        substype = data["substype"]
        viewType = getViewType(substype, admin_type)
    return jsonify({"viewType": viewType})


def getViewType(substype, admin_type):
    if (int(admin_type) == 2):
        viewType = 'admin'              # TPA admin - full edit access
    elif (substype in ["3", "4", "5"]):
        viewType = 'sv_tpa_user'        # SV + TPA user - view only access 
    elif (substype in ["1", "2"]):
        viewType = 'sv_only_user'       # SV Only user - no TPA view
    elif (substype in ["6","7"]):
        viewType = 'tpa_only_user'      # TPA ONLY user - no SV view
    else:
        viewType = 'non_user'           # Not a user - need to register
    return viewType
