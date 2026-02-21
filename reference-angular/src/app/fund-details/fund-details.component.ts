import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { RelativeAnalysisService } from '../services/relative-analysis.service';

@Component({
  selector: 'app-fund-details',
  templateUrl: './fund-details.component.html',
  styleUrls: ['./fund-details.component.scss']
})
export class FundDetailsComponent implements OnInit, OnChanges {

  constructor(private relativeAnalysisService: RelativeAnalysisService) { }

  @Input() symbolObj: {'symbol': string, 'name': string};
  @Input() relativeAnalysisData = [];
  @Input() chartConfig;
  // raChartData = null;

  valueGauge;
  valueText;
  gaugeStops = [
    [0.15, '#008000'], // green
    [0.5, '#DDDF0D'], // yellow
    [0.85, '#FF0000'], // red
  ];

  ngOnInit(): void {
    if (this.chartConfig && this.relativeAnalysisData) {
      // this.setChartData(this.symbolObj.symbol, this.relativeAnalysisData);
      this.setGaugeData(this.chartConfig, this.relativeAnalysisData);
    }
  }

  ngOnChanges(changes: SimpleChanges) {

  }

  setChartData(sym, raData) {
    // let series = [{ name: sym + '_score', data: [], legend: sym }];
    // this.raChartData = { data: raData, series: series, categoryColumn: 'date' };
  }

  setGaugeData(config, raData) {
    if (raData && raData.length > 0) {
      const firstRow = raData[raData.length - 1];
      this.valueGauge = firstRow[config.yColKey1 + '_' + config.yColKey2 + '_score'];
      this.valueText = this.relativeAnalysisService.getRelativeAnalysisScoreText(this.valueGauge);
    }
  }

}
