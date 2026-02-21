import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { LiveService } from '../services/live.service';
import { YouTubeApiService } from '../__saritasa/common/core/services/api/youtube-api.service';
import { htmlDecode } from '../__saritasa/common/core/utils/decode-html-entities';
import { mediaDict } from '../__saritasa/common/core/services/mappers/featured-media-mapper';

@Component({
  selector: 'app-insights-latest',
  templateUrl: './insights-latest.component.html',
  styleUrls: ['./insights-latest.component.scss'],
})
export class InsightsLatestComponent implements OnInit {
  categoryDict = {
    '12335': 'Daily Commentary',
    '226': 'PlanManager',
    '1186': 'Ads',
    '241': 'Economics',
    '414': 'Events',
    '239': 'Financial Plannning',
    '256': 'Latest from RIA Team',
    '12653': 'Messages',
    '220': 'Newsletter',
    '12332': 'PortfolioManagement',
    '12339': ' Pro Blog',
    '902': 'Pro Commentary',
    '12340': 'Weekly Bull/Bear Report',
    '12338': 'Pro Trading',
    '240': 'Real Estate',
    '268': 'Recommended Reading',
    '12336': 'Retirement',
    '1566': 'RQL Financial Planning',
    '1565': 'RQl Investing',
    '417': 'Summits',
    '215': 'Technical Analysis',
    '413': 'Technical Speaking',
    '12562': 'TPA Plus TR',
    '12654': 'TPA Plus RRG',
    '1': 'Uncategorized',
    '259': 'Videos',
    '418': 'Webinars',
  };

  postsNewsletter;
  postsRecentRIA;
  postsDailyCommentary;
  postsSVOriginal;
  postsTradeAlerts;
  postsVideos;

  constructor(private liveService: LiveService, private youTubeApiService: YouTubeApiService) {}

  ngOnInit(): void {
    forkJoin(
      this.liveService.getCategoryPosts(PostCategory.Commentary, 1),
      this.liveService.getCategoryPosts(PostCategory.Newsletter, 1),
      this.liveService.getCategoryPosts(PostCategory.RecentRIA, 1),
      this.liveService.getCategoryPosts(PostCategory.SVOriginal, 4),
      this.liveService.getCategoryPosts(PostCategory.TradeAlerts, 6),
      this.youTubeApiService.getVideosFromPlaylist(),
    ).subscribe(([commentary, newsletter, recentRIA, svoriginal, tradealerts, vids]) => {
      this.postsDailyCommentary = this.mapPosts(commentary);
      this.postsNewsletter = this.mapPosts(newsletter);
      this.postsRecentRIA = this.mapPosts(recentRIA);
      this.postsSVOriginal = this.mapPosts(svoriginal);
      this.postsTradeAlerts = this.mapPosts(tradealerts);
      this.postsVideos = this.mapVids(vids.items);
    });
  }

  mapPosts(posts) {
    let mappedPosts = [];
    for (let post of posts) {
      mappedPosts.push({
        id: post.id,
        date: new Date(post.date),
        title: htmlDecode(post.title.rendered),
        body: htmlDecode(post.content.rendered),
        excerpt: htmlDecode(post.excerpt.rendered),
        authorId: post.author,
        mediaId: post.featured_media,
        link: post.link,
        writer: post.yoast_head_json.twitter_misc['Written by'],
        media_url:
          post.featured_media in mediaDict
            ? mediaDict[post.featured_media]
            : post.yoast_head_json?.og_image?.[0]?.url,
        category: this.categoryDict[post.category]
          ? this.categoryDict[post.category]
          : post.category,
      });
    }

    return mappedPosts;
  }

  mapVids(videos) {
    let mappedVids = [];

    for (let vid of videos) {
      if (!vid.snippet?.videoOwnerChannelId) {
        continue;
      }
      mappedVids.push({
        id: vid.id,
        date: new Date(vid.snippet.publishedAt),
        title: htmlDecode(vid.snippet.title),
        body: htmlDecode(vid.snippet.description),
        excerpt: htmlDecode(vid.snippet.description),
        authorId: vid.snippet.videoOwnerChannelTitle,
        mediaId: vid.snippet.channelId,
        link: 'https://www.youtube.com/watch?v=' + vid.snippet.resourceId.videoId,
        writer: vid.snippet.videoOwnerChannelTitle,
        media_url: vid.snippet.thumbnail?.url,
        category: vid.snippet.channelTitle,
      });
    }
    return mappedVids;
  }
}

enum PostCategory {
  Commentary = '12335',
  RecentRIA = '256',
  TradeAlerts = '12338',
  SVOriginal = '12339',
  Newsletter = '12340',
}
