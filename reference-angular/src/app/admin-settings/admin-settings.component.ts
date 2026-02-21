import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MessageService } from 'primeng/api';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss'],
})
export class AdminSettingsComponent implements OnInit {
  constructor(
    private liveService: LiveService,
    private messageService: MessageService,
    private clipboard: Clipboard,
  ) {}

  newTempPass = '';
  newTempPassMessage = '';

  ngOnInit() {
    this.cleanUp();
  }

  generateTempPassword() {
    this.cleanUp();
    this.liveService.getUrlData('/login/create_temp_stock').subscribe(res => {
      this.newTempPass = res['temp_password'];
      this.newTempPassMessage = res['message'];
      // console.log('Temp Password:', this.newTempPass);
      // console.log('Message:', this.newTempPassMessage);
    });
  }

  copyTempPasswordToClipboard() {
    const success = this.clipboard.copy(this.newTempPass);
    if (success) {
      this.showStatus({ status: 'success', message: 'Temp password copied to clipboard' });
    }
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1200 });
  }

  cleanUp() {
    this.newTempPass = '<Click "Generate Temp Password" to create>';
    this.newTempPassMessage = '';
  }
}
