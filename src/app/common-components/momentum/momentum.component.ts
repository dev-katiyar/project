import { Component, OnInit ,Input, SimpleChanges, SimpleChange} from '@angular/core';
import {LiveService} from '../../services/live.service';
import {ChartUtils} from '../../utils/chart.utils';
import {TechnicalService} from '../../services/technical.service';

@Component({
  selector: 'app-momentum',
  templateUrl: './momentum.component.html',
  styleUrls: ['./momentum.component.css']
})


export class MomentumComponent implements OnInit {

        symbolsHistorical =[];
        @Input() symbols;
        symbolTechnicals: Object;
        symbolNameMapping ={};


        constructor( private liveService: LiveService,private technicalService:TechnicalService) {   }

        ngOnChanges(changes: SimpleChanges) {

          if(this.symbols !=null && this.symbols.length > 0)
          {
          this.liveService.getTechnicals(this.symbols).subscribe(d =>this.createNameMap(d) );

          }

        }

        ngOnInit() {

        }

        createNameMap(d)
        {
          for(let row of d){
            let name = row["alternate_name"];
            let symbol = row["symbol"];
            this.symbolNameMapping[symbol] = name;
          }
          this.liveService.getSymbolsHistorical(this.symbols).subscribe(d =>this.setData(d) );
        }

        assignName(){
          for(let row of this.symbolsHistorical)
          {
            let symbol = row["symbol"];
            if(this.symbolNameMapping.hasOwnProperty(symbol))
            {
              row.name = this.symbolNameMapping[symbol] + " ("+symbol+")";
            }

          }

        }

        setData(response){
           for (const [key, value] of Object.entries(response)) {
               let series= [{name:"macd",data:[],color:'green'}];
               let seriesData = ChartUtils.getAllSeriesData(value,series,"date",true);
               let length = (<any>value).length;
               let rsi =value[length-1].rsi;
               let rsiText = this.technicalService.getRsiText(rsi);
               this.symbolsHistorical.push({"symbol":key,"data":seriesData,"rsi":rsi,"rsiText":rsiText,"name":""});
           }
           this.assignName();
      }
}
