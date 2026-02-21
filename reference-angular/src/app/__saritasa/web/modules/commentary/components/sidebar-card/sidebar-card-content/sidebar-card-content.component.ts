import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { WpPost } from 'src/app/__saritasa/common/core/models/wordpress/wp-post';

@Component({
  selector: 'app-sidebar-card-content',
  templateUrl: './sidebar-card-content.component.html',
  styleUrls: ['./sidebar-card-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component for sidebar card. */
export class SidebarCardContentComponent {
  /** List of displaying posts. */
  @Input()
  public posts: WpPost[] | null;
}
