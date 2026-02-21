import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-manage-portfolios',
  templateUrl: './manage-portfolios.component.html',
  styleUrls: ['./manage-portfolios.component.scss']
})
export class ManagePortfoliosComponent implements OnInit {

  @Input('isSnapPortfolio') isSnapPortfolio = false; 
  @Input('isAdminUser') isAdminUser = 0;
  @Input('portfolios') portfolios = [];
  @Input('title') title = 'Portfolio'
  @Output('backFromManagePortfoliosClick') backFromManagePortfoliosClick = new EventEmitter();
  @Output('createPortfolioClick') createPortfolioClick = new EventEmitter();
  @Output('deletePortfolioClick') deletePortfolioClick = new EventEmitter();
  @Output('editPortfolioClick') editPortfolioClick = new EventEmitter();
  @Output('closePositionsClick') closePositionsClick = new EventEmitter();
  @Output('nameClick') nameClick = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

  onBackFromManagePortfoliosClick() {
    this.backFromManagePortfoliosClick.emit();
  }

  onImportPortfolioClick() {
    // TODO: to be implemented, if import button retained. 
  }

  onCreatePortfolioClick() {
    this.createPortfolioClick.emit();
  }

  onDeletePortfolioClick(portfolio) {
    this.deletePortfolioClick.emit(portfolio);
  }

  onEditPortfolioClick(portfolio) {
    this.editPortfolioClick.emit(portfolio);
  }

  onClosePositionsClick(portfolio) {
    this.closePositionsClick.emit(portfolio);
  }

  onNameClick(portfolio) {
    this.nameClick.emit(portfolio);
  }

}
