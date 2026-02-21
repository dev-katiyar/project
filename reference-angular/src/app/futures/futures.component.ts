import { Component, OnInit, ViewChild } from '@angular/core';
import { LiveService } from '../services/live.service';
// import { Table } from 'primeng/table';

@Component({
  selector: 'app-futures',
  templateUrl: './futures.component.html',
  styleUrls: ['./futures.component.scss']
})
export class FuturesComponent implements OnInit {

  constructor(private liveService: LiveService) { }

  futures_data: any;
  futures_data_selected = [];
  // cols: any[]; // dynamic table needed to enable CSV export feature
  // @ViewChild('dt1') table: Table; //reference of DOM table to be used export function

  ngOnInit(): void {
    // this.loadColumns();
    this.loadData();
  }

  // loadColumns() {
  //   this.cols = [
  //     { field: 'asset', header: 'Asset Class' },
  //     { field: 'label', header: 'Name' },
  //     { field: 'ticker', header: 'Ticker' },
  //     { field: 'low', header: "Low" },
  //     { field: 'high', header: "High" },
  //     { field: 'prevClose', header: "Previous Close" },
  //     { field: 'last', header: 'Last Price' },
  //     { field: 'change', header: "Change" }
  //   ];
  // }

  loadData() {
    this.liveService.getUrlData('/futures/summarydata').subscribe(d =>  {
      this.futures_data = d;
      let keyFutures = ['ES', 'YM', 'NQ', 'VX', 'ZB', 'ZN', 'CL', 'GC', 'DX'];
      this.futures_data_selected = this.futures_data.filter(f => keyFutures.includes(f.ticker));
    });
  }

//   exportToCSV() {
//     this.table.exportCSV();
// }

}
