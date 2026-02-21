import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-sector-performance',
  templateUrl: './sector-performance.component.html',
  styleUrls: ['./sector-performance.component.scss']
})
export class SectorPerformanceComponent implements OnInit {

  constructor(private liveService: LiveService) { }

  sectorSymbols: any;
  sectorSymbolsWithProfile: any;
  selectedSymbolWithProfile: any;
  selectedSymbol = '';
  titlePerformance = "Yearly Top 10 Performers";
  bestPerfSymbols: Object;

  ngOnInit(): void {
    this.loadData();;
  }

  loadData() {
    this.liveService.getUrlData('/symbol/list_type/4').subscribe(d => this.setSectorSymbols(d));
  }

  setSectorSymbols(d) {
    this.sectorSymbols = d;
    if(d.length > 0) {this.selectedSymbol = d[0]}
    this.getSymbolsInfo();
  }

  onSymbolClick(event) {
    this.selectedSymbol = event.value;
  } 

  getSymbolsInfo() {
    if (this.sectorSymbols.length > 0) {
      let qpObj = {
        tickers: this.sectorSymbols.toString(),
        detail: 'profile'
      }
      this.liveService.getRequestQueryParams('/symbol/info', qpObj).subscribe(d => this.setSectorsInfo(d));
    }
  }

  setSectorsInfo(d) {
    if (d) {
      this.sectorSymbolsWithProfile = d;
      this.onSymbolClicked(d[0]);
    }
    else {
      this.sectorSymbolsWithProfile = [];
    }
  }

  onSymbolClicked(symbolWP) {
    this.selectedSymbolWithProfile = symbolWP;
    this.liveService.getUrlData('/sector/yearly/' + this.selectedSymbolWithProfile.symbol).subscribe(d => this.bestPerfSymbols = d);
  }

}
