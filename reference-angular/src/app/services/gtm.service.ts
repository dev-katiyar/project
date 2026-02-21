import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GtmService {
  constructor() {}

  fireGtmEventForUserId(user) {
    window['dataLayer'] = window['dataLayer'] || [];
    window['dataLayer'].push({
      userID: user?.userId,
      event: 'user_info',
    });
  }

  fireGtmEventForApiCalled(url) {
    window['dataLayer'] = window['dataLayer'] || [];
    window['dataLayer'].push({
      api_url: url,
      event: 'api_called',
    });
  }
}
