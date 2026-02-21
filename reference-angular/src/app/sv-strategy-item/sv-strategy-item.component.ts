import { Component, ViewChild, OnInit, Input, OnChanges, SimpleChanges, SimpleChange, Output, EventEmitter } from '@angular/core';
import { CommonUtils } from '../utils/common.utils';
import { TooltipModule } from 'primeng/tooltip';

@Component({
      selector: 'app-sv-strategy-item',
      templateUrl: './sv-strategy-item.component.html',
      styleUrls: ['./sv-strategy-item.component.scss']
})
export class SvStrategyItemComponent implements OnInit {

      @ViewChild('indicatorSettingsPanel', { static: false }) indSettingsPanelElement;
      @ViewChild('optionSettingsPanel', { static: false }) optSettingsPanelElement;
      @Input() selectedInd;
      @Output() public onIndicatorRowDelete = new EventEmitter();

      selectedStrategy;
      selectedOption;

      constructor() { }

      ngOnInit(): void {
      }

      ngOnChanges(changes: SimpleChanges): void {
            if(this.selectedInd.selected_strategy.key != -1) {    // this is check that its not a preset. there could be a better way
                  this.setPresetParamsForSelectedIndicator();     // TODO: ensure that no indicator is saved with selected_staratety -1.
            }
      }

      setPresetParamsForSelectedIndicator() {         // when from preset, indicators does not have all the strategy optoins like ca bud gt etc. 
            this.selectedStrategy = this.selectedInd.selected_strategy;
            if(this.selectedInd.strategies.length > 0) {
                  let stg = this.selectedInd.strategies.find(s => s.key == this.selectedStrategy.key);
                  this.selectedStrategy.name = stg.name;
                  this.selectedOption = this.selectedInd.selected_strategy.selected_option;
            }
      }

      handleStrategyChange() {
            let selectedStrategyId = this.selectedInd.selected_strategy.key;
            this.selectedStrategy = this.selectedInd.strategies.find(i => i.key == selectedStrategyId)
            this.selectedInd.selected_strategy.key = selectedStrategyId;
            this.selectedInd.selected_strategy.type = this.selectedStrategy.type;
            this.selectedInd.selected_strategy.settings = this.selectedStrategy.settings;
      }

      handleOptionChange(event) {
            this.selectedOption = this.selectedStrategy.options.find(i => i.key == event.value)
            this.selectedInd.selected_strategy.selected_option = this.selectedOption;
      }

      handleIndicatorSettingsChange(indSettings) {
            this.selectedInd.settings = indSettings;
            this.indSettingsPanelElement.hide();
      }

      getIndSettings() {
            if (this.selectedInd.settings) {
                  let text = this.selectedInd.settings.map(i => i.value).join(",");
                  return `(${text})`;
            }
            else {
                  return "";
            }
      }

      getOptionSettings() {
            if (this.selectedOption.settings) {
                  let text = this.selectedOption.settings.map(i => i.value).join(",");
                  return `(${text})`;
            }
            else {
                  return "";
            }
      }

      handleOptionSettingsChange(optSettings) {
            this.selectedOption.settings = optSettings;
            this.optSettingsPanelElement.hide();
      }

      deleteIndicatorRow(){
            this.onIndicatorRowDelete.emit({value: this.selectedInd});
      }

}