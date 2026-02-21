import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-snp-sectors-rs',
  templateUrl: './snp-sectors-rs.component.html',
  styleUrls: ['./snp-sectors-rs.component.css']
})
export class SnpSectorsRsComponent implements OnInit {

  sectorSymbols: Object;
  selectedSymbol: Object;
  bestPerfSymbols: Object;
  titlePerformance = "Yearly Top 10 Performers";
  minValue = -100;
  maxValue = 100;

  constructor(private liveService: LiveService) { 
  }

  ngOnInit() {
  }

  loadData() {
    this.liveService.getUrlData('/symbol/list_type/4').subscribe(d => this.setSectorSymbols(d));
  }

  setSectorSymbols(d) {
    this.sectorSymbols = d;
    this.selectedSymbol = d[0];
    let event = { "value": { "symbol": "XLB", "type": "Sector", "name": "Technology" } };
    this.symbolSelected(event);
  }

  symbolSelected(event) {
    let symbol = event.value.symbol;
    let type = event.value.type;
    this.titlePerformance = event.value.name + " - " + "Yearly Top 10 Performers";
    this.selectedSymbol = symbol;
    if (type == "Sector") {
      this.liveService.getUrlData('/sector/yearly/' + this.selectedSymbol).subscribe(d => this.bestPerfSymbols = d);
    }
    else {
      this.liveService.getUrlData('/industry/yearly/' + this.selectedSymbol).subscribe(d => this.bestPerfSymbols = d);
    }
  }
  
}
