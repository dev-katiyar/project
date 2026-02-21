import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LiveService} from '../services/live.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss']
})
export class OptionsComponent implements OnInit {

    symbolDetail: any;
    symbol = "AAPL";
    optionData =[];

    selectedIndex = 0;

    constructor(private route: ActivatedRoute,private router: Router, private liveService: LiveService) { }

    ngOnInit() {
          this.loadData();
    }

    loadData() {
              this.liveService.getSymbolOptionsExpiration("/symbol/option/",this.symbol).subscribe(response => this.setOptions(response));
    }


    reset(params) {
            this.symbol = params["symbol"];
            this.loadSymbolDetails();
        }

    setOptions(response){
            this.optionData =[];
            for(let item of response){
              item.calls =[];
              item.puts =[];
              this.optionData.push(item);
            }
            if(this.optionData.length > 0){
             this.getSymbolOptions(this.optionData[0]);
            }

    }

    symbolSelected(event){
        this.symbol = event.value;
        this.loadData();
    }

    getSymbolOptions(option){
        this.liveService.getSymbolOptions("/symbol/option/",this.symbol,option.id).subscribe(response => this.setSymbolOptionDetails(option,response));
      }

    setSymbolOptionDetails(option,response){
              option.calls = response.calls;
              option.puts = response.puts;
      }

    loadSymbolDetails() {
            this.liveService.getUrlData('/symbol/live/' + this.symbol).subscribe(d => this.setSymbolDetail(d));
    }

    setSymbolDetail(d) {
            this.symbolDetail = d[(this.symbol).toUpperCase()];
    }

    handleChange($event) {
        this.selectedIndex = $event.index;
        let selectedOption = this.optionData[this.selectedIndex];
        if(selectedOption.calls.length == 0 || selectedOption.puts.length == 0){
          this.getSymbolOptions(selectedOption);
        }

    }

}
