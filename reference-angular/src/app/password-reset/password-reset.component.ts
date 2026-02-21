import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RecaptchaComponent } from 'ng-recaptcha-2';
import { environment } from 'src/environments/environment';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.scss'],
})
export class PasswordResetComponent implements OnInit {
  // password reset related
  token = ''; // get it from url param, to be sent to server to ensure that it is genuine and not expired
  user_password = '';
  user_password_confirm = '';
  isOkayToReset = false;
  isPasswordResetSucess = false;

  // Capthca Related
  siteKey = environment.SITE_KEY;
  isCaptchaVerified = false;
  @ViewChild('captcha') captchaEl: RecaptchaComponent;
  
  // server communication related
  msg = '';
  msgType= ''; // Optoins are: info/success/warn/error
  loading = false;

  constructor(private route: ActivatedRoute, private liveService: LiveService,) {}

  ngOnInit(): void {
    // get token from URL
    this.token = this.route.snapshot.queryParamMap.get('token');

    // verify token, if fail then set message and hide reset UI
    this.verifyTokenAndExpiry(this.token);

  }

  verifyTokenAndExpiry(token) {
    this.loading = true;
    this.liveService.postRequest('/register/reset-password/verify-token', {token: this.token})
    .subscribe(
      res => {
        this.loading = false;
        // if token if not fine, then hide UI and set message. Ask to send again.
        if(res && res['status'] != 'ok') {
          this.isOkayToReset = false;
          this.setUserMessage(
            'error', 
            res['status']
          );
        } else {
          this.isOkayToReset = true;
        }
      },
      err => {
        this.loading = false;
        this.isOkayToReset = false;
        this.setUserMessage(
          'error',
          'Something went wrong. Please contact us at contact@simplevisor.com.'
        );
      }
    );
  }

  resetUserPassword() {
    this.setUserMessage(
      'info', 
      'Updating new password in your profile.'
    );

    this.liveService.postRequest('/register/reset-password', {token: this.token, new_password: this.user_password})
    .subscribe(
      res => {
        this.loading = false;
        if(res['status'] !== 'ok') {
          this.setUserMessage(
            'error',
            res['status']
          );
        } else {
          this.isPasswordResetSucess = true;
          this.setUserMessage(
            'success', 
            'Password has been reset successfully! Please login with new password.'
          );
        }
      },
      err => {
        this.loading = false;
        this.setUserMessage(
          'error',
          'Something went wrong. Please contact us at contact@simplevisor.com.'
        );
      }
    );
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
      this.setUserMessage('error', 'Verification Issue! Try again or contact SimpleVisor team.');
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
