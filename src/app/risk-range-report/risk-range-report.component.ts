import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-risk-range-report',
  templateUrl: './risk-range-report.component.html',
  styleUrls: ['./risk-range-report.component.scss'],
})
export class RiskRangeReportComponent implements OnInit {
  // output reated
  riskRangeSymArr = [];

  // error in UI
  error = '';

  // holdings related
  selectedETF;
  riskRangeEtfHoldingsArr;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    // TODO: if there is just one set of symnbols, then we can use symbols from backend directly.
    this.liveService.postRequest('/get-symbols2', { categories: ['RiskRange'] }).subscribe(res => {
      if (res['status'] == 'ok') {
        this.riskRangeSymArr = res['data']['RiskRange'];
        this.error = '';
      } else {
        this.error = 'Could not load the symbols. Please contact support: contact@simplevisor.com';
      }
    });
  }

    // ETF Holdings Related
    onSymbolRowClick(etfRow) {
      this.handleCloseETFTab("");
      this.selectedETF = etfRow;
      const symbol = etfRow['symbol'];
      this.liveService.getUrlData('/etf/holdings/' + symbol).subscribe(res => {
        if (res) {
          let holdingArr = res as any[];
          // convert into object array expected by view
          for(let [index, holding] of holdingArr.entries()) {
            holding['category'] = "Holdings";
            holding['subCategory'] = "Holdings";
            holding['sortOrder'] = index+1;
          }

          // add row for reference IVV
          const ivv = {
            "category": "RiskRange",
            "name": "ISHARS-SP500",
            "sortOrder": 0,
            "subCategory": "Reference Index",
            "symbol": "IVV"
          };
          holdingArr.unshift(ivv);

          this.riskRangeEtfHoldingsArr = holdingArr;
        } else {
          this.error = 'Could not load the ETF holdings. Please contact support: contact@simplevisor.com';
        }
      });
    }

  handleCloseETFTab(event) {
    this.selectedETF = null;
    this.riskRangeEtfHoldingsArr = [];
  }
}
