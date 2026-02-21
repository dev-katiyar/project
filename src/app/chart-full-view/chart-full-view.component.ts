import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';

@Component({
  selector: 'chart-full-view',
  templateUrl: './chart-full-view.component.html',
  styleUrls: ['./chart-full-view.component.css']
})
export class ChartFullViewComponent implements OnInit {

  selectedSymbol = "ADP";
  selectedPeerSymbol = "ADP";
  performanceChartHeader = 'Performance Comparison - S&P';
  selectedSymbolList = [];
  selectedSector = "Communication Services";
  peersSymbols: any;
  typeid = 1;
  heatMapSymbols = [];
  symbolsTechData = [];

  constructor(
    private liveService: LiveService,
    private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['overview'] },
      { label: 'Market X-Ray', routerLink: ['marketx-ray'] }
    ]);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.liveService.getHeatMapByType(1).subscribe(d => this.setsymbols(d));
  }

  setsymbols(d) {
    this.heatMapSymbols = d;
    this.setSymbolData(d[0].data[0]);
  }

  onSectorSelected(sector) {
    this.selectedSector = sector;
  }

  symbolSelected(event) {
    this.setSymbolData(event.value);
  }

  setSymbolData(symbol) {
    this.selectedSymbol = symbol;
    this.liveService.getUrlData("/peer/" + symbol).subscribe(peers => {
      this.peersSymbols = peers;
      this.setChartAndSynopsisData(symbol);
      this.setSymbolsTechDataTable(this.peersSymbols);
    });
  }

  onPeerSymbolSelected(event) {
    this.setChartAndSynopsisData(event.value);
  } 

  setChartAndSynopsisData(symbol) {
    this.selectedPeerSymbol = symbol;
    this.selectedSymbolList = [];
    this.selectedSymbolList.push(this.selectedSymbol);
    if(!this.selectedSymbolList.includes(symbol)) {
      this.selectedSymbolList.push(symbol);
      this.performanceChartHeader = 'Performance Comparison - S&P, ' + this.selectedSymbol + ', ' + symbol;
    } else {
      this.performanceChartHeader = 'Performance Comparison - S&P, ' + this.selectedSymbol;
    }
  }

  setSymbolsTechDataTable(symbols) {
    if (symbols != "") {
      this.liveService.postRequest("/symbol/model/NA", symbols.join(",")).subscribe(d => this.setDataTable(d));
    }
  }

  setDataTable(res) {
    this.symbolsTechData = res;
  }

}
