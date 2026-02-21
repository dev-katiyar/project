import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-technical-strength',
  templateUrl: './technical-strength.component.html',
  styleUrls: ['./technical-strength.component.scss'],
})
export class TechnicalStrengthComponent implements OnInit {
  @Input() symbol;
  @Input() symbolTechnicals;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbol != null && this.symbol != '') {
      this.liveService.getTechnicals([this.symbol]).subscribe(d => this.setTechnical(d));
    }
  }

  setTechnical(d) {
    this.symbolTechnicals = d[0];
  }

  getAlertText(value) {
    if (value == 0) {
      return 'Neutral';
    } else if (value == 1) {
      return 'Very Bearish';
    } else if (value == 2) {
      return 'Bearish';
    } else if (value == 3) {
      return 'Bullish';
    } else if (value == 4) {
      return 'Very Bullish';
    }
  }
}
