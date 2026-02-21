import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-sms-notification-prreference',
  templateUrl: './sms-notification-prreference.component.html',
  styleUrls: ['./sms-notification-prreference.component.scss'],
})
export class SmsNotificationPrreferenceComponent implements OnInit, OnChanges {
  @Input('userData') userData;

  isTPASubscriber;
  phoneNumber;

  smsNotificationPrefernces = {
    id: NaN,
    user_id: NaN,
    daily_portfolio_mails: 0,
    sv_trade_alerts: 1,
    sv_robo_trade_alerts: 1,
    user_symbol_alerts: 0,
    blog_alerts: 0,

    weekly_reports: 0,
    phone: null,
  };

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/sms-notifications-pref').subscribe(d => this.setData(d));
    this.isTPASubscriber = [3, 4, 5].includes(this.userData.subscriptionId) ? true : false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.userData) {
      this.phoneNumber = this.userData.phone;
    }
  }

  setData(d) {
    if (d && d['user_id']) {
      this.smsNotificationPrefernces = d;
    }
  }

  saveSMSNotificationPreference() {
    for (let key of Object.keys(this.smsNotificationPrefernces)) {
      if (!['id', 'user_id'].includes(key)) {
        if (typeof this.smsNotificationPrefernces[key] == 'boolean') {
          this.smsNotificationPrefernces[key] = Number(this.smsNotificationPrefernces[key]);
        }
      }
    }
    this.smsNotificationPrefernces.phone = String(this.phoneNumber).replace(/[\s()\-]+/g, '');
    this.liveService
      .postRequest('/sms-notifications-pref', { prefs: this.smsNotificationPrefernces })
      .subscribe(d => this.setData(d));
  }
}
