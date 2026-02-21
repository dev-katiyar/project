import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppConfigService } from '../app-config.service';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FetchListOptions } from '../../models/fetch-list-options';
import { PagedList } from '../../models/paged-list';
import { PagedListMapper } from '../mappers/paged-list.mapper';
import { SortDirection } from '../../enums/sort-direction';
import { PaginationData } from '../../models/pagination-data';
import { WpMediaApiService } from './wp-media-api.service';
import { WpPostCategories } from '../../enums/wp-post-categories';
import { WpPost } from '../../models/wordpress/wp-post';
import { WpPostDto } from '../mappers/wordpress/dto/wp-post-dto';
import { WpPostMapper } from '../mappers/wordpress/wp-post.mapper';
import { WpResponseMapper } from '../mappers/wordpress/wp-response.mapper';
import { WpPostPaginationDataMapper } from '../mappers/wordpress/wp-post-pagination-data.mapper';
import { WpSortMapper } from '../mappers/wordpress/wp-sort.mapper';
import { HttpParamsMapper } from '../mappers/http-params-mapper';
import { WpPostFiltersMapper } from '../mappers/wordpress/wp-post-filters.mapper';
import { WpPostFilters } from '../../models/wordpress/wp-post-filters';
import { GtmService } from 'src/app/services/gtm.service';

/** Fetch options for recent posts */
const recentPostsOptions: FetchListOptions<WpPostFilters> = {
  filter: {
    categories: [WpPostCategories.Economics, WpPostCategories.Investing],
  },
  sort: {
    field: 'date',
    direction: SortDirection.DESC,
  },
  pagination: new PaginationData({
    page: 1,
    pageSize: 3,
    totalCount: 3,
  }),
};

const DEFAULT_NUMBER_OF_POSTS = 3;

/** Fetch options for recent messages */
const recentMessagesOptions: FetchListOptions<WpPostFilters> = {
  filter: {
    categories: [WpPostCategories.Messages],
  },
  sort: {
    field: 'date',
    direction: SortDirection.DESC,
  },
  pagination: new PaginationData({
    page: 1,
    pageSize: 1,
    totalCount: 1,
  }),
};

@Injectable({ providedIn: 'root' })
/** Service for access to posts from WordPress */
export class WpPostApiService {
  /** Url to WordPress posts RestAPI  */
  private readonly postUrl = this.config.apiUrl + '/wp-json/wp/v2/posts';

  /** Url to get views of the post */
  private readonly viewsUrl = new URL(
    'wp-json/post-views-counter/get-post-views',
    this.config.wordPressUrl,
  ).toString();

  /** List of first 3 recent posts */
  public readonly recentPosts$: Observable<readonly WpPost[]>;

  /** List of first 3 recent messages */
    public readonly recentMessages$: Observable<readonly WpPost[]>;

  public constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
    private readonly mediaService: WpMediaApiService,
    /** List mappers. */
    private readonly sortMapper: WpSortMapper,
    private readonly postsPaginationMapper: WpPostPaginationDataMapper,
    private readonly postFiltersMapper: WpPostFiltersMapper,
    /** Items mappers */
    private readonly postMapper: WpPostMapper,
    private readonly listMapper: PagedListMapper,
    /** Response/request mappers */
    private readonly responseMapper: WpResponseMapper<WpPostDto>,
    private readonly paramsMapper: HttpParamsMapper,
    private readonly gtmService: GtmService,
  ) {
    this.recentPosts$;
    //  = this.getPostsPagedList(recentPostsOptions).pipe(
      // switchMap(posts => of(posts.items)
        // this.mediaService.getPostListMedia(posts.items)
        // ),
    // );
    this.recentMessages$ = this.getPostsPagedList(recentMessagesOptions).pipe(
          switchMap(posts => of(posts.items)
            // this.mediaService.getPostListMedia(posts.items)
            ),
    );
  }

  /**
   * Get post view.
   * @param id post id
   */
  public getPostViews(id: number): Observable<number> {
    const params = new HttpParams({
      fromObject: {
        id: String(id),
      },
    });

    this.gtmService.fireGtmEventForApiCalled('getPostViews');

    return this.http.get<number>(this.viewsUrl, { params });
  }

  /**
   * Get post by id
   * @param id post id
   */
  public getPostById(id: number): Observable<WpPost> {
    const url = `${this.postUrl}/${id}`;
    this.gtmService.fireGtmEventForApiCalled('getPostById');
    return this.http.get<WpPostDto>(url).pipe(map(post => this.postMapper.fromDto(post)));
  }

  /**
   * Get not paginated list of posts.
   * @param filter List of filters.
   * @param limit Number of return posts.
   */
  public getPostsLists(filter: WpPostFilters, limit: number = DEFAULT_NUMBER_OF_POSTS): Observable<readonly WpPost[]> {
    const options: FetchListOptions<WpPostFilters> = {
      pagination: new PaginationData({
        page: 1,
        pageSize: limit,
        totalCount: 3,
      }),
      filter,
    };

    return this.getPostsPagedList(options).pipe(map(list => list.items));
  }

  /**
   * Get list of posts.
   * @param options Fetch options for list.
   */
  public getPostsPagedList(options: FetchListOptions<WpPostFilters>): Observable<PagedList<WpPost>> {
    const params = this.paramsMapper.toDto<WpPostFilters>(
      options,
      this.postsPaginationMapper,
      this.sortMapper,
      this.postFiltersMapper,
    );

    this.gtmService.fireGtmEventForApiCalled('getPostsPagedList');

    return this.http.get<WpPostDto[]>(this.postUrl, { params, observe: 'response' }).pipe(
      map(response => this.responseMapper.fromDto(response)),
      map(response => this.listMapper.fromDto(response, this.postMapper, options.pagination)),
    );
  }
}