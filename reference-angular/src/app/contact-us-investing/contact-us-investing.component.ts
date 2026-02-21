import { Component, EventEmitter, Input, OnInit, Output,ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { LiveService } from '../services/live.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { RIAConstants } from '../utils/ria.constants';
import { RecaptchaComponent } from 'ng-recaptcha-2';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-contact-us-investing',
  templateUrl: './contact-us-investing.component.html',
  styleUrls: ['./contact-us-investing.component.scss'],
})
export class ContactUsInvestingComponent implements OnInit {
  successText = '';
  isUserLogged = false;
  constructor(
    private messageService: MessageService,
    private liveService: LiveService,
    private breadcrumbService: AppBreadcrumbService,
  ) {
    this.breadcrumbService.setItems([{ label: 'Contact Us', routerLink: ['/contact-us'] }]);
  }

  user = { userName: '', email: '', accountId:'', subject: '', body: '' };
  emailPattern = RIAConstants.EMAIL_PATTERN;
  subjectList = [
    { "key": 1, "name": "Opening/Funding Account"},
    { "key": 2, "name": "Transfer of Assets"},
    { "key": 3, "name": "Required Minimum Distribution"},
    { "key": 4, "name": "Changing Model"},
    { "key": 5, "name": "Adding Money To Account"},
    { "key": 6, "name": "Other"},
  ];
  selectedSubjects = [];

  emailApiEp = '/email_robovisor_support';
  @Input() type = '';
  @Output() public msgSent = new EventEmitter();

  // Capthca Related
  siteKey = environment.SITE_KEY;
  isCaptchaVerified = false;
  @ViewChild('captcha') captchaEl: RecaptchaComponent;
  msg = '';
  msgType= ''; // Optoins are: info/success/warn/error

  ngOnInit() {}

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
  }

  sendEmail() {
    this.user.subject = '';
    for(let selSub of this.selectedSubjects) {
      this.user.subject += selSub.name + ', '
    }
    this.user.subject = this.user.subject.slice(0, -2);
    this.liveService.postRequest(this.emailApiEp, this.user).subscribe(d => this.setStatus(d));
  }

  setStatus(d) {
    if (d.status == 'ok') {
      this.showStatus({
        status: 'success',
        message: 'Thanks for writing to us, We will get back to you asap.',
      });
      this.msgSent.emit({
        value: 'success',
      });
    } else {
      this.showStatus({ status: 'error', message: d.status });
    }
  }

  copyToClipboard() {
    this.messageService.add({
      severity: 'success',
      summary: 'Copy Success',
      detail: 'Email Address Copied to Clipboard',
      life: 1000,
    });
    navigator.clipboard.writeText('servicerequest@simplevisor.com');
  }

  showResponse(data) {
    const post_data = { token: data };
    this.liveService
      .postRequest('/user/validate-captcha', post_data)
      .subscribe(d => this.setCaptchaVerification(d));
  }

  setCaptchaVerification(captchaResponse) {
    if (captchaResponse.success) {
      this.isCaptchaVerified = true;
      this.clearUserMessage();
    } else {
      this.setUserMessage('error', 'There is issue in validating the Captcha. Please contact us at contact@simplevisor.com');
      this.resetCaptcha();
    }
  }

  resetCaptcha() {
    this.isCaptchaVerified = false;
    this.captchaEl.reset();
  }

  setUserMessage(type, msg) {
    this.msgType = type;
    this.msg = msg;
  }

  clearUserMessage() {
    this.msgType = '';
    this.msg = '';
  }
}
