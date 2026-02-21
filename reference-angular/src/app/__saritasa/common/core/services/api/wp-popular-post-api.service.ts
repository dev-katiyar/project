import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WpPopularPostRange } from '../../enums/wp-popular-post-range';
import { WpPopularPostTimeUnit } from '../../enums/wp-popular-post-time-unit';
import { FetchListOptions } from '../../models/fetch-list-options';
import { PagedList } from '../../models/paged-list';
import { PaginationData } from '../../models/pagination-data';
import { WpPopularPostFilters } from '../../models/wordpress/wp-popular-post.filters';
import { WpPost } from '../../models/wordpress/wp-post';
import { AppConfigService } from '../app-config.service';
import { HttpParamsMapper } from '../mappers/http-params-mapper';
import { PagedListMapper } from '../mappers/paged-list.mapper';
import { WpPostDto } from '../mappers/wordpress/dto/wp-post-dto';
import { WpPopularPostFiltersMapper } from '../mappers/wordpress/wp-popular-post-filters.mapper';
import { WpPopularPostPaginationDataMapper } from '../mappers/wordpress/wp-popular-post-paginaton-data.mapper';
import { WpPostMapper } from '../mappers/wordpress/wp-post.mapper';
import { WpResponseMapper } from '../mappers/wordpress/wp-response.mapper';
import { WpSortMapper } from '../mappers/wordpress/wp-sort.mapper';
import { WpMediaApiService } from './wp-media-api.service';
import { GtmService } from 'src/app/services/gtm.service';

/** Fetch options for most popular posts */
const popularPostsDefaultOptions: FetchListOptions<WpPopularPostFilters> = {
  filter: {
    range: WpPopularPostRange.Custom,
    timeUnit: WpPopularPostTimeUnit.Day,
    timeQuantity: 90,
  },
  pagination: new PaginationData({
    page: 1,
    pageSize: 3,
    totalCount: 3,
  }),
};

@Injectable({ providedIn: 'root' })
/** Class to work with popular posts API. */
export class WpPopularPostApiService {
  /** Url to get most views post. */
  private readonly mostPopularPostsUrl = this.config.apiUrl  + '/wp-json/wordpress-popular-posts/v1/popular-posts';

  /** List of popular posts with default options. */
  public readonly popularPosts$: Observable<readonly WpPost[]>;

  public constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
    private readonly mediaService: WpMediaApiService,
    /** List mappers. */
    private readonly sortMapper: WpSortMapper,
    private readonly popularPostPaginationMapper: WpPopularPostPaginationDataMapper,
    private readonly popularPostFiltersMapper: WpPopularPostFiltersMapper,
    /** Items mappers */
    private readonly postMapper: WpPostMapper,
    private readonly listMapper: PagedListMapper,
    /** Response/request mappers */
    private readonly responseMapper: WpResponseMapper<WpPostDto>,
    private readonly paramsMapper: HttpParamsMapper,
    private readonly gtmService: GtmService,
  ) {
    this.popularPosts$ = this.getMostPopularPosts()
    .pipe(switchMap(posts => of(posts.items)
      // this.mediaService.getPostListMedia(posts.items)
      ),
      );
  }

  /**
   * Get list of most popular posts.
   * @param options Fetch options for list.
   */
  public getMostPopularPosts(
    options: FetchListOptions<WpPopularPostFilters> = popularPostsDefaultOptions,
  ): Observable<PagedList<WpPost>> {
    const params = this.paramsMapper.toDto<WpPopularPostFilters>(
      options,
      this.popularPostPaginationMapper,
      this.sortMapper,
      this.popularPostFiltersMapper,
    );
    this.gtmService.fireGtmEventForApiCalled('getMostPopularPosts');

    return this.http
      .get<WpPostDto[]>(this.mostPopularPostsUrl, { params, observe: 'response' })
      .pipe(
        map(response => this.responseMapper.fromDto(response)),
        map(response => this.listMapper.fromDto(response, this.postMapper, options.pagination)),
      );
  }
}
