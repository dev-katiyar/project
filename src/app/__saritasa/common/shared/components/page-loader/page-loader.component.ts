import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/**
 * Component for hiding page content before it loaded.
 *
 * It only hide content but not remove it from DOM
 * You need to set `position: relative;` for parent page
 */
@Component({
  selector: 'app-page-loader',
  templateUrl: './page-loader.component.html',
  styleUrls: ['./page-loader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLoaderComponent {

  /** Page loading state. */
  @Input()
  public loading: boolean | null = false;
}
