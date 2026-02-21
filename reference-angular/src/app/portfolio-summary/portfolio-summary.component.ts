import { Component, Input, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-portfolio-summary',
  templateUrl: './portfolio-summary.component.html',
  styleUrls: ['./portfolio-summary.component.scss'],
})
export class PortfolioSummaryComponent implements OnInit {
  @Input() portfolioType = 'user';
  @Input() listURL = '';

  portfolioData;
  updatedAt = '';
  clickedPortfolio = '';

  constructor(private liveService: LiveService, private router: Router,) {}

  ngOnInit(): void {
    this.liveService.getUrlData(this.listURL).subscribe(d => {
      this.portfolioData = d["port_summ"];
      this.updatedAt = d["updated_at"]
    });
  }

  onPortfolioNameClick(portfolio) {
    this.clickedPortfolio = portfolio;
    const url = `/portfolioscombined/${this.portfolioType}/${portfolio.portfolioid}`;
    this.router.navigate([url]);
  }
}
