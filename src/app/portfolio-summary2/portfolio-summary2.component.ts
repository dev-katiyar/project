import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-portfolio-summary2',
  templateUrl: './portfolio-summary2.component.html',
  styleUrls: ['./portfolio-summary2.component.scss'],
})
export class PortfolioSummary2Component implements OnInit {
  @Input() portfolioType = 'user';  // needed for new portfolio creation
  @Input() selectedPortfolio;
  @Input() isMinimalView = false;
  @Input() portfolioSummData;
  @Output() portfolioClick = new EventEmitter();
  @Output() newPortfolioCancelled = new EventEmitter();
  @Output() newPortfolioCreated = new EventEmitter();

   // create new portfolio
   @Input() showCreatePortfolio = false;
   createPortfolioError: any;
   createPortfolioName;
   createPortfolioStartingCash;

   constructor(
    private liveService: LiveService,
    private messageService: MessageService,
    ) {}

  ngOnInit(): void {}

  onPortfolioRowClick(portfolio) {
    // the user of this component can set mininal view and highlight the selected row
    this.selectedPortfolio = portfolio;
    this.portfolioClick.emit(portfolio);
  }

  onNewPortfolioClick() {
    this.showCreatePortfolio = true;
  }

  onCancelCreatePortfolioClick() {
    this.showCreatePortfolio = false;
    this.newPortfolioCancelled.emit(); 
  }

  onCreatePortfolioClick() {
    // client side validation
    const err = this.validatePortfolioForSave();

    if (err) {
      this.createPortfolioError = err;
      return;
    }

    // save only if valid
    const port_data = {
      name: this.createPortfolioName,
      startingCash: this.createPortfolioStartingCash,
      type: this.portfolioType,
    };

    this.liveService
      .postRequest('/modelportfolio/create', port_data)
      .subscribe(d => {
        // server side validation or issue can also send error, means failure
        if (d && d.hasOwnProperty('error')) {
          this.createPortfolioError = d['error'];
        } else {
          this.showCreatePortfolio = false;
          this.createPortfolioError = '';
          this.messageService.add({
            severity: 'success',
            summary: 'Portfolio Created',
            detail: 'A new portfolio has been created successfully',
          });

          this.newPortfolioCreated.emit(d); // portfolio id newly created
        }
      });
  }

  // validates name and cash for edited or new portfolio
  validatePortfolioForSave() {
    const name = this.createPortfolioName;
    const cash = this.createPortfolioStartingCash;

    // name checks
    if (!name || name == '') {
      return 'Portfolio name cannot be empty.';
    }

    if (this.portfolioSummData.some(p => p.name == name)) {
      return 'Portfolio with this name already exists.';
    }

    // cash checks
    if (cash == 0 || isNaN(cash) || cash <= 0) {
      return 'Invalid cash.';
    }

    return '';
  }
}
