import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { YtPlaylists } from '../../enums/yt-playlists';
import { FetchListOptions } from '../../models/fetch-list-options';
import { PagedList } from '../../models/paged-list';
import { PaginationData } from '../../models/pagination-data';
import { YtItem } from '../../models/youtube/yt-item';
import { AppConfigService } from '../app-config.service';
import { PagedListMapper } from '../mappers/paged-list.mapper';
import { YtItemFiltersMapper } from '../mappers/youtube/dto/yt-item-filters.mapper';
import { YtItemListDto } from '../mappers/youtube/dto/yt-item-list-dto';
import { YtItemMapper } from '../mappers/youtube/yt-item-mapper';
import { YtPaginationDataMapper } from '../mappers/youtube/yt-pagination-data.mapper';
import { YtItemListResponseMapper } from '../mappers/youtube/yt-response-mapper';
import { HttpBackendClient } from './http-backend-client.service';
import { GtmService } from 'src/app/services/gtm.service';

/** Filters for youtube items. */
export interface YtItemFilters {
  /** Id of playlist. */
  readonly playlistId: string;
  /** Part of additional data. */
  readonly part?: string;
}

/** Default options for youtube playlist items */
const defaultYoutubePlaylistItemsOptions: FetchListOptions<YtItemFilters> = {
  filter: {
    playlistId: YtPlaylists.RiaPro,
    part: 'snippet',
  },
  sort: null,
  pagination: new PaginationData({
    page: 1,
    pageSize: 5,
    totalCount: 5,
  }),
};

@Injectable({ providedIn: 'root' })
/** Service for work with youtube REST API */
export class YouTubeApiService {
  private readonly apiUrl = new URL('youtube/v3/playlistItems', this.config.gApiUrl).toString();

  public constructor(
    private readonly httpBackend: HttpBackendClient,
    private readonly config: AppConfigService,
    private readonly paginationMapper: YtPaginationDataMapper,
    private readonly filterMapper: YtItemFiltersMapper,
    private readonly listMapper: PagedListMapper,
    private readonly itemsMapper: YtItemMapper,
    private readonly responseMapper: YtItemListResponseMapper,
    private readonly gtmService: GtmService,
  ) {}

  /** Get list of videos from playlist. */
  public getVideosFromPlaylist(
    options: FetchListOptions<YtItemFilters> = defaultYoutubePlaylistItemsOptions,
  ): Observable<PagedList<YtItem>> {
    const params = new HttpParams({
      fromObject: {
        ...this.paginationMapper.toDto(options.pagination),
        ...this.filterMapper.toDto(options.filter),
      },
    });
    this.gtmService.fireGtmEventForApiCalled('getVideosFromPlaylist');

    return this.httpBackend.get<YtItemListDto>(this.apiUrl, { params }).pipe(
      map(response => this.responseMapper.fromDto(response)),
      map(list => this.listMapper.fromDto(list, this.itemsMapper, options.pagination)),
    );
  }
}
