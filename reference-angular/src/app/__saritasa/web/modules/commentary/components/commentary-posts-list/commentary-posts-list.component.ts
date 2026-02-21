import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';

@Component({
  selector: 'app-commentary-posts-list',
  templateUrl: './commentary-posts-list.component.html',
  styleUrls: ['./commentary-posts-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
  /** Component for displaying posts list. */
export class CommentaryPostsListComponent {
  @Input()
  /** List of displaying posts. */
  public posts: WpPost[];
}
