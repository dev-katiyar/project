import { Component, Input, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { NotificationService } from '../services/notification.service';
import { AuthenticationService } from '../_services/index';

@Component({
  selector: 'app-tv-chart',
  templateUrl: './tv-chart.component.html',
  styleUrls: ['./tv-chart.component.scss'],
})
export class TvChartComponent implements OnInit {
  tvUrl = environment.baseUrl + '/tv'; // right now same URL being used for layouts and chart data
  clientId = 'simplevisor.com';
  userId = 'sv_unknown_user';
  @Input() symbol = 'AAPL';
  @Input() chartHeightClass = 'app-tv-chart-container-tall';

  constructor(
    private authenticationService: AuthenticationService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.authenticationService.getLoggedInUser().subscribe(d => this.setUser(d));
    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.symbol = symbol;
    });
  }

  onTvSymbolChanged(event) {
    this.symbol = event;
    localStorage.setItem('currentSymbol', this.symbol);
    this.notificationService.changeSelectedSymbol(this.symbol);
  }

  setUser(user) {
    if (user != null && user != '') {
      this.userId = user.userId;
    }
  }
}
