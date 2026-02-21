import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-tech-alerts-list',
  templateUrl: './tech-alerts-list.component.html',
  styleUrls: ['./tech-alerts-list.component.scss'],
})
export class TechAlertsListComponent implements OnInit {
  symbols: Object;
  techAlerts = [];
  @Output('alertsLoaded') alertsLoaded = new EventEmitter();

  constructor(private liveService: LiveService, private alertService: AlertService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/userportfolio_watchlist/symbol').subscribe(d => {
      this.symbols = d;
      this.alertService.getAlert(this.symbols).subscribe(d => {
        if (d) {
          this.techAlerts = [...d['upsymbols'], ...d['downsymbols']];
          this.techAlerts.sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
          this.alertsLoaded.emit(this.techAlerts.length);
        }
      });
    });
  }
}
