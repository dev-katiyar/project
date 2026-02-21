import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonUtils } from '../utils/common.utils';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-sv-indicators',
  templateUrl: './sv-indicators.component.html',
  styleUrls: ['./sv-indicators.component.scss']
})
export class SvIndicatorsComponent implements OnInit, OnChanges {
  @Input() indicators;
  @Input() strategyInput = { "selected_condition": "and", "strategy_list": [] };
  selectedIndId;
  selectedInd;

  constructor() { }

  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
      if(this.indicators) {
        this.selectedIndId = this.indicators[0].key;
      }
  }

  addIndicatorRow() {
    this.selectedInd = CommonUtils.deepClone(this.indicators.find(i => i.key == this.selectedIndId));
    this.strategyInput.strategy_list.push(this.selectedInd);
  }

  indicatorRowDelete(event){
   let index = this.strategyInput.strategy_list.indexOf(event.value);
    this.strategyInput.strategy_list.splice(index, 1);
  }
}
