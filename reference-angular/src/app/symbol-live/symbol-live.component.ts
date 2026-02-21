import {LiveService} from '../services/live.service';
import {Component, OnInit, Output, Input, EventEmitter, OnChanges, SimpleChanges, SimpleChange} from '@angular/core';
import { Router } from '@angular/router';
import {TechnicalService} from '../services/technical.service';

@Component({
  selector: 'app-symbol-live',
  templateUrl: './symbol-live.component.html',
  styleUrls: ['./symbol-live.component.css']
})
export class SymbolLiveComponent implements OnInit {

  @Input() symbols;
  @Output() public onRecommendedSymbolSelected = new EventEmitter();
  recommendedSymbolDetails = [];

  constructor(private liveService: LiveService,private router: Router,private technicalService:TechnicalService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.symbols){
    this.liveService.getUrlData('/symbol/live/' + this.symbols).subscribe(d => this.setRecommendedSymbolDetails(d));
    }
  }

  setRecommendedSymbolDetails(d){
      for (const [key, value] of Object.entries(d)) {
          this.recommendedSymbolDetails.push(value);
          }
    }

    recommendedSymbolClicked(symbol){
        this.onRecommendedSymbolSelected.emit({
                value: symbol
            });
    }
}
