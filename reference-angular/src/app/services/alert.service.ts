import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GtmService } from './gtm.service';

@Injectable()

export class AlertService {


  constructor (
    private http: HttpClient,
    private readonly gtmService: GtmService,
  ) {}


  getAlert(symbolList){
    this.gtmService.fireGtmEventForApiCalled('getAlert');
    return this.http.post(environment.baseUrl+'/techAlertsNew',{"symbols":symbolList.join(",")});
  }

}
