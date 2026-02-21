import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { PortfolioService } from '../services/portfolio.service';
import { SymbolPopupService } from '../symbol-popup.service';

// Table Row Edit Help for Save: https://stackoverflow.com/questions/74102652/primeng-table-programmatically-handle-row-editing-psaveeditablerow

@Component({
  selector: 'app-edit-transactions',
  templateUrl: './edit-transactions.component.html',
  styleUrls: ['./edit-transactions.component.scss'],
})
export class EditTransactionsComponent implements OnInit {
  // Show Txns and Controls
  @Input() portfolioData;
  @Input() isAdminUser;

  // Edit Related
  @Input() showEditMode = false;
  @Input() clonedTrxns;
  error = '';
  @ViewChild('dt2', { static: false }) table: Table;
  @Output() editingDone = new EventEmitter();

  // Common
  loading = false;

  // For CSV Export
  cols = [
    { field: 'symbol', header: 'Symbol' },
    { field: 'name', header: 'Name' },
    { field: 'side', header: 'Buy/Sell' },
    { field: 'qty', header: 'Total # of Shares' },
    { field: 'date', header: 'Transaction Date' },
    { field: 'price', header: 'Cost Basis' },
    { field: 'commission', header: 'Commission' },
  ];

  constructor(
    private messageService: MessageService,
    private portfolioService: PortfolioService,
    private confirmationService: ConfirmationService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit() {}

  getCommission(transaction) {
    return transaction.commission * transaction.qty;
  }

  getCloseLabel(transaction) {
    if (transaction.side == 'Buy') {
      return 'Sell';
    } else if (transaction.side == 'Sell Short') {
      return 'Buy To Cover';
    } else {
      return '';
    }
  }

  txnEditingDoneClick() {
    this.error = '';
    this.editingDone.emit();
  }

  onRowEditInit(txn) {
    // save original in case of cancel
    this.clonedTrxns[txn.id] = { ...txn };
  }

  onRowEditDelete(txn) {
    this.confirmationService.confirm({
      target: event.target,
      message: 'Are you sure that you want to delete this transaction?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        //confirm action - call backend to delete
        this.deleteSelectedTxn(txn);
      },
      reject: () => {
        //reject action - none
      },
    });
  }

  deleteSelectedTxn(txn) {
    // Check for Cash
    this.error = this.portfolioService.checkEditTransactionsFundingDetails(this.portfolioData);
    if (this.error) {
      this.showMessage({ status: 'error', message: this.error });
      return;
    }

    // check for Holding
    this.error = this.portfolioService.checkDeleteTransactionHoldingDetails(
      txn,
      this.portfolioData,
    );
    if (this.error) {
      this.showMessage({ status: 'error', message: this.error });
      return;
    }

    this.portfolioService
      .deleteTransactionFromPortfolio(this.portfolioData.portfolioDetails.portfolioid, txn)
      .subscribe(
        res => {
          this.portfolioData.transactions = this.portfolioData.transactions.filter(
            t => t.id != txn.id,
          );
          this.showMessage({ status: 'success', message: 'Deleted tranaction from the Portfilio' });
        },
        err => {
          this.error = 'Delete Failed. Server Error. Contact SV Support';
          this.showMessage({
            status: 'error',
            message: 'Delete Failed. Server Error. Contact SV Support.',
          });
        },
      );
  }

  onRowEditSave(txn, htmlTableRowElement) {
    this.loading = true;

    // Basic Details
    this.error = this.portfolioService.checkEditTransactionBasicDetails(txn);
    if (this.error) {
      this.showMessage({ status: 'error', message: this.error });
      return;
    }

    // Check for Cash
    this.error = this.portfolioService.checkEditTransactionsFundingDetails(this.portfolioData);
    if (this.error) {
      this.showMessage({ status: 'error', message: this.error });
      return;
    }

    // Check for Holdings
    this.error = this.portfolioService.checkEditTransactionHoldingDetails(txn, this.portfolioData);
    if (this.error) {
      this.showMessage({ status: 'error', message: this.error });
      return;
    }

    this.portfolioService
      .updateTransactionInPortfolio(this.portfolioData.portfolioDetails.portfolioid, txn)
      .subscribe(
        res => {
          this.showMessage({ status: 'success', message: 'Updated tranaction in the Portfilio' });
          this.table.saveRowEdit(txn, htmlTableRowElement);
        },
        err => {
          this.error = 'Updated Failed. Server Error. Contact SV Support';
          this.showMessage({
            status: 'error',
            message: 'Updated Failed. Server Error. Contact SV Support.',
          });
          this.table.saveRowEdit(txn, htmlTableRowElement);
        },
      );
  }

  onRowEditCancel(txn, ri) {
    // restore original in case of cancel
    this.portfolioData.transactions[ri] = this.clonedTrxns[txn.id];
    delete this.clonedTrxns[txn.id];
  }

  showMessage(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
    this.loading = false;
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
