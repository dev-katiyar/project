import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-admin-user-exit-feedback',
  templateUrl: './admin-user-exit-feedback.component.html',
  styleUrls: ['./admin-user-exit-feedback.component.scss'],
})
export class AdminUserExitFeedbackComponent implements OnInit {
  constructor(private liveService: LiveService) {}

  // api data
  period = '1month';
  feedbackResData;

  // static data resaons dict (no need to clearData())
  reasonsDict;

  // to handle by date chart and table
  dateWiseFeedbackData; // raw data from api
  dateWiseFeedbackChartData; // raw data processed for chart

  // to handle by reason chart and table
  reasonWiseFeedbackData; // raw data from api
  reasonWiseFeedbackChartConfig = [
    {
      seriesName: 'User Exits Count',
      xCol: 'reason',
      xColName: 'reason',
      yCol: 'count',
      clickEventCol: 'reason',
      colorPos: 'mediumspringgreen',
      colorNeg: 'lightcoral',
      barOrColumn: 'column',
    },
  ];
  reasonWiseFeedbackChartData; // raw data processed for chart

  // common table for both date and reason
  filteredTableData; // for both bar chart and line chart filtered table data

  // all rows
  feedbackList;
  feedbackListTableData;

  // user add by date
  dateWiseUserAddData;

  ngOnInit(): void {
    this.feedbackPeriodChanged(this.period);
  }

  feedbackPeriodChanged(period) {
    this.clearData();
    this.period = period;
    this.liveService
      .postRequest('/get-exit-feedback', { period: this.period })
      .subscribe((response: any) => {
        this.feedbackResData = response;

        // static data
        this.reasonsDict = response?.data?.reasons_dict;

        // by date
        this.dateWiseUserAddData = response?.data?.by_date_new_users;
        this.dateWiseFeedbackData = response?.data?.by_date;
        this.prepareDateWiseFeedbackData(this.dateWiseFeedbackData);

        // by reason
        this.reasonWiseFeedbackData = response?.data?.by_reasons;
        this.prepareReasonWiseFeedbackData(this.reasonWiseFeedbackData);

        // all rows
        this.feedbackList = response?.data?.feedback_list;
        this.prepareAllReasonsList(this.feedbackList);
      });
  }

  prepareDateWiseFeedbackData(data) {
    const chartData = [];
    for (const key of Object.keys(data)) {
      chartData.push({
        date: key,
        exit: data[key].length || 0,
        add: this.dateWiseUserAddData[key]?.length || 0,
      });
    }

    this.dateWiseFeedbackChartData = {
      data: chartData,
      series: [
        { name: 'exit', data: [], color: 'blue', legend: 'Exit Count' },
        { name: 'add', data: [], color: 'green', legend: 'Join Count' },
      ],
      categoryColumn: 'date',
    };
  }

  onLineChartPointClick(x) {
    const date = this.formatDate(x?.value);
    this.filteredTableData = this.dateWiseFeedbackData[date];

    this.fillReasonInTable(this.filteredTableData);
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);

    // Get UTC/GMT date components
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  prepareReasonWiseFeedbackData(data) {
    this.reasonWiseFeedbackChartData = [];
    for (const key of Object.keys(data)) {
      this.reasonWiseFeedbackChartData.push({
        reason: this.reasonsDict[key]?.label || key,
        count: data[key].length,
      });
    }
  }

  handleBarClicked(event) {
    const reasonLabel = event.value;
    const reasonKey = Object.keys(this.reasonsDict).find(
      key => this.reasonsDict[key]?.label === reasonLabel,
    );
    this.filteredTableData = this.reasonWiseFeedbackData[reasonKey];

    this.fillReasonInTable(this.filteredTableData);
  }

  fillReasonInTable(data) {
    for (const item of data) {
      const reasonString = item['reasons'];

      if (typeof reasonString !== 'string') {
        continue;
      }

      const reasonKeysList = JSON.parse(reasonString);
      const allReasons = [];
      for (const reasonKey of reasonKeysList) {
        allReasons.push(this.reasonsDict[reasonKey]?.label || reasonKey);
      }
      item['reasons'] = allReasons;
    }
  }

  prepareAllReasonsList(data) {
    this.feedbackListTableData = data;
    this.fillReasonInTable(this.feedbackListTableData);
  }

  clearData() {
    this.period = '1month';
    this.feedbackResData = null;

    // for line chart
    this.dateWiseFeedbackData = null;
    this.dateWiseUserAddData = null;
    this.dateWiseFeedbackChartData = null;

    // for bar chart
    this.reasonWiseFeedbackData = null;
    this.reasonWiseFeedbackChartData = null;

    // for table with fitlered data from both the charts
    this.filteredTableData = null;

    // for all rows
    this.feedbackList = null;
  }
}
