import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import {formatDate} from '@angular/common';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  isAdminUser = 0;
  technicalValues=[];
  gaugeParams = {"fear_greed": 0, "technical": 0,"date":new Date()};
  message :any;

  constructor(private liveService: LiveService) {}

  ngOnInit() {
          this.liveService.getUrlData("/user/isAdmin").subscribe(d => this.isAdminUser = d["userType"]);
  }

  setParams(d) {
      this.technicalValues= d;
  }

  saveDetails() {
  this.message ="";
  this.liveService.postRequest("/dashboard/params", this.gaugeParams).subscribe(d => this.message = "Saved Data");

  }

  getData(){
      let date = this.gaugeParams.date;
      let date_formatted = formatDate(date, 'yyyy-MM-dd', 'en-US')
      this.liveService.getUrlData("/dashboard/params/"+date_formatted).subscribe(d => this.setParams(d));
  }

}
