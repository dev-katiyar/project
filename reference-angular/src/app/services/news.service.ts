import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GtmService } from './gtm.service';

@Injectable()

export class NewsService {

  constructor (private http: HttpClient, private readonly gtmService: GtmService,) {}

  getNews(requestSymbols){
    this.gtmService.fireGtmEventForApiCalled('getNews');
         return this.http.get(environment.baseUrl+'/eod/news/'+requestSymbols);
  }

  getNewsForSymbol(symbol){
    this.gtmService.fireGtmEventForApiCalled('getNewsForSymbol');
    return this.http.get(environment.baseUrl+'/eod/news/'+symbol);
}

}
