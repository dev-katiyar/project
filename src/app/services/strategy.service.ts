import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { LiveService } from '../services/live.service';
import { GtmService } from './gtm.service';

@Injectable({
  providedIn: 'root'
})
export class StrategyService {
  constructor(private http: HttpClient, private liveService: LiveService, private readonly gtmService: GtmService,) { }

  executeStrategy(strategy_inputs) {
    this.gtmService.fireGtmEventForApiCalled('executeStrategy');
    return this.http.post(environment.baseUrl + '/strategy/riapro', JSON.stringify(strategy_inputs));
  }

  executeStrategy2024(strategy_inputs) {
    this.gtmService.fireGtmEventForApiCalled('executeStrategy');
    return this.http.post(environment.baseUrl + '/strategy/riapro2024', JSON.stringify(strategy_inputs));
  }

  executeStrategyForPairRatio(strategy_inputs) {
    this.gtmService.fireGtmEventForApiCalled('executeStrategyForPairRatio');
    return this.http.post(environment.baseUrl + '/strategy/riapro-pair', JSON.stringify(strategy_inputs));
  }

  getListOfImagesForPresetStrategies() {
    return this.liveService.getUrlData('/screen/images');
  }

  getListOfIndicators() {
    return this.liveService.getUrlData('/stg/indicators');
  }

  getOutputDataForStrategyInputs(strategyParams) {
    return this.liveService.postRequest('/stg/runstrategy', strategyParams);
  }

  getSavedStrategiesOfUser() {
    return this.liveService.getUrlData('/stg/preset');
  }
  getModelStrategies() {
    return this.liveService.getUrlData('/stg/model/preset');
  }
  getSavedStrategyById(strategyId) {
    return this.liveService.getUrlData('/stg/preset/' + strategyId);
  }

  saveStrategyForUser(starategyParams) {
    return this.liveService.postRequest("/stg/preset", starategyParams);
  }

  deleteStrategyById(id) {
    return this.liveService.deleteReq(`/stg/preset?id=${id}`);
  }
}
