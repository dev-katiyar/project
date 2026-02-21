import { Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange, Output, EventEmitter } from '@angular/core';
import { CommonUtils } from '../utils/common.utils';

@Component({
  selector: 'app-strategy-settings',
  templateUrl: './strategy-settings.component.html',
  styleUrls: ['./strategy-settings.component.scss']
})
export class StrategySettingsComponent implements OnInit {

  @Input() settings;
  @Output() public settingsValue = new EventEmitter();

  originalSettings;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.originalSettings = CommonUtils.deepClone(this.settings);
  }

  saveSettings() {
    this.settingsValue.emit(this.settings);
  }

  cancelSettings() {
    this.settingsValue.emit(this.originalSettings);
  }

}
