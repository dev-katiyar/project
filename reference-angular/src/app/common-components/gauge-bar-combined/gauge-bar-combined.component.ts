import {Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange} from '@angular/core';

@Component({
  selector: 'app-gauge-bar-combined',
  templateUrl: './gauge-bar-combined.component.html',
  styleUrls: ['./gauge-bar-combined.component.css']
})
export class GaugeBarCombinedComponent implements OnInit {

  @Input() chartData;
  @Input() valueText;
  @Input() valueGauge;
  constructor() { }

  ngOnInit() {
  }

}
