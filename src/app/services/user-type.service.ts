import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { GtmService } from './gtm.service';

@Injectable({
  providedIn: 'root',
})
export class UserTypeService {
  userType = '';
  userTypeMap = {
    '1': 'sv_only_user',
    '2': 'sv_only_user',
    '3': 'sv_tpa_user',
    '4': 'sv_tpa_user',
    '5': 'sv_tpa_user',
    '6': 'tpa_only_user',
    '7': 'tpa_only_user',
    admin1: 'sv_admin',
    admin2: 'tpa_admin',
  };
  constructor(private http: HttpClient, private readonly gtmService: GtmService) {}

  getUserType() {
    if (!this.userType) {
      this.setUserType();
    }
    return this.userType;
  }

  setUserType() {
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && !('substype' in currentUser)) {
      localStorage.removeItem('currentUser');
      currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }
    if (!currentUser) {
      this.userType = '';
    } else {
      if (currentUser.admin_type) {
        this.userType = this.userTypeMap['admin' + currentUser.admin_type];
      } else {
        this.userType = this.userTypeMap[currentUser.substype];
      }
    }
  }
}
