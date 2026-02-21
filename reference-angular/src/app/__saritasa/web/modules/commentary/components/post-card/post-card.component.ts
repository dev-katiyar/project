import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Card component for post */
export class PostCardComponent  {
  /** Post info for card. */
  @Input()
  public post: WpPost | null;

  /** Url to current blog page. */
  public currentUrlPath$ = this.route.url.pipe(
    map(url => url[0].path)
  );

  public constructor(
    protected readonly route: ActivatedRoute,
  ) {}
}
