import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { TechnicalService } from '../services/technical.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-user-alerts',
  templateUrl: './user-alerts.component.html',
  styleUrls: ['./user-alerts.component.css'],
})
export class UserAlertsComponent implements OnInit {
  alerts = [];
  alertError = '';
  displayDialog = false;
  deleteDialog = false;
  selectedAlert;
  isEditMode = false;

  selectedWatchlistId = 0;

  watchlists = [{ id: 0, name: '-Select-' }];

  constructor(
    private liveService: LiveService,
    private breadcrumbService: AppBreadcrumbService,
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {
    this.breadcrumbService.setItems([
      { label: 'Portfolios', routerLink: ['/modelportfolio'] },
      { label: 'Alerts', routerLink: ['/alerts'] },
    ]);
  }

  ngOnInit() {
    this.getAlerts();
  }

  getAlerts() {
    this.liveService.getUrlData('/users_symbol_alerts').subscribe(d => this.setAlerts(d));
  }

  loadSymbolDetails() {
    let symbols = this.alerts.map(item => item.symbol);
    this.liveService
      .getUrlData('/symbol/live/' + symbols.join(','))
      .subscribe(d => this.setSymbolDetail(d));
  }

  setSymbolDetail(prices_data) {
    for (let alert of this.alerts) {
      let ticker = alert.symbol;
      if (prices_data[ticker]) {
        let price_data = prices_data[ticker];
        alert.price = price_data.price;
        alert.priceChange = price_data.priceChange;
        alert.priceChangePct = price_data.priceChangePct;
      }
    }
  }

  addRow() {
    this.alerts.unshift({
      symbol: '',
      low_target: '',
      high_target: '',
      isEditable: true,
      daily_high: '',
      daily_low: '',
    });
    this.alerts = this.alerts.slice();
  }

  saveAlerts() {
    let isAnyEditable = false;
    this.alerts.forEach(alert => {
      if (alert.isEditable) {
        alert.deleted = false;
        let alertError = this.checkInputs(alert);
        if (!alertError) {
          this.liveService
            .postRequest('/users_symbol_alerts', alert)
            .subscribe(d => this.setStatus(d));
          alert.isEditable = false;
        } else {
          isAnyEditable = true;
          this.displayDialog = true;
          this.alertError = alertError;
        }
      }
    });

    this.isEditMode = isAnyEditable;
  }

  fetchLivePrice(event) {
    this.liveService.getUrlData('/symbol/live/' + event).subscribe(d => this.setSymbolDetail(d));
  }

  checkInputs(alert) {
    let columns = ['low_target', 'high_target', 'daily_high', 'daily_low'];
    for (let column of columns) {
      if (alert[column] && !Number(alert[column])) {
        return `Please select valid ${column} for ${alert.symbol} !`;
      }
    }
    if (alert.high_target && alert.price >= Number(alert.high_target)) {
      return `High target of ${alert.symbol} already met !`;
    }
    if (alert.low_target && alert.price <= Number(alert.low_target)) {
      return `Low target of ${alert.symbol} already met !`;
    }

    return '';
  }

  setStatus(d) {}

  confirmDelete(status) {
    if (status) {
      this.alerts = this.alerts.filter(obj => obj.symbol !== this.selectedAlert.symbol);
      this.alerts = this.alerts.slice();
      this.selectedAlert.deleted = true;
      this.liveService
        .postRequest('/users_symbol_alerts', this.selectedAlert)
        .subscribe(d => this.setStatus(d));
    }

    this.deleteDialog = false;
  }

  deleteAlert(alert) {
    this.deleteDialog = true;
    this.selectedAlert = alert;
  }

  setMyClassesNew(priceData) {
    let value = 0;
    if (priceData) {
      value = priceData.priceChange;
    }
    let classes = {
      up: value > 0,
      down: value < 0,
      center: true,
    };
    return classes;
  }

  setAlerts(d) {
    this.alerts = d;
    this.alerts = this.alerts.filter(alert => alert.deleted != 1 && alert.symbol);
    this.loadSymbolDetails();
  }

  enterEditMode() {
    this.isEditMode = true;
    this.alerts.forEach(alert => (alert.isEditable = true));
  }

  cancelEditMode() {
    this.isEditMode = false;
    this.getAlerts();
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
