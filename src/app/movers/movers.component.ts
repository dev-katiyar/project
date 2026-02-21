import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-movers',
  templateUrl: './movers.component.html',
  styleUrls: ['./movers.component.scss'],
})
export class MoversComponent implements OnInit {
  // Class of symbols related
  tickerClasses = ['Stocks', 'Sectors', 'ETFs',];
  selectedClass;

  // Notable Move Related
  moves;
  selectedMove;
  selectedMoveSymbols;

  // Sector Symbols Related
  sectors;
  selectedSector;

  // common for all list of symbols
  symbolTechnicals;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    // starts with ETF selected
    this.selectedClass = this.tickerClasses[0];
    this.onTickerClassClick(this.selectedClass);
  }

  onTickerClassClick(tClass) {
    this.selectedClass = tClass;
    this.loadData(tClass);
  }

  loadData(tClass) {
    if (tClass == 'ETFs') {
      this.liveService.getNotableMovesETF().subscribe(res => this.setNotableMoves(res));
    }

    if (tClass == 'Stocks') {
      this.liveService.getNotableMoves().subscribe(res => this.setNotableMoves(res));
    }

    if (tClass == 'Sectors') {
      this.liveService.getUrlData('/symbol/list_type2/4').subscribe(res => this.setSectorMoves(res));
    }
  }

  // Notable Moves Related Helper Functions
  setNotableMoves(data) {
    this.moves = data;
    this.moveTabClicked({ index: 0 });
  }

  // Sector Related Helper Function
  setSectorMoves(data) {
    if(data) {
      this.sectors = data;
      this.selectedSector = this.sectors[0]; // select first sector
      this.moves = [
        {name: 'Top 1 Year', url: '/sector/yearly/'},
        {name: 'Bottom 1 Year', url: '/sector/yearly_bottom/'},
        {name: 'Top 1 Day', url: '/sector/daily_top/'},
        {name: 'Bottom 1 Day', url: '/sector/daily_bottom/'},
      ];
      this.moveTabClicked({index: 0});
    }
  }

  moveTabClicked(selTab) {
    this.cleanMoveData();
    this.selectedMove = this.moves[selTab.index];

    if (this.selectedClass == 'ETFs') {
      this.loadETFSymbols(this.selectedMove);
    }

    if (this.selectedClass == 'Stocks') {
      this.loadStockSymbols(this.selectedMove);
    }

    if (this.selectedClass == 'Sectors') {
      this.loadSectorSymbols(this.selectedMove);
    }
  }

  loadETFSymbols(selCat) {
    this.liveService.getNotableMoveSymbolsETF(selCat.typeid).subscribe(d => {
      this.selectedMoveSymbols = d;
      this.loadTechnicals(this.selectedMoveSymbols);
    });
  }

  loadStockSymbols(selCat) {
    this.liveService.getNotableMoveSymbols(selCat.typeid).subscribe(d => {
      this.selectedMoveSymbols = d;
      this.loadTechnicals(this.selectedMoveSymbols);
    });
  }

  loadSectorSymbols(selCat) {
    this.liveService.getUrlData(selCat['url'] + this.selectedSector.symbol).subscribe(d => {
      this.selectedMoveSymbols = d;
      this.loadTechnicals(this.selectedMoveSymbols);
    });
  }

  loadTechnicals(symbols) {
    this.liveService.getTechnicals(symbols).subscribe(d => this.symbolTechnicals = d);
  }

  cleanMoveData() {
    this.selectedMoveSymbols = null;
    this.symbolTechnicals = null;
  }

  onSectorChange() {
    this.moveTabClicked({index: 0});
  }
}
