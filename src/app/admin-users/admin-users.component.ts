import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit {
  text = '';
  loading = false;
  userDetails = {
    userId: 0,
    username: '',
    firstName: '',
    lastName: '',
    emailAddress: '',
    substype: 0,
    password: '',
    action: '',
  };
  userDetailList;
  newUser: boolean;
  subscription: any;
  cols: any[]; // dynamic table needed to enable CSV export feature
  subscriptionType: any;

  temp;

  constructor(private liveService: LiveService) {}

  ngOnInit() {
    this.cols = [
      { field: 'userId', header: 'User Id' },
      { field: 'username', header: 'User Name' },
      { field: 'password', header: 'Password' },
      { field: 'firstName', header: 'First Name' },
      { field: 'lastName', header: 'Last Name' },
      { field: 'emailAddress', header: 'Email Address' },
      { field: 'isPaid', header: 'isPaid' },
      { field: 'substype', header: 'Sub Type' },
      { field: 'date', header: 'Date' },
      { field: 'promoCode', header: 'Promo Code' },
    ];

    this.liveService.getSubscriptions('all').subscribe(res => {
      this.subscriptionType = res;
    });
  }

  getAllUserDetail() {
    this.loading = true;
    this.userDetailList = [];

    this.liveService.postRequest('/users/details', this.text).subscribe(d => {
      this.loading = false;
      this.userDetailList = d;
    });
  }

  addNewUser() {
    this.userDetailList = [];
    let newUser = {
      username: '',
      password: '',
      emailAddress: '',
      firstName: '',
      lastName: '',
      isEditable: true,
      newAddition: true,
      isPaid: 1,
      substype: 1,
    };
    this.userDetailList.push(newUser);
  }

  saveUserData(userDetail): void {
    if (userDetail.newAddition) {
      userDetail.action = 'add';
      this.liveService.postRequest('/user/details', userDetail).subscribe(d => {
        this.temp = d;
      });
    } else {
      userDetail.action = 'save';
      this.liveService.postRequest('/user/details', userDetail).subscribe(d => {
        this.temp = d;
      });
    }
    userDetail.isEditable = false;
  }

  deleteUser(userDetail): void {
    userDetail.action = 'delete';
    this.liveService.postRequest('/user/details', userDetail).subscribe(d => {
      this.temp = d;
    });
    userDetail.isEditable = false;
    this.getAllUserDetail();
  }

  editUserData(userDetail) {
    userDetail.isEditable = true;
  }
}
