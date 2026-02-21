import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GtmService } from './gtm.service';


@Injectable()

export class ZachService {


  constructor (
    private http: HttpClient,
    private readonly gtmService: GtmService,
  ) {}


   getZach(symbolList){
    this.gtmService.fireGtmEventForApiCalled('getZach');
      return this.http.get(environment.baseUrl+'/symbol/model/'+symbolList.join(","));
     }
}


