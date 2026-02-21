import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ChartUtils } from '../utils/chart.utils';

@Component({
  selector: 'app-credit-spread-report',
  templateUrl: './credit-spread-report.component.html',
  styleUrls: ['./credit-spread-report.component.scss'],
})
export class CreditSpreadReportComponent implements OnInit {
  errorMsg = '';

  icsData;

  // children of icsData above, just for sort name and easy acces
  icsCols = [];
  icsToday;
  ics4wkChange;

  icsPeriods = [];
  icsPercentiles;

  // bar chart data
  icsPercentileChartData = null;

  // symbol name mapping
  symNameMap;
  nameSymMap;

  // selected symbol
  selSymbol;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/fred_api/oas_data/intra_credit_yield_spreads').subscribe(data => {
      this.unsetData();
      if ('error' in data) {
        this.errorMsg = 'Issue in server. Contact Support';
      } else {
        this.errorMsg = '';
        this.icsData = data;
        this.setDataForTables();
        // this.setBarChartData();
        this.setLineChartData();
      }
    });
  }

  setDataForTables() {
    // name symbol dict
    this.symNameMap = this.icsData?.sym_name_map;
    this.nameSymMap = Object.entries(this.symNameMap || {}).reduce((acc, [symbol, name]) => {
      acc[name as string] = symbol;
      return acc;
    }, {});

    // set data for today table
    this.icsCols = this.setCols(this.icsData?.symbols);
    this.icsToday = this.icsData?.intra_credit_spread_last;
    this.ics4wkChange = this.icsData?.intra_credit_spread_change_4wk;

    this.icsPeriods = this.icsData?.periods;
    this.icsPercentiles = this.icsData?.sym_oas_percentiles;
  }

  setBarChartData() {
    const chartData = ChartUtils.getAllSeriesData(
      this.icsPercentiles?.data,
      this.getSeries(['3 Month', '1 Year', '5 Year', '20 Year']),
      'symbol',
      false,
      100.0,
    );

    this.icsPercentileChartData = chartData;
  }

  setLineChartData() {
    // first symbol in the list
    this.selSymbol = Object.keys(this.symNameMap)[0];
  }

  getSeries(names) {
    let series = [];
    for (let name of names) {
      series.push({ name: name, data: [] });
    }
    return series;
  }

  setCols(symbols) {
    const cols = [];
    for (let sym of symbols) {
      cols.push({ field: sym, header: sym });
    }
    return cols;
  }

  onChartClick(sym) {
    this.selSymbol = this.nameSymMap[sym];
  }

  unsetData() {
    this.icsData = null;

    this.icsCols = [];
    this.icsToday = null;
    this.ics4wkChange = null;

    this.icsPeriods = [];
    this.icsPercentiles = null;

    this.symNameMap = null;
    this.nameSymMap = null;
  }
}
