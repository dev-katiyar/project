import { Component, OnInit, Input , OnChanges, SimpleChanges, SimpleChange} from '@angular/core';
import {LiveService} from '../../services/live.service';

@Component({
  selector: 'app-symbol-detail-modal',
  templateUrl: './symbol-detail-modal.component.html',
  styleUrls: ['./symbol-detail-modal.component.css']
})
export class SymbolDetailModalComponent implements OnInit {

    @Input() symbol;

    fullEarningDetail = 1;
    fullDividendDetail = 1;
    peerSymbols: any;
    newsSymbols =[];
    constructor(private liveService: LiveService) { }

    ngOnInit() {

    }
    ngOnChanges(changes: SimpleChanges) {
        if (this.symbol !=null && this.symbol !="" )
        {
         this.newsSymbols =[];
         this.newsSymbols.push(this.symbol);
         this.liveService.getUrlData("/peer/" + this.symbol).subscribe(d => this.setPeerSymbols(d));
        }
     }
    setPeerSymbols(d){
        this.peerSymbols = d;
    }

}
