import { Component, OnInit } from '@angular/core';
import { PlaidService } from '../services/plaid.service';

declare const Plaid: any;

@Component({
  selector: 'app-plaid-container',
  templateUrl: './plaid-container.component.html',
  styleUrls: ['./plaid-container.component.scss'],
})
export class PlaidContainerComponent implements OnInit {
  plaidMessage = '';
  plaidLinkTokenObj;

  plaidHandler: any;

  temp;

  constructor(private plaidService: PlaidService) {}

  ngOnInit(): void {
    this.getPlaidLinkToken();
  }

  getPlaidLinkToken() {
    // Set Up trust and link with Plaid. Grab a Link token to initialize Link
    this.plaidMessage = '';
    this.plaidService.plaidCreateLinkToken().subscribe(res => {
      this.plaidLinkTokenObj = res;
      if (!this.plaidLinkTokenObj.hasOwnProperty('link_token')) {
        this.plaidMessage =
          'Link to Plaid is down. Please contact SimpleVisor Support. Your Name (top right) > Contact Us';
      }
    });
  }

  createPlaidHandlerObj() {
    this.plaidHandler = Plaid.create({
      token: this.plaidLinkTokenObj['link_token'],
      onSuccess: this.onPlaidLinkIntituteSuccess.bind(this),
      onEvent: this.onPlaidLinkInstituteEvent.bind(this),
      onExit: this.onPlaidLinkInstituteExit.bind(this),
    });
    this.plaidHandler.open();
  }

  onPlaidLinkIntituteSuccess(public_token, metadata) {
    this.plaidService.plaidGetAndSaveAccessTokenForUserAccounts(metadata).subscribe(res => {
      this.temp = res;
    });
    // async (publicToken, metadata) => {
    //   await fetch('/api/exchange_public_token', {
    //     method: 'POST',
    //     body: JSON.stringify({ public_token: publicToken }),
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //   });
    //   await getBalance();
    // }
  }

  onPlaidLinkInstituteEvent(eventName, metadata) {}

  onPlaidLinkInstituteExit(error, metadata) {}

  initiatePlaidLinkUI() {
    this.createPlaidHandlerObj();
  }
}
