import { Component, OnInit, Input, SimpleChanges, SimpleChange, ViewEncapsulation } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { TechnicalService } from '../../services/technical.service';

@Component({
  selector: 'synopsis',
  templateUrl: './synopsis.component.html',
  styleUrls: ['./synopsis.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class SynopsisComponent implements OnInit {

  rsiMaxValue = 100;
  rsiMinValue = 0;
  rsiValue = 0;
  rsiText = "";

  @Input() symbol;
  @Input() showRating = true;
  @Input() showTechnicals = true;

  current_situation = "";
  synopsis = "";
  @Input() gaugeClass = "chart-gauge";
  symbolTechnicals = {
    "ratingText": "", "rating": 1, "companyName": "", "current_situation": "", "synopsis": ""
    , "inter_trend": 1, "short_trend": 1, "macd_trend": 1, "long_trend": 1, "alternate_name": "",
    "rsi": 10
  };

  synopsisData = {
    "ratingText": "", "rating": 1, "companyName": "", "current_situation": "", "synopsis": ""
    , "inter_trend": 1, "short_trend": 1, "macd_trend": 1, "long_trend": 1, "alternate_name": ""
  };
  @Input() gaugeWidth = 220;

  constructor(private liveService: LiveService, private technicalService: TechnicalService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbol != null && this.symbol != "") {
      if (this.showTechnicals) {
        this.liveService.getTechnicals([this.symbol]).subscribe(d => this.setTechnical(d));
      }
      this.liveService.getSynopsis(this.symbol).subscribe(d => this.setSynopsis(d));
    }
  }

  ngOnInit() {
  }

  setTechnical(d) {
    this.symbolTechnicals = d[0];
    this.symbolTechnicals.ratingText = this.technicalService.getRatingText(this.symbolTechnicals.rating).replace(/([^A-Z])([A-Z])/g, '$1 $2');
    this.rsiValue = this.symbolTechnicals.rsi;
    this.rsiText = this.technicalService.getRsiText(this.symbolTechnicals.rsi).replace(/([^A-Z])([A-Z])/g, '$1 $2');
  }

  setSynopsis(d) {
    this.synopsisData = d[0];

    if (this.synopsisData) {
      this.current_situation = this.synopsisData.current_situation.replace(new RegExp("style='color:green'", 'g'), "class='up'");
      this.current_situation = this.synopsisData.current_situation.replace(new RegExp("style='color:red'", 'g'), "class='down'");
      this.synopsis = this.synopsisData.synopsis;
    }
  }

  setTrendClass(value) {
    let classes = {
      'neutral': value == 0,
      'veryBearish': value == 1,
      'bearish': value == 2,
      'bullish': value == 3,
      'veryBullish': value == 4
    };
    return classes;
  }

  getAlertText(value) {
    if (value == 0) {
      return "Neutral"
    }
    else if (value == 1) {
      return "Very Bearish"
    }
    else if (value == 2) {
      return "Bearish"
    }
    else if (value == 3) {
      return "Bullish"
    }
    else if (value == 4) {
      return "Very Bullish"
    }
  }

}
