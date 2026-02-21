import { Component, OnInit, Input, SimpleChanges, SimpleChange, Output, EventEmitter } from '@angular/core';
import { LiveService } from '../../services/live.service';

@Component({
  selector: 'app-stocks-treemap',
  templateUrl: './stocks-treemap.component.html',
  styleUrls: ['./stocks-treemap.component.css']
})
export class StocksTreemapComponent implements OnInit {
  technicals: any;
  @Input() params = { "display": "symbol", "changeField": "priceChange", "changePctField": "priceChangePct" }
  @Input() symbols;
  @Output() public onSymbolClicked = new EventEmitter();

  constructor(private liveService: LiveService) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.technicals = [];
    if (changes.symbols != null && this.symbols != null && this.symbols.length > 0) {
      this.liveService.getTechnicals(this.symbols).subscribe(d => {
        this.technicals = d;
        this.technicals.sort((a, b) => (a[this.params.changePctField] > b[this.params.changePctField]) ? -1 : 1);
      });
    }
  }

  getHeatCls(row) {
    let chgField = row[this.params.changePctField];
    let classes = {
      'heat-green': chgField > 1.0,
      'heat-light-green': chgField > 0 && chgField <= 1.0,
      'heat-red': chgField <= -2.0,
      'heat-light-red': chgField <= -0.4 && chgField > -2.0,
      'heat-grey': chgField <= 0 && chgField > -0.4
    };
    return classes;
  }

  getDisplayData(row) {
    let tempName = "";
    if (this.params.display == "name") {
      tempName = row.alternate_name;
    }
    else {
      tempName = row.symbol;
    }

    let price = row.price.toFixed(2);
    let change = row[this.params.changeField];
    let changePct = row[this.params.changePctField].toFixed(2);

    return  '<div class="heatSymbol">' + tempName + '</div>' +
            '<div>$' + price + '</div>' +
            '<div class="heatChange">$' + change + 
              '(' + changePct + '%)' + 
            '</div>';
  }

  clickSymbol(symbol) {
    this.onSymbolClicked.emit({
      value: symbol
    })
  }

}
