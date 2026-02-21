from MyConfig import MyConfig as cfg
import mysql.connector

def getDbConn():
    dbcon = mysql.connector.connect(
        host=cfg.mysqldb_ai_host,
        user=cfg.mysqldb_ai_user,
        passwd=cfg.mysqldb_ai_passwd,
        db=cfg.mysqldb_ai_db,
        port=cfg.mysqldb_ai_port,
        ssl_verify_cert=False,
        # ssl_disabled=True
        # ,auth_plugin='mysql_native_password'
    )

    cursor = dbcon.cursor(dictionary=True)

    # Disable ONLY_FULL_GROUP_BY mode to handle DISTINCT + ORDER BY issues
    cursor.execute("SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))")
    
    return (dbcon, cursor)

def getDataTableNoLimit(query):
    list_data = []
    dbcon, cursor = getDbConn()
    cursor.execute(query)
    results = cursor.fetchall()
    for row in results:
        list_data.append(row)
    dbcon.close()
    return list_data


