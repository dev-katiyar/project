import { Component, OnInit, ViewChild } from '@angular/core';
import { LiveService } from '../services/live.service';
import { FactorAnalysisViewComponent } from '../factor-analysis-view/factor-analysis-view.component';

@Component({
  selector: 'app-factor-analysis',
  templateUrl: './factor-analysis.component.html',
  styleUrls: ['./factor-analysis.component.scss'],
})
export class FactorAnalysisComponent implements OnInit {
  // Common
  symbolDictTypes: any = [];
  selectedSymbolDictType: any;
  selectedSymbolsDict = {}; // for quick access of symbol dict
  selectedSymbolsArr = []; // for quick access of symbols array

  // for holdings of selected ETF.
  selectedETF;
  selectedSymbolDictTypeEtf;

  // for custom symbol list
  newCustomSybmol = '';
  customSymbolError = '';
  @ViewChild('faSec') faSecViewComp: FactorAnalysisViewComponent;
  @ViewChild('faEtf') faEtfViewComp: FactorAnalysisViewComponent;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    // Load default dicts - Sector and Factor from DB. Custom from local storage/default
    this.liveService
      .postRequest('/get-symbols', { categories: ['Sector', 'Factor'] })
      .subscribe(res => {
        if ((res['status'] = 'ok')) {
          const category_data = res['data'];
          this.symbolDictTypes = [
            {
              code: 'factor_analysis',
              name: 'Factors',
              dict: category_data['Factor'],
            },
            {
              // remove later if not needed
              code: 'factor_analysis_sector',
              name: 'Sectors',
              dict: category_data['Sector'],
            },
            {
              code: 'factor_analysis_custom',
              name: 'Custom',
              dict: {
                AAPL: 'Apple Inc',
                MSFT: 'Micosoft Corp',
                AMZN: 'Amazon.com Inc',
                NVDA: 'NVIDIA Corp',
                GOOGL: 'Alphabet Inc',
              },
            },
          ];

          this.selectedSymbolDictType = this.symbolDictTypes[0];
          this.loadCustomSymbolsFromUserLocalStore();
          this.setSelectedSymbolDict();
        } else {
          console.error(res['data']);
        }
      });
  }

  onSymbolsDictChange(event) {
    this.selectedSymbolDictType = event.value;
    this.setSelectedSymbolDict();
  }

  setSelectedSymbolDict() {
    this.selectedSymbolsDict = this.selectedSymbolDictType.dict;
    this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
    this.newCustomSybmol = '';
    this.customSymbolError = '';
  }

  // Custom Symbol Related
  onSymbolSelected(event) {
    let dictSize = Object.keys(this.selectedSymbolsDict).length;
    if (dictSize > 10) {
      this.customSymbolError = 'At max 10 symbols.';
    } else {
      this.customSymbolError = '';
      this.selectedSymbolsDict[event.value] = event.name;
      this.faSecViewComp.clearAnalysisDataForCustom();
      this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
      this.newCustomSybmol = '';
    }
  }

  handleCustomSymbolRemove(symbol) {
    let dictSize = Object.keys(this.selectedSymbolsDict).length;
    if (dictSize < 5) {
      this.customSymbolError = 'At least 4 symbols.';
      this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
    } else {
      this.customSymbolError = '';
      delete this.selectedSymbolsDict[symbol];
      this.faSecViewComp.clearAnalysisDataForCustom();
      this.selectedSymbolsArr = this.getCuerrentSymbolsArray();
    }
  }

  loadCustomSymbolsFromUserLocalStore() {
    let customSymbols = JSON.parse(localStorage.getItem('factorAnalysisCustomSymbols'));
    if (customSymbols) {
      const customDictType = this.symbolDictTypes.find(
        obj => obj.code === 'factor_analysis_custom',
      );
      customDictType['dict'] = customSymbols;
    }
  }

  saveCustomSymbolsToUserLocalStore() {
    localStorage.setItem('factorAnalysisCustomSymbols', JSON.stringify(this.selectedSymbolsDict));
  }

  handleLiveDataRefresh() {
    this.saveCustomSymbolsToUserLocalStore();
    this.faSecViewComp.handleLiveDataRefresh();
  }

  // ETF Holdings Related
  onSymbolRowClick(row) {
    this.selectedETF = row;
    this.liveService.getUrlData('/etf/holdings/' + this.selectedETF.symbol).subscribe(res => {
      if (res) {
        const dictType = {
          code: 'factor_analysis_etf_holdings',
          name: 'ETF Holdings',
          dict: this.makeKeyValDict(res)
        }
        this.selectedSymbolDictTypeEtf = dictType;
      } else {
        // this.faEtfViewComp.clearAnalysisDataForCustom()
      }
    });
  }

  makeKeyValDict(res) {
    const dict = {};
    res.forEach(element => {
      dict[element['symbol']] = element['name'];
    });
    return dict;
  }

  handleCloseETFTab(event) {
    this.selectedETF = null;
    this.selectedSymbolDictTypeEtf = null;
  }

  // utility functions
  getCuerrentSymbolsArray() {
    const arr = [];
    for (const [key, value] of Object.entries(this.selectedSymbolsDict)) {
      arr.push(key);
    }
    return arr;
  }
}
