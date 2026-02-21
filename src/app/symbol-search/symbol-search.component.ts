import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-symbol-search',
  templateUrl: './symbol-search.component.html',
  styleUrls: ['./symbol-search.component.scss'],
})
export class SymbolSearchComponent implements OnInit {
  // getting
  searchText = '';
  timer;
  polyError = '';

  // showing
  svDbItems = [];
  feedApiItems = [];

  // editing
  displaySymbolDetailsDialog = false;
  targetSymbol = '';
  yahooError = '';

  // saving
  symbolDetails: any = undefined;
  symbol_data = {};
  assets = [];
  sectors = [];
  industries = [];
  emailSentMessage = '';

  constructor(
    private liveService: LiveService,
    private route: ActivatedRoute,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const searchText = params['searchText'];
      if (searchText) {
        this.searchText = searchText;
        this.onSearchTextKeyUp();
      }
    });
  }

  onSearchTextKeyUp() {
    if (this.searchText != '') {
      this.searchText = this.searchText.toUpperCase();
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => {
        this.handleServerRequest();
      }, 500);
    }
  }

  handleServerRequest() {
    this.polyError = '';
    this.svDbItems = [];
    this.feedApiItems = [];
    const dbSearchObs = this.liveService.getUrlData('/search/' + this.searchText);
    const webSearchObs = this.liveService.getUrlData('/search_live/' + this.searchText);

    forkJoin([dbSearchObs, webSearchObs]).subscribe(([dbRes, webRes]: any[]) => {
      // handle db responnse
      this.svDbItems = dbRes.slice(0, 7);

      // handle poly response
      if (webRes && webRes['status'] == 'ok') {
        const webItems = webRes['data'];

        // remove sv items from poly items
        const symbolsInSvDb = new Set(this.svDbItems.map(item => item.symbol));
        const feedItemsFiltered = webItems.filter(item => !symbolsInSvDb.has(item.ticker));

        this.feedApiItems = feedItemsFiltered;
      } else {
        this.polyError = webRes['data'];
      }
    });
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  onAddSymbolClick(symbol) {
    this.displaySymbolDetailsDialog = true;
    this.targetSymbol = symbol;
    this.clearState();

    this.liveService.getUrlData('/symbol_search_yahoo/' + this.targetSymbol).subscribe(res => {
      if ('error' in res) {
        this.yahooError = "We could not find the symbold details.";
        return;
      }

      this.symbol_data = res['symbol_data'];
      const company_profile_options = res['company_profile_options'];
      this.assets = company_profile_options['assets'];
      this.sectors = company_profile_options['sectors'];
      this.industries = company_profile_options['industries'];

      this.prepareSymbolDetailsForSaving();
    });
  }

  prepareSymbolDetailsForSaving() {
    const asset = this.assets.find(asset => asset.name == this.symbol_data['asset']) || {};
    const sector = this.sectors.find(sector => sector.name == this.symbol_data['sector']) || {};
    const industry = this.industries.find(industry => industry.name == this.symbol_data['industry']) || {};

    this.symbolDetails = {
      symbol: this.symbol_data['symbol'],
      symbol_p: this.symbol_data['symbol'],
      alternate_name: this.symbol_data['alternate_name'],
      companyname: this.symbol_data['companyname'],
      exchange: this.symbol_data['exchange'],
      assetid: asset?.id,
      industryid: industry?.id,
      sectorid: sector?.id,
      source: 'poly',
      isactive: 1,
      isnew: 1,
    };
  }

  onDialogCancelClick() {
    this.displaySymbolDetailsDialog = false;
    this.clearState();
    this.targetSymbol = '';
  }

  onDialogSaveClick() {
    this.displaySymbolDetailsDialog = false;
    this.targetSymbol = '';
  }

  clearState() {
    this.yahooError = '';
    this.polyError = '';
    this.symbol_data = undefined;
    this.symbolDetails = undefined;
    this.emailSentMessage = '';
  }

  onInputChange(event) {

  }

  onSaveSymbolDetails() {
    this.liveService.postRequest('/symbol/details/upsert', this.symbolDetails).subscribe(res => {
      this.clearState();
      this.displaySymbolDetailsDialog = false;
      this.handleServerRequest();
    });
  }

  sendEmail() {
    this.liveService.postRequest('/user-request-symbol', this.targetSymbol).subscribe(d => {
      this.emailSentMessage = "Email has been sent to support team.";
    });
  }
}
