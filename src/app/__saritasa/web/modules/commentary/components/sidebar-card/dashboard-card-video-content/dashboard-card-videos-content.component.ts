import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { YtItem } from 'src/app/__saritasa/common/core/models/youtube/yt-item';

@Component({
  selector: 'app-dashboard-card-videos-content',
  templateUrl: './dashboard-card-videos-content.component.html',
  styleUrls: ['./dashboard-card-videos-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Component for videos card on dashboard page. */
export class DashboardCardVideosContentComponent {

  /** List of videos */
  @Input()
  public videos: YtItem[] | null = null;
}
