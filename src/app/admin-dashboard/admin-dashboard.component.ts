import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  isAdminUser = 0;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/user/isAdmin').subscribe(d => {
      this.isAdminUser = d['userType'];
    });
  }

  onTabChange(event: any) {
    // console.log('Tab changed to index: ', event.index);
  }
}
