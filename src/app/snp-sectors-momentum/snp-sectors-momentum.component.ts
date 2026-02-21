import { Component, OnInit } from '@angular/core';
import {LiveService} from '../services/live.service';

@Component({
  selector: 'app-snp-sectors-momentum',
  templateUrl: './snp-sectors-momentum.component.html',
  styleUrls: ['./snp-sectors-momentum.component.css']
})
export class SnpSectorsMomentumComponent implements OnInit {

        sectorSymbols: Object;
        constructor( private liveService: LiveService) {   }

        ngOnInit() {

        }

        loadData(){
                this.liveService.getUrlData('/symbol/list_type/4').subscribe(d =>  this.sectorSymbols = d);
        }
}
