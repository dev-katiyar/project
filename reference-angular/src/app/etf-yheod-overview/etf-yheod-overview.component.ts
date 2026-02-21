import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { Observable, forkJoin } from 'rxjs';
import { TechnicalService } from '../services/technical.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-etf-yheod-overview',
  templateUrl: './etf-yheod-overview.component.html',
  styleUrls: ['./etf-yheod-overview.component.scss'],
})
export class EtfYheodOverviewComponent implements OnInit, OnChanges {
  @Input('symbol') currentSymbol = 'SPY';

  // in case no data from server
  isServerResonseNull = false;

  fundOverview;

  fundAssetAllocation;
  fundSectorAllocation;
  fundHoldings;
  fundTop10Hioldings;

  // to color code the return tiles
  maxAbsReturn = 0;

  constructor(
    private liveService: LiveService,
    private technicalService: TechnicalService,
    private symbolPopupService: SymbolPopupService,
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.currentSymbol) {
      this.loadData();
    }
  }

  loadData() {
    this.isServerResonseNull = false;
    this.fundOverview = null;
    if (this.currentSymbol != '') {
      let eodDataObs = this.liveService.getUrlData('/eod/fundamentals/' + this.currentSymbol);
      let yahooDataObs = this.liveService.getUrlData(
        '/symbol/etf_yh_overview/' + this.currentSymbol,
      );
      let techDataObs = this.liveService.getTechnicals([this.currentSymbol]);

      forkJoin([eodDataObs, yahooDataObs, techDataObs]).subscribe(result => {
        let eodData = result[0][this.currentSymbol];
        let yahooData = result[1];
        let techData = (result[2] as any[]).length > 0 ? result[2][0] : {};
        if (
          this.checkType(eodData) !== 'string' &&
          !this.isEmpty(yahooData) &&
          !this.isEmpty(techData)
        ) {
          this.fundOverview = { ...eodData, ...yahooData, tech: techData };

          this.setMinMaxOfReturns(this.fundOverview?.tech);
          this.setFundAssetAllocation(this.fundOverview?.ETF_Data?.Asset_Allocation);
          this.setFundSetorAllocation(this.fundOverview?.ETF_Data?.Sector_Weights);
          this.setFundHoldings(this.fundOverview?.ETF_Data?.Holdings);
          this.setTop10FundHoldings(this.fundOverview?.ETF_Data?.Top_10_Holdings)
          this.setTimeStampToJSDate(this.fundOverview);
        } else {
          this.isServerResonseNull = true;
        }
      });
    }
  }

  setMinMaxOfReturns(tech) {
    if (tech && !this.isEmpty(tech)) {
      // adding gains data from caclulated technicals
      const returnsArr = [];
      returnsArr.push(tech['wtd']);
      returnsArr.push(tech['mtd']);
      returnsArr.push(tech['qtd']);
      returnsArr.push(tech['ytd']);
      returnsArr.push(tech['change_oneyearbeforedate_pct']);
      returnsArr.push(tech['priceChange2Year']);
      returnsArr.push(tech['priceChange3Year']);
      const minReturn = Math.min(...returnsArr);
      const maxReturn = Math.max(...returnsArr);

      this.maxAbsReturn = Math.max(Math.abs(minReturn), Math.abs(maxReturn));
    }
  }

  setFundAssetAllocation(assetAllocation) {
    this.fundAssetAllocation = [];
    if(assetAllocation && !this.isEmpty(assetAllocation)) {
      for(let [key, val] of Object.entries(assetAllocation)) {
        this.fundAssetAllocation.push(
          {
            name: key,
            percentage: parseFloat(val["Long_%"])
          }
        );
      }
    }
  }

  setFundSetorAllocation(sectorAllocation) {
    this.fundSectorAllocation = [];
    if(sectorAllocation && !this.isEmpty(sectorAllocation)) {
      for(let [key, val] of Object.entries(sectorAllocation)) {
        this.fundSectorAllocation.push(
          {
            name: key,
            percentage: parseFloat(val["Relative_to_Category"])
          }
        );
      }
    }
  }

  setFundHoldings(holdings) {
    this.fundHoldings = null;
    if (holdings && !this.isEmpty(holdings)) {
      this.fundHoldings = Object.values(holdings);
    }
  }

  setTop10FundHoldings(top10Holdings) {
    this.fundTop10Hioldings = [];
    let top10Total = 0;
    if(top10Holdings && !this.isEmpty(top10Holdings)) {
      for(let [key, val] of Object.entries(top10Holdings)) {
        let pctVal = parseFloat(val["Assets_%"])
        top10Total+= pctVal;
        this.fundTop10Hioldings.push(
          {
            name: val["Code"],
            percentage: pctVal
          }
        );
      }

      this.fundTop10Hioldings.push({
        name: 'Others',
        percentage: 100 - top10Total
      });
    }
  }

  setTimeStampToJSDate(fundOverview) {
    if (
      'price' in fundOverview 
      && 'regularMarketTime' in fundOverview.price 
      && !this.isNA(fundOverview.price['regularMarketTime'])
    ) {
      // coverting time stamp to js date time
      fundOverview.price['regularMarketTime'] = new Date(fundOverview.price['regularMarketTime'] * 1000);
    }
  }

  getTileStyle(value) {
    const scoreStyle = {};

    let startColor;
    let endColor;

    // green
    if (value >= 0) {
      startColor = [0, 10, 0];
      endColor = [0, 255, 0];
    }

    // red
    if (value < 0) {
      startColor = [10, 0, 0];
      endColor = [255, 0, 0];
    }

    const gradColor = this.technicalService.getRGBColorPercentage(
      startColor,
      endColor,
      Math.abs(value / this.maxAbsReturn),
    );

    scoreStyle['background-color'] = gradColor;
    return scoreStyle;
  }

  checkType(value) {
    if (typeof value === 'string' || value instanceof String) {
      return 'string';
    } else if (value !== null && typeof value === 'object') {
      return 'object';
    } else {
      return 'other';
    }
  }

  isEmpty(obj) {
    return Object.entries(obj).length === 0;
  }

  isNA(val) {
    if (val === undefined || val === null) {
      return false;
    }
    if (typeof val === 'number' || Object.prototype.toString.call(val) === '[object Date]') {
      return false;
    } else {
      return this.isEmpty(val);
    }
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
