import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-admin-add-symbols',
  templateUrl: './admin-add-symbols.component.html',
  styleUrls: ['./admin-add-symbols.component.scss']
})
export class AdminAddSymbolsComponent implements OnInit {

   text='';
   loading = false;
   displayDialog;
   symbolDetails :any;
   symbolDetailList;
   newSymbol : boolean;
   sectors:any;
   assets :any;
   industries :any;
   cols: any[]; // dynamic table needed to enable CSV export feature

   constructor(private liveService: LiveService) { }

   ngOnInit() {
          this.liveService.getUrlData("/assets").subscribe(d => {this.assets = d;});
          this.liveService.getUrlData("/sectors").subscribe(d => this.sectors = d);
          this.liveService.getUrlData("/industries").subscribe(d => this.industries = d);

          this.cols = [
                         { field: 'symbol', header: 'Symbol' },
                         { field: 'companyname', header: 'Company Name' },
                         { field: 'exchange', header: 'Exchange' },
                         { field: 'source', header: 'Source' },
                         { field: 'asset_id', header: "Asset Id" },
                         { field: 'sector_id', header: 'Sector Id' },
                         { field: 'industry_id', header: 'Industry Id' }
                     ];
   }

   getAllSymbolDetail(){
        this.loading =true;
        this.symbolDetailList =[];

        this.liveService.postRequest("/symbol/details",{"action":"get","symbol":this.text}).subscribe(d =>{
                                                                                   this.loading = false;
                                                                                   this.symbolDetailList=d; }
                                                                                  );
      }

   addNewSymbol(){
       this.symbolDetailList =[];
       let newSymbol = {"symbol":"","companyname":"","exchange":"","source":"","asset_id":0 ,"sector_id":0 ,"industryi_d":0,"isactive":0,"isEditable":true,"newAddition":true};
       this.symbolDetailList.push(newSymbol);
      }

   saveSymbolData(symbolDetail):void{

        if(symbolDetail.newAddition){
          symbolDetail.action ="add";
          this.liveService.postRequest("/symbol/details",symbolDetail).subscribe(d => this.reportStatus(d));
        }
        else{
          symbolDetail.action ="save";
          this.liveService.postRequest("/symbol/details",symbolDetail).subscribe(d => this.reportStatus(d));
         }
        symbolDetail.isEditable = false;
       }

   reportStatus(msg){
   }

   deleteSymbol(symbolDetail):void{
       symbolDetail.action ="delete";
       this.liveService.postRequest("/symbol/details",symbolDetail).subscribe(d => this.reportStatus(d));
       symbolDetail.isEditable = false;
       this.getAllSymbolDetail();
   }

   editSymbolData(symbolDetail){
        symbolDetail.isEditable = true;
   }

}
