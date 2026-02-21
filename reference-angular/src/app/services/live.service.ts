import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';
import { GtmService } from './gtm.service';

@Injectable()
export class LiveService {
  constructor(private http: HttpClient, private gtmService: GtmService) {}

  getWatchList() {
    this.gtmService.fireGtmEventForApiCalled('getWatchList');
    return this.http.get(environment.baseUrl + '/userwatchlist/symbol');
  }

  getTechnicals(symbols) {
    this.gtmService.fireGtmEventForApiCalled('getTechnicals');
    return this.http.get(environment.baseUrl + '/symbol/technical/' + symbols.join(','));
  }

  getCommonViews() {
    this.gtmService.fireGtmEventForApiCalled('getCommonViews');
    return this.http.get(environment.baseUrl + '/views');
  }
  getUserViews() {
    this.gtmService.fireGtmEventForApiCalled('getUserViews');
    return this.http.get(environment.baseUrl + '/user_views');
  }

  getColumnUniverse() {
    this.gtmService.fireGtmEventForApiCalled('getColumnUniverse');
    return this.http.get(environment.baseUrl + '/universe_columns');
  }
  getAllStates() {
    this.gtmService.fireGtmEventForApiCalled('getAllStates');
    return this.http.get(environment.baseUrl + '/states');
  }
  getDetailNews() {
    this.gtmService.fireGtmEventForApiCalled('getDetailNews');
    return this.http.get(environment.baseUrl + '/newsDetail/');
  }

  getCurrentDateNews() {
    this.gtmService.fireGtmEventForApiCalled('getDetailNews');
    return this.http.get(environment.baseUrl + '/newsDetail/currentDate');
  }

  get(marketType) {
    this.gtmService.fireGtmEventForApiCalled('getBoradMarket ' + marketType);
    return this.http.get(environment.baseUrl + '/broadMarket/' + marketType);
  }

  getNotableMoves() {
    this.gtmService.fireGtmEventForApiCalled('getNotableMoves');
    return this.http.get(environment.baseUrl + '/notablemoves');
  }

  getNotableMoveSymbols(typeid) {
    this.gtmService.fireGtmEventForApiCalled('getNotableMoveSymbols ' + typeid);
    return this.http.get(environment.baseUrl + '/notablemoves/' + typeid);
  }

  getNotableMovesETF() {
    this.gtmService.fireGtmEventForApiCalled('getNotableMovesETF');
    return this.http.get(environment.baseUrl + '/notablemoves_etf');
  }

  getNotableMoveSymbolsETF(typeid) {
    this.gtmService.fireGtmEventForApiCalled('getNotableMoveSymbolsETF ' + typeid);
    return this.http.get(environment.baseUrl + '/notablemoves_etf/' + typeid);
  }

  getSectorsPercentages(symbols) {
    this.gtmService.fireGtmEventForApiCalled('getSectorsPercentages');
    return this.http.get(environment.baseUrl + '/sectors/' + symbols.join(','));
  }

  getSymbolsHistorical(symbols) {
    this.gtmService.fireGtmEventForApiCalled('getSymbolsHistorical');
    return this.http.get(environment.baseUrl + '/symbol/technical/history/' + symbols.join(','));
  }

  getSynopsis(symbol) {
    this.gtmService.fireGtmEventForApiCalled('getSynopsis');
    return this.http.get(environment.baseUrl + '/symbol/synopsis/' + symbol);
  }

  getMulticharts() {
    this.gtmService.fireGtmEventForApiCalled('getMulticharts');
    return this.http.get(environment.baseUrl + '/multicharts');
  }

  getSectorIndustryMapping() {
    this.gtmService.fireGtmEventForApiCalled('getSectorIndustryMapping');
    return this.http.get(environment.baseUrl + '/sector/industryMapping');
  }

  getHeatMapByType(typeid) {
    this.gtmService.fireGtmEventForApiCalled('getSectorIndustryMapping ' + typeid);
    return this.http.get(environment.baseUrl + '/heatmap/' + typeid);
  }

  getUrlData(url) {
    this.gtmService.fireGtmEventForApiCalled(url);
    return this.http.get(environment.baseUrl + url);
  }

  postRequest(url, postData) {
    this.gtmService.fireGtmEventForApiCalled(url);
    let bodyString = JSON.stringify(postData);
    return this.http.post(environment.baseUrl + url, bodyString);
  }

  putRequest(url, putData) {
    this.gtmService.fireGtmEventForApiCalled(url);
    let bodyString = JSON.stringify(putData);
    return this.http.put(environment.baseUrl + url, bodyString);
  }

  deleteRequest(url) {
    this.gtmService.fireGtmEventForApiCalled(url);
    return this.http.delete(environment.baseUrl + url);
  }

  getRequestQueryParams(url, queryParamsObj) {
    this.gtmService.fireGtmEventForApiCalled(url);
    return this.http.get(environment.baseUrl + url, { params: queryParamsObj });
  }

  getDataInArray(url) {
    this.gtmService.fireGtmEventForApiCalled(url);
    return this.http.get(environment.baseUrl + url).pipe(map(res => res || []));
  }

  getRegisterQuestions(url) {
    this.gtmService.fireGtmEventForApiCalled('getRegisterQuestions');
    return this.http.get(environment.baseUrl + url);
  }

  getSymbolOptionsExpiration(url, symbol) {
    this.gtmService.fireGtmEventForApiCalled('getSymbolOptionsExpiration');
    return this.http.get(environment.baseUrl + url + symbol);
  }

  getSymbolOptions(url, symbol, expDate) {
    this.gtmService.fireGtmEventForApiCalled('getSymbolOptions');
    return this.http.get(environment.baseUrl + url + symbol + '/' + expDate);
  }
  deleteReq(url) {
    this.gtmService.fireGtmEventForApiCalled(url);
    return this.http.delete(environment.baseUrl + url);
  }
  getSubscriptions(type) {
    this.gtmService.fireGtmEventForApiCalled('getSubscriptions');
    return this.http.get(`${environment.baseUrl}/subscriptions/${type}`);
  }

  getSymbolFinancials(symbol: string, period: string) {
    this.gtmService.fireGtmEventForApiCalled('getSymbolFinancials');
    return this.http.get(`${environment.baseUrl}/symbol/historical/${symbol}/${period}`);
  }

  getSymbolPriceData(symbol: string, period: string) {
    this.gtmService.fireGtmEventForApiCalled('getSymbolPriceData');
    return this.http.get(`${environment.baseUrl}/symbol/price/${symbol}/${period}`);
  }

  getSymbolPriceDataFreq(symbol: string, period: string, freq: string) {
    this.gtmService.fireGtmEventForApiCalled('getSymbolPriceDataFreq');
    return this.http.get(`${environment.baseUrl}/symbol/pricedata/${symbol}/${period}/${freq}`);
  }

  getFairValueForSymbol(symbol: string) {
    this.gtmService.fireGtmEventForApiCalled('getFairValueForSymbol');
    return this.http.get(`${environment.baseUrl}/symbol/fairvalue/${symbol}`);
  }

  getSuperInvestorHoldings(investorCode, reportDate?: string) {
    this.gtmService.fireGtmEventForApiCalled('getSuperInvestorHoldings');
    return this.http.get(
      `${environment.baseUrl}/holdings/${investorCode}${reportDate ? '/' + reportDate : ''}`,
    );
  }

  getSuperInvestorRecentTransactions(investorCode) {
    this.gtmService.fireGtmEventForApiCalled('getSuperInvestorRecentTransactions');
    return this.http.get(`${environment.baseUrl}/super-investors-transactions/${investorCode}`);
  }

  getLatestInsightsPosts(limit: number) {
    return this.http.get(`${environment.baseUrl}/wp-json/wp/v2/recent_posts/${limit}`);
  }

  getCategoryPosts(category: string, limit: number) {
    return this.http.get(
      `${environment.baseUrl}/wp-json/wp/v2/get_newest_posts/${category}/${limit}`,
    );
  }
}
