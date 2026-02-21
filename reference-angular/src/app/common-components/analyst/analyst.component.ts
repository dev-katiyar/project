import { Component,Input, OnInit,OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import {LiveService} from '../../services/live.service';
import {TechnicalService} from '../../services/technical.service';

@Component({
  selector: 'app-analyst',
  templateUrl: './analyst.component.html',
  styleUrls: ['./analyst.component.css']
})


export class AnalystComponent implements OnInit {

    technicalTypes =[{name:"YTD",id: 1},{name:"MTD",id: 2}];
    selectedTechnicalTypeId = 1;
    analysis :any;
    @Input() symbol;
    headerRating ="";
    live_price =0;
    analyst_change = 0;
    error ="";
    headerConsensus="";
    loading = true;
    chartData : Object;

    constructor(private liveService: LiveService, private technicalService:TechnicalService) {}

    ngOnInit() {

          }

    ngOnChanges(changes: SimpleChanges) {
          if (this.symbol !=null && this.symbol !="" )
          {
                this.loading = true;
                this.requestData();
          }
        }

    requestData(){
        this.liveService.getUrlData('/analyst/'+this.symbol).subscribe(d => this.setAnalyst(d) );
    }

    setPrices(d){
        this.live_price = d[this.symbol].price;
        this.analyst_change= 100*(this.analysis.priceTarget - this.live_price)/this.live_price;

    }

    setAnalyst(d){
          this.error = d.error;
          if(d.error !="")
          {
             return ;
          }
          this.liveService.getUrlData('/symbol/live/'+ this.symbol).subscribe(d => this.setPrices(d));
          this.loading = false;
          this.analysis = d.analyst_rating ;
          this.headerRating ="Analyst Rating - "+this.symbol;
          this.headerConsensus ="Analyst Consensus - "+this.symbol;


          this.chartData = [
                                   {name: 'Hold', y: this.analysis.hold, color: '#FFEF01'},
                                   {name: 'Sell', y: this.analysis.sell, color: '#FF2806' },
                                   {name: 'Buy', y:this.analysis.buy, color: '#017F00'}
                             ];
       }

    setRatingCircleClass(value) {
                  let classes = {
                    'strong-buy': value == 'Strong Buy',
                    'sell': value == 'Sell',
                    'hold': value == 'Hold',
                    'underperform': value == 'UnderPerform'
                  }
                  return classes;
                }



}
