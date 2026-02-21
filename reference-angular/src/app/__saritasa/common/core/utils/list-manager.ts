import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { switchMapTo, withLatestFrom } from 'rxjs/operators';
import { map, switchMap, tap } from 'rxjs/operators';
import { FetchListOptions } from '../models/fetch-list-options';
import { PagedList } from '../models/paged-list';
import { PaginationData } from '../models/pagination-data';
import { Sort } from '../models/sort';
import { onMessageOrFailed } from '../rxjs/on-message-or-failed';
import { ToggleSubject } from '../rxjs/toggle-subject';

export type FetchItemsApiRequest<TItem, TFilter> = (
  options: FetchListOptions<TFilter>,
) => Observable<PagedList<TItem>>;

/** Manager for pagination lists. */
export class ListManager<TItem, TFilter = any> {
  /** Is data loading */
  public readonly loading$ = new ToggleSubject();

  /** Emits value of selected filters. */
  public readonly filter$: Observable<TFilter | undefined>;

  /** Emits value of selected sort. */
  public readonly sort$: Observable<Sort | undefined>;

  /** Current pagination data. */
  private readonly pagination$: BehaviorSubject<PaginationData>;
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly filterValue$ = new BehaviorSubject<TFilter | undefined>(undefined);
  private readonly sortValue$ = new BehaviorSubject<Sort | undefined>(undefined);

  /**
   * @constructor
   * @param listManagerConstructorData List manager constructor type.
   */
  public constructor(listManagerConstructorData: ListManagerConstructor<TFilter>) {
    this.filter$ = listManagerConstructorData.filter ?? this.filterValue$.asObservable();
    this.sort$ = listManagerConstructorData.sort ?? this.sortValue$.asObservable();
    this.pagination$ = new BehaviorSubject(new PaginationData({
      page: 1,
      pageSize: listManagerConstructorData.customPageSize,
      totalCount: 1,
    }));
  }

  /** Get current pagination data */
  public get paginationData(): PaginationData {
    return this.pagination$.value;
  }

  /**
   * Get list of paginated items from server.
   * @param func Api request function.
   * @returns Paginated items list.
   */
  public getPaginatedItems(
    func: FetchItemsApiRequest<TItem, TFilter>,
  ): Observable<readonly TItem[]> {
    return this.reload$.pipe(
      tap(() => this.loading$.on()),
      switchMapTo(combineLatest([this.filter$, this.sort$])),
      withLatestFrom(this.pagination$),
      switchMap(([[filter, sort], pagination]) => func({ pagination, filter, sort })),
      onMessageOrFailed(() => this.loading$.off()),
      tap(pagedList => this.paginationChanged(pagedList.pagination)),
      map(list => list.items),
    );
  }

  /**
   * Filters changed.
   * @param filters Updated filters.
   */
  public filtersChanged(filters?: TFilter): void {
    this.filterValue$.next(filters);
  }

  /**
   * Sort changed.
   * @param sort Updated sort.
   */
  public sortChanged(sort?: Sort): void {
    this.sortValue$.next(sort);
  }

  /**
   * Go to selected page
   * @param pagination Updated pagination.
   */
  public changePage(pagination: PaginationData): void {
    this.paginationChanged(pagination, true);
  }

  /**
   * Pagination changed
   * @param pagination Updated pagination.
   * @param triggerReload Should reload the list.
   */
  private paginationChanged(pagination: PaginationData, triggerReload: boolean = false): void {
    this.pagination$.next(pagination);
    if (triggerReload) {
      this.reload$.next();
    }
  }

  /** Reset pagination */
  public resetPagination(): void {
    const currentPagination = this.pagination$.value;
    const newPagination = new PaginationData({
      page: 1,
      pageSize: currentPagination.pageSize,
      totalCount: currentPagination.totalCount,
    });
    this.paginationChanged(newPagination);
  }
}

/** List manager constructor data type. */
export interface ListManagerConstructor<TFilter> {

  /** Filter stream. */
  readonly filter?: Observable<TFilter>;

  /** Sort stream. */
  readonly sort?: Observable<Sort>;

  /** Page size for customize pagination data of the list manager. */
  readonly customPageSize?: number;
}
