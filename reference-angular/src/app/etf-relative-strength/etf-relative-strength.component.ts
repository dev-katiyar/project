import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-etf-relative-strength',
  templateUrl: './etf-relative-strength.component.html',
  styleUrls: ['./etf-relative-strength.component.css']
})
export class EtfRelativeStrengthComponent implements OnInit {

  globalMarketSymbols: Object;
  selectedSymbol;
  selectedTypeName = "Strongest Global ETFs";

  constructor(private liveService: LiveService) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // load globals
    this.etfSelected(null, 28);
  }

  etfSelected(event, typeId) {
    if (typeId == 28) {
      this.selectedTypeName = "Strongest Global ETFs";
    }
    else {
      this.selectedTypeName = "Strongest US Domestic ETFs";
    }
    this.liveService.getUrlData('/symbol/list_type/' + typeId).subscribe(d => this.setEtfData(d));
  }
  
  symbolSelected(event) {
    this.selectedSymbol = event.value;
  }

  setEtfData(d) {
    this.globalMarketSymbols = d;
    this.selectedSymbol = d[0];
  }

}
