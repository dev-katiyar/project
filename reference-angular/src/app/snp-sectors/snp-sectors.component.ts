import { Component, OnInit,ViewChild } from '@angular/core';
import {LiveService} from '../services/live.service';
import {ChartUtils} from '../utils/chart.utils';
import { SnpSectorsMomentumComponent } from '../snp-sectors-momentum/snp-sectors-momentum.component';
import { SnpSectorsRsComponent } from '../snp-sectors-rs/snp-sectors-rs.component';
import {AppBreadcrumbService} from '../app.breadcrumb.service';

@Component({
  selector: 'snp-sectors',
  templateUrl: './snp-sectors.component.html',
  styleUrls: ['./snp-sectors.component.css']
})
export class SnpSectorsComponent implements OnInit {

    @ViewChild(SnpSectorsMomentumComponent, {static: true}) snpSectorMomentum: SnpSectorsMomentumComponent;
    @ViewChild(SnpSectorsRsComponent, {static: true}) snpSectorRs: SnpSectorsRsComponent;
    selectedTab =0;


    symbolsHistorical =[];
    sectorSymbols: Object;
    symbolTechnicals: Object;
    selectedIndex =0;


    constructor( private liveService: LiveService, private breadcrumbService: AppBreadcrumbService) {
        this.breadcrumbService.setItems([
            { label: 'Dashboard', routerLink: ['overview'] },
            { label: 'S&P Sectors', routerLink: ['snp-sectors'] }
        ]);
    }
    minValue = -100;
    maxValue = 100;

    ngOnInit() {
           this.liveService.getUrlData('/symbol/list_type/4').subscribe(d =>  this.setSectorSymbols(d));
           this.snpSectorMomentum.loadData();
    }

    setSectorSymbols(d){
        this.sectorSymbols = d;
        this.liveService.getSymbolsHistorical(this.sectorSymbols).subscribe(d =>this.setData(d) );
    }

    setData(response){
       for (const [key, value] of Object.entries(response)) {
           let series= [{name:"macd",data:[],color:'red'}]
           let seriesData = ChartUtils.getAllSeriesData(value,series,"date",false);
           let length = (<any>value).length;
           let rsi =(value[length-1].rsi)/this.maxValue;

           this.symbolsHistorical.push({"symbol":key,"data":seriesData,"rsi":rsi});

       }
     }

 onChange($event) {
         this.selectedIndex = $event.index;
         if(this.selectedIndex == 2){
             this.snpSectorRs.loadData();
         }
    }

}
