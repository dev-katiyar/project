import { Component, OnInit, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AlertService } from '../../services/alert.service';
import { SymbolPopupService } from 'src/app/symbol-popup.service';

@Component({
  selector: 'tech-alerts',
  templateUrl: './tech-alerts.component.html',
  styleUrls: ['./tech-alerts.component.css'],
})
export class TechAlertsComponent implements OnInit {
  @Input() height = '195px';
  @Input() title = 'My Alerts';
  @Input() symbols;
  @Output('alertsLoaded') alertsLoaded = new EventEmitter();
  techAlerts;
  isUpVisible = true;
  isDownVisible = true;

  constructor(private alertService: AlertService, private symbolPopupService: SymbolPopupService) {}

  ngOnChanges(changes: SimpleChanges) {
    this.techAlerts = {};
    if (this.symbols != null && this.symbols.length > 0) {
      this.alertService.getAlert(this.symbols).subscribe(d => this.setData(d));
    }
  }

  setData(data) {
    this.techAlerts = data;
    this.alertsLoaded.emit(this.techAlerts?.up + this.techAlerts?.down);
  }

  ngOnInit() {
    this.techAlerts = { up: 0, down: 0, upsymbols: '', downsymbols: '' };
  }

  getTabAlertsHeight() {
    return 'tabAlertHeight';
  }

  toggleUp() {
    this.isUpVisible = true;
    this.isDownVisible = false;
  }

  toggleDown() {
    this.isUpVisible = false;
    this.isDownVisible = true;
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
