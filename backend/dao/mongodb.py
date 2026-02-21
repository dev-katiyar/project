import pymongo
from MyConfig import MyConfig as cfg

def getDbConnection():
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    return con_mongo

def get_data(collectionName, condition):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        dataCursor = db[collectionName].find(condition)
        filters = []
        for item in dataCursor:
            del item['_id']
            filters.append(item)
        con_mongo.close()
        return filters
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_data_specific_cols(collectionName, filter, projection):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        dataCursor = db[collectionName].find(filter, projection)
        rows = []
        for item in dataCursor:
            rows.append(item)
        con_mongo.close()
        return rows
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def save_multiple(collectionName, rows):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        db[collectionName].delete_many({})
        db[collectionName].insert_many(rows)
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def save_one_row(collectionName, data, unique_field="id"):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        if unique_field in data:
            db[collectionName].delete_many({unique_field: data[unique_field]})
        db[collectionName].insert_one(data)
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()

def delete(collectionName, id):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        db[collectionName].delete_many({"id": id})
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def import_df(prices_df, col_name,symbol):
    con_mongo = pymongo.MongoClient(cfg.mongodb_host, port=cfg.mongodb_port)
    db_chartlab = con_mongo.chartlab

    count = 0
    try:
        if (len(prices_df) > 0):
            prices_df['symbol'] = prices_df.apply(lambda x: x['symbol'].replace('\r', '').upper(), axis=1)
            bulk_coll = []
            for a in prices_df.iterrows():
                tempdict = a[1].to_dict()
                bulk_coll.append(tempdict)
            print("inserting bulk  count = {}".format(len(bulk_coll)))
            db_chartlab.symbolshistorical.delete_many({"symbol":symbol})
            db_chartlab.symbolshistorical.insert_many(bulk_coll)
    except Exception as ex:
        print(ex)

    con_mongo.close()


def deleteCollection(coll_name, key, value):
    try:
        con_mongo = getDbConnection()
        db_chartlab = con_mongo.chartlab
        db_chartlab[coll_name].delete_many({key: value})
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def save_data(coll_name, data):
    con_mongo = getDbConnection()
    try:
        db_chartlab = con_mongo.chartlab
        db_chartlab[coll_name].insert_one(data)
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def update_data_one(coll_name, filter, update_data):
    con_mongo = getDbConnection()
    try:
        db_chartlab = con_mongo.chartlab
        db_chartlab[coll_name].update_one(filter, update_data)
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_aggregated_top_posts(collection, projection, posts_limit):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        dataCursor = db[collection].aggregate([
            { "$match": {"category": {
                "$in": ["12335", "12338", "12339", "12340"]
            }}
            },  # get only from these categories
            {"$project": projection},  # get only relevant fields
            {"$unwind": "$data"},       # combine all the data arrays into one
            {"$sort": {"data.date": -1}},   # sort them by date
            {"$limit": posts_limit},     # limit to some number to reduce time
        ])
        rows = []
        for item in dataCursor:
            rows.append(item["data"])
        con_mongo.close()
        return rows
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_specified_number_of_post_projected(collection, category, projection, posts_limit):
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        dataCursor = db[collection].aggregate([
            {"$match": {"category": category}}, # get from the given category  
            {"$project": { "data": {"$slice": ["$data", 0, posts_limit]}}},  #  get specfied number of posts
            {"$unwind": "$data"},       # make array of objects
            {"$project": projection }   # get only the relevant posts
        ])
        rows = []
        for item in dataCursor:
            rows.append(item["data"])
        con_mongo.close()
        return rows
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_agggregated_summary(collection_name, groupings):
    # gruopings is list of .separated nested field for which aggregation is needed
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        collection = db[collection_name]

        res = {}

        for grouping in groupings:
            key = grouping['key']
            field = grouping['field']
            print(f"\nGrouped by {field}:")

            resGrp = {}
            pipeline = [
                {
                    "$match": {
                        field : { "$exists": True, "$ne": None }
                    }
                },
                {
                    "$group": {
                        "_id": '$' + field,
                        "count": { "$sum": 1 }
                    }
                }
            ]
            for result in collection.aggregate(pipeline):
                print(f"{result['_id']}: {result['count']}")
                resGrp[result['_id']] = result['count']
            
            res[key] = resGrp
        return res
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()


def get_agggregated_pipline_list(collection_name, pipeline):
    # filters and projects data from the collection and returns list of objects (dicts)
    try:
        con_mongo = getDbConnection()
        db = con_mongo.chartlab
        collection = db[collection_name]

        items = collection.aggregate(pipeline)
        
        res = []
        for item in items:
            del item['_id']
            res.append(item)

        return res
    except Exception as ex:
        print(ex)
    finally:
        con_mongo.close()
