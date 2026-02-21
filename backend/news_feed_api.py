import feedparser
from flask import request, jsonify, Blueprint
from dateutil.parser import parse


api_newsrss = Blueprint('api_newsrss', __name__)


@api_newsrss.route("/rss/news", methods=['GET'])
def get_news_from_rss():
    rss_source1 = get_rss_news("https://seekingalpha.com/market_currents.xml", 'published', 'title', 'link')
    rss_source2 = get_rss_news("https://seekingalpha.com/listing/most-popular-articles.xml", 'published', 'title', 'link')
    rss_source3 = get_rss_news("https://feeds.content.dowjones.io/public/rss/mw_topstories", 'published', 'title', 'link')

    rss_all = rss_source1 + rss_source2 + rss_source3
    rss_all = sorted(rss_all, key=lambda x: parse(x['published']), reverse=True)
    return jsonify(rss_all)

def get_rss_news(url, published, title, link):
    try:
        feed = feedparser.parse(url)
        res = []
        for item in feed.entries:
            res.append({
                'published': item[published],
                'title': item[title],
                'link': item[link]
            })
        return res
    except Exception as ex:
        print(ex)
        return []
