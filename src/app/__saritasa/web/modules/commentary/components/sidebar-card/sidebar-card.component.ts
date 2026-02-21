import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-sidebar-card',
  templateUrl: './sidebar-card.component.html',
  styleUrls: ['./sidebar-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarCardComponent {
  /** Card header text. */
  @Input()
  public headerText: string;

  /** Link to section */
  @Input()
  public showSectionLink = false;

  /** Link text */
  @Input()
  public sectionLinkText?: string;

  /** Link value */
  @Input()
  public sectionLink?: string;
}
