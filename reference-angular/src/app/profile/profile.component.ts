import { Component, OnInit, ViewChild } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  selectedCheckbox = [];
  user = { oldPassword: '', newPassword: '', newEmail: '' };
  subscription_type = 1;
  userData: any;

  isAdminUser = 0;

  constructor(private liveService: LiveService, private messageService: MessageService) {}

  ngOnInit() {
    this.liveService.getUrlData('/user/isAdmin').subscribe(d => {
      this.isAdminUser = d['userType'];
      this.getUserProfileData();
    });
  }

  getUserProfileData() {
    this.liveService.getUrlData('/user/subscription').subscribe(d => this.setUserData(d));
  }

  setUserData(d) {
    this.userData = d;

    // for dropdown to work
    this.userData.age = this.userData.age?.toString();
  }

  setFromServer() {
    this.getUserProfileData();
  }

  saveAccountInfo() {
    this.liveService
      .postRequest('/user/subscription', { userData: this.userData, action: 'update' })
      .subscribe(d => this.setAccountDetails(d));
  }

  setAccountDetails(d) {
    this.showStatus({ status: 'success', message: d.message });
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1200 });
  }
}
