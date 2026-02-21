import { Injectable } from '@angular/core';
import { LiveService } from '../services/live.service';

@Injectable({
  providedIn: 'root'
})
export class PlaidService {
  constructor(private liveService: LiveService) { }

  plaidCreateLinkToken() {
    return this.liveService.postRequest('/plaid/create_link_token', {});
  }

  plaidGetAndSaveAccessTokenForUserAccounts(plaidMetaData) {
    return this.liveService.postRequest('/plaid/set_access_token', plaidMetaData);
  }

  getUserLinkedAccounts() {
    return this.liveService.getDataInArray('/plaid/get_linked_user_accounts');
  }

  getHoldingsForUserAccount(accountId) {
    return this.liveService.postRequest('/plaid/get_user_account_holdings', {account_id: accountId});
  }

  getTransactionsForUserAccount(accountId) {
    return this.liveService.postRequest('/plaid/get_user_account_transactions', {account_id: accountId});
  }
}
