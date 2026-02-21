import { Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { TechnicalService } from '../../services/technical.service';

@Component({
  selector: 'app-data-table-trends',
  templateUrl: './data-table-trends.component.html',
  styleUrls: ['./data-table-trends.component.css']
})
export class DataTableTrendsComponent implements OnInit {

  @Input() symbols;
  trends: Object;
  
  constructor(private liveService: LiveService, private technicalService: TechnicalService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.symbols != null && this.symbols.length > 0) {
      this.liveService.getTechnicals(this.symbols).subscribe(d => this.trends = d);
    }
  }
  
}
