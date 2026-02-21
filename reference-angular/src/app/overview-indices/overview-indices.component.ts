import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { ChartUtils } from '../utils/chart.utils';

@Component({
  selector: 'overview-indices',
  templateUrl: './overview-indices.component.html',
  styleUrls: ['./overview-indices.component.css']
})
export class OverviewIndicesComponent implements OnInit {

  constructor(
    private liveService: LiveService,
    private breadcrumbService: AppBreadcrumbService
  ) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['overview'] },
      { label: 'Major Markets', routerLink: ['majormarkets'] },
    ]);
  }

  indicesSymbols: any[];
  indicesSymbolsWithProfile: any;
  selectedSymbolWithProfile: any;
  selectedSymbolTechnicals: any;
  indicesClasses = [
    {id: '8', name: 'Indices', itemName: 'Index'},
    {id: '4', name: 'Sectors', itemName: 'Sector'},
    {id: '5', name: 'Assets', itemName: 'Asset'},
  ];
  selectedClass;
  selectedPeriod = '1year'; // equivalent to day's gain
  barChartMasterData;
  barChartData;
  isPeriodBarVisible = true;

  // heatMapParams = { "display": "name", "changeField": "priceChange", "changePctField": "priceChangePct" };

  ngOnInit() {
    this.selectedClass = this.indicesClasses[0];
    this.loadData();
  }

  loadData() {
    this.liveService.getUrlData('/symbol/list_type/' + this.selectedClass.id).subscribe(d => this.setIndicesSymbol(d));
  }

  setIndicesSymbol(d) {
    this.indicesSymbols = d;
    this.getIndicesInfo();
  }

  getIndicesInfo() {
    if (this.indicesSymbols.length > 0) {
      let qpObjProfile = {
        tickers: this.indicesSymbols.toString(),
        detail: 'profile'
      }
      this.liveService.getRequestQueryParams('/symbol/info', qpObjProfile).subscribe(d => this.setIndicesInfo(d));
      let qpObjPerformance = {
        tickers: this.indicesSymbols.toString(),
        detail: 'performance'
      }
      this.liveService.getRequestQueryParams('/symbol/info', qpObjPerformance).subscribe(d => this.setBarChartMasterData(d));
    }
  }

  setIndicesInfo(d) {
    if (d) {
      this.indicesSymbolsWithProfile = d;
      this.sortSymbolsWitProfie();
      this.selectedSymbolWithProfile = d[0];
      this.onSelectedSymbolChange();
    }
    else {
      this.indicesSymbolsWithProfile = [];
    }
  }

  sortSymbolsWitProfie() {
    if (this.indicesSymbolsWithProfile) {
      this.indicesSymbolsWithProfile.sort((a, b) => 
        this.indicesSymbols.indexOf(a.symbol) - this.indicesSymbols.indexOf(b.symbol)
      );
    }
  }

  setBarChartMasterData(d) {
    this.barChartMasterData = d;
    if (d) {
      this.setBarChartPlotData();
    }
  }

  setBarChartPlotData() {
    this.barChartData = ChartUtils.createSeriesData(
      this.barChartMasterData,
      this.selectedPeriod,
      'alternate_name',
      true,
    );
  }

  onIndicesClassChange(iClass) {
    this.selectedClass = iClass;
    this.loadData();
  }

  changeBarChartData(period) {
    this.selectedPeriod = period; 
    this.setBarChartPlotData();
  }

  onSelectedSymbolChange() {
    if(this.selectedSymbolWithProfile.symbol) {
      this.liveService.getTechnicals([this.selectedSymbolWithProfile.symbol]).subscribe(d => this.setTechnicals(d));
    }
  }

  setTechnicals(d) {
    if(d && d.length > 0) {
      this.selectedSymbolTechnicals = d[0];
    }
  }
}
