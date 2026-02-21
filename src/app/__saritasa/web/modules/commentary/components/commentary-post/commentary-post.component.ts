import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, forkJoin, of } from 'rxjs';
import { Observable, throwError } from 'rxjs';
import { switchMap, catchError, shareReplay, map, tap, withLatestFrom } from 'rxjs/operators';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';
import { onMessageOrFailed } from 'src/app/__saritasa/common/core/rxjs/on-message-or-failed';
import { ToggleSubject } from 'src/app/__saritasa/common/core/rxjs/toggle-subject';
import { WpPopularPostApiService } from 'src/app/__saritasa/common/core/services/api/wp-popular-post-api.service';
import { htmlDecode } from 'src/app/__saritasa/common/core/utils/decode-html-entities';
import {
  DestroyableComponent,
} from 'src/app/__saritasa/common/core/utils/destroyable';
import { WpMediaApiService } from '../../../../../common/core/services/api/wp-media-api.service';
import { WpPostApiService } from '../../../../../common/core/services/api/wp-post-api.service';
import { WpUserApiService } from '../../../../../common/core/services/api/wp-user-api.service';

@Component({
  selector: 'app-commentary-post',
  templateUrl: './commentary-post.component.html',
  styleUrls: ['./commentary-post.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Post component in commentary module. */
@DestroyableComponent()
export class CommentaryPostComponent {

  /** Loading state for items. */
  protected readonly postLoading$ = new ToggleSubject(true);
  /** Loading state for recent posts. */
  // protected readonly recentPostsLoading$ = new ToggleSubject(true);
  /** Loading state for popular posts. */
  protected readonly popularPostsLoading$ = new ToggleSubject(true);

  /** Is data loading. */
  public readonly isLoading$ = combineLatest([
    this.postLoading$,
    // this.recentPostsLoading$,
    this.popularPostsLoading$,
  ]).pipe(map(([
    items, 
    // recent, 
    popular]) => items 
    // || recent 
    || popular));

  /** Get post by id from params. */
  private readonly postFromParams$ = this.route.paramMap.pipe(
    map(params => Number(params.get('id'))),
    switchMap(id => this.postsService.getPostById(id)),
    catchError((httpError: HttpErrorResponse) => {
      this.router.navigate(['commentary']);
      return throwError(httpError);
    }),
    withLatestFrom(this.route.url),
    tap(([post, url]) => {
      this.breadcrumbService.setItems([
        { label: 'Commentary', routerLink: ['/commentary'] },
        { label: url[0].path, routerLink: ['/commentary', url[0].path] },
        { label: htmlDecode(post.title), routerLink: [`/commentary`, url[0].path, post.id] },
      ]);
    }),
    map(([post]) => post),
    shareReplay({ refCount: true, bufferSize: 1 }),
  );

  // /** List of recent posts */
  public readonly recentPosts$;
  // = this.postsService.recentPosts$.pipe(
  //   onMessageOrFailed(() => this.recentPostsLoading$.off()),
  // );

  /** List of popular posts */
  public readonly popularPosts$ = this.popularPostsService.popularPosts$.pipe(
    onMessageOrFailed(() => this.popularPostsLoading$.off()),
  );

  /** Post info. */
  public readonly post$: Observable<WpPost> = this.postFromParams$.pipe(
    switchMap(post => {
      return forkJoin([
        of(post),
        this.userService.getUserById(post.authorId).pipe(catchError(() => of(null))),
        this.mediaService.getMediaById(post.mediaId).pipe(catchError(() => of(null))),
      ]);
    }),
    map(([post, user, media]) => {
      return {
        ...post,
        author: user,
        media,
      };
    }),
    onMessageOrFailed(() => this.postLoading$.off()),
  );

  public constructor(
    @Inject(AppBreadcrumbService) private readonly breadcrumbService: AppBreadcrumbService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly mediaService: WpMediaApiService,
    private readonly userService: WpUserApiService,
    private readonly postsService: WpPostApiService,
    private readonly popularPostsService: WpPopularPostApiService,
  ) {}
}
