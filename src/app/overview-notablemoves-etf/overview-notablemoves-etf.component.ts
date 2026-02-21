import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';

@Component({
  selector: 'app-overview-notablemoves-etf',
  templateUrl: './overview-notablemoves-etf.component.html',
  styleUrls: ['./overview-notablemoves-etf.component.scss'],
})
export class OverviewNotablemovesEtfComponent implements OnInit {
  notableMoveData: Object;
  selectedNotable: Object;
  selectedSymbol;
  symbols = [];
  symbolsTechnicalData;
  activeRowName;

  constructor(private liveService: LiveService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['overview'] },
      { label: 'Movers', routerLink: ['movers'] },
    ]);
  } // TODO: There a too many calls for tecnical data inside the bar chart. Get a bar chart without live service.

  setMyClasses(value) {
    let classes = {
      'up-background': value == 1,
      'down-background': value == -1,
    };
    return classes;
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.liveService.getNotableMovesETF().subscribe(res => this.setNotableMoves(res));
  }
  setNotableMoves(data) {
    this.notableMoveData = data;
    this.showNotableMoves({ typeid: data[0].typeid, name: data[0].name });
    this.selectedNotable = data[0].name;
  }

  showNotableMoves(row) {
    this.symbols = [];
    this.symbolsTechnicalData = undefined;
    this.selectedSymbol = undefined;
    this.selectedNotable = row;
    this.liveService.getNotableMoveSymbolsETF(row.typeid).subscribe(d => {
      this.setSymbols(d);
      this.activeRowName = row.name;
    });
  }

  setSymbols(d) {
    if (d) {
      this.symbols = d;
      this.selectedSymbol = d[0];
      this.liveService.getTechnicals(this.symbols).subscribe(d => (this.symbolsTechnicalData = d));
    } else {
      this.symbols = [];
      this.symbolsTechnicalData = undefined;
      this.selectedSymbol = undefined;
    }
  }

  symbolSelected(event) {
    this.selectedSymbol = event.value;
  }
}
