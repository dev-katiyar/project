import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { TechnicalService } from '../services/technical.service';

@Component({
  selector: 'app-rsi-rating',
  templateUrl: './rsi-rating.component.html',
  styleUrls: ['./rsi-rating.component.scss']
})
export class RsiRatingComponent implements OnInit, OnChanges {
  @Input() technicals;
  @Input() gaugeClass = "chart-gauge";

  rsiMaxValue = 100;
  rsiMinValue = 0;
  rsiValue = 0;
  rsiText = "";

  constructor(private technicalService: TechnicalService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.technicals) {
      this.rsiValue = this.technicals.rsi;
      this.rsiText = this.technicalService.getRsiText(this.technicals.rsi).replace(/([^A-Z])([A-Z])/g, '$1 $2');
    }
  }

}
