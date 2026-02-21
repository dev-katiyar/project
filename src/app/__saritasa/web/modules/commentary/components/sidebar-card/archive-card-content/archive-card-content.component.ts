import { Component } from '@angular/core';

const NUMBER_OF_MONTH_DO_DISPLAY = 5;

@Component({
  selector: 'app-archive-card-content',
  templateUrl: './archive-card-content.component.html',
  styleUrls: ['./archive-card-content.component.scss']
})
/** Card component to display link to list of archives posts */
export class ArchiveCardContentComponent {

  /** List of dates to display. */
  public readonly dates: Date[] = [];

  public constructor() {
    const currentDate = new Date();
    for (let i = 0; i < NUMBER_OF_MONTH_DO_DISPLAY; i++) {
      const date =  new Date(currentDate.getFullYear(), currentDate.getMonth() - i);
      this.dates.push(date);
    }
  }
}
