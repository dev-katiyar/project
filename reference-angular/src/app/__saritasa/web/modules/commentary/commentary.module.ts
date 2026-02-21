import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealTimePageComponent } from './real-time-page/real-time-page.component';
import { RouterModule, Routes } from '@angular/router';
import { TradingDiaryPageComponent } from './trading-diary-page/trading-diary-page.component';
import { PostCardComponent } from './components/post-card/post-card.component';
import { CommentaryPostComponent } from './components/commentary-post/commentary-post.component';
import { SaritasaCommonSharedModule } from '../../../common/shared/saritasa-common-shared.module';
import { SaritasaSharedModule } from '../shared/saritasa-shared.module';
import { SidebarCardContentComponent } from './components/sidebar-card/sidebar-card-content/sidebar-card-content.component';
import { CommentaryPostsListComponent } from './components/commentary-posts-list/commentary-posts-list.component';
import { VideosPageComponent } from './videos-page/videos-page.component';
import { ArchiveCardContentComponent } from './components/sidebar-card/archive-card-content/archive-card-content.component';
import { VideoCardComponent } from './components/video-card/video-card.component';
import { NewsletterPageComponent } from './newsletter-page/newsletter-page.component';
import { DashboardCardPostContentComponent } from './components/sidebar-card/dashboard-card-post-content/dashboard-card-post-content.component';
import { DashboardCardVideosContentComponent } from './components/sidebar-card/dashboard-card-video-content/dashboard-card-videos-content.component';
import { SidebarCardComponent } from './components/sidebar-card/sidebar-card.component';
import { CommentarySidebarComponent } from './components/commentary-sidebar/commentary-sidebar.component';
import { TpaPageComponent } from './tpa-page/tpa-page.component';
import { TpaPageRrgComponent } from './tpa-page-rrg/tpa-page-rrg.component';
import { MessagesModule } from 'primeng/messages';
import { RecentRIABlogs } from './recent-ria-page/recent-ria-page.component';

const routes: Routes = [
  { path: 'real-time', component: RealTimePageComponent, data: { title: 'Real Time' } },
  { path: 'real-time/:id', component: CommentaryPostComponent, data: { title: 'Real Time' } },

  { path: 'tpa-plus', component: TpaPageComponent, data: { title: 'TPA - Trend Range' } },
  { path: 'tpa-plus/:id', component: CommentaryPostComponent, data: { title: 'TPA - Trend Range' } },

  { path: 'tpa-plus-rrg', component: TpaPageRrgComponent, data: { title: 'TPA - RRG' } },
  { path: 'tpa-plus-rrg/:id', component: CommentaryPostComponent, data: { title: 'TPA - RRG' } },

  { path: 'diary', component: TradingDiaryPageComponent, data: { title: 'Trading Diary' } },
  { path: 'diary/:id', component: CommentaryPostComponent, data: { title: 'Trading Diary' } },

  { path: 'newsletter', component: NewsletterPageComponent, data: { title: 'News Letter' } },
  { path: 'newsletter/:id', component: CommentaryPostComponent, data: { title: 'News Letter' } },

  { path: 'recent-ria', component: RecentRIABlogs, data: { title: 'RIA Blogs' } },
  { path: 'recent-ria/:id', component: CommentaryPostComponent, data: { title: 'RIA Blog' } },

  { path: 'videos', component: VideosPageComponent,data: { title: 'Videos' } },

  { path: '**', redirectTo: 'real-time' },
];

const DECLARATIONS = [
  TpaPageComponent,
  TpaPageRrgComponent,
  RealTimePageComponent,
  PostCardComponent,
  VideosPageComponent,
  CommentaryPostComponent,
  TradingDiaryPageComponent,
  SidebarCardContentComponent,
  CommentaryPostComponent,
  CommentaryPostsListComponent,
  ArchiveCardContentComponent,
  VideoCardComponent,
  NewsletterPageComponent,
  RecentRIABlogs,
  DashboardCardPostContentComponent,
  DashboardCardVideosContentComponent,
];

@NgModule({
  declarations: [...DECLARATIONS, SidebarCardComponent, CommentarySidebarComponent, TpaPageRrgComponent],
  imports: [
    RouterModule.forChild(routes),
    SaritasaSharedModule,
    SaritasaCommonSharedModule,
    CommonModule,
    MessagesModule
  ],
  exports: [...DECLARATIONS, SidebarCardComponent],
})
/** Commentary module */
export class CommentaryModule {}
