import { WpPost } from '../../../../../common/core/models/wordpress/wp-post';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-commentary-sidebar',
  templateUrl: './commentary-sidebar.component.html',
  styleUrls: ['./commentary-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component with sidebar cards. */
export class CommentarySidebarComponent {
  @Input()
  /** List of recent posts to display */
  public recentPosts: WpPost[] | null = null;

  @Input()
  /** List of popular posts to display */
  public popularPosts: WpPost[] | null = null;
}
