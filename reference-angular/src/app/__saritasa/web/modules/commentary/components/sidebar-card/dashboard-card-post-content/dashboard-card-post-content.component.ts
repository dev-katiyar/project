import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';

@Component({
  selector: 'app-dashboard-card-post-content',
  templateUrl: './dashboard-card-post-content.component.html',
  styleUrls: ['./dashboard-card-post-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component for cards on dashboard page. */
export class DashboardCardPostContentComponent {
  /** List of displaying posts. */
  @Input()
  public post: WpPost | null;
}
