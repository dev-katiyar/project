import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { mediaDict } from '../__saritasa/common/core/services/mappers/featured-media-mapper';
import { htmlDecode } from '../__saritasa/common/core/utils/decode-html-entities';
import { YouTubeApiService } from '../__saritasa/common/core/services/api/youtube-api.service';

@Component({
  selector: 'app-latest-insights-horizontal',
  templateUrl: './latest-insights-horizontal.component.html',
  styleUrls: ['./latest-insights-horizontal.component.scss'],
})
export class LatestInsightsHorizontalComponent implements OnInit {
  blogPosts = [];
  ytPosts = [];
  posts = [];
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

  constructor(private liveService: LiveService, private youTubeApiService: YouTubeApiService) {}

  ngOnInit(): void {
    this.posts = [];
    this.blogPosts = [];
    this.liveService.getLatestInsightsPosts(6).subscribe((posts: any[]) => {
      for (let post of posts) {
        this.blogPosts.push({
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
      this.addYouTubeItems();
    });
  }

  addYouTubeItems() {
    this.ytPosts = [];
    this.youTubeApiService.getVideosFromPlaylist().subscribe(res => {
      const videos = res.items;
      for (let vid of videos) {
        if(!vid.snippet?.videoOwnerChannelId) {
          continue;
        }
        this.ytPosts.push({
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
      this.blogPosts = this.blogPosts.concat(...this.ytPosts)
      this.blogPosts.sort((a, b) => b.date - a.date);
      this.posts = this.blogPosts.slice(0, 6);
    });
  }
}
