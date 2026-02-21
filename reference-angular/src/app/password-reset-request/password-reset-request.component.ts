import { Component, OnInit, ViewChild } from '@angular/core';
import { RIAConstants } from '../utils/ria.constants';
import { environment } from 'src/environments/environment';
import { RecaptchaComponent } from 'ng-recaptcha-2';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-password-reset-request',
  templateUrl: './password-reset-request.component.html',
  styleUrls: ['./password-reset-request.component.scss'],
})
export class PasswordResetRequestComponent implements OnInit {
  // user email related
  userEmail = '';
  emailPattern = RIAConstants.EMAIL_PATTERN;
  isUserEmailSent = false;

  // Capthca Related
  siteKey = environment.SITE_KEY;
  isCaptchaVerified = false;
  @ViewChild('captcha') captchaEl: RecaptchaComponent;

 // server communication related
  msg = '';
  msgType= ''; // Optoins are: info/success/warn/error
  loading = false;

  // try again button related 
  isTryAgainButtonDisabled = true;
  initialTimerSeconds: number = 300;
  remainingSeconds: number = 0;

  constructor(private liveService: LiveService) {}

  ngOnInit(): void {}

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

  sendResetLinkEmail() {
    this.loading = true;
    this.setUserMessage('info', 'Sending email with reset link. Please wait...')
    this.liveService.postRequest('/register/reset-password-request', {userEmail: this.userEmail})
    .subscribe(
      res => {
        this.loading = false;
        this.isUserEmailSent = true;
        this.startTimer();
        this.setUserMessage(
          'success', 
          'Email with reset link has been sent to your registered email. Please open the email and click on link in the email to set the new password. The link will expire in 15 minutes. If you do not get password reset email within 5 minutes, please try again by clicking the button below or contact us at contact@simplevisor.com.'
        );
      },
      err => {
        this.loading = false;
        this.setUserMessage(
          'error',
          'Something went wrong. Please contact us at contact@simplevisor.com'
        );
      }
    );
  }

  resetForm() {
    this.loading = false;
    this.isCaptchaVerified = false;
    this.msg = '';
    this.msgType = '';
    this.isUserEmailSent = false;
  }

  startTimer(): void {
    this.remainingSeconds = this.initialTimerSeconds;
    const intervalId = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.isTryAgainButtonDisabled = false;
        clearInterval(intervalId);
      }
    }, 1000); // Update every second
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
