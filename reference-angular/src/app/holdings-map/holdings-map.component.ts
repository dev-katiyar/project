import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-holdings-map',
  templateUrl: './holdings-map.component.html',
  styleUrls: ['./holdings-map.component.scss'],
})
export class HoldingsMapComponent implements OnInit {
  mapCateogries;
  selectedMapCategory;
  selectedSubCategory;

  categoryData;

  showMarketXRay = false;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService
      .getUrlData('/symbol/holding-maps-categories')
      .subscribe(d => this.setHoldingMapCategories(d));
  }

  setHoldingMapCategories(categories) {
    this.mapCateogries = categories ? categories : [];
    this.selectedMapCategory = this.mapCateogries.length > 0 ? this.mapCateogries[0] : null;
    this.selectedSubCategory = this.selectedMapCategory.children[0];
    this.onSubCategoryChange();
  }

  onMapCategoryChange(mCat) {
    this.categoryData = null;
    this.selectedSubCategory = null;
    this.selectedMapCategory = mCat;
    if(this.selectedMapCategory.id == 'market_xray') {
      this.showMarketXRay = true;
    } else  {
      this.showMarketXRay = false;
      this.selectedSubCategory = this.selectedMapCategory.children[0];
      this.onSubCategoryChange();
    }
  }

  onSubCategoryChange() {
    // TODO: Optimization Required

    if (this.selectedSubCategory.id == 'SandP500') {
      this.getSPYData();
    }

    if (this.selectedSubCategory.id == 'Nasdaq100') {
      this.getNasdaqData();
    }

    if(['sv_portfolios', 'sv_portfolios_thematic', 'user_portfolios'].includes(this.selectedMapCategory.id)) {
      this.getPortfolioData(this.selectedSubCategory.id);
    }

    
  }

  getSPYData() {
    this.liveService.getUrlData('/symbol/spytreemap').subscribe(res => {
      if(res) {
        const spyData = {};
        spyData['rawData'] = res;
        spyData['nameColumn'] = 'symbol';
        spyData['valColumn'] = 'priceChangePct';
        spyData['parentColumn'] = 'sectorName';
        spyData['sizeColumn'] = 'marketCap';
        this.categoryData = spyData;
      }
    });
  }

  getNasdaqData() {
    this.liveService.getUrlData('/symbol/nasdaqtreemap').subscribe(res => {
      if(res) {
        const nasdaqData = {};
        nasdaqData['rawData'] = res;
        nasdaqData['nameColumn'] = 'symbol';
        nasdaqData['valColumn'] = 'priceChangePct';
        nasdaqData['parentColumn'] = 'sectorName';
        nasdaqData['sizeColumn'] = 'marketCap';
        this.categoryData = nasdaqData;
      }
    });
  }

  getPortfolioData(portfolio_id) {
    this.liveService.getUrlData('/modelportfolio/holdingmap/' + portfolio_id).subscribe(res => {
      if(res) {
        const nasdaqData = {};
        nasdaqData['rawData'] = res;
        nasdaqData['nameColumn'] = 'symbol';
        nasdaqData['valColumn'] = 'priceChangePct';
        nasdaqData['parentColumn'] = 'sectorName';
        nasdaqData['sizeColumn'] = 'marketValue';
        this.categoryData = nasdaqData;
      }
    });
  }
}
