import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { LiveService } from '../services/live.service';
import { AuthenticationService } from '../_services/index';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { RIAConstants } from '../utils/ria.constants';
import { RecaptchaComponent } from 'ng-recaptcha-2';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'contact-us-diy',
  templateUrl: './contact-us-diy.component.html',
  styleUrls: ['./contact-us-diy.component.css'],
})
export class ContactUsDiyComponent implements OnInit {
  successText = '';
  isUserLogged = false;
  constructor(
    private router: Router,
    private messageService: MessageService,
    private liveService: LiveService,
    private authenticationService: AuthenticationService,
    private breadcrumbService: AppBreadcrumbService,
  ) {
    this.breadcrumbService.setItems([{ label: 'Contact Us', routerLink: ['/contact-us'] }]);
    this.authenticationService.getLoggedInUser().subscribe(d => this.setUser(d));
  }

  user = { userName: '', email: '', subject: '', body: '', isCaptchaOK: false };
  emailPattern = RIAConstants.EMAIL_PATTERN;

  emailApiEp = '/contact';
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

  setUser(user) {
    if (user != null && user != '') {
      this.isUserLogged = true;
    }
  }

  sendEmail() {
    this.user["isCaptchaOK"] = this.isCaptchaVerified;
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
      this.resetCaptcha();
      this.clearUserMessage();
      this.router.navigate(['/message']);
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
    navigator.clipboard.writeText('contact@simplevisor.com');
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
