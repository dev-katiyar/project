import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-trade-landing-page',
  templateUrl: './trade-landing-page.component.html',
  styleUrls: ['./trade-landing-page.component.css']
})
export class TradeLandingPageComponent implements OnInit {

  baseLink ="https://portal.tradingfront.com/riaadvisors/client/questionnaire/welcome?questionnaireToken"
  cashAlternativeLink =`${this.baseLink}=de6570e600ad61a4ebf931039e324490`
  constructor() { }

  ngOnInit(): void {
  }

}
