import { Component, Input } from '@angular/core';
import { YtItem } from 'src/app/__saritasa/common/core/models/youtube/yt-item';

@Component({
  selector: 'app-video-card',
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss']
})
export class VideoCardComponent {
  /** Inputted data */
  @Input()
  public video: YtItem | null = null;
}
