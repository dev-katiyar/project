import { Component, OnInit, Input, SimpleChanges, SimpleChange, Output, EventEmitter } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'chart-sector-heatmap',
  templateUrl: './chart-sector-heatmap.component.html',
  styleUrls: ['./chart-sector-heatmap.component.css']
})
export class ChartSectorHeatmapComponent implements OnInit {

  title = "Sector HeatMap";
  dataList = [];
  technicals: any;

  @Input() columnCount = 6;
  @Input() symbols;
  @Output() public onSymbolClicked = new EventEmitter();

  constructor(private liveService: LiveService) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbols != null && this.symbols.length > 0) {
      this.liveService.getTechnicals(this.symbols).subscribe(d => this.setTechnicalData(d));
    }
  }

  setTechnicalData(data) {
    data.sort((a, b) => (a.priceChangePct > b.priceChangePct) ? -1 : 1);
    this.technicals = data;
  }

  getHeatCls(row) {
    let classes = {
      'heat-green': row.priceChangePct > 1.0,
      'heat-light-green': row.priceChangePct > 0 && row.priceChangePct <= 1.0,
      'heat-red': row.priceChangePct <= -2.0,
      'heat-light-red': row.priceChangePct <= -0.4 && row.priceChangePct > -2.0,
      'heat-grey': row.priceChangePct <= 0 && row.priceChangePct > -0.4
    };
    return classes;
  }

  getDisplayData(row) {
    //  return "<font size='2px'>" + row.symbol
    //                 +"<font size='2px'>"  +"<br/>"+ row.priceChangePct +"%" +"</font> </div>";
    return "<div>" + row.symbol + "</div>" + "<div>" + row.priceChangePct + "%</div>";
  }

  clickSymbol(symbol) {
    this.onSymbolClicked.emit({
      value: symbol
    })
  }

}
