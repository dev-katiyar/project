import { Component, OnInit } from '@angular/core';
import {LiveService} from '../services/live.service';
import {AppBreadcrumbService} from '../app.breadcrumb.service';


@Component({
  selector: 'overview-broadmarkets',
  templateUrl: './overview-broadmarkets.component.html',
  styleUrls: ['./overview-broadmarkets.component.css']
})
export class OverviewBroadmarketsComponent implements OnInit {
    data;
    globalMarketSymbols: Object;
    assetSymbols : Object;
    bondSymbols: Object;
    commoditySymbols: Object;
    asiaPacificSymbols: Object;

  constructor(private liveService: LiveService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['overview'] },
      { label: 'Broad Markets', routerLink: ['/markets'] }
    ]);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData(){
        this.liveService.getUrlData('/symbol/list_type/5').subscribe(d =>  this.assetSymbols = d);
        this.liveService.getUrlData('/symbol/list_type/24').subscribe(d =>  this.bondSymbols = d);
        this.liveService.getUrlData('/symbol/list_type/43').subscribe(d =>  this.commoditySymbols = d);
        this.liveService.getUrlData('/symbol/list_type/7').subscribe(d => this.globalMarketSymbols = d);
        this.liveService.getUrlData('/symbol/list_type/23').subscribe(d => this.asiaPacificSymbols = d);
  }
}
