import { Component, Input, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-email-notification-preference',
  templateUrl: './email-notification-preference.component.html',
  styleUrls: ['./email-notification-preference.component.scss'],
})
export class EmailNotificationPreferenceComponent implements OnInit {
  constructor(private liveService: LiveService) {}

  userNotificationPrefernces = {
    id: NaN,
    user_id: NaN,
    daily_portfolio_mails: 0,
    sv_trade_alerts: 0,
    sv_robo_trade_alerts: 1,
    user_symbol_alerts: 1,
    blog_alerts: 0,
    tpa_blog_alerts: 1,
    weekly_reports: 1,
  };

  @Input('userData') userData;
  isTPASubscriber: boolean;

  errorMessage = '';

  ngOnInit(): void {
    this.liveService.getUrlData('/email-notifications-pref').subscribe(d => this.setData(d));
    this.isTPASubscriber = [3, 4, 5].includes(this.userData.subscriptionId) ? true : false;
  }

  setData(d) {
    if (d['user_id']) {
      this.userNotificationPrefernces = d;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Issue in getting the settings from server. Please contact support.';
    }
  }

  saveEmailNotificationPreference() {
    for (let key of Object.keys(this.userNotificationPrefernces)) {
      if (!['id', 'user_id'].includes(key)) {
        if (typeof this.userNotificationPrefernces[key] == 'boolean') {
          this.userNotificationPrefernces[key] = Number(this.userNotificationPrefernces[key]);
        }
      }
    }
    this.liveService
      .postRequest('/email-notifications-pref', { prefs: this.userNotificationPrefernces })
      .subscribe(d => this.setData(d));
  }
}
