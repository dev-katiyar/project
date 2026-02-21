import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-edit-snapshot-portfolio',
  templateUrl: './edit-snapshot-portfolio.component.html',
  styleUrls: ['./edit-snapshot-portfolio.component.scss']
})
export class EditSnapshotPortfolioComponent implements OnInit {

  @Input('editPortfolio') selectedPortfolio = null;
  selectedPortfolioTransactions = [];

  @Output('editPortfolioCancelClick') public editPortfolioCancelClick = new EventEmitter();
  @Output('editPortfolioSaveClick') public editPortfolioSaveClick = new EventEmitter();

  constructor(private liveService: LiveService, private messageService: MessageService,) { }

  showMessage(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1000 });
  }

  ngOnInit(): void {
    if (this.selectedPortfolio) {
      this.getPortfolioData();
    }
  }

  getPortfolioData() {
    this.liveService.getUrlData("/userportfolio/" + this.selectedPortfolio.id).subscribe(d => this.setPortfolioData(d));
  }

  setPortfolioData(d) {
    if (d) {
      this.selectedPortfolioTransactions = d['transactions'];
    }
  }

  onEditPortfolioCancelClick() {
    this.editPortfolioCancelClick.emit();
  }

  onEditPortfolioSaveClick() {
    if (this.selectedPortfolio.name == "") {
      this.showMessage({ "status": "error", "message": "Please enter valid name" });
    }
    else {
      let validMsg = "";
      for (let txn of this.selectedPortfolioTransactions) {
        validMsg = this.validateEditedTransaction(txn);
        if (validMsg != "") {
          this.showMessage({ "status": "error", "message": validMsg });
          break;
        }
      }
      if (validMsg == "") {
        this.liveService.postRequest("/userportfolio", {
          "action": "update",
          "name": this.selectedPortfolio.name,
          "portfolio_id": this.selectedPortfolio.id
        }).subscribe(d => this.saveEditedTransactions());
      }
    }
  }

  saveEditedTransactions() {
    this.liveService.postRequest("/userPortfolio/" + this.selectedPortfolio.id, { 
      "action": 'update', 
      "data": this.selectedPortfolioTransactions 
    }).subscribe(d => {
      this.editPortfolioSaveClick.emit({value: this.selectedPortfolio});
      this.showMessage({ "status": "status", "message": "Edits to portfolio saved." });
    });
  }

  validateEditedTransaction(txn) {
    if (txn.qty == 0 || isNaN(txn.qty)) {
      return "Quanity is not valid for some trade.";
    }
    else if (Number(txn.cost_basis) == 0) {
      return "Cost basis is not valid for some trade.";
    }
    else {
      return "";
    }
  }

  onDeleteTransactionClick(transaction) {
    this.selectedPortfolioTransactions.splice(this.selectedPortfolioTransactions.indexOf(transaction), 1);
  }
}
