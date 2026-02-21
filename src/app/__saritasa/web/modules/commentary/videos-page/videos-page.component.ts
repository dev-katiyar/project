import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { YtPlaylists } from 'src/app/__saritasa/common/core/enums/yt-playlists';
import { YtItem } from 'src/app/__saritasa/common/core/models/youtube/yt-item';
import { onMessageOrFailed } from 'src/app/__saritasa/common/core/rxjs/on-message-or-failed';
import { WpPopularPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-popular-post-api.service';
import { WpPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-post-api.service';
import {
  YouTubeApiService,
  YtItemFilters,
} from 'src/app/__saritasa/common/core/services/api/youtube-api.service';
import { DestroyableComponent } from 'src/app/__saritasa/common/core/utils/destroyable';
import { ListManager } from 'src/app/__saritasa/common/core/utils/list-manager';
import { CommentaryPageBase } from '../components/commentary-page-base';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-videos-page',
  templateUrl: './videos-page.component.html',
  styleUrls: ['./videos-page.component.scss', './../commentary.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component with list of video */
@DestroyableComponent()
export class VideosPageComponent extends CommentaryPageBase<YtItem, YtItemFilters> {
  /** @inheritDoc */
  public readonly filters$: BehaviorSubject<YtItemFilters> = new BehaviorSubject({
    playlistId: YtPlaylists.RiaPro,
    part: 'snippet',
  });

  /** @inheritDoc */
  public readonly listManager = new ListManager<YtItem, YtItemFilters>({ filter: this.filters$ });

  /** @inheritDoc */
  public readonly items$ = this.listManager
    .getPaginatedItems(options => this.youTubeService.getVideosFromPlaylist(options))
    .pipe(
      switchMap(posts => (posts.length ? of(posts) : throwError('No videos found'))),
      onMessageOrFailed(() => this.itemsLoading$.off()),
    );

  public constructor(
    @Inject(AppBreadcrumbService) private readonly breadcrumbService: AppBreadcrumbService,
    protected readonly postService: WpPostApiService,
    private readonly youTubeService: YouTubeApiService,
    protected readonly popularPostsService: WpPopularPostApiService,
  ) {
    super(postService, popularPostsService);
    this.breadcrumbService.setItems([
      { label: 'Commentary', routerLink: ['/commentary'] },
      { label: 'Videos', routerLink: ['/commentary/videos'] },
    ]);
  }

  /** Get next page. */
  public nextPage(): void {
    const newPagination = this.listManager.paginationData;
    newPagination.pageToken = newPagination.nextPageToken;
    this.listManager.changePage(newPagination);
  }

  /** Get prev page. */
  public prevPage(): void {
    const newPagination = this.listManager.paginationData;
    newPagination.pageToken = newPagination.prevPageToken;
    this.listManager.changePage(newPagination);
  }
}
