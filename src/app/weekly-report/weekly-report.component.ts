import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-weekly-report',
  templateUrl: './weekly-report.component.html',
  styleUrls: ['./weekly-report.component.scss'],
})
export class WeeklyReportComponent implements OnInit {
  constructor(private liveService: LiveService) {}

  weeklyReportData;
  barChartSeriesConfig1 = [
    {
      seriesName: 'Change (%)',
      xCol: 'name',
      xColName: 'symbol',
      yCol: 'week_chg',
      clickEventCol: 'symbol',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      sortByCol: 'week_chg',
    },
  ];
  barChartSeriesConfig2 = [
    {
      seriesName: 'Change (%)',
      xCol: 'symbol',
      xColName: 'name',
      yCol: 'week_chg',
      clickEventCol: 'symbol',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
      sortByCol: 'week_chg',
    },
  ];
  isData = true;
  yAxisTitle = 'Weekly Price Change (%)';

  raHeatMapData = [];
  raHeatMapConfig = {
    xCol: 'sectorSymbol',
    yCol: 'score',
    xColName: 'sectorName',
    yColFormat: 'decimal',
    clickEventCol: 'sectorSymbol',
  };

  sectorSymbolsDict = {
    XLP: 'Consumer Staples',
    XLB: 'Materials',
    XLRE: 'Real Estate',
    XLE: 'Energy',
    XLU: 'Utilities',
    XLV: 'Health Care',
    XTN: 'Transportation',
    XLI: 'Industrials',
    XLK: 'Technology',
    XLF: 'Financial',
    XLY: 'Consumer Discretionary',
    XLC: 'Communication Services',
  };

  ngOnInit(): void {
    this.getWeeklyReportData();
  }

  getWeeklyReportData() {
    this.liveService.getUrlData('/weekly_report').subscribe(d => {
      this.weeklyReportData = d;
      if (Object.keys(this.weeklyReportData).length == 0) {
        this.isData = false;
      } else {
        this.transformAndExtractForReport();
      }
    });
  }

  transformAndExtractForReport() {
    if (this.weeklyReportData['date']) {
      this.setReportPeriod();
    }
    if (this.weeklyReportData['ra_sectors']) {
      this.setHeatMapData(this.weeklyReportData?.ra_sectors);
    }
    if (this.weeklyReportData['world_indices']) {
      this.setTrendAndMaxMin(this.weeklyReportData.world_indices);
    }
    if (this.weeklyReportData['us_indices_symbols']) {
      this.setTrendAndMaxMin(this.weeklyReportData.us_indices_symbols);
    }
    if (this.weeklyReportData['sectors']) {
      this.setTrendAndMaxMin(this.weeklyReportData.sectors);
    }
    if (this.weeklyReportData['snp_top_mcap']) {
      this.setTrendAndMaxMin(this.weeklyReportData.snp_top_mcap);
    }
    // if(this.weeklyReportData["spy_strong_rsi_symbols"]) {
    //   this.setTrendAndMaxMin(this.weeklyReportData.spy_strong_rsi_symbols)
    // }
    // if(this.weeklyReportData["spy_strong_mom_symbols"]) {
    //   this.setTrendAndMaxMin(this.weeklyReportData.spy_strong_mom_symbols)
    // }
    if (this.weeklyReportData['last_week_blogs']) {
      this.weeklyReportData.last_week_blogs.sort((a, b) => (a['date'] > b['date'] ? -1 : 1));
    }
  }

  handleBarClicked(event) {}

  setReportPeriod() {
    const reportDate = new Date(this.weeklyReportData.date + 'T00:00:00');
    let startDate = new Date(this.weeklyReportData.date + 'T00:00:00');
    startDate.setDate(startDate.getDate() - 6);
    startDate = new Date(startDate);
    this.weeklyReportData['report_date'] = reportDate;
    this.weeklyReportData['start_date'] = startDate;
  }

  setTrendAndMaxMin(data: any[]) {
    let posCount: number = 0;
    let negCount: number = 0;
    data.forEach(item => {
      if (item['week_chg'] > 0) posCount++;
      if (item['week_chg'] < 0) negCount++;
    });

    let trend = '';
    let leader = '';
    let mostOrAll = 'Most';
    if (posCount > negCount) {
      trend = 'postive';
      if (posCount > 0) {
        data.sort((a, b) => (a['week_chg'] > b['week_chg'] ? -1 : 1));
        leader = data[0];
      }
      if (posCount === data.length) mostOrAll = 'All';
    }
    if (posCount < negCount) {
      trend = 'negative';
      if (negCount > 0) {
        data.sort((a, b) => (a['week_chg'] > b['week_chg'] ? -1 : 1));
        leader = data[data.length - 1];
      }
      if (negCount === data.length) mostOrAll = 'All';
    }
    data['trend'] = trend;
    data['leader'] = leader;
    data['mostOrAll'] = mostOrAll;
  }

  setHeatMapData(lastRow) {
    this.raHeatMapData = [];
    for (let key in this.sectorSymbolsDict) {
      if (key != 'SPY' && key != 'date') {
        this.raHeatMapData.push({
          sectorSymbol: key,
          sectorName: this.sectorSymbolsDict[key],
          score: lastRow[key + '_SPY_score'],
        });
      }
    }
    this.raHeatMapData.sort((a, b) => a['score'] - b['score']);
  }

  htmlDecode(str: string) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  reportLink = window.location.href;
  copyLink() {
    navigator.clipboard.writeText(this.reportLink).then(() => {
      alert('Link copied to clipboard!');
    });
  }
}
