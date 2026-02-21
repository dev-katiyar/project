import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { TechnicalService } from '../services/technical.service';

@Component({
  selector: 'app-technnical-rating',
  templateUrl: './technnical-rating.component.html',
  styleUrls: ['./technnical-rating.component.scss']
})
export class TechnnicalRatingComponent implements OnInit, OnChanges {

  @Input() technicals;
  @Input() gaugeClass = "chart-gauge";
  @Input() gaugeWidth = 220;

  constructor(private technicalService: TechnicalService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.technicals) {
      this.technicals.ratingText = this.technicalService.getRatingText(this.technicals.rating).replace(/([^A-Z])([A-Z])/g, '$1 $2');
    }
  }
}
