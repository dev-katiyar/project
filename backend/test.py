def filterSelectedColumns(obj, listColumns):
    res = {}
    for key, value in obj.items():
        if (key in listColumns):
            res.update({key: value["fmt"]})

    return res


dict1 = {
    "a": [
        {
            "maxAge": 1,
            "endDate": {
                "raw": 1624665600,
                "fmt": "q1"
            },
            "totalRevenue": {
                "raw": 81434000000,
                "fmt": "81.43B",
                "longFmt": "81,434,000,000"
            }
        },
        {
            "maxAge": 1,
            "endDate": {
                "raw": 1624665600,
                "fmt": "q2"
            },
            "totalRevenue": {
                "raw": 81434000000,
                "fmt": "81.43B",
                "longFmt": "81,434,000,000"
            }
        }
    ]
}
# dict2 = {"b": 11}
# dict1.update(dict2)
print(dict1)
list1 = dict1["a"]
print(list1)
listColumns = ["totalRevenue"]
list2 = map(lambda x: filterSelectedColumns(x,listColumns), list1)
print(list2)
