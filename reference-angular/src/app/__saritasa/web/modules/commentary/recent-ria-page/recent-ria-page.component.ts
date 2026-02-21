import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { months } from 'moment';
import {BehaviorSubject, Observable, of, throwError} from 'rxjs';
import { tap, switchMap, map } from 'rxjs/operators';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { WpPostCategories } from 'src/app/__saritasa/common/core/enums/wp-post-categories';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';
import { WpPostFilters } from 'src/app/__saritasa/common/core/models/wordpress/wp-post-filters';
import { onMessageOrFailed } from 'src/app/__saritasa/common/core/rxjs/on-message-or-failed';
import { WpMediaApiService } from 'src/app/__saritasa/common/core/services/api/wp-media-api.service';
import { WpPopularPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-popular-post-api.service';
import {
  WpPostApiService,
} from 'src/app/__saritasa/common/core/services/api/wp-post-api.service';
import { PrimeNgPaginationMapper } from 'src/app/__saritasa/common/core/services/mappers/primeNg-pagination.mapper';
import {
  DestroyableComponent,
  takeUntilDestroy,
} from 'src/app/__saritasa/common/core/utils/destroyable';
import { ListManager } from 'src/app/__saritasa/common/core/utils/list-manager';
import { CommentaryPageBase } from '../components/commentary-page-base';

/** Default most recent newsletters on the one page. */
export const MOST_RECENT_NEWSLETTERS_SIZE = 6;

@Component({
  selector: 'recent-ria-page',
  templateUrl: './recent-ria-page.component.html',
  styleUrls: ['./recent-ria-page.component.scss', './../commentary.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component for Newsletter page */
@DestroyableComponent()
export class RecentRIABlogs extends CommentaryPageBase<WpPost, WpPostFilters> {
  /** Current filtered month */
  public readonly currentMonth$: BehaviorSubject<string | null> = new BehaviorSubject(null);

  /** @inheritDoc */
  protected readonly filters$: Observable<WpPostFilters> = this.route.queryParams.pipe(
    tap(params => this.currentMonth$.next(months(Number(params.month)) || null)),
    map(params => {
      if (!(params.year && params.month)) {
        return;
      }

      const startDate = new Date(params.year, params.month, 1, 0, 0, 0);
      const endDate = new Date(params.year, Number(params.month) + 1, 0, 0, 0, 0);

      return {
        after: startDate.toISOString(),
        before: endDate.toISOString(),
      } as WpPostFilters;
    }),
    map(filters => ({
      ...filters,
      categories: [WpPostCategories.Investing],
    })),
  );

  /** @inheritDoc */
  public readonly listManager = new ListManager<WpPost, WpPostFilters>({
    filter: this.filters$,
    customPageSize: MOST_RECENT_NEWSLETTERS_SIZE
  });

  /** @inheritDoc */
  public readonly items$ = this.listManager
    .getPaginatedItems(options => this.postService.getPostsPagedList(options))
    .pipe(
      switchMap(posts => posts.length ? of(posts) : throwError('No posts found')),
      // switchMap(posts => this.mediaService.getPostListMedia(posts)),
      onMessageOrFailed(() => this.itemsLoading$.off()),
    );

  public constructor(
    @Inject(AppBreadcrumbService) private readonly breadcrumbService: AppBreadcrumbService,
    protected readonly postService: WpPostApiService,
    protected readonly popularPostsService: WpPopularPostApiService,
    protected readonly primeNgPaginationMapper: PrimeNgPaginationMapper,
    private readonly mediaService: WpMediaApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    super(postService, popularPostsService, primeNgPaginationMapper);

    this.router.events.pipe(takeUntilDestroy(this)).subscribe(() => {
      this.listManager.resetPagination();
    });

    this.breadcrumbService.setItems([
      { label: 'Commentary', routerLink: ['/commentary'] },
      { label: 'Newsletter', routerLink: ['/commentary/newsletter'] },
    ]);
  }
}
