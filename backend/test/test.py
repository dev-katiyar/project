
# ages = [13, 90, 17, 59, 21, 60, 5]

# adults = list(filter(lambda age: age>18, ages))

# print(adults)

# list1 = [1, 2, 3]
# list2 = map(lambda x: x * x, list1)
# print(list2)


# from bs4 import BeautifulSoup
# import urllib3

# url = "https://www.turningpointanalyticsllc.com/tpa-rrg-etfs"
# http = urllib3.PoolManager()
# r = http.request(method='GET', url=url, headers={'User-Agent': 'Mozilla/5.0'})

# print("Getting page...")
# print(r.status)
# print(r.data)

from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

URL = "https://www.dataroma.com/m/holdings.php?m=BRK"
req = Request(URL)
req.add_header('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36')

rawpage = urlopen(req).read()
soup = BeautifulSoup(rawpage, 'html.parser')

holdings_table = soup.find(id="grid")
rows = holdings_table.find_all("tr")
rows = rows[1:]

holdings = []

for row in rows:
    try:
        cols = row.find_all("td")
        symbol = row.find("td", class_="stock").text.split("-")[0].strip() 
        portfolio_pct = cols[2].text
        recent_activity = cols[3].text
        shares = cols[4].text
        reported_price = cols[5].text

        print(symbol, portfolio_pct, recent_activity, shares, reported_price)
        holding = {
            "symbol": symbol,
            "portfolio_pct": float(portfolio_pct.replace(',','')),
            "recent_activity": recent_activity,
            "shares": float(shares.replace(',','')),
            "reported_price": float(reported_price.replace(',','').split('$')[1])
        }
        holdings.append(holding)
    except Exception as ex:
        print(ex)
        continue

print("done")