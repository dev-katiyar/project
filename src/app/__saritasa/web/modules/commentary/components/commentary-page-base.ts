import { combineLatest } from 'rxjs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrimeNgPaginationEvent } from 'src/app/__saritasa/common/core/models/primeNg-pagination-event';
import { onMessageOrFailed } from 'src/app/__saritasa/common/core/rxjs/on-message-or-failed';
import { ToggleSubject } from 'src/app/__saritasa/common/core/rxjs/toggle-subject';
import { WpPopularPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-popular-post-api.service';
import { WpPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-post-api.service';
import { PrimeNgPaginationMapper } from 'src/app/__saritasa/common/core/services/mappers/primeNg-pagination.mapper';
import { ListManager } from 'src/app/__saritasa/common/core/utils/list-manager';
import { scrollToTop } from 'src/app/__saritasa/common/core/utils/scroll-top';

/** Base class for commentary page. */
export abstract class CommentaryPageBase<TItem, TFilter = any> {
  /** Loading state for items. */
  protected readonly itemsLoading$ = new ToggleSubject(true);
  /** Loading state for recent posts. */
  // protected readonly recentPostsLoading$ = new ToggleSubject(true);
  /** Loading state for popular posts. */
  protected readonly popularPostsLoading$ = new ToggleSubject(true);

  /** Manager for pagination. */
  public abstract readonly listManager: ListManager<TItem, TFilter>;

  /** Displaying items. */
  public abstract readonly items$: Observable<readonly TItem[]>;

  /** Is data loading. */
  public readonly isLoading$ = combineLatest([
    this.itemsLoading$,
    // this.recentPostsLoading$,
    this.popularPostsLoading$,
  ]).pipe(map(([
    items, 
    // recent,
    popular]) => items 
    // || recent 
    || popular));

  /** List of filters. */
  protected readonly filters$?: Observable<TFilter>;

  /** List of recent posts. */
  public readonly recentPosts$;
  //  = this.postService.recentPosts$.pipe(
    // onMessageOrFailed(() => this.recentPostsLoading$.off()),
  // );

  /** List of popular posts. */
  public readonly popularPosts$ = this.popularPostsService.popularPosts$.pipe(
    onMessageOrFailed(() => this.popularPostsLoading$.off()),
  );

  protected constructor(
    protected readonly postService: WpPostApiService,
    protected readonly popularPostsService: WpPopularPostApiService,
    protected readonly primeNgPaginationMapper?: PrimeNgPaginationMapper,
  ) {}

  /** Event on pagination change */
  public paginate(event: PrimeNgPaginationEvent): void {
    const paginationData = this.primeNgPaginationMapper.fromDto(event);
    scrollToTop();
    this.listManager.changePage(paginationData);
  }
}
