import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { WpMedia } from '../../models/wordpress/wp-media';
import { WpPost } from '../../models/wordpress/wp-post';
import { AppConfigService } from '../app-config.service';
import { WpMediaDto } from '../mappers/wordpress/dto/wp-media-dto';
import { WpMediaMapper } from '../mappers/wordpress/wp-media.mapper';
import { GtmService } from 'src/app/services/gtm.service';

@Injectable({ providedIn: 'root' })
/** Service for work with media from WordPress */
export class WpMediaApiService {
  /** Url to wordpress media restAPI */
  private readonly mediaUrl = this.config.apiUrl + '/wp-json/wp/v2/media';

  public constructor(
    private readonly http: HttpClient,
    private readonly mediaMapper: WpMediaMapper,
    private readonly config: AppConfigService,
    private readonly gtmService: GtmService,
  ) {}

  /** Get media data for post list */
  public getPostListMedia(posts: readonly WpPost[]): Observable<readonly WpPost[]> {
    // Here we wait while every post gets his media item and add this data to the post.
    return forkJoin(
      posts.map(post =>
        of(post).pipe(
          switchMap(p => this.getMediaById(p.mediaId).pipe(catchError(() => of(null)))),
          map(media => ({
            ...post,
            media,
          })),
        ),
      ),
    );
  }

  /** Get media by id */
  public getMediaById(id: number): Observable<WpMedia> {
    const url = `${this.mediaUrl}/${id}`;
    this.gtmService.fireGtmEventForApiCalled('getMediaById');
    return this.http.get<WpMediaDto>(url).pipe(map(m => this.mediaMapper.fromDto(m)));
  }
}
