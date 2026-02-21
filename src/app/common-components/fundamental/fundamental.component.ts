import { Component, OnInit,Input,SimpleChanges, SimpleChange } from '@angular/core';
import {LiveService} from '../../services/live.service';

@Component({
  selector: 'app-fundamental',
  templateUrl: './fundamental.component.html',
  styleUrls: ['./fundamental.component.css']
})
export class FundamentalComponent implements OnInit {

 objectKeys = Object.keys;
 loading = false;

 @Input() symbol;
 @Input() displayClass ="p-grid scrollable";

 peersDataList ={peer_data:[],"peer_symbols":[]};
 symbolList =[];

  rowGroupMetadata: any; // supports grouping of row in p-table, see helper functions below.

  constructor(private liveService: LiveService) { }

  ngOnInit() {
   }

  ngOnChanges(changes: SimpleChanges) {
          if (this.symbol !=null && this.symbol !="" )
          {
                this.loading = true;
                this.liveService.getUrlData('/fundamental/peer/'+this.symbol).subscribe(d => this.setSymbols(d) );
          }
        }


 setSymbols(d){
    this.peersDataList = d ;
    this.symbolList = Object.assign([], d.peer_symbols);
    this.symbolList.push(this.symbol);
    this.updateRowGroupMetaData();
 }


 //// creates a map for helping table to group rows
      // sorts data initially so that mapping can be created
      onSort() {
          this.updateRowGroupMetaData();
      }

     // creates the mapping
     updateRowGroupMetaData() {
         this.rowGroupMetadata = {};

         if (this.peersDataList.peer_data) {
             for (let i = 0; i < this.peersDataList.peer_data.length; i++) {
                 let rowData = this.peersDataList.peer_data[i];
                 let groupName = rowData.group;

                 if (i == 0) {
                     this.rowGroupMetadata[groupName] = { index: 0, size: 1 };
                 }
                 else {
                     let previousRowData = this.peersDataList.peer_data[i - 1];
                     let previousRowGroup = previousRowData.group;
                     if (groupName === previousRowGroup)
                         this.rowGroupMetadata[groupName].size++;
                     else
                         this.rowGroupMetadata[groupName] = { index: i, size: 1 };
                 }
             }
         }
     }
}
