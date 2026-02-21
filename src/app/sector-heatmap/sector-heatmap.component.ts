import { Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange, Output, EventEmitter } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-sector-heatmap',
  templateUrl: './sector-heatmap.component.html',
  styleUrls: ['./sector-heatmap.component.css']
})
export class SectorHeatmapComponent implements OnInit {

  data: Object;
  @Input() symbols: Object;
  @Output() public onSymbolClicked = new EventEmitter();

  constructor(private liveService: LiveService) { }

  ngOnInit() {
    this.liveService.getSectorIndustryMapping().subscribe(d => this.data = d);
  }

  getHeatCls(row) {
    let classes = {
      'heat-green': row.rating >= 9,
      'heat-light-green': row.rating >= 5 && row.rating <= 8,
      'heat-red': row.rating <= 2,
      'heat-grey': row.rating >= 3 && row.rating <= 4
    };
    return classes;
  }

  getDisplayString(text) {
    return text.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  clickSymbol(symbol, type, name) {
    this.onSymbolClicked.emit({
      value: { "symbol": symbol, "type": type, "name": type + ":" + name }
    });
  }

}
