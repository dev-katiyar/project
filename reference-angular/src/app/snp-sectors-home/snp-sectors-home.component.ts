import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-snp-sectors-home',
  templateUrl: './snp-sectors-home.component.html',
  styleUrls: ['./snp-sectors-home.component.css']
})
export class SnpSectorsHomeComponent implements OnInit {

  selectedSymbol = "XLB";

  ngOnInit() {
  }

  symbolSelected(event) {
    this.selectedSymbol = event.value.symbol;
  }
  
}
