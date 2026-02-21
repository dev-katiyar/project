import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-super-investor',
  templateUrl: './super-investor.component.html',
  styleUrls: ['./super-investor.component.scss'],
})
export class SuperInvestorComponent implements OnInit {
  investors: any;
  selectedInvestor: any;
  holdings: any;
  sectorDistribution: any[];
  routeInvestorCode: string;

  constructor(private liveService: LiveService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get the code parameter from the route
    this.route.params.subscribe(params => {
      if (params['code']) {
        this.routeInvestorCode = params['code'];
      }
    });

    this.liveService.getUrlData('/super-investors').subscribe(d => this.fillDropdown(d));
  }

  fillDropdown(supInvestors) {
    if (supInvestors && supInvestors.length > 0) {
      this.investors = supInvestors;

      // set the default portfolio in dropdown, if code found in the route param
      if (this.routeInvestorCode) {
        const investor = this.investors?.find(inv => inv.code === this.routeInvestorCode);
        if (investor) {
          this.selectedInvestor = investor;
        }
      } else {
        this.selectedInvestor = this.investors[0];
      }
    }
  }
}
