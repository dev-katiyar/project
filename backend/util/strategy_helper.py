import dbutil


def getEmps(id):
    sql_getUsers = "select * from users where emailAddress like '%{}%'".format(id)
    return dbutil.getDataTable(sql_getUsers)
