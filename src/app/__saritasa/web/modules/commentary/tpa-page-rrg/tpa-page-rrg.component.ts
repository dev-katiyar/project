import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { WpPostCategories } from 'src/app/__saritasa/common/core/enums/wp-post-categories';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';
import { WpPostFilters } from 'src/app/__saritasa/common/core/models/wordpress/wp-post-filters';
import { onMessageOrFailed } from 'src/app/__saritasa/common/core/rxjs/on-message-or-failed';
import { WpMediaApiService } from 'src/app/__saritasa/common/core/services/api/wp-media-api.service';
import { WpPopularPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-popular-post-api.service';
import { PrimeNgPaginationMapper } from 'src/app/__saritasa/common/core/services/mappers/primeNg-pagination.mapper';
import { DestroyableComponent } from 'src/app/__saritasa/common/core/utils/destroyable';
import { ListManager } from 'src/app/__saritasa/common/core/utils/list-manager';
import { WpPostApiService } from '../../../../common/core/services/api/wp-post-api.service';
import { CommentaryPageBase } from '../components/commentary-page-base';

@Component({
  selector: 'app-tpa-page-rrg',
  templateUrl: './tpa-page-rrg.component.html',
  styleUrls: ['./tpa-page-rrg.component.scss', './../commentary.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component for TPA Page blog page */
@DestroyableComponent()
export class TpaPageRrgComponent extends CommentaryPageBase<WpPost, WpPostFilters>  {
  /** @inheritDoc */
  protected readonly filters$: BehaviorSubject<WpPostFilters> = new BehaviorSubject({
    categories: [WpPostCategories.TpaPlusRRG]
  });

  /** @inheritDoc */
  public readonly listManager = new ListManager<WpPost, WpPostFilters>({ filter: this.filters$ });

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
  ) {
    super(postService, popularPostsService, primeNgPaginationMapper);
    this.breadcrumbService.setItems([
      { label: 'TPA+', routerLink: ['/tpa-plus'] },
    ]);
  }

}
